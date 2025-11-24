import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('teams', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.schema.createTable('team_members', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('team_id').unsigned().references('id').inTable('teams').onDelete('CASCADE')
      table.string('role').defaultTo('member')
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'team_id'])
    })
  }

  async down() {
    this.schema.dropTable('team_members')
    this.schema.dropTable('teams')
  }
}

