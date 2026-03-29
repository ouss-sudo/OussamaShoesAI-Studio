'use client'
import { useState } from 'react'
import { useShoeStore } from '@/stores/shoeStore'
import type { SelectionMode } from '@/stores/shoeStore'

type CommitFn = (() => void) | null
type RestoreFn = (() => void) | null
type ResetFn = (() => void) | null

export default function ToolsPanel() {
  const {
    selectionMode, setSelectionMode,
    paintMode, setPaintMode,
    stickerImg, setStickerImg,
    stickerScale, setStickerScale,
    stickerRotation, setStickerRotation,
    hasActiveSelection, setHasActiveSelection,
    commitCurrentTint, restoreZone, resetAllColors
  } = useShoeStore()

  const [stickerFileName, setStickerFileName] = useState<string>('')

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setStickerFileName(file.name)
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => setStickerImg(img)
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
      setSelectionMode('sticker')
    }
  }

  const toolBtn = (mode: SelectionMode, label: string, span = 2, color = 'purple') => {
    const isActive = selectionMode === mode
    const activeClass = color === 'pink'
      ? 'bg-pink-600 text-white shadow-lg'
      : color === 'green'
        ? 'bg-green-600 text-white shadow-lg'
        : color === 'blue'
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-purple-600 text-white shadow-lg'
    const inactiveClass = color === 'pink'
      ? 'text-pink-400 hover:text-white hover:bg-white/5'
      : color === 'green'
        ? 'text-green-400 hover:text-white hover:bg-white/5'
        : color === 'blue'
          ? 'text-blue-400 hover:text-white hover:bg-white/5'
          : 'text-gray-400 hover:text-white hover:bg-white/5'

    return (
      <button
        onClick={() => setSelectionMode(mode)}
        className={`col-span-${span} py-2 px-1 rounded-md text-[11px] font-bold transition-all ${isActive ? activeClass : inactiveClass}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="tools-panel">
      {/* Title */}
      <div className="tools-panel-section">
        <div className="section-title">Mode de rendu</div>
        <div className="flex bg-black/40 rounded-lg p-1">
          <button
            onClick={() => setPaintMode('realistic')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${paintMode === 'realistic' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            🎥 Réaliste
          </button>
          <button
            onClick={() => setPaintMode('opaque')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${paintMode === 'opaque' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            🟦 Opaque
          </button>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="tools-panel-section">
        <div className="section-title">Outils de sélection</div>
        <div className="grid grid-cols-4 gap-1.5">
          {toolBtn('wand',          '✨ Magique',    2)}
          {toolBtn('magic_eraser',  '🧨 Gomme IA',   2, 'pink')}
          {toolBtn('lasso',         '✂️ Lasso Add',  2)}
          {toolBtn('lasso_eraser',  '✂️ Gomme Lasso',2, 'pink')}
          {toolBtn('circle',        '⭕ Cercle',      2)}
          {toolBtn('rect',          '⬜ Rect',        1)}
          {toolBtn('line',          '➖ Ligne',       1)}
          {toolBtn('brush',         '🖌️ Peindre',    2)}
          {toolBtn('eraser',        '🧽 Gomme',      2, 'pink')}
          {toolBtn('splatter',      '💧 Éclaboussures', 4, 'green')}
          {toolBtn('sticker',       '🏷️ Motif / Sticker', 4, 'blue')}
        </div>
      </div>

      {/* Sticker sub-panel */}
      {selectionMode === 'sticker' && (
        <div className="tools-panel-section">
          <div className="section-title">Paramètres du motif</div>
          <div className="sticker-upload-area">
            <input
              type="file"
              id="sticker-upload"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={handleStickerUpload}
            />
            <label htmlFor="sticker-upload" className="sticker-upload-btn">
              📁 {stickerFileName || 'Charger une image'}
            </label>
          </div>
          {stickerImg && (
            <>
              <div className="slider-row">
                <div className="slider-label">
                  <span>Taille</span>
                  <span>{stickerScale.toFixed(1)}×</span>
                </div>
                <input type="range" min="0.1" max="3" step="0.1"
                  value={stickerScale}
                  onChange={e => setStickerScale(parseFloat(e.target.value))} />
              </div>
              <div className="slider-row">
                <div className="slider-label">
                  <span>Rotation</span>
                  <span>{stickerRotation}°</span>
                </div>
                <input type="range" min="0" max="360" step="1"
                  value={stickerRotation}
                  onChange={e => setStickerRotation(parseFloat(e.target.value))} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Hint text */}
      <div className="tools-hint">
        {selectionMode === 'wand' && '✨ Cliquez sur une zone pour la sélectionner intelligemment.'}
        {selectionMode === 'magic_eraser' && '🧨 Cliquez pour effacer une zone sélectionnée par IA.'}
        {selectionMode === 'lasso' && '✂️ Dessinez un contour pour sélectionner la forme.'}
        {selectionMode === 'lasso_eraser' && '✂️ Entourez la zone à soustraire de la sélection.'}
        {selectionMode === 'circle' && '⭕ Cliquez + glissez pour un cercle parfait.'}
        {selectionMode === 'rect' && '⬜ Cliquez + glissez pour une zone rectangulaire.'}
        {selectionMode === 'line' && '➖ Tracez une ligne droite de couleur.'}
        {selectionMode === 'brush' && '🖌️ Peignez librement sur la chaussure.'}
        {selectionMode === 'eraser' && '🧽 Effacez les débordements de peinture.'}
        {selectionMode === 'splatter' && '💧 Cliquez pour projeter des éclaboussures de peinture !'}
        {selectionMode === 'sticker' && '🏷️ Survolez la chaussure et cliquez pour tamponner le motif.'}
      </div>

      {/* Action Buttons */}
      <div className="tools-panel-section">
        {hasActiveSelection && commitCurrentTint ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => { commitCurrentTint(); setHasActiveSelection(false) }}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-black px-3 py-2.5 rounded-lg text-[12px] font-bold shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Valider couleur
              </button>
              <button
                onClick={() => setHasActiveSelection(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2.5 rounded-lg text-[12px] font-bold transition-all"
                title="Annuler la sélection"
              >❌</button>
            </div>
            <button
              onClick={() => { restoreZone && restoreZone(); setHasActiveSelection(false) }}
              className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-3 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-2"
            >
              ↩️ Retirer peinture (zone sélectionnée)
            </button>
          </div>
        ) : (
          <button
            onClick={() => resetAllColors && resetAllColors()}
            className="w-full text-[12px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-red-500/10"
          >
            🧹 Supprimer toutes les couleurs
          </button>
        )}
      </div>
    </div>
  )
}
