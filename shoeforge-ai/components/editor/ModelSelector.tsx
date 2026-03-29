'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useShoeStore } from '@/stores/shoeStore'
import { useImageTo3D } from '@/hooks/useImageTo3D'
import { useGLBExporter } from '@/hooks/useGLBExporter'

const PRESET_MODELS = [
  { id: 'sneaker', label: 'Sneaker Low', icon: '👟' },
  { id: 'runner',  label: 'Runner Pro',  icon: '🏃' },
  { id: 'boot',    label: 'Boot Haut',   icon: '🥾' },
  { id: 'slip',    label: 'Slip-On',     icon: '🪖' },
]

const STEP_LABELS: Record<string, string> = {
  idle:      '',
  loading:   'Chargement de l\'image...',
  analyzing: 'Analyse de la silhouette...',
  extracting:'Extraction des couleurs...',
  building:  'Construction du modèle 3D...',
  texturing: 'Application des textures...',
  done:      '✅ Modèle 3D généré avec succès !',
  error:     '❌ Erreur de conversion',
}

export default function ModelSelector() {
  const {
    imageTexture, imageColors,
    conversionStep, conversionProgress, conversionError,
    setImageTexture, setConversionStep, modelUrl, setModelUrl,
  } = useShoeStore()

  const { convert } = useImageTo3D()
  const { exportGLB, exportGLTF } = useGLBExporter()
  const [activePreset, setActivePreset] = useState('sneaker')
  const [showExport, setShowExport] = useState(false)

  const isConverting = ['loading', 'analyzing', 'extracting', 'building', 'texturing'].includes(conversionStep)
  const isDone = conversionStep === 'done'
  const isError = conversionStep === 'error'

  const onDrop = useCallback(async (accepted: File[], rejected: File[]) => {
    if (rejected.length > 0) {
      useShoeStore.getState().setConversionError(
        'Format non supporté. Utilisez PNG, JPG ou WEBP (max 10MB).'
      )
      return
    }
    const file = accepted[0]
    if (!file) return
    await convert(file)
  }, [convert])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isConverting,
  })

  const handleReset = () => {
    setImageTexture(null)
    setConversionStep('idle', 0)
    useShoeStore.getState().resetDesign()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Preset Models ── */}
      <div>
        <div className="section-title">Modèles disponibles</div>
        <div className="model-grid">
          {PRESET_MODELS.map(m => (
            <button
              key={m.id}
              className={`model-card ${activePreset === m.id && !isDone ? 'active' : ''}`}
              onClick={() => {
                setActivePreset(m.id)
                setModelUrl('procedural')
                handleReset()
              }}
            >
              <div className="model-preview">{m.icon}</div>
              <div className="model-name">{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── PNG Import Zone ── */}
      <div>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Importer votre modèle</span>
          <span style={{
            background: 'linear-gradient(135deg, var(--accent-1), var(--accent-3))',
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '9px',
            fontWeight: '800',
            color: 'white',
            letterSpacing: '0.05em',
          }}>PNG → 3D</span>
        </div>

        {/* Drop Zone */}
        {!isDone && !isError && (
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${isConverting ? 'converting' : ''}`}
            style={{ cursor: isConverting ? 'default' : 'pointer' }}
          >
            <input {...getInputProps()} />
            <div className="dropzone-icon">
              {isConverting ? '⚙️' : isDragActive ? '📂' : '🖼️'}
            </div>
            <div className="dropzone-text">
              {isConverting
                ? STEP_LABELS[conversionStep]
                : isDragActive
                  ? 'Relâchez pour convertir en 3D'
                  : <>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                        Glissez une image de chaussure
                      </strong>
                      PNG, JPG, WEBP · Max 10 Mo
                    </>
              }
            </div>
          </div>
        )}

        {/* Conversion Progress */}
        {isConverting && (
          <div className="conversion-progress">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="conversion-step-label">{STEP_LABELS[conversionStep]}</span>
              <span className="conversion-pct">{conversionProgress}%</span>
            </div>
            <div className="conversion-bar">
              <div
                className="conversion-bar-fill"
                style={{ width: `${conversionProgress}%` }}
              />
            </div>
            <div className="conversion-steps-row">
              {['analyzing', 'extracting', 'building', 'texturing'].map((s, i) => (
                <div
                  key={s}
                  className={`step-dot ${
                    conversionProgress >= (i + 1) * 20 ? 'done' :
                    conversionStep === s ? 'active' : ''
                  }`}
                  title={STEP_LABELS[s]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="conversion-error">
            <span>⚠️ {conversionError}</span>
            <button className="btn btn-ghost" onClick={handleReset} style={{ padding: '6px 12px', fontSize: '12px' }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Success State */}
        {isDone && imageTexture && (
          <div className="conversion-success">
            {/* Preview strip */}
            <div className="converted-preview">
              <img
                src={imageTexture}
                alt="Source PNG"
                className="converted-thumb"
              />
              <div className="converted-arrow">→</div>
              <div className="converted-3d-badge">3D</div>
            </div>

            {/* Extracted palette */}
            {imageColors.length > 0 && (
              <div>
                <div className="section-title" style={{ marginBottom: '8px' }}>Palette extraite</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {imageColors.map((c, i) => (
                    <div
                      key={i}
                      className="palette-swatch"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Export buttons */}
            <div>
              <div className="section-title" style={{ marginBottom: '8px' }}>Exporter le modèle 3D</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '10px' }}
                  onClick={() => exportGLB()}
                >
                  ⬇️ .GLB
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '10px' }}
                  onClick={() => exportGLTF()}
                >
                  ⬇️ .GLTF
                </button>
              </div>
            </div>

            {/* Reset */}
            <button
              className="btn btn-ghost"
              onClick={handleReset}
              style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
            >
              🔄 Importer une autre image
            </button>
          </div>
        )}
      </div>

      {/* ── GLB Upload (for real models) ── */}
      {conversionStep === 'idle' && (
        <div>
          <div className="section-title">Ou importer un modèle GLB</div>
          <GlbDropZone />
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: GLB dropzone ──────────────────────────────────────────
function GlbDropZone() {
  const { setModelUrl } = useShoeStore()
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    const url = URL.createObjectURL(file)
    setModelUrl(url)
    setTimeout(() => setUploading(false), 800)
  }, [setModelUrl])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'model/gltf-binary': ['.glb'], 'model/gltf+json': ['.gltf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  })

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      <div className="dropzone-icon">
        {uploading ? '⏳' : isDragActive ? '📂' : '📦'}
      </div>
      <div className="dropzone-text">
        {uploading ? 'Chargement...' :
          isDragActive ? 'Relâchez pour charger' :
          'Glissez votre fichier .glb ou .gltf'
        }
      </div>
      {!uploading && !isDragActive && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Max 50 Mo · glTF 2.0 recommandé
        </div>
      )}
    </div>
  )
}
