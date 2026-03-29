'use client'
import { useCallback, useRef } from 'react'
import { useShoeStore } from '@/stores/shoeStore'

export function useGLBExporter() {
  const sceneRef = useRef<THREE.Scene | null>(null)

  const exportGLB = useCallback(async (filename = 'oussamashoes-model') => {
    try {
      // Dynamic import to avoid SSR issues
      const THREE = await import('three')
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')

      const { materials } = useShoeStore.getState()

      // Build a minimal exportable scene from store materials
      const scene = new THREE.Scene()
      const group = new THREE.Group()
      group.name = 'OussamaShoesModel'

      const parts = [
        { name: 'upper',  geo: new THREE.BoxGeometry(2.2, 0.42, 0.82),        pos: [-0.05, 0.18, 0] },
        { name: 'sole',   geo: new THREE.BoxGeometry(2.6, 0.12, 0.95),        pos: [0,    -0.18, 0] },
        { name: 'toecap', geo: new THREE.SphereGeometry(0.46, 32, 16, 0, Math.PI, 0, Math.PI * 0.6), pos: [1.05, 0.1, 0] },
        { name: 'tongue', geo: new THREE.BoxGeometry(1.0, 0.18, 0.55),         pos: [-0.1, 0.38, 0] },
        { name: 'laces',  geo: new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8), pos: [0.1, 0.42, 0] },
      ]

      const texLoader = new THREE.TextureLoader()
      const { imageTexture } = useShoeStore.getState()

      for (const p of parts) {
        const m = materials[p.name] ?? { color: '#cccccc', roughness: 0.7, metalness: 0 }
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(m.color),
          roughness: m.roughness,
          metalness: m.metalness,
        })
        if (imageTexture && p.name === 'upper') {
          try {
            const t = texLoader.load(imageTexture)
            mat.map = t
          } catch {}
        }
        const mesh = new THREE.Mesh(p.geo, mat)
        mesh.name = p.name
        mesh.position.set(...(p.pos as [number, number, number]))
        group.add(mesh)
      }

      scene.add(group)

      const exporter = new GLTFExporter()

      // Export as GLB (binary)
      exporter.parse(
        scene,
        (result) => {
          const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })
          const url  = URL.createObjectURL(blob)
          const a    = document.createElement('a')
          a.href     = url
          a.download = `${filename}.glb`
          a.click()
          URL.revokeObjectURL(url)
        },
        (err) => { console.error('GLB export error:', err) },
        { binary: true }
      )
    } catch (err) {
      console.error('Export setup error:', err)
    }
  }, [])

  const exportGLTF = useCallback(async (filename = 'oussamashoes-model') => {
    try {
      const THREE = await import('three')
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
      const { materials } = useShoeStore.getState()

      const scene = new THREE.Scene()
      const group = new THREE.Group()
      group.name = 'OussamaShoesModel'

      const parts = [
        { name: 'upper',  geo: new THREE.BoxGeometry(2.2, 0.42, 0.82), pos: [-0.05, 0.18, 0] },
        { name: 'sole',   geo: new THREE.BoxGeometry(2.6, 0.12, 0.95), pos: [0,    -0.18, 0] },
        { name: 'toecap', geo: new THREE.SphereGeometry(0.46, 16, 8),  pos: [1.05,  0.1,  0] },
        { name: 'tongue', geo: new THREE.BoxGeometry(1.0, 0.18, 0.55), pos: [-0.1,  0.38, 0] },
      ]

      for (const p of parts) {
        const m = materials[p.name] ?? { color: '#cccccc', roughness: 0.7, metalness: 0 }
        const mat  = new THREE.MeshStandardMaterial({
          color: new THREE.Color(m.color),
          roughness: m.roughness,
          metalness: m.metalness,
        })
        const mesh = new THREE.Mesh(p.geo, mat)
        mesh.name  = p.name
        mesh.position.set(...(p.pos as [number, number, number]))
        group.add(mesh)
      }
      scene.add(group)

      const exporter = new GLTFExporter()
      exporter.parse(
        scene,
        (result) => {
          const json  = JSON.stringify(result, null, 2)
          const blob  = new Blob([json], { type: 'application/json' })
          const url   = URL.createObjectURL(blob)
          const a     = document.createElement('a')
          a.href      = url
          a.download  = `${filename}.gltf`
          a.click()
          URL.revokeObjectURL(url)
        },
        (err) => { console.error('GLTF export error:', err) },
        { binary: false }
      )
    } catch (err) {
      console.error('Export setup error:', err)
    }
  }, [])

  return { sceneRef, exportGLB, exportGLTF }
}

// Type import only for ref declaration
import type * as THREE from 'three'
