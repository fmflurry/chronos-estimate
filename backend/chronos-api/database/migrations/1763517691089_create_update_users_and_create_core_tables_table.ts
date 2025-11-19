import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Update users table
    this.schema.alterTable('users', (table) => {
      table.string('google_id').nullable().unique()
      table.string('avatar_url').nullable()
      table.text('ado_pat').nullable()
      table.string('password').nullable().alter()
    })

    // Create rooms table
    this.schema.createTable('rooms', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // Create room_participants table
    this.schema.createTable('room_participants', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('room_id').unsigned().references('id').inTable('rooms').onDelete('CASCADE')
      table.string('role').defaultTo('estimator')
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'room_id'])
    })

    // Create statistics table
    this.schema.createTable('statistics', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('votes_cast').defaultTo(0)
      table.integer('correct_predictions').defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable('statistics')
    this.schema.dropTable('room_participants')
    this.schema.dropTable('rooms')

    this.schema.alterTable('users', (table) => {
      table.dropColumn('google_id')
      table.dropColumn('avatar_url')
      table.dropColumn('ado_pat')
      table.string('password').notNullable().alter()
    })
  }
}
