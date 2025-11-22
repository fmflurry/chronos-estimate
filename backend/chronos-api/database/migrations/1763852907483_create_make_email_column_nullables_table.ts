import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      ALTER TABLE users 
      ALTER COLUMN email DROP NOT NULL;
    `)
  }

  async down() {
    await this.db.rawQuery(`
      ALTER TABLE users 
      ALTER COLUMN email SET NOT NULL;
    `)
  }
}
