import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, MeshTransmissionMaterial, Float, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

const COLOR_BG     = "#111112";
const COLOR_CYAN   = "#7fffd4";
const FONT_DISPLAY = "'Satoshi','Switzer',system-ui,sans-serif";
const FONT_SANS    = "'Switzer',system-ui,sans-serif";
const FONT_MONO    = "ui-monospace,'JetBrains Mono',Menlo,monospace";
const COLOR_INK    = "#f7f7f6";
const COLOR_MUTE   = "rgba(247,247,246,0.45)";
const COLOR_GREEN  = "#5ec97b";

/* different Z-spin speeds per mesh — tweak freely */
const SPIN_SPEEDS = [
  0.008, -0.005, 0.012, -0.009, 0.006,
  -0.014, 0.010, -0.007, 0.016, -0.011,
  0.009, -0.013, 0.011,
];

/* ── asset ── */
function HoloSphere({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const { scene } = useGLTF("/hero-asset.glb");
  const groupRef  = useRef<THREE.Group>(null!);

  const meshes = useMemo(() => {
    const acc: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
const hue = (180 + Math.random() * 120) % 360;
        const col = new THREE.Color(`hsl(${hue}, 90%, 72%)`);
        mesh.material = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 20.2,
          roughness: 0,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        acc.push(mesh);
      }
    });
    return acc;
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;

    /* gentle mouse tilt on the whole group */
groupRef.current.rotation.x += (-Math.PI / 2 + mouse.current.y * 0.6 - groupRef.current.rotation.x) * 0.05;
groupRef.current.rotation.z += (mouse.current.x * -0.6 - 0.15 - groupRef.current.rotation.z) * 0.05;

    /* spin each mesh on its own local Z only */
    meshes.forEach((mesh, i) => {
      mesh.rotation.y += SPIN_SPEEDS[i % SPIN_SPEEDS.length] * 0.25;
    });
  });

return (
    <Float speed={1.0} rotationIntensity={0} floatIntensity={0.35}>
      {/*
        -90° on X tips the model from "lying flat / rings facing up"
        to "rings facing the camera"
      */}
      <group ref={groupRef} position={[2, 0, 0]} scale={0.65} rotation={[0, 0, 0]}>
        {meshes.map((mesh, i) => (
          <primitive key={i} object={mesh} />
        ))}
      </group>
    </Float>
  );

}

/* ── dust ── */
function Dust() {
  const count = 500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('hsl(180, 100%, 50%)') },
    },
    vertexShader: `
      uniform float uTime;
      attribute float aOffset;
      void main() {
        vec3 pos = position;
        pos.y += sin(uTime * 0.4 + aOffset) * 0.3;
        pos.x += cos(uTime * 0.3 + aOffset) * 0.2;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 1.5;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColor * 10.0, 1.0 - d * 2.0);
      }
    `,
    transparent: true,
    depthWrite: false,
  }), []);

  const offsets = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null!);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <points position={[2, 0, 0]} ref={ref} material={mat}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aOffset" args={[offsets, 1]} />
      </bufferGeometry>
    </points>
  );
}

/* ── vignette plane baked from canvas ── */
function Vignette() {
  const texture = useMemo(() => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s/2, s/2, s*0.08, s/2, s/2, s*0.72);
    g.addColorStop(0,    "rgba(17,17,18,0)");
    g.addColorStop(0.45, "rgba(17,17,18,0.21)");
    g.addColorStop(1,    "rgba(17,17,18,0.97)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <mesh position={[0, 0, 4.5]} renderOrder={10}>
      <planeGeometry args={[28, 16]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/* ── lights (bright so bloom has fuel) ── */
function Lighting() {
  const pulsRef = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    if (pulsRef.current)
      pulsRef.current.intensity = 2.0 + Math.sin(clock.getElapsedTime() * 1.2) * 0.5;
  });
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 10]}   intensity={2.5} color={COLOR_CYAN} />
      <pointLight ref={pulsRef} position={[-4, 3, -2]} intensity={2.0} color="#4488ff" />
      <pointLight position={[4, -3, -1]} intensity={1.2} color="#00ffcc" />
    </>
  );
}

/* ── main export ── */
export default function HeroSection() {
  const mouse = useRef({ x: 0, y: 0 });

  return (
    <section
      style={{ position:"relative", width:"100%", height:"100vh", minHeight:600, background:COLOR_BG, overflow:"hidden" }}
      onMouseMove={(e) => {
        mouse.current.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }}
    >
      <Canvas
        camera={{ position:[0, 0, 7], fov:50 }}
        style={{ position:"absolute", inset:0 }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[COLOR_BG]} />
        <HoloSphere mouse={mouse} />
        <Vignette />
        <Dust />

        <EffectComposer>
          <Bloom
            intensity={1.6}        /* strength of the glow */
            luminanceThreshold={.9} /* only bright parts glow */
            luminanceSmoothing={0.8}
            mipmapBlur            /* smoother, less pixelated bloom */
          />
        </EffectComposer>
      </Canvas>

      {/* CSS vignette layer */}
      <div aria-hidden="true" style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(50% 50%, transparent 25.63%, rgba(17, 17, 18, 0.55) 87.39%, rgba(17, 17, 18, 0.96))"
      }} />

      {/* text overlay */}
      <div style={{
        position:"absolute", inset:0, display:"flex", flexDirection:"column",
        justifyContent:"center", alignItems:"flex-start",
        padding:"0 clamp(1.5rem,5vw,6rem)"
      }}>
        <p style={{ fontFamily:FONT_MONO, fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.16em", color:COLOR_MUTE, margin:"0 0 1.4rem" }}>
          <span style={{ color:COLOR_GREEN, marginRight:"0.5em" }}>●</span>
          Full-stack AI studio
        </p>

        <h1 style={{ fontFamily:FONT_DISPLAY, fontWeight:900, fontSize:"clamp(2.8rem,7vw,6.5rem)", lineHeight:1.02, letterSpacing:"-0.03em", color:COLOR_INK, margin:"0 0 1.4rem", maxWidth:"14ch" }}>
          Full-stack systems,{" "}
          <span style={{ color:"transparent", WebkitTextStroke:`1.5px ${COLOR_INK}`, opacity:0.6 }}>
            built and operated
          </span>{" "}
          by AI.
        </h1>

        <p style={{ fontFamily:FONT_SANS, fontSize:"clamp(1rem,1.6vw,1.2rem)", color:COLOR_MUTE, margin:"0 0 2.8rem", maxWidth:"42ch", lineHeight:1.6 }}>
          Websites, SaaS platforms, backend infrastructure, AI agents.{" "}
          <em style={{ fontStyle:"normal", color:COLOR_INK, opacity:0.8 }}>One studio.</em>
        </p>

        <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
          <a href="#work" style={{ fontFamily:FONT_SANS, fontWeight:600, fontSize:"0.9rem", background:COLOR_INK, color:COLOR_BG, padding:"0.65rem 1.4rem", borderRadius:"999px", textDecoration:"none" }}>
            View work →
          </a>
          <a href="#contact" style={{ fontFamily:FONT_SANS, fontWeight:500, fontSize:"0.9rem", color:COLOR_MUTE, padding:"0.65rem 1.4rem", borderRadius:"999px", border:"1px solid rgba(247,247,246,0.18)", textDecoration:"none" }}>
            Start a conversation
          </a>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload("/hero-asset.glb");
