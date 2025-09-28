import { useCollabProjectStore } from '#/store/collabProjectStore'
import { usePromptStore } from '#/store/promptStore'
import modules from '../modules'
import Wire from '../wire'
import Node from '../node'
import { updateCanvasSet, scheduleUpdate } from '../engine'

export function startCollab(shareId: string | null) {
    const promptStore = usePromptStore()
    const collabProject = useCollabProjectStore()

    const currentProjectId = promptStore.getProjectId
    const collabProjectId = collabProject.getProjectId

    // Determine which project to collaborate on
    const projectIdToUse = (shareId && shareId.trim() !== '') ? shareId : currentProjectId

    console.log('Requested collaboration projectId:', projectIdToUse)

    // Case 1: Already collaborating on this project
    if (collabProject.getEnableCollab && projectIdToUse === collabProjectId) {
        console.log('Already in collaboration mode for this project')
        console.log('Existing WebSocket:', collabProject.getWsConnection)
        console.log('Current collaborators:', collabProject.getCollaborators)
        return
    }

    // Case 2: Collaboration active but different project → disable old one
    if (collabProject.getEnableCollab) {
        collabProject.doEnableCollab(false)

        // leave the old room first by sending a leave message
        collabProject.leaveRoom()
        // set old ws connection to undefined
        collabProject.setWsConnection(undefined)
        // create a new Yjs doc for this project
        collabProject.setNewYjsDoc(undefined) // using undefined to get a new doc
    }

    // Set project ID and enable collaboration
    collabProject.setProjectId(projectIdToUse)
    collabProject.doEnableCollab(true)


    // Create a new WebSocket connection
    try {
        const ws = new WebSocket('ws://localhost:10234') // TODO: move to config/env
        collabProject.setWsConnection(ws)
        console.log('WebSocket connection established')
    } catch (err) {
        console.error('Failed to establish WebSocket connection', err)
        collabProject.doEnableCollab(false)
        collabProject.setWsConnection(undefined)
        return
    }

    // Log current collaborators (empty initially)
    console.log('Current collaborators:', collabProject.getCollaborators)
}


