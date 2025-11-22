import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    const hasColumn = await this.db
      .rawQuery(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'email'`
      )
      .then((result) => result.rows.length > 0)
      .catch(() => false)

    if (!hasColumn) {
      await this.db.rawQuery(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS email VARCHAR(254) UNIQUE
      `)
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('email')
    })
  }
}
