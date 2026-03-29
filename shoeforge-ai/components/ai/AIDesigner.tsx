'use client'
import { useState, useCallback } from 'react'
import { useShoeStore } from '@/stores/shoeStore'

const STYLE_PRESETS = [
  { emoji: '✨', label: 'Luxe Noir & Or', prompt: 'luxury black gold leather, golden metallic accents, premium designer' },
  { emoji: '🔥', label: 'Streetwear Rouge', prompt: 'urban streetwear bold red neon, graffiti pattern, hypebeast style' },
  { emoji: '🌿', label: 'Nature & Bois', prompt: 'natural wood grain organic, earthy brown tones, eco sustainable' },
  { emoji: '🌌', label: 'Galaxie Holographique', prompt: 'galaxy nebula space, iridescent holographic glitter, cosmic purple blue' },
  { emoji: '🐍', label: 'Peau de Serpent', prompt: 'python snake skin exotic reptile leather, green black pattern' },
  { emoji: '🌸', label: 'Floral Japonais', prompt: 'japanese sakura floral pattern, pink white delicate flowers, zen aesthetic' },
  { emoji: '⚡', label: 'Cyber Néon', prompt: 'cyberpunk neon electric blue yellow, tech grid pattern, futuristic' },
  { emoji: '🏆', label: 'Or Massif', prompt: 'solid gold metallic gleaming, luxury 24k gold surface, premium shine' },
]

type GenStatus = 'idle' | 'generating' | 'done' | 'error'

export default function AIDesigner() {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<GenStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  const { selectedPart, setMaterial } = useShoeStore()

  // Simulated AI generation (V1 — offline demo)
  // In V2, replace with real API call to FastAPI backend
  const generate = useCallback(async () => {
    if (!prompt.trim() || !selectedPart) return

    setStatus('generating')
    setProgress(0)
    setMessage('Analyse du style...')

    // Simulate multi-step processing
    const steps = [
      { pct: 15, msg: 'Analyse sémantique du prompt...' },
      { pct: 35, msg: 'Génération de la texture...' },
      { pct: 60, msg: 'Application du style IA...' },
      { pct: 82, msg: 'Optimisation PBR...' },
      { pct: 100, msg: 'Finalisation...' },
    ]

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600))
      setProgress(step.pct)
      setMessage(step.msg)
    }

    // Apply AI-inspired material based on keywords in prompt
    const p = prompt.toLowerCase()
    let color = '#7c3aed'
    let roughness = 0.5
    let metalness = 0.1

    if (p.includes('or') || p.includes('gold')) { color = '#d97706'; metalness = 0.8; roughness = 0.2 }
    else if (p.includes('noir') || p.includes('black')) { color = '#0f172a'; roughness = 0.6 }
    else if (p.includes('rouge') || p.includes('red')) { color = '#dc2626'; roughness = 0.5 }
    else if (p.includes('galaxie') || p.includes('cosmos')) { color = '#4c1d95'; metalness = 0.3; roughness = 0.3 }
    else if (p.includes('bois') || p.includes('wood')) { color = '#92400e'; roughness = 0.9 }
    else if (p.includes('serpent') || p.includes('snake')) { color = '#166534'; roughness = 0.7 }
    else if (p.includes('floral') || p.includes('rose')) { color = '#db2777'; roughness = 0.6 }
    else if (p.includes('cyber') || p.includes('néon') || p.includes('neon')) { color = '#0ea5e9'; metalness = 0.4; roughness = 0.2 }
    else if (p.includes('blanc') || p.includes('white')) { color = '#f8fafc'; roughness = 0.4 }
    else if (p.includes('luxe') || p.includes('premium')) { color = '#1c1917'; metalness = 0.5; roughness = 0.3 }

    setMaterial(selectedPart, { color, roughness, metalness })
    setStatus('done')
    setMessage(`✅ Texture "${prompt}" appliquée sur ${selectedPart}`)

    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 3000)
  }, [prompt, selectedPart, setMaterial])

  return (
    <div className="ai-panel">
      {/* Badge */}
      <div className="ai-badge">
        🤖 IA Designer
      </div>

      {/* Info */}
      {!selectedPart && (
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '12px',
          color: '#f59e0b',
        }}>
          ⚠️ Sélectionnez d&apos;abord une zone dans l&apos;onglet Style
        </div>
      )}

      {selectedPart && (
        <div style={{
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '12px',
          color: 'var(--accent-2)',
        }}>
          Zone active : <strong style={{ textTransform: 'capitalize' }}>{selectedPart}</strong>
        </div>
      )}

      {/* Style Presets */}
      <div>
        <div className="section-title">Styles prédéfinis</div>
        <div className="presets-scroll">
          {STYLE_PRESETS.map(s => (
            <button
              key={s.label}
              className="preset-chip"
              onClick={() => setPrompt(s.prompt)}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="prompt-area">
        <div className="section-title">Prompt personnalisé</div>
        <textarea
          className="prompt-textarea"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder='Ex: "velours violet rétro", "camouflage digital militaire", "marbre blanc et or"...'
          rows={3}
        />
        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={status === 'generating' || !prompt.trim() || !selectedPart}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {status === 'generating' ? `Génération... ${progress}%` : '✨ Générer avec l\'IA'}
        </button>
      </div>

      {/* Progress */}
      {status === 'generating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="generating-indicator">
            <div className="pulse-dot" />
            <span>{message}</span>
          </div>
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Done message */}
      {status === 'done' && (
        <div style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '12px',
          color: '#10b981',
        }}>
          {message}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        padding: '10px 12px',
        background: 'var(--bg-glass)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}>
        💡 <strong>V1 Demo</strong> — Simulation locale. En V2, connectez à votre
        backend FastAPI + Stable Diffusion XL pour la génération réelle de textures.
      </div>
    </div>
  )
}
