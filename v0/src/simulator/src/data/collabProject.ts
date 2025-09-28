import { useCollabProjectStore } from '#/store/collabProjectStore'
import { usePromptStore } from '#/store/promptStore'

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

export function initObservers() {
    const collabProjectStore = useCollabProjectStore()
    // add observe to Yjs map for projectName changes
    collabProjectStore.getYjsMap.observe((event: any) => {
        const promptStore = usePromptStore()
        event.changes.keys.forEach((change: any, key: string) => {
            if (key === 'projectName') {
                const newName = collabProjectStore.getYjsMap.get('projectName')
                console.log('projectName changed in Yjs map:', newName)
                promptStore.setProjectName(newName || 'Untitled')
            }
        })
    })
}