import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";

// ─── design tokens ────────────────────────────────────────────────────────────
const COLOR_BG = "#111112";
const COLOR_INK = "#f7f7f6";
const COLOR_MUTE = "rgba(247,247,246,0.45)";
const COLOR_GREEN = "#5ec97b";
const FONT_DISPLAY = "'Satoshi','Switzer',system-ui,sans-serif";
const FONT_SANS = "'Switzer',system-ui,sans-serif";
const FONT_MONO = "ui-monospace,'JetBrains Mono',Menlo,monospace";

// ─── grid ─────────────────────────────────────────────────────────────────────
const COLS = 124;
const ROWS = 124;
const CUBE_SIZE = 0.5;    // width/depth of each cube face
const GAP = 0.03;   // gap between cubes
const STEP = CUBE_SIZE + GAP;

// resting noise height range — cubes already varied like in the reference
const NOISE_MIN = -0.3;
const NOISE_MAX = 2.4;

// ─── mouse extrude ────────────────────────────────────────────────────────────
const M_RADIUS = 1.5;
const M_MAX = 2.0;    // extra height on top of noise
const M_FALLOFF = 1.8;
const LERP = 0.3;

// ─── idle pulse (line sweeps) ─────────────────────────────────────────────────
const PULSE_W = 2.8;   // band width in world units
const PULSE_H = 2.2;   // extra extrude height
const PULSE_SPD_MIN = 2.0;
const PULSE_SPD_MAX = 3.8;
const PULSE_FADE = 1.5;
const PULSE_INT_MIN = 1.2;
const PULSE_INT_MAX = 3.5;
const PULSE_MAX = 3;

const GW = (COLS - 1) * STEP;
const GH = (ROWS - 1) * STEP;

// ─── noise ────────────────────────────────────────────────────────────────────
function h(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function sn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return h(ix, iy) + (h(ix + 1, iy) - h(ix, iy)) * ux + (h(ix, iy + 1) - h(ix, iy)) * uy
    + (h(ix + 1, iy + 1) - h(ix + 1, iy) - h(ix, iy + 1) + h(ix, iy)) * ux * uy;
}
function fbm(x, y) {
  return sn(x, y) * 0.5 + sn(x * 2.1, y * 2.1) * 0.25 + sn(x * 4.2, y * 4.2) * 0.125;
}

