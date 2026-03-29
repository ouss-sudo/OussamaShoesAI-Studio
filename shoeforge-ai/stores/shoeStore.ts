import { create } from 'zustand'

export type TextureType = 'leather' | 'fabric' | 'suede' | 'glossy' | 'matte' | 'custom'

export interface MaterialConfig {
  color: string
  roughness: number
  metalness: number
  textureType: TextureType
  textureUrl?: string
}

export interface HistoryEntry {
  part: string
  material: MaterialConfig
}

export type ConversionStep =
  | 'idle'
  | 'loading'
  | 'analyzing'
  | 'extracting'
  | 'building'
  | 'texturing'
  | 'done'
  | 'error'

export type SelectionMode = 'wand' | 'magic_eraser' | 'brush' | 'eraser' | 'lasso' | 'lasso_eraser' | 'circle' | 'rect' | 'line' | 'sticker' | 'splatter'
export type PaintMode = 'realistic' | 'opaque'

interface ShoeStore {
  // 3D Model
  modelUrl: string
  setModelUrl: (url: string) => void

  // PNG → 3D conversion state
  imageTexture: string | null
  imageColors: string[]
  imageShape: { top: [number, number][], bottom: [number, number][], aspect: number } | null
  conversionStep: ConversionStep
  conversionProgress: number
  conversionError: string | null
  setImageTexture: (url: string | null) => void
  setImageColors: (colors: string[]) => void
  setImageShape: (shape: { top: [number, number][], bottom: [number, number][], aspect: number } | null) => void
  setConversionStep: (step: ConversionStep, progress?: number) => void
  setConversionError: (msg: string) => void

  // Material editing
  materials: Record<string, MaterialConfig>
  selectedPart: string | null
  setMaterial: (part: string, mat: Partial<MaterialConfig>) => void
  setSelectedPart: (part: string | null) => void

  //...
  history: HistoryEntry[]
  historyIndex: number
  undo: () => void
  redo: () => void

  // UI state
  activeTab: 'style' | 'ai' | 'tools'
  setActiveTab: (tab: 'style' | 'ai' | 'tools') => void

  // Tool state (shared between ToolsPanel + ShoeViewer3D)
  selectionMode: SelectionMode
  setSelectionMode: (mode: SelectionMode) => void
  paintMode: PaintMode
  setPaintMode: (mode: PaintMode) => void
  activeColor: string
  setActiveColor: (color: string) => void
  stickerImg: HTMLImageElement | null
  setStickerImg: (img: HTMLImageElement | null) => void
  stickerScale: number
  setStickerScale: (s: number) => void
  stickerRotation: number
  setStickerRotation: (r: number) => void

  // Floating Actions
  hasActiveSelection: boolean
  setHasActiveSelection: (v: boolean) => void
  commitCurrentTint: (() => void) | null
  setCommitCurrentTint: (fn: (() => void) | null) => void
  resetAllColors: (() => void) | null
  setResetAllColors: (fn: (() => void) | null) => void
  restoreZone: (() => void) | null
  setRestoreZone: (fn: (() => void) | null) => void

  // Reset
  resetDesign: () => void
}


const DEFAULT_MODEL = 'procedural'

const defaultMaterials: Record<string, MaterialConfig> = {
  upper:  { color: '#e2e8f0', roughness: 0.75, metalness: 0.0, textureType: 'leather' },
  sole:   { color: '#1e293b', roughness: 0.9,  metalness: 0.0, textureType: 'matte'   },
  laces:  { color: '#ffffff', roughness: 0.7,  metalness: 0.0, textureType: 'fabric'  },
  toecap: { color: '#e2e8f0', roughness: 0.6,  metalness: 0.1, textureType: 'leather' },
  tongue: { color: '#cbd5e1', roughness: 0.8,  metalness: 0.0, textureType: 'fabric'  },
}

export const useShoeStore = create<ShoeStore>((set, get) => ({
  modelUrl: DEFAULT_MODEL,
  setModelUrl: (url) => set({ modelUrl: url }),

  imageTexture: null,
  imageColors: [],
  imageShape: null,
  conversionStep: 'idle',
  conversionProgress: 0,
  conversionError: null,
  setImageTexture: (url) => set({ imageTexture: url }),
  setImageColors: (colors) => set({ imageColors: colors }),
  setImageShape: (shape) => set({ imageShape: shape }),
  setConversionStep: (step, progress = 0) =>
    set({ conversionStep: step, conversionProgress: progress }),
  setConversionError: (msg) =>
    set({ conversionStep: 'error', conversionError: msg }),

  materials: { ...defaultMaterials },
  selectedPart: 'upper',

  setMaterial: (part, mat) => {
    const state = get()
    const oldMaterial = state.materials[part]
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({ part, material: { ...oldMaterial } })
    set({
      materials: { ...state.materials, [part]: { ...state.materials[part], ...mat } },
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  setSelectedPart: (part) => set({ selectedPart: part }),

  history: [],
  historyIndex: -1,

  undo: () => {
    const { history, historyIndex, materials } = get()
    if (historyIndex < 0) return
    const entry = history[historyIndex]
    set({ materials: { ...materials, [entry.part]: entry.material }, historyIndex: historyIndex - 1 })
  },

  redo: () => {
    const { history, historyIndex, materials } = get()
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    set({ materials: { ...materials, [entry.part]: entry.material }, historyIndex: historyIndex + 1 })
  },

  activeTab: 'style',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Tool state defaults
  selectionMode: 'wand' as SelectionMode,
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  paintMode: 'realistic' as PaintMode,
  setPaintMode: (mode) => set({ paintMode: mode }),
  activeColor: '#ff0000',
  setActiveColor: (color) => set({ activeColor: color }),
  stickerImg: null,
  setStickerImg: (img) => set({ stickerImg: img }),
  stickerScale: 0.5,
  setStickerScale: (s) => set({ stickerScale: s }),
  stickerRotation: 0,
  setStickerRotation: (r) => set({ stickerRotation: r }),

  hasActiveSelection: false,
  setHasActiveSelection: (v) => set({ hasActiveSelection: v }),
  commitCurrentTint: null,
  setCommitCurrentTint: (fn) => set({ commitCurrentTint: fn }),
  resetAllColors: null,
  setResetAllColors: (fn) => set({ resetAllColors: fn }),
  restoreZone: null,
  setRestoreZone: (fn) => set({ restoreZone: fn }),

  resetDesign: () =>
    set({
      materials: { ...defaultMaterials },
      selectedPart: 'upper',
      history: [],
      historyIndex: -1,
      imageTexture: null,
      imageColors: [],
      imageShape: null,
      conversionStep: 'idle',
      conversionProgress: 0,
      conversionError: null,
      modelUrl: DEFAULT_MODEL,
      selectionMode: 'wand',
      paintMode: 'realistic',
      stickerImg: null,
      stickerScale: 0.5,
      stickerRotation: 0,
      hasActiveSelection: false,
      commitCurrentTint: null,
      resetAllColors: null,
      restoreZone: null,
    }),
}))

