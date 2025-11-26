import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'team_invitations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('invited_user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('invited_user_id')
    })
  }
}