// ─── pulse factory ───────────────────────────────────────────────────────────
const DIRS = [
  { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
  { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
  { dx: 1, dy: 0.3 }, { dx: -1, dy: 0.3 },
];
function mkPulse() {
  const raw = DIRS[Math.floor(Math.random() * DIRS.length)];
  const len = Math.sqrt(raw.dx * raw.dx + raw.dy * raw.dy);
  const dx = raw.dx / len, dy = raw.dy / len;
  const speed = PULSE_SPD_MIN + Math.random() * (PULSE_SPD_MAX - PULSE_SPD_MIN);
  const hw = GW / 2 + PULSE_W * 2, hh = GH / 2 + PULSE_W * 2;
  let sx, sy;
  if (Math.abs(dx) > Math.abs(dy)) {
    sx = dx > 0 ? -hw : hw; sy = (Math.random() - 0.5) * GH;
  } else {
    sx = (Math.random() - 0.5) * GW; sy = dy > 0 ? -hh : hh;
  }
  const travel = Math.sqrt((GW + PULSE_W * 6) ** 2 + (GH + PULSE_W * 6) ** 2);
  return { x: sx, y: sy, dx, dy, speed, elapsed: 0, duration: travel / speed, alive: true };
}

// ─── colors ───────────────────────────────────────────────────────────────────
// reference is white/light-grey — we do dark navy version
const C_BASE = new THREE.Color("#d8e8f5");   // cool near-white for cube tops
const C_SIDE = new THREE.Color("#9ab8d4");   // slightly darker for sides
const C_HIGH = new THREE.Color("#ffffff");   // peak highlight

// ─── main grid component ──────────────────────────────────────────────────────
function CubeGrid({ mouseNDC }) {
  const ref = useRef();
  const { camera } = useThree();
  const count = COLS * ROWS;

  const currH = useRef(new Float32Array(count));
  const targH = useRef(new Float32Array(count));
  const pulses = useRef([]);
  const nextPt = useRef(0.5);

  const { pos, noiseH, noiseCol } = useMemo(() => {
    const pos = new Float32Array(count * 4);
    const noiseH = new Float32Array(count);
    const noiseCol = new Float32Array(count);
    const ox = (COLS - 1) * STEP / 2, oy = (ROWS - 1) * STEP / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        pos[i * 2] = c * STEP - ox;
        pos[i * 2 + 1] = r * STEP - oy;
        const f = fbm(c * 0.22, r * 0.22);
        noiseH[i] = NOISE_MIN + f * (NOISE_MAX - NOISE_MIN);
        noiseCol[i] = fbm(c * 0.41 + 7, r * 0.41 + 3); // separate noise for color variation
      }
    }
    // init current heights to noise so it starts looking like the reference
    for (let i = 0; i < count; i++) currH.current[i] = noiseH[i];
    return { pos, noiseH, noiseCol };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colTmp = useMemo(() => new THREE.Color(), []);

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const mWorld = useRef(new THREE.Vector2(99999, 99999));

  useFrame(({ delta }) => {
    // unproject mouse
    ray.setFromCamera(mouseNDC.current, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      mWorld.current.set(hit.x, hit.y);
    }

    const mesh = ref.current;
    if (!mesh) return;

    // pulse lifecycle
    nextPt.current -= delta;
    const alive = pulses.current.filter(p => p.alive);
    if (nextPt.current <= 0 && alive.length < PULSE_MAX) {
      pulses.current.push(mkPulse());
      nextPt.current = PULSE_INT_MIN + Math.random() * (PULSE_INT_MAX - PULSE_INT_MIN);
    }
    for (const p of alive) {
      p.elapsed += delta;
      p.x += p.dx * p.speed * delta;
      p.y += p.dy * p.speed * delta;
      if (p.elapsed >= p.duration) p.alive = false;
    }
    if (pulses.current.length > 40) pulses.current = pulses.current.filter(p => p.alive);
    const ap = pulses.current.filter(p => p.alive);

    const mx = mWorld.current.x, my = mWorld.current.y;

    for (let i = 0; i < count; i++) {
      const px = pos[i * 2], py = pos[i * 2 + 1];

      // mouse bump
      const ddx = px - mx, ddy = py - my;
      const md = Math.sqrt(ddx * ddx + ddy * ddy);
      const mProx = Math.max(0, 1 - md / M_RADIUS);
      const mH = Math.pow(mProx, M_FALLOFF) * M_MAX;

      // pulse bumps
      let pH = 0;
      for (const p of ap) {
        const rx = px - p.x, ry = py - p.y;
        const along = rx * p.dx + ry * p.dy;
        const perp = Math.abs(rx * (-p.dy) + ry * p.dx);
        if (Math.abs(along) > PULSE_W) continue;
        const profile = Math.cos((along / PULSE_W) * Math.PI * 0.5);
        const soft = Math.max(0, 1 - perp / (GW * 0.5));
        const fi = Math.min(1, p.elapsed / PULSE_FADE);
        const fo = Math.min(1, (p.duration - p.elapsed) / PULSE_FADE);
        pH += profile * soft * fi * fo * PULSE_H;
      }

      // target = noise base + mouse + pulse
      targH.current[i] = noiseH[i] + mH + pH;
      currH.current[i] += (targH.current[i] - currH.current[i]) * LERP;
      const ch = currH.current[i];

      // position + scale — cube base at z=0, top at z=ch
      dummy.position.set(px, py, ch * 0.5);
      dummy.scale.set(1, 1, Math.max(0.01, ch) / CUBE_SIZE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // color: top faces brightened by height + mouse proximity
      const heightT = Math.min(1, (ch - NOISE_MIN) / (M_MAX + PULSE_H));
      const mT = Math.pow(Math.max(0, 1 - md / M_RADIUS), 2.0);
      const pT = Math.min(1, pH / PULSE_H);
      const t = Math.min(1, heightT * 0.4 + mT * 0.8 + pT * 0.6);
      colTmp.copy(C_BASE).lerp(C_HIGH, t);
      // darken short cubes slightly for depth
      colTmp.multiplyScalar(0.72 + noiseCol[i] * 0.28 + t * 0.15);
      mesh.setColorAt(i, colTmp);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[null, null, count]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
      <meshStandardMaterial roughness={0.3} metalness={0.05} />
    </instancedMesh>
  );
}

// ─── scene setup ──────────────────────────────────────────────────────────────
function Scene({ mouseNDC }) {
  return (
    <>
      <ambientLight intensity={0.45} color="#eef4fa" />

      <directionalLight
        position={[-12, 12, 18]}
        intensity={4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />

      <directionalLight
        position={[12, 4, 8]}
        intensity={0.8}
        color="#dce9f5"
      />

      <directionalLight
        position={[18, -10, 12]}
        intensity={1.25}
        color="#ffffff"
      />

      <CubeGrid mouseNDC={mouseNDC} />
      <mesh receiveShadow position={[0, 0, -0.15]}>
        <planeGeometry args={[300, 300]} />
        <shadowMaterial opacity={0.18} />
      </mesh>

    </>
  );
}


// ─── root ─────────────────────────────────────────────────────────────────────
export default function HeroSection({ className = "", style = {} }) {
  const mouseNDC = useRef(new THREE.Vector2(99999, 99999));

  return (
    <section
      className={className}
      style={{
        position: "relative", width: "100%", height: "100vh",
        minHeight: 600, background: "#e8eef4", overflow: "hidden",
        ...style,
      }}
      onMouseMove={(e) => {
        mouseNDC.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseNDC.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      }}
      onMouseLeave={() => mouseNDC.current.set(99999, 99999)}
    >
      <Canvas
        // angled camera like the reference — looking down at ~35°
        camera={{
          position: [
            GH * 0.2,      // Move less negative for wider grid
            -GH * 0.3,     // Adjust vertical angle  
            GH * 0.35        // Pull camera back to see more
          ],
          fov: 48, up: [0.0, .0, 0.0]
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true, alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}

        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >

        <color attach="background" args={["#e8eef4"]} />
        <Scene mouseNDC={mouseNDC} />
        <fog attach="fog" args={["#e8eef4", 25, 95]} />
        <fog attach="fog" args={["#e8eef4", 15, 70]} />
      </Canvas>


      {/* soft vignette to fade edges */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(70% 70% at 50% 50%, transparent 40%, rgba(232,238,244,0.5) 75%, rgba(232,238,244,0.95) 100%)",
      }} />

      {/* text overlay — dark ink on light bg */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-start",
        padding: "0 clamp(1.0rem,2vw,6rem)", pointerEvents: "none",
      }}>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            padding: "100px 120px",
            borderRadius: "18px",

            border: "1px solid rgba(255,255,255,0.45)",
            boxShadow: `
      0 12px 40px rgba(13,31,45,0.08),
      inset 0 1px 0 rgba(255,255,255,0.7)
    `,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        >
          <p style={{
            fontFamily: FONT_MONO, fontSize: "0.72rem", textTransform: "uppercase",
            letterSpacing: "0.16em", color: "rgba(20,40,60,0.5)", margin: "0 0 1.4rem",
          }}>
            <span style={{ color: "#2a7a4a", marginRight: "0.5em" }}>●</span>
            Full-stack AI studio
          </p>

          <h1 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 900,
            fontSize: "clamp(2.8rem,7vw,6.5rem)", lineHeight: 1.02,
            letterSpacing: "-0.03em", color: "#0d1f2d",
            margin: "0 0 1.4rem", maxWidth: "14ch",
          }}>
            Full-stack systems,{" "}
            <span style={{ color: "transparent", WebkitTextStroke: "1.5px #0d1f2d", opacity: 0.45 }}>
              built and operated
            </span>{" "}
            by AI.
          </h1>

          <p style={{
            fontFamily: FONT_SANS, fontSize: "clamp(1rem,1.6vw,1.2rem)",
            color: "rgba(13,31,45,0.6)", margin: "0 0 2.8rem",
            maxWidth: "42ch", lineHeight: 1.6,
          }}>
            Websites, SaaS platforms, backend infrastructure, AI agents.{" "}
            <em style={{ fontStyle: "normal", color: "#0d1f2d", opacity: 0.85 }}>One studio.</em>
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", pointerEvents: "auto" }}>
            <a href="#work" style={{
              fontFamily: FONT_SANS, fontWeight: 600, fontSize: "0.9rem",
              background: "#0d1f2d", color: "#f7f7f6",
              padding: "0.65rem 1.4rem", borderRadius: "999px", textDecoration: "none",
            }}>View work →</a>
            <a href="#contact" style={{
              fontFamily: FONT_SANS, fontWeight: 500, fontSize: "0.9rem",
              color: "rgba(13,31,45,0.6)", padding: "0.65rem 1.4rem", borderRadius: "999px",
              border: "1px solid rgba(13,31,45,0.2)", textDecoration: "none",
            }}>Start a conversation</a>
          </div>
        </div>
      </div>
    </section>
  );
}