function generateElementId(element: any): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${element.objectType}_${timestamp}_${random}`
}

// Helper function to sync to collab
export function syncToCollab(element) {
    try {
        const collabStore = useCollabProjectStore()
        if (!collabStore.getEnableCollab || element._isRemoteUpdate) {
            return
        }

        const yElements = collabStore.getYElements
        if (!yElements) return

        // Assign ID if missing
        if (!element.id) {
            element.id = generateElementId(element)
        }


        const elementData = {
            id: element.id,
            objectType: element.objectType,
            x: element.x,
            y: element.y,
            label: element.label,
            direction: element.direction,
            labelDirection: element.labelDirection,
            bitWidth: element.bitWidth,
            customData: element.customSave ? element.customSave() : {}
        }

        yElements.set(element.id, elementData)
        console.log('Synced to collab:', element.id)
    } catch (err) {
        console.log('Collab sync skipped:', err.message)
    }
}



export function deleteFromCollab(elementId) {
    try {
        const collabStore = useCollabProjectStore()
        if (!collabStore.getEnableCollab) return

        const yElements = collabStore.getYElements
        if (!yElements) return

        yElements.delete(elementId)
        console.log('Deleted from collab:', elementId)
    } catch (err) {
        console.log('Collab delete skipped:', err.message)
    }
}

// 5. Integration functions - call these in your existing code
export function startMinimalCollab() {

    // Sync existing elements
    if (typeof globalScope !== 'undefined' && globalScope && globalScope.allElements) {
        globalScope.allElements.forEach(element => {
            syncElementToYjs(element)
        })
        console.log('Synced existing elements:', globalScope.allElements.length)
    }

    syncExistingConnections()    
}


// Yjs to local changes
export function applyRemoteElementChange(elementData: any) {
    // Find existing element
    const existingElement = findElementById(elementData.id)

    if (existingElement) {
        // Update existing element
        updateRemoteElement(existingElement, elementData)
    } else {
        // Create new element
        createRemoteElement(elementData)
    }
}

function findElementById(id: string) {
    // Search through all element types in scope
    for (const [elementType, elements] of Object.entries(globalScope)) {
        if (Array.isArray(elements)) {
            const found = elements.find(el => el.id === id)
            if (found) return found
        }
    }
    return null
}

function createRemoteElement(elementData: any) {
    // Mark as remote to prevent sync loops
    const tempRemoteFlag = true

    // Create element using the factory
    const element = new modules[elementData.objectType]()
    element._isRemoteUpdate = true
    element.id = elementData.id

    // Apply properties
    element.x = elementData.x
    element.y = elementData.y
    element.label = elementData.label || ''
    element.direction = elementData.direction
    element.labelDirection = elementData.labelDirection
    element.bitWidth = elementData.bitWidth

    // Apply custom data if available
    if (elementData.customData && element.customLoad) {
        element.customLoad(elementData.customData)
    }

    console.log('Created remote element:', element.id)
}

function updateRemoteElement(element: any, elementData: any) {
    // Prevent sync loops
    element._isRemoteUpdate = true

    // Update properties
    element.x = elementData.x
    element.y = elementData.y
    element.label = elementData.label || ''
    element.direction = elementData.direction
    element.labelDirection = elementData.labelDirection
    element.newElement = false  // Mark as not new

    // Clear flag after update
    setTimeout(() => {
        element._isRemoteUpdate = false
    }, 0)

    console.log('Updated remote element:', element.id)
}

export function deleteRemoteElement(elementId: string) {
    const element = findElementById(elementId)
    if (element) {
        element._isRemoteUpdate = true
        element.delete()
        console.log('Deleted remote element:', elementId)
    } else {
        console.log('Remote element to delete not found:', elementId)
    }
}


// Handle Nodes - required for Wires
export function createRemoteConnection(connectionData: any) {
    console.log('Creating remote connection:', connectionData)
    
    // Find nodes by their IDs
    const node1 = findNodeById(connectionData.node1Id)
    const node2 = findNodeById(connectionData.node2Id)
    
    if (!node1 || !node2) {
        console.log('Nodes not found for connection:', connectionData)
        // Retry after delay (nodes might not be created yet)
        setTimeout(() => createRemoteConnection(connectionData), 100)
        return
    }
    
    // Check if connection already exists
    if (node1.connections.includes(node2)) {
        console.log('Connection already exists, skipping')
        return
    }
    
    // Create connection (mark as remote to prevent sync loop)
    node1._isRemoteUpdate = true
    node2._isRemoteUpdate = true
    
    node1.connections.push(node2)
    node2.connections.push(node1)
    
    // Create visual wire
    const wire = new Wire(node1, node2, node1.scope)
    wire._isRemoteUpdate = true
    
    // Force canvas update to draw the wire
    scheduleUpdate()
    updateCanvasSet(true)

    // Clear remote flags
    setTimeout(() => {
        node1._isRemoteUpdate = false
        node2._isRemoteUpdate = false
        wire._isRemoteUpdate = false
    }, 0)
    
    console.log('Created remote connection between nodes:', node1.id, node2.id)

}

export function deleteRemoteConnection(connectionId: string) {
    console.log('Deleting remote connection:', connectionId)
    
    const [node1Id, node2Id] = connectionId.split('_to_')
    const node1 = findNodeById(node1Id)
    const node2 = findNodeById(node2Id)
    
    if (node1 && node2) {
        node1._isRemoteUpdate = true
        node2._isRemoteUpdate = true
        
        // Remove from connections arrays
        node1.connections = node1.connections.filter(n => n !== node2)
        node2.connections = node2.connections.filter(n => n !== node1)
        
        // Remove wire
        const wire = node1.scope.wires.find(w => 
            (w.node1 === node1 && w.node2 === node2) || 
            (w.node1 === node2 && w.node2 === node1)
        )
        if (wire) {
            wire._isRemoteUpdate = true
            wire.scope.wires = wire.scope.wires.filter(x => x !== wire)
            wire.delete()
            scheduleUpdate() // Force visual update
        }
        
        console.log('Deleted remote connection')
    }
}

export function findNodeById(nodeId: string): Node | null {
    // Search through all nodes in scope
    return globalScope.allNodes?.find(node => node.id === nodeId) || null
}


function syncExistingConnections() {
    const processedPairs = new Set()
    
    globalScope.allNodes?.forEach(node => {
        node.connections.forEach(connectedNode => {
            const connectionId = generateConnectionId(node, connectedNode)
            if (!processedPairs.has(connectionId)) {
                processedPairs.add(connectionId)
                syncNodeConnectionToCollab(node, connectedNode)
            }
        })
    })
    console.log('Synced existing connections:', processedPairs.size)
}

// Sync node connections
export function syncNodeConnectionToCollab(node1: Node, node2: Node) {
    const collabStore = useCollabProjectStore()
    if (!collabStore.getEnableCollab) return
    
    const yConnections = collabStore.getYNodes
    
    const connectionId = generateConnectionId(node1, node2)
    const connectionData = {
        id: connectionId,
        node1Id: node1.id,
        node2Id: node2.id,
        timestamp: Date.now()
    }
    
    yConnections.set(connectionId, connectionData)
    console.log('Synced node connection:', connectionId)
}

export function deleteNodeConnectionFromCollab(node1: Node, node2: Node) {
    const collabStore = useCollabProjectStore()
    if (!collabStore.getEnableCollab) return
    
    const yConnections = collabStore.getYNodes
    const connectionId = generateConnectionId(node1, node2)
    
    yConnections.delete(connectionId)
    console.log('Deleted node connection:', connectionId)
}

function generateConnectionId(node1: Node, node2: Node): string {
    // Sort IDs to ensure consistent connection ID regardless of direction
    return [node1.id, node2.id].sort().join('_to_')
}