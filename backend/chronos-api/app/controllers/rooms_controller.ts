import type { HttpContext } from '@adonisjs/core/http'
import Room from '#models/room'
import RoomParticipant from '#models/room_participant'
import RoomInvitation from '#models/room_invitation'
import Notification from '#models/notification'
import User from '#models/user'
import { randomBytes } from 'node:crypto'
import { io, userSockets } from '#start/ws'

export default class RoomsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    const rooms = await Room.query()
      .whereHas('participants', (query) => {
        query.where('userId', user.id)
      })
      .orderBy('updatedAt', 'desc')

    return rooms
  }

  async store({ auth, request }: HttpContext) {
    const user = auth.user!
    const { name, invitedEmails } = request.only(['name', 'invitedEmails'])

    const room = await Room.create({
      name: name || `${user.fullName}'s Room`,
      ownerId: user.id,
      isActive: true,
    })

    await RoomParticipant.create({
      userId: user.id,
      roomId: room.id,
      role: 'host',
    })

    if (invitedEmails && Array.isArray(invitedEmails) && invitedEmails.length > 0) {
      for (const email of invitedEmails) {
        const token = randomBytes(32).toString('hex')
        const invitation = await RoomInvitation.create({
          roomId: room.id,
          invitedByUserId: user.id,
          invitedUserEmail: email,
          token,
          status: 'pending',
        })

        const existingUser = await User.findBy('email', email)
        if (existingUser) {
          const notification = await Notification.create({
            userId: existingUser.id,
            type: 'room_invitation',
            title: 'Room Invitation',
            message: `${user.fullName || user.email} invited you to join ${room.name}`,
            link: `/room/${room.id}/invite/${token}`,
            isRead: false,
          })

          const socketId = userSockets.get(existingUser.id)
          if (socketId) {
            io.to(socketId).emit('new-notification', notification.serialize())
          }
        }
      }
    }

    return room
  }

  async show({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const room = await Room.query()
      .whereHas('participants', (query) => {
        query.where('userId', user.id)
      })
      .where('id', params.id)
      .preload('owner')
      .preload('participants', (query) => {
        query.preload('user')
      })
      .preload('invitations', (query) => {
        query.where('status', 'pending').preload('invitedBy').preload('invitedUser')
      })
      .first()

    if (!room) return response.notFound()

    return room
  }

  async update({ params, auth, request, response }: HttpContext) {
    const user = auth.user!
    const { name } = request.only(['name'])

    const room = await Room.find(params.id)
    if (!room) return response.notFound()

    const participant = await RoomParticipant.query()
      .where('userId', user.id)
      .where('roomId', params.id)
      .first()

    if (!participant || participant.role !== 'host') {
      return response.forbidden('Only hosts can rename the room')
    }

    room.name = name
    await room.save()

    return room
  }

  async join({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const room = await Room.find(params.id)

    if (!room) return response.notFound()

    await RoomParticipant.firstOrCreate(
      {
        userId: user.id,
        roomId: room.id,
      },
      {
        role: 'estimator',
      }
    )

    return room
  }

  async leave({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const room = await Room.query()
      .where('id', params.id)
      .preload('participants')
      .first()

    if (!room) return response.notFound()

    const participant = await RoomParticipant.query()
      .where('userId', user.id)
      .where('roomId', params.id)
      .first()

    if (!participant) return response.notFound()

    if (participant.role === 'host') {
      const otherHosts = await RoomParticipant.query()
        .where('roomId', params.id)
        .where('userId', '!=', user.id)
        .where('role', 'host')
        .count('* as count')

      if (otherHosts[0].$extras.count === 0) {
        return response.badRequest('Cannot leave room: you are the only host')
      }
    }

    await participant.delete()

    const socketId = userSockets.get(user.id)
    if (socketId) {
      io.to(socketId).emit('removed-from-room', { roomId: params.id })
    }

    for (const roomParticipant of room.participants) {
      if (roomParticipant.userId !== user.id) {
        const participantSocketId = userSockets.get(roomParticipant.userId)
        if (participantSocketId) {
          io.to(participantSocketId).emit('room-participant-left', {
            roomId: params.id,
            userId: user.id,
            participantId: participant.id,
          })
        }
      }
    }

    return response.ok({ success: true })
  }

  async invite({ params, auth, request, response }: HttpContext) {
    const user = auth.user!
    const { email, userId } = request.only(['email', 'userId'])

    try {
      const room = await Room.find(params.id)
      if (!room) return response.notFound('Room not found')

      const participant = await RoomParticipant.query()
        .where('userId', user.id)
        .where('roomId', params.id)
        .first()

      if (!participant || participant.role !== 'host') {
        return response.forbidden('Only hosts can invite participants')
      }

      let invitedUser: User | null = null
      let invitedUserEmail = ''

      if (userId) {
        invitedUser = await User.find(userId)
        if (!invitedUser) {
          return response.badRequest('User not found')
        }
        invitedUserEmail = invitedUser.email || `user_${invitedUser.id}`
      } else if (email) {
        invitedUser = await User.findBy('email', email)
        if (!invitedUser) {
          return response.badRequest("Can't send invitation to an unknown user.")
        }
        invitedUserEmail = email
      } else {
        return response.badRequest('Either email or userId is required')
      }

      const existingParticipant = await RoomParticipant.query()
        .where('roomId', params.id)
        .where('userId', invitedUser.id)
        .first()

      if (existingParticipant) {
        return response.badRequest('User is already a participant of this room')
      }

      const existingInvitation = await RoomInvitation.query()
        .where('roomId', params.id)
        .where('invitedUserEmail', invitedUserEmail)
        .where('status', 'pending')
        .first()

      if (existingInvitation) {
        return response.badRequest('User has already been invited to this room')
      }

      const token = randomBytes(32).toString('hex')
      const invitation = await RoomInvitation.create({
        roomId: room.id,
        invitedByUserId: user.id,
        invitedUserId: invitedUser.id,
        invitedUserEmail: invitedUserEmail,
        token,
        status: 'pending',
      })

      const notification = await Notification.create({
        userId: invitedUser.id,
        type: 'room_invitation',
        title: 'Room Invitation',
        message: `${user.fullName || user.email} invited you to join ${room.name}`,
        link: `/room/${room.id}/invite/${token}`,
        isRead: false,
      })

      const socketId = userSockets.get(invitedUser.id)
      if (socketId) {
        io.to(socketId).emit('new-notification', notification.serialize())
      }

      return invitation
    } catch (error) {
      console.error('Error in invite:', error)
      return response.internalServerError({ message: error.message || 'Failed to send invitation' })
    }
  }

  async acceptInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const { token } = params

    const invitation = await RoomInvitation.findBy('token', token)
    if (!invitation) return response.notFound('Invitation not found')

    if (invitation.status !== 'pending') {
      return response.badRequest('Invitation has already been used or cancelled')
    }

    const userIdentifier = user.email || `user_${user.id}`
    if (invitation.invitedUserEmail !== userIdentifier) {
      return response.forbidden('This invitation is not for you')
    }

    const room = await Room.query()
      .where('id', invitation.roomId)
      .preload('participants', (query) => {
        query.preload('user')
      })
      .first()
    
    if (!room) return response.notFound('Room not found')

    const newParticipant = await RoomParticipant.firstOrCreate(
      {
        userId: user.id,
        roomId: room.id,
      },
      {
        role: 'estimator',
      }
    )

    await newParticipant.load('user')

    invitation.status = 'accepted'
    await invitation.save()

    await Notification.query()
      .where('userId', user.id)
      .where('link', `/room/${room.id}/invite/${token}`)
      .delete()

    for (const participant of room.participants) {
      const socketId = userSockets.get(participant.userId)
      if (socketId) {
        io.to(socketId).emit('room-participant-joined', {
          roomId: room.id,
          participant: newParticipant.serialize(),
          invitationId: invitation.id,
        })
      }
    }

    return { success: true }
  }

  async declineInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const { token } = params

    const invitation = await RoomInvitation.findBy('token', token)
    if (!invitation) return response.notFound('Invitation not found')

    if (invitation.status !== 'pending') {
      return response.badRequest('Invitation has already been used or cancelled')
    }

    const userIdentifier = user.email || `user_${user.id}`
    if (invitation.invitedUserEmail !== userIdentifier) {
      return response.forbidden('This invitation is not for you')
    }

    invitation.status = 'declined'
    await invitation.save()

    await Notification.query()
      .where('userId', user.id)
      .where('link', `/room/${invitation.roomId}/invite/${token}`)
      .delete()

    return { success: true }
  }

  async getInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const { token } = params

    try {
      const invitation = await RoomInvitation.query()
        .where('token', token)
        .preload('room')
        .preload('invitedBy')
        .first()

      if (!invitation) return response.notFound('Invitation not found')

      if (invitation.status !== 'pending') {
        return response.badRequest('Invitation has already been used or cancelled')
      }

      const userIdentifier = user.email || `user_${user.id}`
      if (invitation.invitedUserEmail !== userIdentifier) {
        return response.forbidden('This invitation is not for you')
      }

      return {
        roomName: invitation.room.name,
        invitedBy: invitation.invitedBy.fullName || invitation.invitedBy.email,
        status: invitation.status,
      }
    } catch (error) {
      console.error('Error in getInvitation:', error)
      return response.internalServerError({ message: error.message || 'Failed to load invitation' })
    }
  }

  async removeParticipant({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const participantId = params.participantId

    const room = await Room.find(params.id)
    if (!room) return response.notFound()

    const currentParticipant = await RoomParticipant.query()
      .where('userId', user.id)
      .where('roomId', params.id)
      .first()

    if (!currentParticipant || currentParticipant.role !== 'host') {
      return response.forbidden('Only hosts can remove participants')
    }

    const participantToRemove = await RoomParticipant.query()
      .where('id', participantId)
      .where('roomId', params.id)
      .first()

    if (!participantToRemove) return response.notFound('Participant not found')

    if (participantToRemove.userId === user.id) {
      return response.badRequest('Cannot remove yourself. Use leave endpoint instead.')
    }

    await participantToRemove.delete()

    const socketId = userSockets.get(participantToRemove.userId)
    if (socketId) {
      io.to(socketId).emit('removed-from-room', { roomId: params.id })
    }

    return response.ok({ success: true })
  }

  async cancelInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const invitationId = params.invitationId

    const room = await Room.find(params.id)
    if (!room) return response.notFound()

    const currentParticipant = await RoomParticipant.query()
      .where('userId', user.id)
      .where('roomId', params.id)
      .first()

    if (!currentParticipant || currentParticipant.role !== 'host') {
      return response.forbidden('Only hosts can cancel invitations')
    }

    const invitation = await RoomInvitation.query()
      .where('id', invitationId)
      .where('roomId', params.id)
      .first()

    if (!invitation) return response.notFound('Invitation not found')

    const invitedUser = await User.findBy('email', invitation.invitedUserEmail)

    const notifications = await Notification.query()
      .where('link', `/room/${room.id}/invite/${invitation.token}`)

    for (const notification of notifications) {
      await notification.delete()
      
      if (invitedUser) {
        const socketId = userSockets.get(invitedUser.id)
        if (socketId) {
          io.to(socketId).emit('notification-deleted', { id: notification.id })
        }
      }
    }

    await invitation.delete()

    return response.ok({ success: true })
  }
}
