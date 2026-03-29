'use client'
import { Suspense, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  ContactShadows,
  PresentationControls,
  Html,
} from '@react-three/drei'
import * as THREE from 'three'
import { useShoeStore } from '@/stores/shoeStore'

// ─── Click-Based Magic Wand Texture Generator ───────────────────────────────

interface TexturedShoeProps {
  onSelectionActive?: (active: boolean) => void;
  registerCommit?: (fn: () => void) => void;
  registerReset?: (fn: () => void) => void;
  registerRestore?: (fn: () => void) => void;
  selectionMode?: 'wand' | 'magic_eraser' | 'brush' | 'eraser' | 'lasso' | 'lasso_eraser' | 'circle' | 'rect' | 'line' | 'sticker' | 'splatter';
  stickerImg?: HTMLImageElement | null;
  stickerScale?: number;
  stickerRotation?: number;
  paintMode?: 'realistic' | 'opaque';
}

function TexturedShoe({ onSelectionActive, registerCommit, registerReset, registerRestore, selectionMode = 'wand', stickerImg, stickerScale=0.2, stickerRotation=0, paintMode='realistic' }: TexturedShoeProps) {
  const { imageTexture, imageShape, materials, selectedPart } = useShoeStore()
  const geomRef1 = useRef<THREE.PlaneGeometry>(null)
  const geomRef2 = useRef<THREE.PlaneGeometry>(null)

  // We maintain our own state for the tinted texture and the active mask
  const [tintedTex, setTintedTex] = useState<THREE.Texture | null>(null)
  const initialBaseImgDataRef = useRef<ImageData | null>(null)
  const originalImgDataRef = useRef<ImageData | null>(null)
  const currentImgDataRef = useRef<ImageData | null>(null)
  const activeMaskRef = useRef<Uint8Array | null>(null)
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Custom active color controlled locally (or synced with store)
  const [activeColor, setActiveColor] = useState<string>('#ff0000')

  // Drawing state
  const isDrawing = useRef(false)
  const brushSize = 15 // pixel radius
  const lassoPathRef = useRef<THREE.Vector2[]>([])
  const maskBackupRef = useRef<Uint8Array | null>(null)
  const shapeStartUvRef = useRef<{x:number, y:number} | null>(null)

  // 1. Initial Load: create the base un-tinted texture and cache ImageData
  useEffect(() => {
    if (!imageTexture) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      originalImgDataRef.current = imgData
      initialBaseImgDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      const workingCanvas = document.createElement('canvas')
      workingCanvas.width = img.width
      workingCanvas.height = img.height
      workingCanvasRef.current = workingCanvas
      workingCanvas.getContext('2d')!.putImageData(imgData, 0, 0)
      
      currentImgDataRef.current = workingCanvas.getContext('2d')!.getImageData(0, 0, img.width, img.height)

      const t = new THREE.CanvasTexture(workingCanvas)
      t.colorSpace = THREE.SRGBColorSpace
      setTintedTex(t)
    }
    img.src = imageTexture
  }, [imageTexture])

  // 2. Parabolic Bulge Effect
  useEffect(() => {
    [geomRef1.current, geomRef2.current].forEach(geom => {
      if (!geom) return
      geom.computeBoundingBox()
      const bbox = geom.boundingBox
      if (!bbox) return
      
      const pos = geom.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        const nx = x / bbox.max.x
        const ny = y / bbox.max.y
        const distSq = nx*nx + ny*ny
        const z = Math.max(0, 0.15 * (1 - distSq))
        pos.setZ(i, z)
      }
      geom.computeVertexNormals()
      pos.needsUpdate = true
    })
  }, [imageShape])

  // 3. Drawing Logic: AI Smart Brush & Lasso Tracker
  const applyBrush = (uv: THREE.Vector2, overrideRadius?: number, forceSolidMode?: boolean) => {
    if (!originalImgDataRef.current) return
    if (!activeMaskRef.current) {
        activeMaskRef.current = new Uint8Array(originalImgDataRef.current.width * originalImgDataRef.current.height)
    }

    const w = originalImgDataRef.current.width
    const h = originalImgDataRef.current.height
    const cx = Math.floor(uv.x * w)
    const cy = Math.floor((1 - uv.y) * h)

    const centerIdx = (cy * w + cx) * 4
    const cr = originalImgDataRef.current.data[centerIdx]
    const cg = originalImgDataRef.current.data[centerIdx+1]
    const cb = originalImgDataRef.current.data[centerIdx+2]

    let modified = false
    const radius = overrideRadius || brushSize
    const r2 = radius * radius

    for(let y = Math.max(0, cy - radius); y < Math.min(h, cy + radius); y++) {
      for(let x = Math.max(0, cx - radius); x < Math.min(w, cx + radius); x++) {
        const distSq = (x-cx)*(x-cx) + (y-cy)*(y-cy)
        if (distSq <= r2) {
           const pIdx = (y * w + x) * 4
           const pr = originalImgDataRef.current.data[pIdx]
           const pg = originalImgDataRef.current.data[pIdx+1]
           const pb = originalImgDataRef.current.data[pIdx+2]
           
           // AI Edge Detection for paint brush only
           const colorDist = forceSolidMode ? 0 : Math.sqrt((pr-cr)**2 + (pg-cg)**2 + (pb-cb)**2)
           
           if (selectionMode === 'eraser' || forceSolidMode || colorDist < 45) {
              const softEdge = forceSolidMode ? 255 : Math.max(0, 255 * (1 - Math.sqrt(distSq)/radius))
              const currentVal = activeMaskRef.current[y * w + x]
              
              if (selectionMode === 'brush' || forceSolidMode) {
                 activeMaskRef.current[y * w + x] = Math.max(currentVal, softEdge)
                 modified = true
              } else if (selectionMode === 'eraser' || selectionMode === 'lasso_eraser') {
                 activeMaskRef.current[y * w + x] = 0
                 
                 const p = (y * w + x) * 4
                 if (initialBaseImgDataRef.current && originalImgDataRef.current && currentImgDataRef.current) {
                     originalImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                     originalImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                     originalImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                     
                     currentImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                     currentImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                     currentImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                 }
                 modified = true
              }
           }
        }
      }
    }

    if (modified) {
       if ((selectionMode === 'eraser' || selectionMode === 'lasso_eraser') && workingCanvasRef.current && tintedTex) {
           workingCanvasRef.current.getContext('2d')!.putImageData(currentImgDataRef.current!, 0, 0)
           tintedTex.needsUpdate = true
       }
       applyTintToCurrent(activeMaskRef.current, activeColor)
    }
  }

  const fillLassoPath = () => {
      if (!originalImgDataRef.current || !activeMaskRef.current || lassoPathRef.current.length < 3) return
      
      const w = originalImgDataRef.current.width
      const h = originalImgDataRef.current.height
      
      // We use a temporary native HTML Canvas API to fill the polygon super fast!
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = w
      tempCanvas.height = h
      const ctx = tempCanvas.getContext('2d')!
      
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      lassoPathRef.current.forEach((uv, i) => {
          const x = uv.x * w
          const y = (1 - uv.y) * h // Invert WebGL uv to DOM Canvas Y
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fill()
      
      const polyData = ctx.getImageData(0,0,w,h).data
      let modified = false
      let erased = false
      
      for (let i = 0; i < w*h; i++) {
          if (polyData[i*4] > 128) {
              if (selectionMode === 'lasso' && activeMaskRef.current[i] !== 255) {
                activeMaskRef.current[i] = 255
                modified = true
              } else if (selectionMode === 'lasso_eraser') {
                activeMaskRef.current[i] = 0
                const p = i * 4
                if (initialBaseImgDataRef.current && originalImgDataRef.current && currentImgDataRef.current) {
                    originalImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                    originalImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                    originalImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                    
                    currentImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                    currentImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                    currentImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                }
                modified = true
                erased = true
              }
          }
      }
      
      if (modified) {
         if (erased && workingCanvasRef.current && tintedTex) {
             workingCanvasRef.current.getContext('2d')!.putImageData(currentImgDataRef.current!, 0, 0)
             tintedTex.needsUpdate = true
         }
         applyTintToCurrent(activeMaskRef.current, activeColor)
      }
  }

  const fillShapePreview = (endUv: {x:number, y:number}) => {
      if (!originalImgDataRef.current || !activeMaskRef.current || !maskBackupRef.current || !shapeStartUvRef.current) return
      
      const w = originalImgDataRef.current.width
      const h = originalImgDataRef.current.height
      const start = shapeStartUvRef.current
      const end = endUv
      
      const sx = start.x * w, sy = (1 - start.y) * h
      const ex = end.x * w,   ey = (1 - end.y) * h

      const tempCvs = document.createElement('canvas')
      tempCvs.width = w; tempCvs.height = h
      const ctx = tempCvs.getContext('2d')!
      
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = brushSize * 2 // Match brush diameter

      ctx.beginPath()
      if (selectionMode === 'rect') {
          ctx.rect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy))
          ctx.fill()
      } else if (selectionMode === 'circle') {
          const radius = Math.sqrt((ex-sx)**2 + (ey-sy)**2)
          ctx.arc(sx, sy, radius, 0, Math.PI * 2)
          ctx.fill()
      } else if (selectionMode === 'line') {
          ctx.lineCap = 'round'
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.stroke()
      }

      const polyData = ctx.getImageData(0,0,w,h).data
      
      // Restore starting mask before drawing the preview overlay
      activeMaskRef.current.set(maskBackupRef.current)
      
      for (let i = 0; i < w*h; i++) {
          if (polyData[i*4] > 128) { // if drawing touched this pixel
              activeMaskRef.current[i] = 255
          }
      }
      
      applyTintToCurrent(activeMaskRef.current, activeColor)
  }

  const drawSticker = (uv: THREE.Vector2 | {x: number, y: number}, permanent: boolean = false) => {
      if (!originalImgDataRef.current || !workingCanvasRef.current || !currentImgDataRef.current || !stickerImg) return
      
      const w = originalImgDataRef.current.width
      const h = originalImgDataRef.current.height
      const cx = uv.x * w
      const cy = (1 - uv.y) * h

      // We draw the sticker ON TOP OF the current tinted state to preview it
      const ctx = workingCanvasRef.current.getContext('2d')!
      
      // Reset canvas if just previewing
      if (!permanent) {
          ctx.putImageData(currentImgDataRef.current, 0, 0)
          if (activeMaskRef.current) applyTintToCurrent(activeMaskRef.current, activeColor) // re-apply active selection
      }
      
      const sw = stickerImg.width * stickerScale
      const sh = stickerImg.height * stickerScale
      
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((stickerRotation * Math.PI) / 180)
      ctx.drawImage(stickerImg, -sw/2, -sh/2, sw, sh)
      ctx.restore()
      
      if (permanent && tintedTex) {
         // Bake into the original base so it becomes paint and is erasable
         originalImgDataRef.current = ctx.getImageData(0, 0, w, h)
         currentImgDataRef.current = ctx.getImageData(0, 0, w, h)
      }
      
      if (tintedTex) tintedTex.needsUpdate = true
  }

  const generateSplatter = (uv: THREE.Vector2 | {x: number, y: number}) => {
      if (!originalImgDataRef.current) return
      
      const w = originalImgDataRef.current.width
      const h = originalImgDataRef.current.height
      const cx = uv.x * w, cy = (1 - uv.y) * h

      const tempCvs = document.createElement('canvas')
      tempCvs.width = w; tempCvs.height = h
      const ctx = tempCvs.getContext('2d')!
      
      ctx.fillStyle = '#FFFFFF'
      
      // Central impact
      const radius = brushSize * 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()

      // Splashes
      for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2
          const distance = radius + Math.random() * radius * 4
          const splashX = cx + Math.cos(angle) * distance
          const splashY = cy + Math.sin(angle) * distance
          const splashRadius = Math.random() * (radius * 0.5)
          
          ctx.beginPath()
          ctx.arc(splashX, splashY, splashRadius, 0, Math.PI * 2)
          ctx.fill()
      }

      // Drips (Gravity)
      const drips = 4 + Math.floor(Math.random() * 4) // 4 to 7 drips
      for (let i = 0; i < drips; i++) {
          let dx = cx + (Math.random() * radius * 2 - radius)
          let dy = cy + (Math.random() * radius)
          let dr = radius * (0.2 + Math.random() * 0.3)
          
          const length = radius * 5 + Math.random() * radius * 15
          const stopY = dy + length

          while (dy < stopY && dr > 0.5) {
               ctx.beginPath()
               ctx.arc(dx, dy, dr, 0, Math.PI * 2)
               ctx.fill()
               dy += 2
               dx += (Math.random() - 0.5) * 1.2
               dr *= 0.985
          }
      }
      
      const polyData = ctx.getImageData(0,0,w,h).data
      
      if (!activeMaskRef.current) {
          activeMaskRef.current = new Uint8Array(w * h)
      }
      let modified = false
      for (let i = 0; i < w*h; i++) {
          if (polyData[i*4] > 128) {
              activeMaskRef.current[i] = 255
              modified = true
          }
      }
      
      if (modified) {
         applyTintToCurrent(activeMaskRef.current, activeColor)
      }
  }

  // Handle Canvas Events
  const handlePointerDown = (e: any) => {
    if (!originalImgDataRef.current || !currentImgDataRef.current || !workingCanvasRef.current) return
    e.stopPropagation()
    const uv = e.uv
    if (!uv) return

    if (onSelectionActive) onSelectionActive(true)

    if (selectionMode === 'wand' || selectionMode === 'magic_eraser') {
      const w = originalImgDataRef.current.width
      const h = originalImgDataRef.current.height
      const startX = Math.floor(uv.x * w)
      const startY = Math.floor((1 - uv.y) * h)
      const mask = runMagicWand(originalImgDataRef.current, startX, startY, 40)
      
      if (!activeMaskRef.current) {
        activeMaskRef.current = new Uint8Array(w * h)
      }
      
      let modified = false
      let erased = false
      for (let i = 0; i < mask.length; i++) {
         if (mask[i] > 128) {
           if (selectionMode === 'wand' && activeMaskRef.current[i] === 0) {
              activeMaskRef.current[i] = 255
              modified = true
           } else if (selectionMode === 'magic_eraser') {
              activeMaskRef.current[i] = 0
              
              const p = i * 4
              if (initialBaseImgDataRef.current && originalImgDataRef.current && currentImgDataRef.current) {
                  originalImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                  originalImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                  originalImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                  
                  currentImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                  currentImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                  currentImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
              }
              modified = true
              erased = true
           }
         }
      }
      
      if (modified) {
         if (erased && workingCanvasRef.current && tintedTex) {
             workingCanvasRef.current.getContext('2d')!.putImageData(currentImgDataRef.current!, 0, 0)
             tintedTex.needsUpdate = true
         }
         applyTintToCurrent(activeMaskRef.current, activeColor)
      }
    } else if (selectionMode === 'sticker') {
      drawSticker(uv, true)
    } else if (selectionMode === 'splatter') {
      isDrawing.current = true
      generateSplatter(uv)
    } else if (selectionMode === 'lasso' || selectionMode === 'lasso_eraser') {
      isDrawing.current = true
      lassoPathRef.current = [uv]
      if (!activeMaskRef.current) {
         activeMaskRef.current = new Uint8Array(originalImgDataRef.current.width * originalImgDataRef.current.height)
      }
      applyBrush(uv, 3, true) // Draw a sharp point
    } else if (['circle','rect','line'].includes(selectionMode)) {
      isDrawing.current = true
      shapeStartUvRef.current = {x: uv.x, y: uv.y}
      if (!activeMaskRef.current) activeMaskRef.current = new Uint8Array(originalImgDataRef.current.width * originalImgDataRef.current.height)
      maskBackupRef.current = new Uint8Array(activeMaskRef.current)
      fillShapePreview({x: uv.x, y: uv.y})
    } else {
      isDrawing.current = true
      applyBrush(uv)
    }
  }

  const handlePointerMove = (e: any) => {
    if (selectionMode === 'sticker' && e.uv) {
        drawSticker(e.uv, false) // Live preview loop
        return
    }
  
    if (!isDrawing.current || !e.uv) return
    e.stopPropagation()

    if (selectionMode === 'lasso' || selectionMode === 'lasso_eraser') {
       lassoPathRef.current.push(e.uv)
       applyBrush(e.uv, 3, true) 
    } else if (['circle','rect','line'].includes(selectionMode)) {
       fillShapePreview({x: e.uv.x, y: e.uv.y})
    } else if (selectionMode === 'brush' || selectionMode === 'eraser') {
       applyBrush(e.uv)
    } else if (selectionMode === 'splatter') {
       if (Math.random() > 0.8) {
           generateSplatter(e.uv)
       }
    }
  }

  const handlePointerUp = () => {
    if ((selectionMode === 'lasso' || selectionMode === 'lasso_eraser') && isDrawing.current) {
        fillLassoPath()
        lassoPathRef.current = [] // reset
    } else if (['circle','rect','line'].includes(selectionMode) && isDrawing.current) {
        maskBackupRef.current = null
        shapeStartUvRef.current = null
    }
    isDrawing.current = false
  }

  // 4. Listen to Material changes and extract color for the active UI panel
  const currentUserColor = (selectedPart && materials[selectedPart]?.color) ? materials[selectedPart].color : '#ffffff'

  useEffect(() => {
    if (activeMaskRef.current) {
      setActiveColor(currentUserColor)
      applyTintToCurrent(activeMaskRef.current, currentUserColor)
    }
  }, [currentUserColor, selectedPart, paintMode])

  useEffect(() => {
    if (registerCommit) {
      registerCommit(() => {
        if (workingCanvasRef.current && originalImgDataRef.current && activeMaskRef.current) {
          // Permanently save the colored canvas back into our original data ref!
          originalImgDataRef.current = workingCanvasRef.current.getContext('2d')!.getImageData(0, 0, workingCanvasRef.current.width, workingCanvasRef.current.height)
          activeMaskRef.current = null // Clear active mask so next click starts fresh from the new base
        }
      })
    }
  }, [registerCommit])

  useEffect(() => {
    if (registerReset) {
      registerReset(() => {
        if (workingCanvasRef.current && initialBaseImgDataRef.current && tintedTex) {
          const w = initialBaseImgDataRef.current.width
          const h = initialBaseImgDataRef.current.height
          originalImgDataRef.current = new ImageData(
             new Uint8ClampedArray(initialBaseImgDataRef.current.data), w, h
          )
          currentImgDataRef.current = new ImageData(
             new Uint8ClampedArray(initialBaseImgDataRef.current.data), w, h
          )
          activeMaskRef.current = null
          workingCanvasRef.current.getContext('2d')!.putImageData(originalImgDataRef.current, 0, 0)
          tintedTex.needsUpdate = true
        }
      })
    }
  }, [registerReset, tintedTex])

  useEffect(() => {
    if (registerRestore) {
      registerRestore(() => {
        if (workingCanvasRef.current && initialBaseImgDataRef.current && activeMaskRef.current && originalImgDataRef.current && currentImgDataRef.current && tintedTex) {
          const w = initialBaseImgDataRef.current.width
          const h = initialBaseImgDataRef.current.height
          
          for (let i = 0; i < w * h; i++) {
             if (activeMaskRef.current[i] > 128) {
                const p = i * 4
                originalImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                originalImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                originalImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                originalImgDataRef.current.data[p+3] = initialBaseImgDataRef.current.data[p+3]
                
                currentImgDataRef.current.data[p] = initialBaseImgDataRef.current.data[p]
                currentImgDataRef.current.data[p+1] = initialBaseImgDataRef.current.data[p+1]
                currentImgDataRef.current.data[p+2] = initialBaseImgDataRef.current.data[p+2]
                currentImgDataRef.current.data[p+3] = initialBaseImgDataRef.current.data[p+3]
             }
          }
          
          activeMaskRef.current = null
          workingCanvasRef.current.getContext('2d')!.putImageData(originalImgDataRef.current, 0, 0)
          tintedTex.needsUpdate = true
        }
      })
    }
  }, [registerRestore, tintedTex])


  const applyTintToCurrent = (mask: Uint8Array, colorHex: string) => {
      if (!originalImgDataRef.current || !currentImgDataRef.current || !workingCanvasRef.current || !tintedTex) return

      const w = originalImgDataRef.current.width
      const h = originalImgDataRef.current.height
      const copyData = new Uint8ClampedArray(originalImgDataRef.current.data) 

      const c = colorHex.replace('#', '')
      const tr = parseInt(c.substring(0, 2), 16)
      const tg = parseInt(c.substring(2, 4), 16)
      const tb = parseInt(c.substring(4, 6), 16)

      // 1. Calculate Average Luminosity of the masked area (only fully selected pixels > 128)
      let totalLum = 0
      let pixelCount = 0
      for (let i = 0; i < w * h; i++) {
        if (mask[i] > 128) {
          const p = i * 4
          totalLum += 0.299 * copyData[p] + 0.587 * copyData[p+1] + 0.114 * copyData[p+2]
          pixelCount++
        }
      }
      
      // Prevent division by zero
      const avgLum = Math.max(10, pixelCount > 0 ? totalLum / pixelCount : 255)
      const avgLumNorm = avgLum / 255.0

      // Stunning physically-based highlight-conserving recolor algorithm
      for (let i = 0; i < w * h; i++) {
        if (mask[i] > 0) {
          const p = i * 4
          const alpha = mask[i] / 255.0
          const or = copyData[p], og = copyData[p+1], ob = copyData[p+2]
          
          const lumOrig = (0.299 * or + 0.587 * og + 0.114 * ob) / 255.0
          let newR, newG, newB
          
          if (paintMode === 'opaque') {
             newR = tr
             newG = tg
             newB = tb
          } else {
             if (lumOrig <= avgLumNorm) {
                let f = avgLumNorm > 0 ? lumOrig / avgLumNorm : 0
                f = f * 0.75 + 0.25
                
                newR = tr * f
                newG = tg * f
                newB = tb * f
             } else {
                const f = (lumOrig - avgLumNorm) / (1.0 - avgLumNorm)
                newR = tr + (255 - tr) * f
                newG = tg + (255 - tg) * f
                newB = tb + (255 - tb) * f
             }
          }
          
          copyData[p]   = newR * alpha + or * (1 - alpha)
          copyData[p+1] = newG * alpha + og * (1 - alpha)
          copyData[p+2] = newB * alpha + ob * (1 - alpha)
        }
      }

      const newImgData = new ImageData(copyData, w, h)
      workingCanvasRef.current.getContext('2d')!.putImageData(newImgData, 0, 0)
      tintedTex.needsUpdate = true
  }

  if (!imageShape || !tintedTex) return null
  const aspect = imageShape.aspect || 1
  const width = 3
  const height = width / aspect

  return (
    <group position={[0, 0, 0]}>
      <mesh 
         castShadow receiveShadow 
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onPointerOut={handlePointerUp}
      >
        <planeGeometry ref={geomRef1} args={[width, height, 32, 32]} />
        <meshStandardMaterial map={tintedTex} color="#ffffff" transparent alphaTest={0.05} side={THREE.FrontSide} roughness={0.7} />
      </mesh>
      <mesh 
         castShadow receiveShadow rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]} 
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onPointerOut={handlePointerUp}
      >
        <planeGeometry ref={geomRef2} args={[width, height, 32, 32]} />
        <meshStandardMaterial map={tintedTex} color="#ffffff" transparent alphaTest={0.05} side={THREE.FrontSide} roughness={0.7} />
      </mesh>
    </group>
  )
}

