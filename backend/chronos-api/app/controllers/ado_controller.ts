import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'

export default class AdoController {
  private createAuthHeader(pat: string) {
    return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
  }

  async search({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { query } = request.qs()

    if (!user.adoPat || !user.adoOrg || !user.adoProject) {
      return response.badRequest('ADO configuration missing')
    }

    const wiql = `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.Title] CONTAINS '${query}' AND [System.TeamProject] = '${user.adoProject}'`

    try {
      const pat = user.adoPat
      const authHeader = this.createAuthHeader(pat)

      const result = await axios.post(
        `https://dev.azure.com/${user.adoOrg}/${user.adoProject}/_apis/wit/wiql?api-version=6.0`,
        { query: wiql },
        { headers: { Authorization: authHeader } }
      )

      const workItems = result.data.workItems

      if (workItems.length === 0) return []

      const ids = workItems
        .slice(0, 10)
        .map((wi: any) => wi.id)
        .join(',')
      const details = await axios.get(
        `https://dev.azure.com/${user.adoOrg}/${user.adoProject}/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.Title&api-version=6.0`,
        { headers: { Authorization: authHeader } }
      )

      return details.data.value
    } catch (error) {
      console.error(error)
      return response.internalServerError('ADO API Error')
    }
  }

  async organizations({ auth, response }: HttpContext) {
    const user = auth.user!

    if (!user.adoPat) {
      return response.badRequest('ADO PAT missing')
    }

    try {
      const pat = user.adoPat
      const authHeader = this.createAuthHeader(pat)

      const profile = await axios.get(
        'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0',
        { headers: { Authorization: authHeader } }
      )

      const memberId = profile.data.id

      const accounts = await axios.get(
        `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${memberId}&api-version=6.0`,
        { headers: { Authorization: authHeader } }
      )

      return accounts.data.value.map((account: any) => account.accountName)
    } catch (error: any) {
      console.error(error)
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        return response.badRequest('Invalid ADO PAT or insufficient permissions')
      }
      return response.internalServerError('ADO API Error')
    }
  }

  async projects({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { org } = request.qs()
    const organization = org || user.adoOrg

    if (!user.adoPat || !organization) {
      return response.badRequest('ADO organization or PAT missing')
    }

    try {
      const pat = user.adoPat
      const authHeader = this.createAuthHeader(pat)

      const projects = await axios.get(
        `https://dev.azure.com/${organization}/_apis/projects?api-version=6.0`,
        { headers: { Authorization: authHeader } }
      )

      return projects.data.value.map((project: any) => project.name)
    } catch (error: any) {
      console.error(error)
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        return response.badRequest('Invalid ADO PAT or insufficient permissions')
      }
      return response.internalServerError('ADO API Error')
    }
  }
}
