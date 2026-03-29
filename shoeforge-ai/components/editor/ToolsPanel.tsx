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
    activeColor, setActiveColor,
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

    const iconMatch = label.match(/^([^a-zA-ZÀ-ÿ\s]+)\s*(.*)$/)
    const iconStr = iconMatch ? iconMatch[1] : ''
    const textStr = iconMatch ? iconMatch[2] : label

    return (
      <button
        onClick={() => setSelectionMode(mode)}
        className={`tool-btn col-span-${span} hover-color-${color} ${isActive ? `active-color-${color}` : ''}`}
      >
        <div className="tool-btn-icon">
          {iconStr}
        </div>
        <span className="tool-btn-text">
          {textStr}
        </span>
      </button>
    )
  }

  return (
    <div className="tools-panel">
      {/* Title */}
      <div className="tools-panel-section">
        <div className="section-title text-center" style={{color: 'rgba(255,255,255,0.5)', fontSize: '10px', textTransform:'uppercase', letterSpacing:'2px', marginBottom: '12px'}}>Mode de rendu</div>
        <div className="render-mode-group">
          <button
            onClick={() => setPaintMode('realistic')}
            className={`render-mode-btn ${paintMode === 'realistic' ? 'active-purple' : ''}`}
          >
            <span className="render-mode-icon">🎥</span> Réaliste
          </button>
          <button
            onClick={() => setPaintMode('opaque')}
            className={`render-mode-btn ${paintMode === 'opaque' ? 'active-blue' : ''}`}
          >
            <span className="render-mode-icon">🟦</span> Opaque
          </button>
        </div>
      </div>

      {/* Active Color Picker */}
      <div className="tools-panel-section">
        <div className="section-title text-center" style={{color: 'rgba(255,255,255,0.5)', fontSize: '10px', textTransform:'uppercase', letterSpacing:'2px', marginBottom: '12px', marginTop: '8px'}}>Couleur active</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <input 
            type="color" 
            value={activeColor} 
            onChange={(e) => setActiveColor(e.target.value)}
            style={{ 
               width: '40px', height: '40px', padding: '0', 
               border: '2px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer',
               backgroundColor: 'transparent'
            }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>HEX</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'white', letterSpacing: '1px' }}>
              {activeColor.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="tools-panel-section">
        <div className="section-title text-center" style={{color: 'rgba(255,255,255,0.5)', fontSize: '10px', textTransform:'uppercase', letterSpacing:'2px', marginBottom: '12px', marginTop: '8px'}}>Pinceaux & Sélections</div>
        <div className="tools-grid">
          {toolBtn('wand',          '✨ Magique',    2, 'purple')}
          {toolBtn('magic_eraser',  '🧨 Gomme IA',   2, 'pink')}
          {toolBtn('lasso',         '✂️ Lasso Add',  2, 'purple')}
          {toolBtn('lasso_eraser',  '✂️ Gomme Lasso',2, 'pink')}
          {toolBtn('brush',         '🖌️ Peindre',    4, 'purple')}
          {toolBtn('eraser',        '🧽 Gomme',      2, 'pink')}
          {toolBtn('circle',        '⭕ Cercle',      2, 'orange')}
          {toolBtn('rect',          '⬜ Rect',        2, 'orange')}
          {toolBtn('line',          '➖ Ligne',       2, 'orange')}
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
        <button
          onClick={() => resetAllColors && resetAllColors()}
          className="w-full text-[12px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-red-500/10 border border-red-500/20"
        >
          🧹 Effacer toutes les peintures
        </button>
      </div>
    </div>
  )
}
