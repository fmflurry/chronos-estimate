import type { HttpContext } from '@adonisjs/core/http'

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
}
