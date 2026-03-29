'use client'
import { useCallback } from 'react'
import { useShoeStore } from '@/stores/shoeStore'

// ─── Extract dominant colors ────────────────────────────────────────────────
function extractDominantColors(imageUrl: string, k = 6): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 80
      const scale = Math.min(MAX / img.width, MAX / img.height)
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels: [number, number, number][] = []

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 30) continue
        pixels.push([data[i], data[i + 1], data[i + 2]])
      }

      let centers: [number, number, number][] = []
      for (let c = 0; c < k; c++) {
        centers.push(pixels[Math.floor((c / k) * pixels.length)] || [128,128,128])
      }

      for (let iter = 0; iter < 5; iter++) {
        const sums   = Array.from({ length: k }, () => [0, 0, 0, 0])
        for (const [r, g, b] of pixels) {
          let best = 0, bestD = Infinity
          centers.forEach(([cr, cg, cb], j) => {
            const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
            if (d < bestD) { bestD = d; best = j }
          })
          sums[best][0] += r; sums[best][1] += g; sums[best][2] += b; sums[best][3]++
        }
        centers = sums.map(([r, g, b, n]) => n > 0 ? [r / n, g / n, b / n] : [128, 128, 128]) as [number, number, number][]
      }

      const hex = centers
        .sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))
        .map(([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''))
      resolve(hex)
    }
    img.onerror = () => resolve(['#cccccc'])
    img.src = imageUrl
  })
}

// ─── Get Image Aspect Ratio ────────────────────────────────────────────────
function getImageAspect(imageUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.width / img.height)
    img.onerror = () => resolve(1)
    img.src = imageUrl
  })
}

// ─── Auto Background Removal (Magic Wand on Corners) ──────────────────────
export function removeBackgroundClientSide(imageUrl: string, tolerance: number = 65): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(imageUrl)

      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data
      const w = canvas.width, h = canvas.height

      const mask = new Uint8Array(w * h)
      const stack: [number, number][] = []
      const corners = [[0,0], [w-1, 0], [0, h-1], [w-1, h-1]]
      
      const isSimilar = (x: number, y: number, refR: number, refG: number, refB: number) => {
          const p = (y * w + x) * 4
          if (data[p+3] < 10) return false // already transparent
          const d = Math.sqrt((data[p]-refR)**2 + (data[p+1]-refG)**2 + (data[p+2]-refB)**2)
          return d <= tolerance
      }

      corners.forEach(([cx, cy]) => {
         const p = (cy * w + cx) * 4
         const r = data[p], g = data[p+1], b = data[p+2], a = data[p+3]
         if (a < 10 || mask[cy*w+cx]) return // Skip if transparent or already processed
         
         stack.push([cx, cy])
         mask[cy*w+cx] = 1

         const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
         while(stack.length > 0) {
             const [x, y] = stack.pop()!
             for (const [dx, dy] of dirs) {
                 const nx = x+dx, ny = y+dy
                 if (nx>=0 && nx<w && ny>=0 && ny<h) {
                     if (mask[ny*w+nx] === 0 && isSimilar(nx, ny, r, g, b)) {
                         mask[ny*w+nx] = 1
                         stack.push([nx,ny])
                     }
                 }
             }
         }
      })

      // Dilation pass on background mask to eat 1 more pixel of fringing/anti-aliasing
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

      // Apply transparent mask!
      let modified = false
      for (let i = 0; i < dilatedMask.length; i++) {
          if (dilatedMask[i] === 1) {
             data[i*4] = 0
             data[i*4 + 1] = 0
             data[i*4 + 2] = 0
             data[i*4 + 3] = 0 // Fully transparent!
             modified = true
          }
      }
      
      if (!modified) return resolve(imageUrl) // nothing removed
          
      // Super important: clear rect ensures NO old pixels bleed through
      ctx.clearRect(0, 0, w, h)
      ctx.putImageData(imgData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(imageUrl)
    img.src = imageUrl
  })
}

export function useImageTo3D() {
  const {
    setImageTexture,
    setImageColors,
    setImageShape,
    setConversionStep,
    setConversionError,
    setMaterial,
  } = useShoeStore()

  const convert = useCallback(async (file: File, autoRemoveBg: boolean = true) => {
    try {
      setConversionStep('loading', 5)
      if (!file.type.startsWith('image/')) {
        setConversionError('Fichier non supporté.')
        return
      }

      let imageUrl = URL.createObjectURL(file)

      setConversionStep('analyzing', 20)
      
      if (autoRemoveBg) {
         imageUrl = await removeBackgroundClientSide(imageUrl, 25)
      }
      const aspect = await getImageAspect(imageUrl)
      await new Promise(r => setTimeout(r, 200))

      setConversionStep('extracting', 40)
      const dominantColors = await extractDominantColors(imageUrl, 6)
      setImageColors(dominantColors)
      await new Promise(r => setTimeout(r, 400))

      setConversionStep('building', 70)
      // Pass the aspect ratio via imageShape (we no longer trace points directly)
      setImageShape({ top: [], bottom: [], aspect })
      await new Promise(r => setTimeout(r, 400))

      setConversionStep('texturing', 90)
      setImageTexture(imageUrl)

      // Set base materials from palette
      const mainColor = dominantColors[0] || '#e2e8f0'
      const soleColor = dominantColors[dominantColors.length - 1] || '#1e293b'

      setMaterial('upper',  { color: mainColor, textureType: 'custom' })
      setMaterial('sole',   { color: soleColor, textureType: 'matte'  })
      setMaterial('toecap', { color: mainColor, textureType: 'leather'})
      setMaterial('laces',  { color: mainColor, textureType: 'fabric' })

      await new Promise(r => setTimeout(r, 300))
      setConversionStep('done', 100)

    } catch (err) {
      console.error('PNG→3D error:', err)
      setConversionError('Erreur lors de la conversion.')
    }
  }, [setConversionStep, setConversionError, setImageTexture, setImageColors, setImageShape, setMaterial])

  return { convert }
}
