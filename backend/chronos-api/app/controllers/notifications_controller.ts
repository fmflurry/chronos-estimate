import type { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'

export default class NotificationsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    const notifications = await Notification.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .limit(50)

    return notifications
  }

  async markAsRead({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const notification = await Notification.find(params.id)

    if (!notification) return response.notFound()
    if (notification.userId !== user.id) return response.forbidden()

    notification.isRead = true
    await notification.save()

    return notification
  }

  async markAllAsRead({ auth }: HttpContext) {
    const user = auth.user!
    await Notification.query()
      .where('userId', user.id)
      .where('isRead', false)
      .update({ isRead: true })

    return { success: true }
  }
}

