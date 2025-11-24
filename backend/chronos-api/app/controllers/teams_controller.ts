import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team'
import TeamMember from '#models/team_member'
import TeamInvitation from '#models/team_invitation'
import Notification from '#models/notification'
import User from '#models/user'
import { randomBytes } from 'node:crypto'

export default class TeamsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    const teams = await Team.query()
      .whereHas('members', (query) => {
        query.where('userId', user.id)
      })
      .orderBy('updatedAt', 'desc')

    return teams
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
          await Notification.create({
            userId: existingUser.id,
            type: 'team_invitation',
            title: 'Team Invitation',
            message: `${user.fullName || user.email} invited you to join ${team.name}`,
            link: `/team/${team.id}/invite/${token}`,
            isRead: false,
          })
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
    const team = await Team.find(params.id)

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

    return response.ok({ success: true })
  }

  async invite({ params, auth, request, response }: HttpContext) {
    const user = auth.user!
    const { email } = request.only(['email'])

    const team = await Team.find(params.id)
    if (!team) return response.notFound()

    const member = await TeamMember.query()
      .where('userId', user.id)
      .where('teamId', params.id)
      .first()

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return response.forbidden('Only admins can invite members')
    }

    const existingMember = await TeamMember.query()
      .where('teamId', params.id)
      .whereHas('user', (query) => {
        query.where('email', email)
      })
      .first()

    if (existingMember) {
      return response.badRequest('User is already a member of this team')
    }

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
      await Notification.create({
        userId: existingUser.id,
        type: 'team_invitation',
        title: 'Team Invitation',
        message: `${user.fullName || user.email} invited you to join ${team.name}`,
        link: `/team/${team.id}/invite/${token}`,
        isRead: false,
      })
    }

    return invitation
  }

  async acceptInvitation({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const { token } = params

    const invitation = await TeamInvitation.findBy('token', token)
    if (!invitation) return response.notFound('Invitation not found')

    if (invitation.status !== 'pending') {
      return response.badRequest('Invitation has already been used or cancelled')
    }

    if (invitation.invitedUserEmail !== user.email) {
      return response.forbidden('This invitation is not for your email address')
    }

    const team = await Team.find(invitation.teamId)
    if (!team) return response.notFound('Team not found')

    await TeamMember.firstOrCreate(
      {
        userId: user.id,
        teamId: team.id,
      },
      {
        role: 'member',
      }
    )

    invitation.status = 'accepted'
    await invitation.save()

    await Notification.query()
      .where('userId', user.id)
      .where('link', `/team/${team.id}/invite/${token}`)
      .update({ isRead: true })

    return team
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
}

