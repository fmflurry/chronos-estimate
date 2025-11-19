import { Server, Socket } from 'socket.io'
import server from '@adonisjs/core/services/server'
import app from '@adonisjs/core/services/app'

let io: Server
const roomVotes = new Map<string, Map<string, string>>()

app.ready(async () => {
  io = new Server(server.getNodeServer(), {
    cors: {
      origin: 'http://localhost:4200',
      credentials: true,
    },
  })

  io.on('connection', (socket: Socket) => {
    console.log('New connection', socket.id)

    socket.on('join-room', (roomId: string) => {
      socket.join(`room:${roomId}`)
      console.log(`Socket ${socket.id} joined room ${roomId}`)
      io.to(`room:${roomId}`).emit('participant-joined', { id: socket.id })
    })

    socket.on('start-analysis', ({ roomId, workItem }: { roomId: string; workItem: unknown }) => {
      io.to(`room:${roomId}`).emit('state-change', { state: 'analysis', workItem })
    })

    socket.on('start-voting', ({ roomId }: { roomId: string }) => {
      if (!roomVotes.has(roomId)) {
        roomVotes.set(roomId, new Map())
      } else {
        roomVotes.get(roomId)!.clear()
      }
      io.to(`room:${roomId}`).emit('state-change', { state: 'deliberation' })
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
      io.to(`room:${roomId}`).emit('votes-revealed', { votes: votesArray })
    })

    socket.on('disconnect', () => {
      console.log('Disconnected', socket.id)
    })
  })
})

export { io }
