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
            const { projectId, user, update: clientUpdate } = data
            currentRoom = projectId.toString()

            let room = rooms.get(currentRoom)
            if (!room) {
                // Create room with fresh doc
                room = { doc: new Y.Doc(), users: [] }
                rooms.set(currentRoom, room)
            }

            // Only apply client update if server doc has no state
            const docStateVector = Y.encodeStateVector(room.doc)
            if (docStateVector.byteLength === 0 && clientUpdate) {
                Y.applyUpdate(room.doc, new Uint8Array(clientUpdate))
                console.log(`Initialized room ${currentRoom} doc from client ${user.name}`)
            }

            // Add user if not already present
            if (!room.users.find(u => u.user.id === user.id)) {
                room.users.push({ ws, user })
                console.log(`User ${user.name} joined room ${currentRoom}`)
            }

            // broadcast collaborators
            const collaborators = room.users.map(u => u.user)
            room.users.forEach(({ ws: client }) =>
                client.send(JSON.stringify({ type: 'collaborators', collaborators }))
            )

            // send current Yjs state to new client
            const update = Y.encodeStateAsUpdate(room.doc)
            ws.send(JSON.stringify({ type: 'init', update: Array.from(update) }))
        }

        // leave: remove user but **do not delete room**
        if (data.type === 'leave') {
            const { projectId, userId } = data
            const room = rooms.get(projectId)
            if (room) {
                room.users = room.users.filter(u => u.user.id !== userId)
                const collaborators = room.users.map(u => u.user)
                room.users.forEach(({ ws: client }) =>
                    client.send(JSON.stringify({ type: 'collaborators', collaborators }))
                )
                console.log(`User ${userId} left room ${projectId}`)
                // no deletion of room here
            }
        }

        if (data.type === 'sync') {
            const room = rooms.get(currentRoom!)
            if (!room) return

            const update = new Uint8Array(data.update)
            Y.applyUpdate(room.doc, update)

            // sender user
            const sender = room.users.find(u => u.ws === ws)?.user

            // console.log(`Received update from user ${sender?.name} in room ${currentRoom}`)

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
