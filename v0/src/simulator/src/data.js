import { fullView } from './ux'
import { createSubCircuitPrompt } from './subcircuit'
import save from './data/save'
import load from './data/load'
import createSaveAsImgPrompt from './data/saveImage'
import {
    clearProject,
    newProject,
    saveOffline,
    openOffline,
    recoverProject,
} from './data/project'
import { createNewCircuitScope } from './circuit'
import { createCombinationalAnalysisPrompt } from './combinationalAnalysis'
import { colorThemes } from './themer/themer'
import { showTourGuide } from './tutorials'
import { createVerilogCircuit } from './Verilog2CV'
import { generateVerilog } from './verilog'
import { bitConverterDialog } from './utils'
import { keyBinder } from '#/components/DialogBox/CustomShortcut.vue'
import { ExportProject } from '#/components/DialogBox/ExportProject.vue'
import { ImportProject } from '#/components/DialogBox/ImportProject.vue'

const loginFunction = {}
loginFunction.save = save
loginFunction.load = load
loginFunction.createSaveAsImgPrompt = createSaveAsImgPrompt
loginFunction.clearProject = clearProject
loginFunction.newProject = newProject
loginFunction.saveOffline = saveOffline
loginFunction.createOpenLocalPrompt = openOffline
loginFunction.recoverProject = recoverProject
loginFunction.createSubCircuitPrompt = createSubCircuitPrompt
loginFunction.createCombinationalAnalysisPrompt =
    createCombinationalAnalysisPrompt
loginFunction.fullViewOption = fullView
loginFunction.colorThemes = colorThemes
loginFunction.showTourGuide = showTourGuideHelper
loginFunction.newVerilogModule = createVerilogCircuit
loginFunction.generateVerilog = generateVerilog
loginFunction.bitconverter = bitConverterDialog
loginFunction.createNewCircuitScope = createNewCircuit
loginFunction.customShortcut = keyBinder
loginFunction.ExportProject = ExportProject
loginFunction.ImportProject = ImportProject
export default loginFunction

// Hack to restart tour guide
function showTourGuideHelper() {
    setTimeout(() => {
        showTourGuide()
    }, 100)
}

// Hack to call createNewCircuitScope with keyboard shortcut
function createNewCircuit() {
    createNewCircuitScope()
}
