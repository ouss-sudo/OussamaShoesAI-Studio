'use client'
import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useShoeStore } from '@/stores/shoeStore'
import { useImageTo3D } from '@/hooks/useImageTo3D'

const STEP_LABELS: Record<string, string> = {
  loading:   'Chargement...',
  analyzing: 'Analyse de la silhouette...',
  extracting:'Extraction des couleurs...',
  building:  'Construction 3D...',
  texturing: 'Application des textures...',
}

function BackgroundEditor({
  originalUrl,
  initialRemovedUrl,
  onValidate,
  onCancel
}: {
  originalUrl: string
  initialRemovedUrl: string
  onValidate: (file: File) => void
  onCancel: () => void
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const originalImageRef = React.useRef<HTMLImageElement | null>(null)
  const [mode, setMode] = useState<'erase' | 'restore' | 'wand'>('wand')
  const [brushSize, setBrushSize] = useState(25)
  const [wandTolerance, setWandTolerance] = useState(45)
  const isDrawing = React.useRef(false)

  React.useEffect(() => {
    const origImg = new Image()
    origImg.onload = () => {
        originalImageRef.current = origImg
        const curImg = new Image()
        curImg.onload = () => {
            const cvs = canvasRef.current; if(!cvs) return;
            const maxD = 1000
            let w = origImg.width, h = origImg.height
            if (w > maxD || h > maxD) {
                const scale = Math.min(maxD/w, maxD/h)
                w *= scale; h *= scale
            }
            cvs.width = w; cvs.height = h;
            const ctx = cvs.getContext('2d')!
            ctx.drawImage(curImg, 0, 0, w, h)
        }
        curImg.src = initialRemovedUrl
    }
    origImg.src = originalUrl
  }, [originalUrl, initialRemovedUrl])

  const applyBrush = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const cvs = canvasRef.current; if (!cvs || !originalImageRef.current) return;
      const rect = cvs.getBoundingClientRect()
      const scaleX = cvs.width / rect.width
      const scaleY = cvs.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      const ctx = cvs.getContext('2d')!
      
      if (mode === 'erase') {
          // Erase creates transparency
          ctx.globalCompositeOperation = 'destination-out'
          ctx.beginPath()
          ctx.arc(x, y, brushSize, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalCompositeOperation = 'source-over'
      } else {
          // Restore paints the original image cutout
          ctx.save()
          ctx.beginPath()
          ctx.arc(x, y, brushSize, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(originalImageRef.current, 0, 0, cvs.width, cvs.height)
          ctx.restore()
      }
  }

  const applyWand = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const cvs = canvasRef.current; if (!cvs) return;
      const rect = cvs.getBoundingClientRect()
      const scaleX = cvs.width / rect.width
      const scaleY = cvs.height / rect.height
      const startX = Math.floor((e.clientX - rect.left) * scaleX)
      const startY = Math.floor((e.clientY - rect.top) * scaleY)

      const ctx = cvs.getContext('2d')!
      const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height)
      const data = imgData.data
      const w = cvs.width, h = cvs.height

      const startIndex = (startY * w + startX) * 4
      const startR = data[startIndex], startG = data[startIndex + 1], startB = data[startIndex + 2]
      if (data[startIndex + 3] < 10) return

      const stack: [number, number][] = [[startX, startY]]
      const mask = new Uint8Array(w * h)
      mask[startY * w + startX] = 1

      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = ny * w + nx
            if (mask[idx] === 0) {
              const pIdx = idx * 4
              if (data[pIdx + 3] < 10) continue
              const dist = Math.sqrt((data[pIdx]-startR)**2 + (data[pIdx+1]-startG)**2 + (data[pIdx+2]-startB)**2)
              if (dist <= wandTolerance) {
                mask[idx] = 1
                stack.push([nx, ny])
              }
            }
          }
        }
      }

      // Edge Dilation
      const dilatedMask = new Uint8Array(w * h)
      const fringeDirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,-1], [1,-1], [-1,1]]
      for (let y = 0; y < h; y++) {
         for (let x = 0; x < w; x++) {
            if (mask[y * w + x] === 1) {
               dilatedMask[y * w + x] = 1
               for (const [dx, dy] of fringeDirs) {
                  const nx = x+dx, ny = y+dy
                  if (nx>=0 && nx<w && ny>=0 && ny<h) dilatedMask[ny*w+nx] = 1
               }
            }
         }
      }

      let modified = false
      for (let i = 0; i < dilatedMask.length; i++) {
         if (dilatedMask[i] === 1) {
            data[i*4] = 0; data[i*4+1] = 0; data[i*4+2] = 0; data[i*4+3] = 0;
            modified = true
         }
      }
      
      if (modified) {
          ctx.clearRect(0,0,w,h)
          ctx.putImageData(imgData, 0, 0)
      }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDrawing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId)
      if (mode === 'wand') {
          applyWand(e);
      } else {
          applyBrush(e)
      }
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDrawing.current && mode !== 'wand') applyBrush(e)
  }
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDrawing.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleFinish = async () => {
      const cvs = canvasRef.current
      if (!cvs) return onCancel()
      cvs.toBlob(blob => {
          if (!blob) return onCancel()
          const file = new File([blob], 'shoe-custom-cutout.png', { type: 'image/png' })
          onValidate(file)
      }, 'image/png')
  }

  // Smart Auto-Clean: Refinds the outer boundaries of the current non-transparent blob and flood deletes them!
  const handleAutoClean = () => {
      const cvs = canvasRef.current; if (!cvs) return;
      const ctx = cvs.getContext('2d')!
      const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height)
      const data = imgData.data
      const w = cvs.width, h = cvs.height

      const seeds: {x:number, y:number}[] = []

      top: for(let y=0; y<h; y++) {
         for(let x=0; x<w; x++) { if(data[(y*w+x)*4+3]>10) { seeds.push({x,y}); break top; } }
      }
      bottom: for(let y=h-1; y>=0; y--) {
         for(let x=0; x<w; x++) { if(data[(y*w+x)*4+3]>10) { seeds.push({x,y}); break bottom; } }
      }
      left: for(let x=0; x<w; x++) {
         for(let y=0; y<h; y++) { if(data[(y*w+x)*4+3]>10) { seeds.push({x,y}); break left; } }
      }
      right: for(let x=w-1; x>=0; x--) {
         for(let y=0; y<h; y++) { if(data[(y*w+x)*4+3]>10) { seeds.push({x,y}); break right; } }
      }

      const mask = new Uint8Array(w * h)
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
      
      seeds.forEach(seed => {
          if (mask[seed.y*w+seed.x] === 1) return;
          const startIdx = (seed.y * w + seed.x) * 4
          const refR = data[startIdx], refG = data[startIdx+1], refB = data[startIdx+2]

          const stack: [number, number][] = [[seed.x, seed.y]]
          mask[seed.y*w + seed.x] = 1

          while(stack.length > 0) {
              const [cx, cy] = stack.pop()!
              for(const [dx, dy] of dirs) {
                  const nx = cx+dx, ny = cy+dy
                  if(nx>=0 && nx<w && ny>=0 && ny<h) {
                      const idx = ny*w + nx
                      if (mask[idx] === 0) {
                          const p = idx * 4
                          if (data[p+3] < 10) continue // solid boundaries only
                          const dist = Math.sqrt((data[p]-refR)**2 + (data[p+1]-refG)**2 + (data[p+2]-refB)**2)
                          if (dist <= wandTolerance) {
                              mask[idx] = 1
                              stack.push([nx,ny])
                          }
                      }
                  }
              }
          }
      })

      const dilatedMask = new Uint8Array(w * h)
      const fringeDirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,-1], [1,-1], [-1,1]]
      for (let y = 0; y < h; y++) {
         for (let x = 0; x < w; x++) {
            if (mask[y * w + x] === 1) {
               dilatedMask[y * w + x] = 1
               for (const [dx, dy] of fringeDirs) {
                  const nx = x+dx, ny = y+dy
                  if (nx>=0 && nx<w && ny>=0 && ny<h) dilatedMask[ny*w+nx] = 1
               }
            }
         }
      }

      let modified = false
      for(let i=0; i<w*h; i++) {
         if(dilatedMask[i] === 1) {
             data[i*4]=0; data[i*4+1]=0; data[i*4+2]=0; data[i*4+3]=0;
             modified = true
         }
      }

      if(modified) {
         ctx.clearRect(0,0,w,h)
         ctx.putImageData(imgData, 0,0)
      }
  }

  return (
    <div className="preview-bg-state" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="upload-title mb-1" style={{ fontSize: '18px' }}>Peaufiner le détourage</h2>
          <p className="text-xs text-gray-400">Corrigez le masque généré par l'IA avant de passer en 3D.</p>
        </div>
        <button onClick={handleAutoClean} className="btn" style={{ background: 'linear-gradient(90deg, #9333ea, #db2777)', color: 'white', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', boxShadow: '0 0 10px rgba(219,39,119,0.3)' }}>
           ✨ IA Auto-Nettoyage
        </button>
      </div>
      
      {/* Editor Controls */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
         <button onClick={() => setMode('wand')} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: mode === 'wand' ? 'var(--accent-1)' : 'transparent', color: mode === 'wand' ? 'white' : 'var(--text-muted)' }}>
            <span style={{ display: 'block', fontSize: '16px', marginBottom: '2px' }}>🪄</span> Baguette
         </button>
         <button onClick={() => setMode('erase')} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: mode === 'erase' ? 'var(--accent-1)' : 'transparent', color: mode === 'erase' ? 'white' : 'var(--text-muted)' }}>
            <span style={{ display: 'block', fontSize: '16px', marginBottom: '2px' }}>➖</span> Effacer
         </button>
         <button onClick={() => setMode('restore')} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: mode === 'restore' ? 'var(--accent-2)' : 'transparent', color: mode === 'restore' ? 'white' : 'var(--text-muted)' }}>
            <span style={{ display: 'block', fontSize: '16px', marginBottom: '2px' }}>➕</span> Restaurer
         </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '8px' }}>
          {mode === 'wand' ? (
             <>
               <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tolérance: {wandTolerance}</span>
               <input type="range" min="5" max="100" value={wandTolerance} onChange={e => setWandTolerance(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-1)' }} />
             </>
          ) : (
             <>
               <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Taille: {brushSize}px</span>
               <input type="range" min="5" max="100" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-1)' }} />
             </>
          )}
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', height: '300px', background: 'url(https://upload.wikimedia.org/wikipedia/commons/5/5c/Image_checkerboard.png) repeat center center', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', touchAction: 'none' }}>
         <canvas 
           ref={canvasRef} 
           style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'crosshair' }} 
           onPointerDown={handlePointerDown}
           onPointerMove={handlePointerMove}
           onPointerUp={handlePointerUp}
           onPointerCancel={handlePointerUp}
         />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
           Ignorer le détourage
        </button>
        <button className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-1)' }} onClick={handleFinish}>
           ✅ Générer la 3D
        </button>
      </div>
    </div>
  )
}

