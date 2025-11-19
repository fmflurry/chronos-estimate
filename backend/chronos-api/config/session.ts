import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  store: 'cookie',
  stores: {
    cookie: stores.cookie(),
  },
})

export default sessionConfig
