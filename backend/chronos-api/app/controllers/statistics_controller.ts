import type { HttpContext } from '@adonisjs/core/http'
import Statistic from '#models/statistic'

export default class StatisticsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    const stats = await Statistic.query().where('userId', user.id)

    const totalVotes = stats.reduce((acc, curr) => acc + curr.votesCast, 0)
    const correctPredictions = stats.reduce((acc, curr) => acc + curr.correctPredictions, 0)

    return {
      totalVotes,
      correctPredictions,
      accuracy: totalVotes > 0 ? Math.round((correctPredictions / totalVotes) * 100) : 0,
    }
  }
}
