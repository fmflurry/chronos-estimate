import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'email'
        ) THEN
          ALTER TABLE users ADD COLUMN email VARCHAR(254);
          CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;
        END IF;
      END $$;
    `)
  }

  async down() {
    await this.db.rawQuery(`
      ALTER TABLE users DROP COLUMN IF EXISTS email;
    `)
  }
}
