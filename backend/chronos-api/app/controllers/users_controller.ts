import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class UsersController {
  async updateSettings({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { fullName, adoPat, adoOrg, adoProject } = request.only([
      'fullName',
      'adoPat',
      'adoOrg',
      'adoProject',
    ])

    if (fullName) user.fullName = fullName
    if (adoPat !== undefined) {
      const trimmedPat = adoPat.trim()
      user.adoPat = trimmedPat || null
    }
    if (adoOrg !== undefined) user.adoOrg = adoOrg?.trim() || null
    if (adoProject !== undefined) user.adoProject = adoProject?.trim() || null

    await user.save()
    return response.ok({ success: true })
  }

  async search({ request }: HttpContext) {
    const { q } = request.only(['q'])
    
    if (!q || q.length < 2) {
      return []
    }

    const searchTerm = `%${q}%`
    const users = await User.query()
      .where((query) => {
        query
          .whereILike('email', searchTerm)
          .orWhereILike('fullName', searchTerm)
      })
      .limit(20)
      .select('id', 'email', 'fullName', 'avatarUrl')

    return users
  }
}
