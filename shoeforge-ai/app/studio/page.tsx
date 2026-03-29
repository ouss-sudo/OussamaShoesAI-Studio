'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { useShoeStore } from '@/stores/shoeStore'
import MaterialEditor from '@/components/editor/MaterialEditor'
import AIDesigner from '@/components/ai/AIDesigner'
import { useGLBExporter } from '@/hooks/useGLBExporter'

// No SSR for WebGL
const ShoeViewer3D  = dynamic(() => import('@/components/viewer/ShoeViewer3D'),  { ssr: false })
const UploadOverlay = dynamic(() => import('@/components/viewer/UploadOverlay'), { ssr: false })
const ToolsPanel = dynamic(() => import('@/components/editor/ToolsPanel'), { ssr: false })

export default function StudioPage() {
  const {
    activeTab, setActiveTab,
    undo, redo, historyIndex, history,
    resetDesign,
    imageTexture, imageColors, conversionStep,
    materials,
  } = useShoeStore()

  const { exportGLB, exportGLTF } = useGLBExporter()

  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [mobilePanel, setMobilePanel] = useState<'canvas' | 'info' | 'style' | 'ai' | 'tools'>('canvas')
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  const hasModel = !!imageTexture

  const toast = (msg: string) => {
    setToastMsg(msg); setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleMobileTab = (tab: 'canvas' | 'info' | 'style' | 'ai' | 'tools') => {
    if (tab === 'canvas') {
      setMobilePanel('canvas')
      setMobilePanelOpen(false)
    } else {
      setMobilePanel(tab)
      setMobilePanelOpen(true)
    }
  }

  return (
    <div
      className={`studio-layout ${hasModel ? '' : 'studio-upload-mode'}`}
      onClick={() => setShowExportMenu(false)}
    >
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="logo-icon">👟</div>
          <span className="logo-text">OussamaShoes AI</span>
          {hasModel && <span className="navbar-3d-badge">3D ✓</span>}
        </div>

        {hasModel && (
          <div className="navbar-undo-redo">
            <button className="btn-icon" onClick={undo}
              disabled={historyIndex < 0} style={{ opacity: historyIndex < 0 ? 0.4 : 1 }} title="Annuler">↩</button>
            <button className="btn-icon" onClick={redo}
              disabled={historyIndex >= history.length - 1} style={{ opacity: historyIndex >= history.length - 1 ? 0.4 : 1 }} title="Refaire">↪</button>
          </div>
        )}

        <div className="navbar-actions">
          <Link href="/" className="btn btn-ghost navbar-home-btn">← <span className="btn-label">Accueil</span></Link>

          {hasModel && (
            <>
              <button className="btn btn-ghost navbar-reset-btn" onClick={resetDesign}>
                🔄 <span className="btn-label">Nouvelle image</span>
              </button>

              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost"
                  onClick={e => { e.stopPropagation(); setShowExportMenu(p => !p) }}>
                  📤 <span className="btn-label">Exporter</span> ▾
                </button>
                {showExportMenu && (
                  <div className="export-menu" onClick={e => e.stopPropagation()}>
                    <button className="export-menu-item" onClick={async () => { toast('⏳ Export GLB…'); await exportGLB(); setShowExportMenu(false) }}>
                      <span className="export-menu-icon">📦</span>
                      <div>
                        <div className="export-menu-label">Exporter .GLB</div>
                        <div className="export-menu-desc">Binaire glTF · Three.js ready</div>
                      </div>
                    </button>
                    <button className="export-menu-item" onClick={async () => { toast('⏳ Export GLTF…'); await exportGLTF(); setShowExportMenu(false) }}>
                      <span className="export-menu-icon">📄</span>
                      <div>
                        <div className="export-menu-label">Exporter .GLTF</div>
                        <div className="export-menu-desc">JSON · éditable dans Blender</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button className="btn btn-primary navbar-order-btn" onClick={() => toast('🛍️ Commande — bientôt disponible !')}>
                🛍️ <span className="btn-label">Commander</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── LEFT PANEL ── */}
      {hasModel && (
        <aside className={`panel-left ${mobilePanel === 'info' && mobilePanelOpen ? 'mobile-panel-visible' : ''}`}>
          <div className="section-title">Image source</div>
          <div className="source-image-card">
            <img src={imageTexture!} alt="Source" className="source-img" />
            <div style={{ fontSize: '11px', color: 'var(--accent-2)', fontWeight: 600 }}>PNG → 3D ✓</div>
          </div>

          {imageColors.length > 0 && (
            <div>
              <div className="section-title">Palette extraite</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {imageColors.map((c, i) => (
                  <div key={i} className="palette-swatch" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
          )}

          <div className="divider" />
          <div className="section-title">Zones personnalisées</div>
          {Object.entries(materials).map(([part, mat]) => (
            <div key={part} className="part-summary-row">
              <div className="part-summary-color" style={{ background: mat.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{part}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{mat.textureType} · {mat.color}</div>
              </div>
            </div>
          ))}

          <div className="divider" />
          <div className="section-title">Export rapide</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '10px' }}
              onClick={async () => { toast('⏳ GLB…'); await exportGLB() }}>⬇ .GLB</button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '10px' }}
              onClick={async () => { toast('⏳ GLTF…'); await exportGLTF() }}>⬇ .GLTF</button>
          </div>
        </aside>
      )}

      {/* ── CANVAS ── */}
      <div className={`canvas-area ${!hasModel ? 'canvas-full' : ''} ${hasModel && mobilePanel !== 'canvas' && mobilePanelOpen ? 'mobile-canvas-hidden' : ''}`}>
        {!hasModel ? <UploadOverlay /> : <ShoeViewer3D />}
      </div>

      {/* ── RIGHT PANEL ── */}
      {hasModel && (
        <aside className={`panel-right ${(mobilePanel === 'style' || mobilePanel === 'ai' || mobilePanel === 'tools') && mobilePanelOpen ? 'mobile-panel-visible' : ''}`}>
          <div className="panel-tabs">
            <button className={`panel-tab ${activeTab === 'style' ? 'active' : ''}`}
              onClick={() => { setActiveTab('style'); handleMobileTab('style') }}>🎨 Style</button>
            <button className={`panel-tab ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => { setActiveTab('tools'); handleMobileTab('tools') }}>🧰 Outils</button>
            <button className={`panel-tab ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ai'); handleMobileTab('ai') }}>🤖 IA</button>
          </div>
          <div className="panel-content">
            {activeTab === 'style' && <MaterialEditor />}
            {activeTab === 'tools' && <ToolsPanel />}
            {activeTab === 'ai'    && <AIDesigner />}
          </div>
        </aside>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      {hasModel && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-btn ${mobilePanel === 'canvas' ? 'active' : ''}`}
            onClick={() => handleMobileTab('canvas')}>
            <span className="mobile-nav-icon">🖥️</span>
            <span className="mobile-nav-label">Chaussure</span>
          </button>
          <button className={`mobile-nav-btn ${mobilePanel === 'info' && mobilePanelOpen ? 'active' : ''}`}
            onClick={() => handleMobileTab('info')}>
            <span className="mobile-nav-icon">🖼️</span>
            <span className="mobile-nav-label">Source</span>
          </button>
          <button className={`mobile-nav-btn ${mobilePanel === 'style' && mobilePanelOpen ? 'active' : ''}`}
            onClick={() => { setActiveTab('style'); handleMobileTab('style') }}>
            <span className="mobile-nav-icon">🎨</span>
            <span className="mobile-nav-label">Style</span>
          </button>
          <button className={`mobile-nav-btn ${mobilePanel === 'tools' && mobilePanelOpen ? 'active' : ''}`}
            onClick={() => { setActiveTab('tools'); handleMobileTab('tools') }}>
            <span className="mobile-nav-icon">🧰</span>
            <span className="mobile-nav-label">Outils</span>
          </button>
          <button className={`mobile-nav-btn ${mobilePanel === 'ai' && mobilePanelOpen ? 'active' : ''}`}
            onClick={() => { setActiveTab('ai'); handleMobileTab('ai') }}>
            <span className="mobile-nav-icon">🤖</span>
            <span className="mobile-nav-label">IA</span>
          </button>
        </nav>
      )}

      {showToast && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
