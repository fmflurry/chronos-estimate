import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('team_invitations', (table) => {
      table.increments('id')
      table.integer('team_id').unsigned().references('id').inTable('teams').onDelete('CASCADE')
      table.integer('invited_by_user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('invited_user_email').notNullable()
      table.string('token').notNullable().unique()
      table.string('status').defaultTo('pending')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.schema.createTable('notifications', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('title').notNullable()
      table.text('message').notNullable()
      table.string('link').nullable()
      table.boolean('is_read').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable('notifications')
    this.schema.dropTable('team_invitations')
  }
}

