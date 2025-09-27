import * as http from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import * as Y from 'yjs'

// room state in-memory (could be Redis later)
interface RoomUser {
  ws: WebSocket
  user: { id: number; name: string; avatar: string }
}

const rooms = new Map<string, { doc: Y.Doc; users: RoomUser[] }>()

const server = http.createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  let currentRoom: string | null = null

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString())

    if (data.type === 'join') {
      const { projectId, user } = data
      currentRoom = projectId.toString()

      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, { doc: new Y.Doc(), users: [] })
      }

      const room = rooms.get(currentRoom)!

      // Prevent duplicate users
      if (!room.users.find(u => u.user.id === user.id)) {
        room.users.push({ ws, user })
        console.log(`User ${user.name} joined room ${currentRoom}`)
      } else {
        console.log(`User ${user.name} already in room ${currentRoom}`)
      }

      console.log('Current users in room:', room.users.length)

      // update collaborators and broadcast
      const collaborators = room.users.map(u => u.user)
      console.log('Sending collaborators to client:', collaborators)
      room.users.forEach(({ ws: client }) =>
        client.send(JSON.stringify({ type: 'collaborators', collaborators }))
      )

      // send current Yjs state to the new client
      const update = Y.encodeStateAsUpdate(room.doc)
      ws.send(JSON.stringify({ type: 'init', update }))
    }

    if (data.type === 'sync') {
      const room = rooms.get(currentRoom!)
      if (!room) return

      const update = new Uint8Array(data.update)
      Y.applyUpdate(room.doc, update)

      // rebroadcast to others
      room.users.forEach(({ ws: client }) => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: 'sync', update: Array.from(update) }))
        }
      })
    }
  })

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom)!

      // Remove the user from the room
      room.users = room.users.filter(u => u.ws !== ws)

      // update collaborators and broadcast
      const collaborators = room.users.map(u => u.user)
      room.users.forEach(({ ws: client }) =>
        client.send(JSON.stringify({ type: 'collaborators', collaborators }))
      )
    }
  })
})

server.listen(10234, () => {
  console.log('Server running on ws://localhost:10234')
})
