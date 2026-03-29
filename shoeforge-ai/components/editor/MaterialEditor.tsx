'use client'
import { HexColorPicker } from 'react-colorful'
import { useShoeStore } from '@/stores/shoeStore'

const PARTS = [
  { id: 'upper',  label: 'Upper',   icon: '👟' },
  { id: 'toecap', label: 'Bout',    icon: '💡' },
  { id: 'sole',   label: 'Semelle', icon: '⬛' },
  { id: 'laces',  label: 'Lacets',  icon: '🎀' },
  { id: 'tongue', label: 'Languette', icon: '👅' },
]

const COLOR_PRESETS = [
  '#ffffff', '#f1f5f9', '#94a3b8', '#334155', '#0f172a',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#7c3aed', '#1e40af', '#065f46', '#7f1d1d', '#292524',
]

export default function MaterialEditor() {
  const { materials, selectedPart, setMaterial, setSelectedPart } = useShoeStore()
  const current = selectedPart ? materials[selectedPart] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Part Selector */}
      <div>
        <div className="section-title">Zone à modifier</div>
        <div className="parts-grid">
          {PARTS.map(p => (
            <button
              key={p.id}
              className={`part-btn ${selectedPart === p.id ? 'active' : ''}`}
              onClick={() => setSelectedPart(p.id)}
            >
              <span className="part-icon">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {current && selectedPart && (
        <>
          <div className="divider" />

          {/* Color Picker */}
          <div className="color-section">
            <div className="section-title">Couleur</div>
            <HexColorPicker
              color={current.color}
              onChange={(color) => setMaterial(selectedPart, { color })}
              style={{ width: '100%', height: '150px', borderRadius: '12px' }}
            />
            <div className="color-presets">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${current.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setMaterial(selectedPart, { color: c })}
                  title={c}
                />
              ))}
            </div>
            <div className="color-hex-input">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HEX</span>
              <input
                value={current.color}
                onChange={e => setMaterial(selectedPart, { color: e.target.value })}
                maxLength={7}
                spellCheck={false}
              />
              <div
                style={{
                  width: 20, height: 20,
                  background: current.color,
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>

          <div className="divider" />

          {/* Texture Type */}
          <div>
            <div className="section-title">Matière</div>
            <div className="texture-grid">
              {[
                { id: 'leather', label: 'Cuir',    gradient: 'linear-gradient(135deg, #78350f, #92400e)' },
                { id: 'fabric',  label: 'Tissu',   gradient: 'repeating-linear-gradient(45deg, #1e293b 0, #1e293b 2px, #293548 2px, #293548 8px)' },
                { id: 'suede',   label: 'Daim',    gradient: 'linear-gradient(135deg, #b45309, #d97706)' },
                { id: 'glossy',  label: 'Brillant', gradient: 'linear-gradient(135deg, #1e40af, #3b82f6, #bfdbfe)' },
                { id: 'matte',   label: 'Mat',     gradient: 'linear-gradient(135deg, #374151, #4b5563)' },
              ].map(t => (
                <button
                  key={t.id}
                  className={`texture-swatch ${current.textureType === t.id ? 'active' : ''}`}
                  data-label={t.label}
                  style={{ background: t.gradient }}
                  title={t.label}
                  onClick={() => {
                    const roughMap: Record<string, number> = {
                      leather: 0.7, fabric: 0.9, suede: 0.95, glossy: 0.1, matte: 0.98
                    }
                    const metalMap: Record<string, number> = {
                      leather: 0, fabric: 0, suede: 0, glossy: 0.2, matte: 0
                    }
                    setMaterial(selectedPart, {
                      textureType: t.id as any,
                      roughness: roughMap[t.id],
                      metalness: metalMap[t.id],
                    })
                  }}
                />
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Sliders */}
          <div className="slider-group">
            <div className="section-title">Finition avancée</div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Rugosité</span>
                <span>{current.roughness.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={current.roughness}
                onChange={e => setMaterial(selectedPart, { roughness: +e.target.value })}
              />
            </div>

            <div className="slider-row">
              <div className="slider-label">
                <span>Métallisé</span>
                <span>{current.metalness.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={current.metalness}
                onChange={e => setMaterial(selectedPart, { metalness: +e.target.value })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
