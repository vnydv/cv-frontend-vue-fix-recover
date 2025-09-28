import { useCollabProjectStore } from '#/store/collabProjectStore'
import { usePromptStore } from '#/store/promptStore'
import modules from '../modules'

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
    }
}