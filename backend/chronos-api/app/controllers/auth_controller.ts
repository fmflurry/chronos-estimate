import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import env from '#start/env'

export default class AuthController {
  async getGoogleUrl({ ally }: HttpContext) {
    const url = await ally.use('google').redirectUrl()
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

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.ok({ success: true })
  }

  async me({ auth }: HttpContext) {
    await auth.check()
    return auth.user
  }
}
