import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import env from '#start/env'

export default class AuthController {
  async getGoogleUrl({ ally }: HttpContext) {
    const url = await ally.use('google').redirectUrl()
    return { url }
  }

  async getMicrosoftUrl({ ally }: HttpContext) {
    const url = await ally.use('microsoft').redirectUrl()
    return { url }
  }

  async callback({ ally, auth, response }: HttpContext) {
    const google = ally.use('google')

    if (google.accessDenied()) {
      return 'Access was denied'
    }

    if (google.stateMisMatch()) {
      return 'Request expired. Retry again'
    }

    if (google.hasError()) {
      return google.getError()
    }

    const googleUser = await google.user()

    const user = await User.firstOrCreate(
      {
        email: googleUser.email,
      },
      {
        fullName: googleUser.name,
        googleId: googleUser.id,
        avatarUrl: googleUser.avatarUrl,
      }
    )

    if (!user.googleId || user.avatarUrl !== googleUser.avatarUrl) {
      user.googleId = googleUser.id
      user.avatarUrl = googleUser.avatarUrl
      await user.save()
    }

    await auth.use('web').login(user)

    const frontend = env.get('FRONTEND_URL')
    return response.redirect(`${frontend}/dashboard`)
  }

  async microsoftCallback({ ally, auth, response }: HttpContext) {
    const microsoft = ally.use('microsoft')

    if (microsoft.accessDenied()) {
      return 'Access was denied'
    }

    if (microsoft.stateMisMatch()) {
      return 'Request expired. Retry again'
    }

    if (microsoft.hasError()) {
      return microsoft.getError()
    }

    const microsoftUser = await microsoft.user()

    let organizations: string[] = []
    if (microsoftUser.email) {
      const emailDomain = microsoftUser.email.split('@')[1]
      if (emailDomain) {
        const domainParts = emailDomain.split('.')
        const orgName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1)
        organizations.push(orgName)
      }
    }

    let user = await User.findBy('microsoft_id', microsoftUser.id)

    if (!user) {
      user = new User()
      if (microsoftUser.email) {
        user.email = microsoftUser.email
      }
      user.fullName = microsoftUser.name
      user.microsoftId = microsoftUser.id
      user.avatarUrl = microsoftUser.avatarUrl
      user.microsoftOrganizations = organizations.length > 0 ? organizations : null
      await user.save()
    } else {
      if (microsoftUser.email && !user.email) {
        user.email = microsoftUser.email
      }
      if (user.avatarUrl !== microsoftUser.avatarUrl) {
        user.avatarUrl = microsoftUser.avatarUrl
      }
      if (user.microsoftId !== microsoftUser.id) {
        user.microsoftId = microsoftUser.id
      }
      if (organizations.length > 0) {
        user.microsoftOrganizations = organizations
      }
      if (user.$isDirty) {
        await user.save()
      }
    }

    await auth.use('web').login(user)

    const frontend = env.get('FRONTEND_URL')
    return response.redirect(`${frontend}/dashboard`)
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.ok({ success: true })
  }

  async me({ auth }: HttpContext) {
    await auth.check()
    return auth.user
  }
}
