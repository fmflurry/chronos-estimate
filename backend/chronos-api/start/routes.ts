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
    router.get('/microsoft/url', [() => import('#controllers/auth_controller'), 'getMicrosoftUrl'])
    router.get('/microsoft/callback', [
      () => import('#controllers/auth_controller'),
      'microsoftCallback',
    ])
    router.post('/logout', [() => import('#controllers/auth_controller'), 'logout'])
    router.get('/me', [() => import('#controllers/auth_controller'), 'me'])
  })
  .prefix('/auth')

router
  .group(() => {
    router.get('/rooms', [() => import('#controllers/rooms_controller'), 'index'])
    router.post('/rooms', [() => import('#controllers/rooms_controller'), 'store'])
    router.get('/rooms/:id', [() => import('#controllers/rooms_controller'), 'show'])
    router.put('/rooms/:id', [() => import('#controllers/rooms_controller'), 'update'])
    router.post('/rooms/:id/join', [() => import('#controllers/rooms_controller'), 'join'])
    router.post('/rooms/:id/leave', [() => import('#controllers/rooms_controller'), 'leave'])
    router.post('/rooms/:id/invite', [() => import('#controllers/rooms_controller'), 'invite'])
    router.delete('/rooms/:id/participants/:participantId', [() => import('#controllers/rooms_controller'), 'removeParticipant'])
    router.delete('/rooms/:id/invitations/:invitationId', [() => import('#controllers/rooms_controller'), 'cancelInvitation'])
    router.get('/rooms/:id/invite/:token', [() => import('#controllers/rooms_controller'), 'getInvitation'])
    router.post('/rooms/:id/invite/:token/accept', [() => import('#controllers/rooms_controller'), 'acceptInvitation'])
    router.post('/rooms/:id/invite/:token/decline', [() => import('#controllers/rooms_controller'), 'declineInvitation'])

    router.get('/teams', [() => import('#controllers/teams_controller'), 'index'])
    router.get('/teams/search', [() => import('#controllers/teams_controller'), 'search'])
    router.post('/teams', [() => import('#controllers/teams_controller'), 'store'])
    router.get('/teams/:id', [() => import('#controllers/teams_controller'), 'show'])
    router.put('/teams/:id', [() => import('#controllers/teams_controller'), 'update'])
    router.delete('/teams/:id', [() => import('#controllers/teams_controller'), 'destroy'])
    router.post('/teams/:id/join', [() => import('#controllers/teams_controller'), 'join'])
    router.post('/teams/:id/leave', [() => import('#controllers/teams_controller'), 'leave'])
    router.post('/teams/:id/invite', [() => import('#controllers/teams_controller'), 'invite'])
    router.delete('/teams/:id/members/:memberId', [() => import('#controllers/teams_controller'), 'removeMember'])
    router.delete('/teams/:id/invitations/:invitationId', [() => import('#controllers/teams_controller'), 'cancelInvitation'])
    router.get('/teams/:id/invite/:token', [() => import('#controllers/teams_controller'), 'getInvitation'])
    router.post('/teams/:id/invite/:token/accept', [() => import('#controllers/teams_controller'), 'acceptInvitation'])
    router.post('/teams/:id/invite/:token/decline', [() => import('#controllers/teams_controller'), 'declineInvitation'])

    router.get('/notifications', [() => import('#controllers/notifications_controller'), 'index'])
    router.put('/notifications/:id/read', [() => import('#controllers/notifications_controller'), 'markAsRead'])
    router.put('/notifications/read-all', [() => import('#controllers/notifications_controller'), 'markAllAsRead'])
    router.delete('/notifications/:id', [() => import('#controllers/notifications_controller'), 'destroy'])

    router.get('/statistics', [() => import('#controllers/statistics_controller'), 'index'])

    router.post('/user/settings', [() => import('#controllers/users_controller'), 'updateSettings'])
    router.get('/users/search', [() => import('#controllers/users_controller'), 'search'])

    router.get('/ado/search', [() => import('#controllers/ado_controller'), 'search'])
    router.get('/ado/orgs', [() => import('#controllers/ado_controller'), 'organizations'])
    router.get('/ado/projects', [() => import('#controllers/ado_controller'), 'projects'])
  })
  .prefix('/api')
  .use(middleware.auth())
