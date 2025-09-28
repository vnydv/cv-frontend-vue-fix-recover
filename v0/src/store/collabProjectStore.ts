// collab store.ts
// store the collaborators data

import { defineStore } from 'pinia'
import * as Y from 'yjs'
import { generateSaveData } from '../simulator/src/data/save'
import { startMinimalCollab } from '../simulator/src/data/collabProject'
import { constructNodeConnections, replace } from '../simulator/src/node'
import { loadModule } from '../simulator/src/data/load'
import { usePromptStore } from './promptStore'
import { start } from '@popperjs/core'


interface collabStoreType {
    enableCollab: boolean
    userId: number
    projectId?: string
    collaborators: Array<{ id: number; name: string; avatar: string }>
    yjsDoc?: any
    yjsMap?: any
    wsConnection?: any
    yElements?: any
    yNodes?: any
}

// Flow
// 1. User clicks on "Start Collaboration" button
// 2. the collabProjectStore's doEnableCollab action is called with true
// 3. The collabProjectStore's enableCollab state is set to true
// 4. The collabProjectStore's projectId state is set to the current project's id
// 5. The collabProjectStore's collaborators state is set to an empty array
// 6. The collabProjectStore's yjsDoc state is set to a new Y.Doc()
// 7. The setCollaborator is called with current user's data

// on the server side
// 1. The server receives the yjsDoc from the client
// 2. The server creates a new room for the project if it doesn't exist
// 3. The server adds the user to the room
// 4. The server sends the yjsDoc to all users in the room
// 5. The server listens for changes to the yjsDoc and broadcasts them to all users in the room

// on the client side
// 0. The client connects to the server via setCollaborator as soon as the user clicks on "Start Collaboration" button
// 1. if the user is not the first one to join, the server sends the current yjsDoc to the client
// 2. the client initializes the project with the yjsDoc
// 3. The client listens for changes to the yjsDoc and updates the project accordingly
// 4. The client sends changes to the yjsDoc to the server

// Note: The above flow is a high-level overview and may not include all the details and edge cases involved in implementing real-time collaboration using Yjs and WebRTC.

// Yjs doc schema
// 1. A Y.Map to store the project data (circuits, components, wires, etc.)
// 2. A Y.Array to store the list of collaborators
// 3. A Y.Text to store the project name and description
// Note: The above schema is a high-level overview and may not include all the 
// details and edge cases involved in implementing real-time collaboration using Yjs


