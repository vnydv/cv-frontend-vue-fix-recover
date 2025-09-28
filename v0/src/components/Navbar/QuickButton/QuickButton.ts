import loginFunction from '#/simulator/src/data'
import { deleteSelected } from '#/simulator/src/ux'
import undo from '#/simulator/src/data/undo'
import redo from '#/simulator/src/data/redo'
import { fullView } from '#/simulator/src/ux'
import { ZoomIn, ZoomOut } from '#/simulator/src/listeners'

export function saveOnline(): void {
    loginFunction.save()
}
export function saveOffline(): void {
    loginFunction.saveOffline()
}
export function deleteSelectedItem(): void {
    deleteSelected()
}
export function createSaveAsImgPrompt(): void {
    loginFunction.createSaveAsImgPrompt()
}
export function zoomToFit(): void {
    globalScope.centerFocus(false)
}
export function undoit(): void {
    undo()
}
export function redoit(): void {
    redo()
}
export function view(): void {
    fullView()
}
export function decrement(): void {
    ZoomOut()
}
export function increment(): void {
    ZoomIn()
}