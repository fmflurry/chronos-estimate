import { Server, Socket } from 'socket.io'
import server from '@adonisjs/core/services/server'
import app from '@adonisjs/core/services/app'
import Team from '#models/team'

let io: Server
const roomVotes = new Map<string, Map<string, string>>()
const roomStates = new Map<string, { state: string; workItem: unknown | null }>()
const userSockets = new Map<number, string>()

async function broadcastTeamOnlineMembers() {
  const teams = await Team.query().preload('members')
  
  const teamCounts = teams.map(team => {
    const totalMembers = team.members.length
    const connectedMembers = team.members.filter(member => 
      userSockets.has(member.userId)
    ).length

    return {
      teamId: team.id,
      connectedMembers,
      totalMembers,
    }
  })

  io.emit('team-online-members', teamCounts)
}

app.ready(async () => {
  io = new Server(server.getNodeServer(), {
    cors: {
      origin: 'http://localhost:4200',
      credentials: true,
    },
  })

  io.on('connection', (socket: Socket) => {
    console.log('New connection', socket.id)

    socket.on('authenticate', async (userId: number) => {
      userSockets.set(userId, socket.id)
      console.log(`User ${userId} authenticated with socket ${socket.id}`)
      await broadcastTeamOnlineMembers()
    })

    socket.on('join-room', (roomId: string) => {
      socket.join(`room:${roomId}`)
      console.log(`Socket ${socket.id} joined room ${roomId}`)
      io.to(`room:${roomId}`).emit('participant-joined', { id: socket.id })
      
      const currentState = roomStates.get(roomId)
      if (currentState) {
        socket.emit('state-change', currentState)
      }
    })

    socket.on('start-analysis', ({ roomId, workItem }: { roomId: string; workItem: unknown }) => {
      const stateData = { state: 'analysis', workItem }
      roomStates.set(roomId, stateData)
      io.to(`room:${roomId}`).emit('state-change', stateData)
    })

    socket.on('start-voting', ({ roomId }: { roomId: string }) => {
      if (!roomVotes.has(roomId)) {
        roomVotes.set(roomId, new Map())
      } else {
        roomVotes.get(roomId)!.clear()
      }
      const currentState = roomStates.get(roomId)
      const stateData = { state: 'deliberation', workItem: currentState?.workItem || null }
      roomStates.set(roomId, stateData)
      io.to(`room:${roomId}`).emit('state-change', stateData)
    })

    socket.on('submit-vote', ({ roomId, vote }: { roomId: string; vote: string }) => {
      if (!roomVotes.has(roomId)) {
        roomVotes.set(roomId, new Map())
      }
      roomVotes.get(roomId)!.set(socket.id, vote)
      io.to(`room:${roomId}`).emit('user-voted', { userId: socket.id })
    })

    socket.on('reveal-votes', ({ roomId }: { roomId: string }) => {
      const votes = roomVotes.get(roomId)
      const votesArray = votes
        ? Array.from(votes.entries()).map(([userId, vote]) => ({ userId, vote }))
        : []
      const currentState = roomStates.get(roomId)
      const stateData = { state: 'reveal', workItem: currentState?.workItem || null }
      roomStates.set(roomId, stateData)
      io.to(`room:${roomId}`).emit('votes-revealed', { votes: votesArray })
    })

    socket.on('reset-session', ({ roomId }: { roomId: string }) => {
      if (roomVotes.has(roomId)) {
        roomVotes.get(roomId)!.clear()
      }
      const stateData = { state: 'idle', workItem: null }
      roomStates.set(roomId, stateData)
      io.to(`room:${roomId}`).emit('state-change', stateData)
    })

    socket.on('disconnect', async () => {
      console.log('Disconnected', socket.id)
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId)
          break
        }
      }
      await broadcastTeamOnlineMembers()
    })
  })
})

export { io, userSockets, broadcastTeamOnlineMembers }