export const useCollabProjectStore = defineStore({
    id: 'collabStore',
    state: (): collabStoreType => ({
        enableCollab: false,
        // in real app, this data should come from the auth system
        // here we just use dummy data
        // get a random id between 1 and 10000                
        userId: Math.floor(Math.random() * 10000), // random user id for demo purpose
        projectId: undefined,
        collaborators: [],
        yjsDoc: undefined,
        yjsMap: undefined,
        yElements: undefined,
        yNodes: undefined,
        wsConnection: undefined

    }),
    actions: {
        doEnableCollab(show: boolean): void {
            this.enableCollab = show
        },
        setProjectId(projectId: string): void {
            this.projectId = projectId
        },
        // data is sent to the server when user connects
        updateCollaborators(collaborators: Array<{ id: number; name: string; avatar: string }>): void {
            this.collaborators = collaborators
        },
        setNewYjsDoc(): void {
            if (!this.yjsDoc) {
                this.yjsDoc = new Y.Doc()
                this.yjsMap = this.yjsDoc.getMap('projectData')

                // the required CircuitElements without connections
                // necessary to render the elements on the canvas
                this.yElements = this.yjsDoc.getMap('elements')  // stores CircuitElements

                // the Node connections between elements for wires etc.
                // wires can be derived from this on the client sides
                this.yNodes = this.yjsDoc.getMap('nodes')        // stores Node connections

                this.yjsDoc.on('update', (update: Uint8Array) => {
                    const ws = this.wsConnection
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'sync',
                            projectId: this.projectId,
                            update: Array.from(update)
                        }))
                        console.log('Sent Yjs update to server')
                    }
                })

                this.getYjsMap.observe((event: any) => {
                    const promptStore = usePromptStore()
                    event.changes.keys.forEach((change: any, key: string) => {
                        if (key === 'projectName') {
                            const newName = this.getYjsMap.get('projectName')
                            console.log('projectName changed in Yjs map:', newName)
                            promptStore.setProjectName(newName || 'Untitled')
                        }
                    })
                })

            }
        },

        leaveRoom(): void {
            const ws = this.wsConnection
            if (ws && ws.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'leave',
                    projectId: this.projectId,
                    userId: this.userId
                }
                ws.send(JSON.stringify(message))
                console.log('Sent leave for userId:', this.userId)
            } else {
                console.warn('WebSocket is not connected. Cannot send leave message.')
            }
        },
        joinRoom(user: { id: number; name: string; avatar: string }): void {
            const ws = this.wsConnection
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Only send local update if the doc has content and server may be empty
                const update = this.yjsDoc && Y.encodeStateVector(this.yjsDoc).byteLength === 0
                    ? Array.from(Y.encodeStateAsUpdate(this.yjsDoc))
                    : undefined

                const message: any = { type: 'join', projectId: this.projectId, user }
                if (update) message.update = update

                ws.send(JSON.stringify(message))
                console.log('Sent join for user:', user, 'with update:', update ? 'yes' : 'no')
            }
        }
        ,

        setWsConnection(ws: any): void {
            if (!ws) {
                console.error('WebSocket instance is undefined')
                this.wsConnection = undefined
                return
            }

            if (this.wsConnection) return // already connected
            this.wsConnection = ws

            ws.onmessage = (event: MessageEvent) => {
                const data = JSON.parse(event.data)

                if (data.type === 'collaborators') {
                    this.updateCollaborators(data.collaborators)
                }

                if (data.type === 'init') {
                    const update = new Uint8Array(data.update)
                    // Apply server update first
                    Y.applyUpdate(this.yjsDoc, update)
                    console.log('Merged initial Yjs document state from server')
                }

                if (data.type === 'sync') {
                    const update = new Uint8Array(data.update)
                    Y.applyUpdate(this.yjsDoc, update)
                    console.log('Applied Yjs update from server')
                    // print the update keys
                    console.log('Update keys:', Array.from(update))
                }
            }

            ws.onopen = () => {
                console.log('WS connected')
                console.log('Enabling collaboration for projectId:', this.projectId)
                this.doEnableCollab(true)

                startMinimalCollab()

                // Send join message with doc update
                this.joinRoom({ id: this.userId, name: `User${this.userId}`, avatar: 'dummy.png' })
            }

            ws.onclose = () => {
                console.log('WS closed')
                this.doEnableCollab(false)
                this.projectId = undefined
                this.collaborators = []
                this.wsConnection = undefined

                console.log('Collaboration disabled/Ended')
            }
        }
    },
    getters: {
        getEnableCollab(): boolean {
            return this.enableCollab
        },
        getProjectId(): string | undefined {
            return this.projectId
        },
        // may need to send events to update the collaborators when
        // a new user joins or leaves for now just check every few seconds
        // the server will send the collaborators data
        getCollaborators(): Array<{ id: number; name: string; avatar: string }> {
            return this.collaborators
        },

        getYjsDoc(): any {
            return this.yjsDoc
        },
        getWsConnection(): any {
            return this.wsConnection
        },
        getYjsMap(): any {
            if (!this.yjsMap && this.getYjsDoc) {
                // initialize the Y.Map for project data if not already done
                this.yjsMap = this.yjsDoc.getMap('projectData')
            }

            return this.yjsMap
        },
        getYElements(): any {
            if (!this.yElements && this.getYjsDoc) {
                this.yElements = this.yjsDoc.getMap('elements')
            }
            return this.yElements
        },
        getYNodes(): any {
            if (!this.yNodes && this.getYjsDoc) {
                this.yNodes = this.yjsDoc.getMap('nodes')
            }
            return this.yNodes
        },
    },
})
