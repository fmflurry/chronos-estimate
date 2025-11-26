import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team'
import TeamMember from '#models/team_member'
import TeamInvitation from '#models/team_invitation'
import Notification from '#models/notification'
import User from '#models/user'
import { randomBytes } from 'node:crypto'
import { io, userSockets, broadcastTeamOnlineMembers } from '#start/ws'

export default class TeamsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    const teams = await Team.query()
      .whereHas('members', (query) => {
        query.where('userId', user.id)
      })
      .preload('members', (query) => {
        query.preload('user')
      })
      .orderBy('updatedAt', 'desc')

    const teamsWithCounts = teams.map(team => {
      const totalMembers = team.members.length
      const connectedMembers = team.members.filter(member => 
        userSockets.has(member.userId)
      ).length

      return {
        ...team.serialize(),
        totalMembers,
        connectedMembers,
      }
    })

    return teamsWithCounts
  }

  async search({ auth, request }: HttpContext) {
    const user = auth.user!
    const { q } = request.only(['q'])

    const userTeamMembers = await TeamMember.query()
      .where('userId', user.id)
      .select('teamId')

    const userTeamIds = userTeamMembers.map((tm) => tm.teamId)

    const query = Team.query()
      .limit(50)
      .select('id', 'name', 'createdAt', 'updatedAt')

    if (userTeamIds.length > 0) {
      query.whereNotIn('id', userTeamIds)
    }

    if (q && q.length >= 2) {
      const searchTerm = `%${q}%`
      query.where('name', 'like', searchTerm)
    }

    const teams = await query

    return teams
  }

  async show({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const team = await Team.query()
      .whereHas('members', (query) => {
        query.where('userId', user.id)
      })
      .where('id', params.id)
      .preload('owner')
      .preload('members', (query) => {
        query.preload('user')
      })
      .preload('invitations', (query) => {
        query.where('status', 'pending').preload('invitedBy').preload('invitedUser')
      })
      .first()

    if (!team) return response.notFound()

    return team
  }

  async store({ auth, request }: HttpContext) {
    const user = auth.user!
    const { name, invitedEmails } = request.only(['name', 'invitedEmails'])

    const team = await Team.create({
      name: name || `${user.fullName}'s Team`,
      ownerId: user.id,
    })

    await TeamMember.create({
      userId: user.id,
      teamId: team.id,
      role: 'owner',
    })

    if (invitedEmails && Array.isArray(invitedEmails) && invitedEmails.length > 0) {
      for (const email of invitedEmails) {
        const token = randomBytes(32).toString('hex')
        const invitation = await TeamInvitation.create({
          teamId: team.id,
          invitedByUserId: user.id,
          invitedUserEmail: email,
          token,
          status: 'pending',
        })

        const existingUser = await User.findBy('email', email)
        if (existingUser) {
          const notification = await Notification.create({
            userId: existingUser.id,
            type: 'team_invitation',
            title: 'Team Invitation',
            message: `${user.fullName || user.email} invited you to join ${team.name}`,
            link: `/team/${team.id}/invite/${token}`,
            isRead: false,
          })

          const socketId = userSockets.get(existingUser.id)
          if (socketId) {
            io.to(socketId).emit('new-notification', notification.serialize())
          }
        }
      }
    }

    return team
  }

  async update({ params, auth, request, response }: HttpContext) {
    const user = auth.user!
    const { memberId, role } = request.only(['memberId', 'role'])

    const member = await TeamMember.query()
      .where('id', memberId)
      .where('teamId', params.id)
      .preload('team')
      .first()

    if (!member) return response.notFound()

    const currentMember = await TeamMember.query()
      .where('userId', user.id)
      .where('teamId', params.id)
      .first()

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return response.forbidden('Only admins can change member roles')
    }

    member.role = role
    await member.save()

    return member
  }

  async destroy({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const team = await Team.find(params.id)

    if (!team) return response.notFound()

    if (team.ownerId !== user.id) {
      return response.forbidden('Only the owner can delete the team')
    }

    await team.delete()

    return response.ok({ success: true })
  }

  async leave({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const team = await Team.query()
      .where('id', params.id)
      .preload('members')
      .first()

    if (!team) return response.notFound()

    const member = await TeamMember.query()
      .where('userId', user.id)
      .where('teamId', params.id)
      .first()

    if (!member) return response.notFound()

    if (member.role === 'owner' || member.role === 'admin') {
      const otherAdmins = await TeamMember.query()
        .where('teamId', params.id)
        .where('userId', '!=', user.id)
        .whereIn('role', ['owner', 'admin'])
        .count('* as count')

      if (otherAdmins[0].$extras.count === 0) {
        return response.badRequest('Cannot leave team: you are the only admin')
      }
    }

    await member.delete()

    const socketId = userSockets.get(user.id)
    if (socketId) {
      io.to(socketId).emit('removed-from-team', { teamId: params.id })
    }

    for (const teamMember of team.members) {
      if (teamMember.userId !== user.id) {
        const memberSocketId = userSockets.get(teamMember.userId)
        if (memberSocketId) {
          io.to(memberSocketId).emit('team-member-left', {
            teamId: params.id,
            userId: user.id,
            memberId: member.id,
          })
        }
      }
    }

    await broadcastTeamOnlineMembers()

    return response.ok({ success: true })
  }

  async invite({ params, auth, request, response }: HttpContext) {
    const user = auth.user!
    const { email, userId } = request.only(['email', 'userId'])

    try {
      const team = await Team.find(params.id)
      if (!team) return response.notFound('Team not found')

      const member = await TeamMember.query()
        .where('userId', user.id)
        .where('teamId', params.id)
        .first()

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return response.forbidden('Only admins can invite members')
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

      const existingMember = await TeamMember.query()
        .where('teamId', params.id)
        .where('userId', invitedUser.id)
        .first()

      if (existingMember) {
        return response.badRequest('User is already a member of this team')
      }

      const existingInvitation = await TeamInvitation.query()
        .where('teamId', params.id)
        .where('invitedUserEmail', invitedUserEmail)
        .where('status', 'pending')
        .first()

      if (existingInvitation) {
        return response.badRequest('User has already been invited to this team')
      }

      const token = randomBytes(32).toString('hex')
      const invitation = await TeamInvitation.create({
        teamId: team.id,
        invitedByUserId: user.id,
        invitedUserId: invitedUser.id,
        invitedUserEmail: invitedUserEmail,
        token,
        status: 'pending',
      })

      const notification = await Notification.create({
        userId: invitedUser.id,
        type: 'team_invitation',
        title: 'Team Invitation',
        message: `${user.fullName || user.email} invited you to join ${team.name}`,
        link: `/team/${team.id}/invite/${token}`,
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

    const invitation = await TeamInvitation.findBy('token', token)
    if (!invitation) return response.notFound('Invitation not found')

    if (invitation.status !== 'pending') {
      return response.badRequest('Invitation has already been used or cancelled')
    }

    const userIdentifier = user.email || `user_${user.id}`
    if (invitation.invitedUserEmail !== userIdentifier) {
      return response.forbidden('This invitation is not for you')
    }

    const team = await Team.query()
      .where('id', invitation.teamId)
      .preload('members', (query) => {
        query.preload('user')
      })
      .first()
    
    if (!team) return response.notFound('Team not found')

    const newMember = await TeamMember.firstOrCreate(
      {
        userId: user.id,
        teamId: team.id,
      },
      {
        role: 'member',
      }
    )

    await newMember.load('user')

    invitation.status = 'accepted'
    await invitation.save()

    await Notification.query()
      .where('userId', user.id)
      .where('link', `/team/${team.id}/invite/${token}`)
      .delete()

    for (const member of team.members) {
      const socketId = userSockets.get(member.userId)
      if (socketId) {
        io.to(socketId).emit('team-member-joined', {
          teamId: team.id,
          member: newMember.serialize(),
          invitationId: invitation.id,
        })
      }
    }

    return { success: true }
  }

  async declineInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const { token } = params

    const invitation = await TeamInvitation.findBy('token', token)
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
      .where('link', `/team/${invitation.teamId}/invite/${token}`)
      .delete()

    return { success: true }
  }

  async getInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const { token } = params

    try {
      const invitation = await TeamInvitation.query()
        .where('token', token)
        .preload('team')
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
        teamName: invitation.team.name,
        invitedBy: invitation.invitedBy.fullName || invitation.invitedBy.email,
        status: invitation.status,
      }
    } catch (error) {
      console.error('Error in getInvitation:', error)
      return response.internalServerError({ message: error.message || 'Failed to load invitation' })
    }
  }

  async join({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const team = await Team.find(params.id)

    if (!team) return response.notFound()

    await TeamMember.firstOrCreate(
      {
        userId: user.id,
        teamId: team.id,
      },
      {
        role: 'member',
      }
    )

    return team
  }

  async removeMember({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const memberId = params.memberId

    const team = await Team.find(params.id)
    if (!team) return response.notFound()

    const currentMember = await TeamMember.query()
      .where('userId', user.id)
      .where('teamId', params.id)
      .first()

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return response.forbidden('Only admins can remove members')
    }

    const memberToRemove = await TeamMember.query()
      .where('id', memberId)
      .where('teamId', params.id)
      .first()

    if (!memberToRemove) return response.notFound('Member not found')

    if (memberToRemove.userId === user.id) {
      return response.badRequest('Cannot remove yourself. Use leave endpoint instead.')
    }

    await memberToRemove.delete()

    const socketId = userSockets.get(memberToRemove.userId)
    if (socketId) {
      io.to(socketId).emit('removed-from-team', { teamId: params.id })
    }

    await broadcastTeamOnlineMembers()

    return response.ok({ success: true })
  }

  async cancelInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const invitationId = params.invitationId

    const team = await Team.find(params.id)
    if (!team) return response.notFound()

    const currentMember = await TeamMember.query()
      .where('userId', user.id)
      .where('teamId', params.id)
      .first()

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return response.forbidden('Only admins can cancel invitations')
    }

    const invitation = await TeamInvitation.query()
      .where('id', invitationId)
      .where('teamId', params.id)
      .first()

    if (!invitation) return response.notFound('Invitation not found')

    const invitedUser = await User.findBy('email', invitation.invitedUserEmail)

    const notifications = await Notification.query()
      .where('link', `/team/${team.id}/invite/${invitation.token}`)

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

