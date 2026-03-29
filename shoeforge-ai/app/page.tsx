'use client'
import { useRouter } from 'next/navigation'

const features = [
  { icon: '🎨', title: 'Couleurs & Textures', desc: 'Personnalisez chaque zone : upper, semelle, lacets et plus encore.' },
  { icon: '🤖', title: 'IA Générative', desc: 'Décrivez un style en texte et laissez l\'IA créer votre texture unique.' },
  { icon: '🔄', title: 'Viewer 3D temps réel', desc: 'Visualisez votre création en 3D interactif avec éclairage PBR réaliste.' },
  { icon: '📤', title: 'Export HD', desc: 'Exportez votre design en PNG haute définition ou partagez le lien.' },
]

export default function Home() {
  const router = useRouter()

  return (
    <main className="landing">
      {/* Background orbs */}
      <div className="landing-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="hero-badge">
          ✨ Propulsé par Stable Diffusion XL
        </div>

        <h1 className="hero-title">
          Créez des chaussures<br />
          <span className="gradient-text">uniques avec l&apos;IA</span>
        </h1>

        <p className="hero-sub">
          Personnalisez chaque détail de vos chaussures en 3D.
          Couleurs, textures, motifs générés par intelligence artificielle.
          Votre design, votre vision.
        </p>

        <div className="hero-actions">
          <button
            className="btn btn-primary"
            style={{ fontSize: '16px', padding: '14px 32px' }}
            onClick={() => router.push('/studio')}
          >
            🚀 Lancer le Studio 3D
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '16px', padding: '14px 32px' }}>
            Voir les designs
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '40px',
          justifyContent: 'center',
          marginBottom: '60px',
          flexWrap: 'wrap',
        }}>
          {[
            { val: '10+', label: 'Modèles 3D' },
            { val: 'IA', label: 'Textures générées' },
            { val: '∞', label: 'Combinaisons' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '36px',
                fontWeight: '900',
                background: 'var(--gradient-hero)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{s.val}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
