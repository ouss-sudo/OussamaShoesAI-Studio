
export default function ShoeViewer3D() {
  const {
    imageTexture,
    selectionMode, paintMode,
    stickerImg, stickerScale, stickerRotation,
  } = useShoeStore()

  const controlsRef = useRef<any>(null)
  const [hasActiveSelection, setHasActiveSelection] = useState(false)
  const [commitCurrentTint, setCommitCurrentTint] = useState<(() => void) | null>(null)
  const [resetAllColors, setResetAllColors] = useState<(() => void) | null>(null)
  const [restoreZone, setRestoreZone] = useState<(() => void) | null>(null)

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
