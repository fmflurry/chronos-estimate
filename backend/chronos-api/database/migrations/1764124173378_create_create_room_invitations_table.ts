import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'room_invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('room_id').unsigned().references('id').inTable('rooms').onDelete('CASCADE')
      table.integer('invited_by_user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('invited_user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').nullable()
      table.string('invited_user_email').notNullable()
      table.string('token').notNullable().unique()
      table.string('status').defaultTo('pending')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}