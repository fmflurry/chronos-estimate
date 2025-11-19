import type { HttpContext } from '@adonisjs/core/http'
import Room from '#models/room'
import RoomParticipant from '#models/room_participant'

export default class RoomsController {
  async index({ auth }: HttpContext) {
    const user = auth.user!
    const rooms = await Room.query()
      .whereHas('participants', (query) => {
        query.where('userId', user.id)
      })
      .orderBy('updatedAt', 'desc')

    return rooms
  }

  async store({ auth, request }: HttpContext) {
    const user = auth.user!
    const { name } = request.only(['name'])

    const room = await Room.create({
      name: name || `${user.fullName}'s Room`,
      ownerId: user.id,
      isActive: true,
    })

    await RoomParticipant.create({
      userId: user.id,
      roomId: room.id,
      role: 'estimator',
    })

    return room
  }

  async show({ params, response }: HttpContext) {
    const room = await Room.find(params.id)

    if (!room) {
      return response.notFound('Room not found')
    }

    return room
  }

  async join({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const room = await Room.find(params.id)

    if (!room) return response.notFound()

    await RoomParticipant.firstOrCreate(
      {
        userId: user.id,
        roomId: room.id,
      },
      {
        role: 'estimator',
      }
    )

    return room
  }
}