// Flood Fill Algorithm (Magic Wand) with AI Edge Smoothing
function runMagicWand(imgData: ImageData, startX: number, startY: number, tolerance: number = 30): Uint8Array {
  const w = imgData.width, h = imgData.height, data = imgData.data
  const mask = new Uint8Array(w * h)
  const startIndex = (startY * w + startX) * 4
  const startR = data[startIndex], startG = data[startIndex + 1], startB = data[startIndex + 2]

  if (data[startIndex + 3] < 50) return mask // transparent

  const stack: [number, number][] = [[startX, startY]]
  mask[startY * w + startX] = 1

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]

  // Breadth-first / Depth-first
  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const idx = ny * w + nx
        if (mask[idx] === 0) {
          const pIdx = idx * 4
          if (data[pIdx + 3] < 50) continue
          const dist = Math.sqrt((data[pIdx]-startR)**2 + (data[pIdx+1]-startG)**2 + (data[pIdx+2]-startB)**2)
          if (dist <= tolerance) {
            mask[idx] = 1
            stack.push([nx, ny])
          }
        }
      }
    }
  }

  // AI Edge Dilation to capture partial anti-aliased edges
  const dilatedMask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        dilatedMask[y * w + x] = 255
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) dilatedMask[ny * w + nx] = 255
        }
      }
    }
  }

  // AI Gaussian Box Blur (Creates seamless feathering)
  const temp = new Float32Array(w * h)
  const out = new Uint8Array(w * h)
  const radius = 2
  
  // Blur X
  for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0
        for(let dx = -radius; dx <= radius; dx++) {
            if (x+dx >= 0 && x+dx < w) { sum += dilatedMask[y*w + x+dx]; count++; }
        }
        temp[y*w + x] = sum / count
      }
  }
  // Blur Y
  for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0, count = 0
        for(let dy = -radius; dy <= radius; dy++) {
            if (y+dy >= 0 && y+dy < h) { sum += temp[(y+dy)*w + x]; count++; }
        }
        out[y*w + x] = Math.min(255, sum / count)
      }
  }

  return out
}

