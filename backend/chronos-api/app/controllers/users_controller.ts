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
    if (adoPat) user.adoPat = adoPat
    if (adoOrg) user.adoOrg = adoOrg
    if (adoProject) user.adoProject = adoProject

    await user.save()
    return response.ok({ success: true })
  }
}
