import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Room from '#models/room'
import User from '#models/user'

export default class RoomInvitation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare roomId: number

  @column()
  declare invitedByUserId: number

  @column()
  declare invitedUserId: number

  @column()
  declare invitedUserEmail: string

  @column()
  declare token: string

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Room)
  declare room: BelongsTo<typeof Room>

  @belongsTo(() => User, {
    foreignKey: 'invitedByUserId',
  })
  declare invitedBy: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'invitedUserId',
  })
  declare invitedUser: BelongsTo<typeof User>
}