export default function ShoeViewer3D() {
  const {
    imageTexture,
    selectionMode, paintMode,
    stickerImg, stickerScale, stickerRotation,
    setHasActiveSelection, setCommitCurrentTint, setResetAllColors, setRestoreZone
  } = useShoeStore()

  const controlsRef = useRef<any>(null)

  if (!imageTexture) return null

  return (
    <>
      {/* Camera angle controls */}
      <div
        className="canvas-controls"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        <button className="btn-icon" title="Vue de face" onClick={() => {
          if (controlsRef.current) {
            controlsRef.current.setAzimuthalAngle(0)
            controlsRef.current.setPolarAngle(Math.PI / 2)
            controlsRef.current.update()
          }
        }}>⬡</button>
        <button className="btn-icon" title="Vue côté" onClick={() => {
          if (controlsRef.current) {
            controlsRef.current.setAzimuthalAngle(Math.PI / 2)
            controlsRef.current.setPolarAngle(Math.PI / 2)
            controlsRef.current.update()
          }
        }}>↔️</button>
        <button className="btn-icon" title="Vue dessus" onClick={() => {
          if (controlsRef.current) {
            controlsRef.current.setAzimuthalAngle(0)
            controlsRef.current.setPolarAngle(Math.PI * 0.2)
            controlsRef.current.update()
          }
        }}>⬆️</button>
      </div>

      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        shadows
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        <Suspense fallback={<Html center><div className="loader-3d"><div className="spinner" /></div></Html>}>
          <Environment preset="city" />
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 6, 4]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />

          <PresentationControls
            global={selectionMode === 'wand'}
            enabled={selectionMode === 'wand'}
            rotation={[0, 0, 0]}
            polar={[-0.4, 0.4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
          >
            <TexturedShoe
              onSelectionActive={(active) => setHasActiveSelection(active)}
              registerCommit={(fn) => setCommitCurrentTint(() => fn)}
              registerReset={(fn) => setResetAllColors(() => fn)}
              registerRestore={(fn) => setRestoreZone(() => fn)}
              selectionMode={selectionMode}
              stickerImg={stickerImg}
              stickerScale={stickerScale}
              stickerRotation={stickerRotation}
              paintMode={paintMode}
            />
          </PresentationControls>

          <ContactShadows position={[0, -1, 0]} opacity={0.8} scale={8} blur={2.5} far={3} color="#3b0764" />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            enableRotate={selectionMode === 'wand' || selectionMode === 'magic_eraser'}
            minDistance={2}
            maxDistance={7}
            minPolarAngle={Math.PI * 0.2}
            maxPolarAngle={Math.PI * 0.8}
          />
        </Suspense>
      </Canvas>
    </>
  )
}