export default function UploadOverlay() {
  const {
    conversionStep,
    conversionProgress,
    conversionError,
    setConversionStep,
  } = useShoeStore()

  const { convert } = useImageTo3D()
  const isConverting = ['loading','analyzing','extracting','building','texturing'].includes(conversionStep)
  const isError = conversionStep === 'error'

  const [autoRemoveBg, setAutoRemoveBg] = useState(true)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [previewBgRemoved, setPreviewBgRemoved] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [isProcessingRemoval, setIsProcessingRemoval] = useState(false)

  // We need to import the removal logic here to preview it
  const onDrop = useCallback(async (accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      useShoeStore.getState().setConversionError('Format non supporté. Utilisez PNG, JPG ou WEBP.')
      return
    }

    const file = accepted[0]
    
    if (autoRemoveBg) {
       setIsProcessingRemoval(true)
       const blobUrl = URL.createObjectURL(file)
       setOriginalUrl(blobUrl)
       setStagedFile(file)
       
       try {
           // We extract the existing logic slightly. For simplicity we will dynamically import it from the hook file.
           const { removeBackgroundClientSide } = await import('@/hooks/useImageTo3D')
           const removedUrl = await removeBackgroundClientSide(blobUrl, 65)
           setPreviewBgRemoved(removedUrl)
       } catch (err) {
           console.error(err)
           // fallback to direct convert
           await convert(file, false)
       } finally {
           setIsProcessingRemoval(false)
       }
    } else {
       await convert(file, false)
    }
  }, [convert, autoRemoveBg])

  const handleValidation = async (useRemoved: boolean) => {
      // Logic replaced by BackgroundEditor internal callbacks
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg','.jpeg'], 'image/webp': ['.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: isConverting || isProcessingRemoval || previewBgRemoved !== null,
  })

  return (
    <div className="upload-overlay">
      {/* Background decoration */}
      <div className="upload-bg-orb upload-bg-orb-1" />
      <div className="upload-bg-orb upload-bg-orb-2" />

      <div className="upload-card" {...(isConverting || isError || previewBgRemoved || isProcessingRemoval ? {} : getRootProps())}>
        {!isConverting && !isError && !previewBgRemoved && !isProcessingRemoval && <input {...getInputProps()} />}

        {/* Processing Extraction */}
        {isProcessingRemoval && (
          <div className="converting-state">
            <div className="converting-ring"><div className="converting-spinner" /><span className="converting-icon">✂️</span></div>
            <h2 className="upload-title">Détourage en cours...</h2>
            <p className="converting-step">Suppression intelligente de l'arrière plan</p>
          </div>
        )}

        {/* Preview BG Removal Validation */}
        {previewBgRemoved && originalUrl && (
          <BackgroundEditor 
             originalUrl={originalUrl}
             initialRemovedUrl={previewBgRemoved}
             onValidate={(file) => {
                 setPreviewBgRemoved(null)
                 convert(file, false)
             }}
             onCancel={() => {
                 setPreviewBgRemoved(null)
                 if (stagedFile) convert(stagedFile, false)
             }}
          />
        )}

        {/* Idle / drag state */}
        {!isConverting && !isError && !previewBgRemoved && !isProcessingRemoval && (
          <>
            <div className={`upload-icon-ring ${isDragActive ? 'drag-active' : ''}`}>
              <span className="upload-icon">{isDragActive ? '📂' : '🖼️'}</span>
            </div>

            <h2 className="upload-title">
              {isDragActive ? 'Relâchez pour convertir' : 'Importez votre chaussure'}
            </h2>
            <p className="upload-subtitle">
              {isDragActive
                ? 'Conversion PNG → 3D automatique'
                : 'Glissez une photo PNG, JPG ou WEBP de votre chaussure\nElle sera automatiquement convertie en modèle 3D interactif'
              }
            </p>

            <button className="btn btn-primary upload-btn">
              📁 Choisir une image
            </button>

            <div className="upload-formats">
              <span className="format-tag">PNG</span>
              <span className="format-tag">JPG</span>
              <span className="format-tag">WEBP</span>
              <span className="format-sep">·</span>
              <span className="format-limit">Max 10 Mo</span>
            </div>

            <div onClick={e => e.stopPropagation()} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input type="checkbox" id="removeBg" checked={autoRemoveBg} onChange={e => setAutoRemoveBg(e.target.checked)} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
              <label htmlFor="removeBg" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-color)' }}>✂️ Détourage automatique (Supprimer le fond uni)</label>
            </div>
          </>
        )}

        {/* Converting state */}
        {isConverting && (
          <div className="converting-state">
            <div className="converting-ring">
              <div className="converting-spinner" />
              <span className="converting-icon">🧠</span>
            </div>
            <h2 className="upload-title">Conversion en cours...</h2>
            <p className="converting-step">{STEP_LABELS[conversionStep] ?? ''}</p>

            <div className="converting-bar-wrap">
              <div className="converting-bar">
                <div className="converting-bar-fill" style={{ width: `${conversionProgress}%` }} />
              </div>
              <span className="converting-pct">{conversionProgress}%</span>
            </div>

            <div className="converting-dots">
              {['Analyse','Couleurs','Maillage','Texture'].map((label, i) => (
                <div key={label} className="converting-dot-item">
                  <div className={`c-dot ${conversionProgress >= (i+1)*20 ? 'done' : conversionStep === Object.keys(STEP_LABELS)[i] ? 'active' : ''}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="upload-error-state">
            <div className="upload-icon-ring error">
              <span className="upload-icon">⚠️</span>
            </div>
            <h2 className="upload-title">Erreur de conversion</h2>
            <p className="upload-subtitle" style={{ color: 'var(--text-muted)' }}>
              {conversionError ?? 'Une erreur est survenue'}
            </p>
            <button
              className="btn btn-primary upload-btn"
              onClick={() => setConversionStep('idle', 0)}
            >
              🔄 Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
