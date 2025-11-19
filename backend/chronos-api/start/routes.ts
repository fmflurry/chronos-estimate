/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router
  .group(() => {
    router.get('/google/url', [() => import('#controllers/auth_controller'), 'getGoogleUrl'])
    router.get('/google/callback', [() => import('#controllers/auth_controller'), 'callback'])
    router.post('/logout', [() => import('#controllers/auth_controller'), 'logout'])
    router.get('/me', [() => import('#controllers/auth_controller'), 'me'])
  })
  .prefix('/auth')

router
  .group(() => {
    router.get('/rooms', [() => import('#controllers/rooms_controller'), 'index'])
    router.post('/rooms', [() => import('#controllers/rooms_controller'), 'store'])
    router.get('/rooms/:id', [() => import('#controllers/rooms_controller'), 'show'])
    router.post('/rooms/:id/join', [() => import('#controllers/rooms_controller'), 'join'])

    router.get('/statistics', [() => import('#controllers/statistics_controller'), 'index'])

    router.post('/user/settings', [() => import('#controllers/users_controller'), 'updateSettings'])

    router.get('/ado/search', [() => import('#controllers/ado_controller'), 'search'])
  })
  .prefix('/api')
  .use(middleware.auth())
