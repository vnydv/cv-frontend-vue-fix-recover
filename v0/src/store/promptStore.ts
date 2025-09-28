import { HTMLContent } from '@tiptap/core'
import { defineStore } from 'pinia'
import { useCollabProjectStore } from '#/store/collabProjectStore'

interface promptStoreType {
    resolvePromise: Function
    // resolvePromise: (value?: string | undefined) => void
    prompt: {
        activate: boolean
        messageText: string
        isPersistent: boolean
        buttonList: Array<{
            text: string
            emitOption: string
        }>
        inputList: Array<{
            text: string
            val: string
            placeholder: string
            id: string
            class: string
            style: string
            type: string
        }>
    }
    confirm: {
        activate: boolean
        messageText: string
        isPersistent: boolean
        buttonList: Array<{
            text: string
            emitOption: string | boolean
        }>
    }
    DeleteCircuit: {
        activate: boolean
        messageText: string
        isPersistent: boolean
        buttonList: Array<{
            text: string
            emitOption: string
        }>
        circuitItem: object
    }
    UpdateProjectDetail: {
        activate: boolean
        projectId: string
        projectName: string
        projectTags: string
        projectType: Readonly<any> | string
        projectDescription: HTMLContent
    }
}

export const usePromptStore = defineStore({
    id: 'promptStore',
    state: (): promptStoreType => ({
        resolvePromise: (): any => {},
        prompt: {
            activate: false,
            messageText: '',
            isPersistent: false,
            buttonList: [],
            inputList: [],
        },
        confirm: {
            activate: false,
            messageText: '',
            isPersistent: false,
            buttonList: [],
        },
        DeleteCircuit: {
            activate: false,
            messageText: '',
            isPersistent: false,
            buttonList: [],
            circuitItem: {},
        },
        UpdateProjectDetail: {
            activate: false,
            projectId: "",
            projectName: "Untitled",
            projectTags: '',
            projectType: 'Public',
            projectDescription: '',
        },
    }),
    actions: {
        // resolvePromise(): any {},
        setProjectName(projectName: string): void {
            if (projectName === this.UpdateProjectDetail.projectName) return // no change
            this.UpdateProjectDetail.projectName = projectName
            const collabProjectStore = useCollabProjectStore()
            const yjsMap = collabProjectStore.getYjsMap
            if (!yjsMap) return
            yjsMap.set('projectName', projectName) // sync to Yjs
        },

        setProjectId(projectId: string): void {
            this.UpdateProjectDetail.projectId = projectId
        },
    },
    getters: {
        getProjectName(): string {
            return this.UpdateProjectDetail.projectName
        },
        getProjectId(): string {
            return this.UpdateProjectDetail.projectId
        },
        getProjectTags(): string {
            return this.UpdateProjectDetail.projectTags
        },
        getProjectType(): Readonly<any> | string {
            return this.UpdateProjectDetail.projectType
        },
        getProjectDescription(): HTMLContent {
            return this.UpdateProjectDetail.projectDescription
        },
    },
})