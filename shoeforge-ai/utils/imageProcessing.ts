export function magicWand(
  imgData: ImageData,
  startX: number,
  startY: number,
  tolerance: number = 30
): Uint8Array {
  const w = imgData.width
  const h = imgData.height
  const data = imgData.data
  const mask = new Uint8Array(w * h)

  const startIndex = (startY * w + startX) * 4
  const startR = data[startIndex]
  const startG = data[startIndex + 1]
  const startB = data[startIndex + 2]

  // If clicked on transparent, abort
  if (data[startIndex + 3] < 50) return mask

  const stack: [number, number][] = [[startX, startY]]
  mask[startY * w + startX] = 1

  const colorDistance = (r: number, g: number, b: number) => {
    return Math.sqrt(
      (r - startR) ** 2 +
      (g - startG) ** 2 +
      (b - startB) ** 2
    )
  }

  // 4-way flood fill
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()!

    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy

      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const idx = ny * w + nx
        if (mask[idx] === 0) {
          const pIdx = idx * 4
          // Ignore transparent pixels boundary
          if (data[pIdx + 3] < 50) continue

          const dist = colorDistance(data[pIdx], data[pIdx + 1], data[pIdx + 2])
          if (dist <= tolerance) {
            mask[idx] = 1
            stack.push([nx, ny])
          }
        }
      }
    }
  }

  // Dilation (expand mask by 1 pixel) to avoid jagged white edges!
  const dilatedMask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        dilatedMask[y * w + x] = 1
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            dilatedMask[ny * w + nx] = 1
          }
        }
      }
    }
  }

  return dilatedMask
}

export function applyColorToMask(
  originalData: ImageData,
  targetData: ImageData,
  mask: Uint8Array,
  targetColorHex: string
) {
  const c = targetColorHex.replace('#', '')
  const tr = parseInt(c.substring(0, 2), 16)
  const tg = parseInt(c.substring(2, 4), 16)
  const tb = parseInt(c.substring(4, 6), 16)

  const w = originalData.width
  const h = originalData.height

  for (let i = 0; i < w * h; i++) {
    if (mask[i] === 1) {
      const pIdx = i * 4
      const or = originalData.data[pIdx]
      const og = originalData.data[pIdx + 1]
      const ob = originalData.data[pIdx + 2]

      // Luminosity blending
      const lumOrig = 0.299 * or + 0.587 * og + 0.114 * ob
      
      // To prevent dark colors washing out, we blend the color using Hard Light or Overlay
      // Simplest method: Tinting based on target color but scaled by original luminosity
      // normalized lum (0-1)
      const lumNorm = lumOrig / 255.0
      
      // Target Color scaled by orig lum 
      // If orig is white (lumNorm=1) -> target color
      // If orig is black (lumNorm=0) -> black
      targetData.data[pIdx] = Math.min(255, tr * lumNorm * 1.5) // slight boost
      targetData.data[pIdx + 1] = Math.min(255, tg * lumNorm * 1.5)
      targetData.data[pIdx + 2] = Math.min(255, tb * lumNorm * 1.5)
    }
  }
}
