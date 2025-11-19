import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'

export default class AdoController {
  async search({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { query } = request.qs()

    if (!user.adoPat || !user.adoOrg || !user.adoProject) {
      return response.badRequest('ADO configuration missing')
    }

    const wiql = `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.Title] CONTAINS '${query}' AND [System.TeamProject] = '${user.adoProject}'`

    try {
      const pat = user.adoPat
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`

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
}
