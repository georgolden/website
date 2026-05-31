import { useRef, useMemo, useEffect, useState, useTransition, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, MeshTransmissionMaterial, Float, Sparkles, Environment, AccumulativeShadows, RandomizedLight, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

const COLOR_BG = "#ffffff";
const COLOR_CYAN = "#7fffd4";
const FONT_DISPLAY = "'Satoshi','Switzer',system-ui,sans-serif";
const FONT_SANS = "'Switzer',system-ui,sans-serif";
const FONT_MONO = "ui-monospace,'JetBrains Mono',Menlo,monospace";
const COLOR_INK = "#f7f7f6";
const COLOR_MUTE = "rgba(247,247,246,0.45)";
const COLOR_GREEN = "#5ec97b";

/* different Z-spin speeds per mesh — tweak freely */
const SPIN_SPEEDS = [
  0.008, -0.005, 0.012, -0.009, 0.006,
  -0.014, 0.010, -0.007, 0.016, -0.011,
  0.009, -0.013, 0.011,
];

type Bubble = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  originalParent: THREE.Object3D;
  originalPosition: THREE.Vector3;
  restScale: THREE.Vector3;
};

export function HoloSphere({
  mouse,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const { scene } = useGLTF("/hero-asset.glb");
  const groupRef = useRef<THREE.Group>(null!);
  const bubblesRef = useRef<Bubble[]>([]);
  const spawnTimerRef = useRef(0);
  const restScaleMap = useRef<Map<THREE.Mesh, THREE.Vector3>>(new Map());
  const floatingRef = useRef<Set<THREE.Mesh>>(new Set());

  const [meshes, lights, staticMeshes, surfaceMeshes] = useMemo(() => {
    const acc: THREE.Mesh[] = [];
    const staticMeshes: THREE.Mesh[] = [];
    const surfaceMeshes: THREE.Mesh[] = [];
    const lights: THREE.Light[] = [];

    scene.traverse((obj) => {
      if ((obj as THREE.Light).isLight) {
        const light = obj as THREE.Light;
        light.castShadow = true;
        lights.push(light);
      }

      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        if (mesh.name.includes("glow")) {
          const hue = (180 + Math.random() * 120) % 360;
          const col = new THREE.Color(`hsl(${hue}, 90%, 72%)`);
          mesh.material = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 3.2,
            roughness: 0,
            metalness: 0,
            side: THREE.DoubleSide,
          });
          acc.push(mesh);
        } else if (mesh.name.includes("surface")) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.side = THREE.DoubleSide;
          mat.transparent = true;
          // restScale capture + zeroing happens in useEffect below
          surfaceMeshes.push(mesh);
        } else {
          staticMeshes.push(mesh);
        }
      }
    });

    return [acc, lights, staticMeshes, surfaceMeshes];
  }, [scene]);

  // One-time setup: capture rest scales and hide all surface meshes
  // BEFORE the first spawner useEffect fires. Runs synchronously after
  // the first render so there's no visible flash.
  useEffect(() => {
    if (surfaceMeshes.length === 0) return;
    restScaleMap.current.clear();
    for (const mesh of surfaceMeshes) {
      // Clone scale now, while mesh is still at its authored rest pose
      restScaleMap.current.set(mesh, mesh.scale.clone());
      mesh.scale.setScalar(0);
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceMeshes]);

  const spawnBubble = useCallback(() => {
    const available = surfaceMeshes.filter((m) => !floatingRef.current.has(m));
    if (available.length === 0) return;

    const mesh = available[Math.floor(Math.random() * available.length)];
    floatingRef.current.add(mesh);

    const originalParent = mesh.parent!;
    const originalPosition = mesh.position.clone();

    const restScale = restScaleMap.current.get(mesh) ?? new THREE.Vector3(1, 1, 1);

    const parentWorldScale = new THREE.Vector3();
    originalParent.getWorldScale(parentWorldScale);

    const localSpeedY = 0.006 / parentWorldScale.y;
    const localSpeedX = 0.0025 / parentWorldScale.x;
    const localSpeedZ = 0.0012 / parentWorldScale.z;

    bubblesRef.current.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * localSpeedX,
        localSpeedY + Math.random() * (0.004 / parentWorldScale.y),
        (Math.random() - 0.5) * localSpeedZ
      ),
      life: 0,
      maxLife: 200 + Math.random() * 160,
      originalParent,
      originalPosition,
      restScale,
    });
  }, [surfaceMeshes]);

  // Staggered initial burst — runs after the setup effect above
  useEffect(() => {
    if (surfaceMeshes.length === 0) return;
    const ids = surfaceMeshes.map((_, i) =>
      setTimeout(() => spawnBubble(), i * 180)
    );
    return () => ids.forEach(clearTimeout);
  }, [surfaceMeshes, spawnBubble]);

  useFrame(() => {
    spawnTimerRef.current += 1;
    if (spawnTimerRef.current >= 30) {
      spawnTimerRef.current = 0;
      spawnBubble();
    }

    bubblesRef.current = bubblesRef.current.filter((b) => {
      b.life += 1;
      const t = b.life / b.maxLife;

      b.mesh.position.addScaledVector(b.velocity, 1);
      b.mesh.position.x += Math.sin(b.life * 0.1) * (0.002 / 0.65);

      // Pop-in: 0 → 1.3× overshoot → settle at 1×
      let scaleMult: number;
      if (t < 0.2) {
        const st = t / 0.2;
        scaleMult =
          st < 0.6 ? (st / 0.6) * 1.3 : 1.3 - ((st - 0.6) / 0.4) * 0.3;
      } else if (t > 0.75) {
        scaleMult = 1 - (t - 0.75) / 0.25;
      } else {
        scaleMult = 1.0;
      }

      const s = b.restScale.x * scaleMult;
      b.mesh.scale.setScalar(Math.max(0, s));

      const fadeIn = t < 0.2 ? t / 0.2 : 1;
      const fadeOut = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      (b.mesh.material as THREE.MeshStandardMaterial).opacity = fadeIn * fadeOut;

      if (b.life >= b.maxLife) {
        b.mesh.position.copy(b.originalPosition);
        b.mesh.scale.setScalar(0);
        (b.mesh.material as THREE.MeshStandardMaterial).opacity = 0;
        floatingRef.current.delete(b.mesh);
        return false;
      }

      return true;
    });
  });

  return (
    <Float speed={0.1} rotationIntensity={0} floatIntensity={0.25}>
      <group castShadow receiveShadow position={[2, 0, 0]} scale={0.65}>
        <group castShadow receiveShadow ref={groupRef} rotation={[0, 0, 0]}>
          {meshes.map((mesh, i) => (
            <primitive key={i} object={mesh} />
          ))}
          {surfaceMeshes.map((mesh, i) => (
            <primitive key={`surf_${i}`} object={mesh} />
          ))}
        </group>
        {lights.map((light, i) => (
          <primitive key={`light_${i}`} object={light} />
        ))}
        <group rotation={[0, 0, 0]}>
          {staticMeshes.map((mesh, i) => (
            <primitive key={`sm_${i}`} object={mesh} />
          ))}
        </group>
      </group>
    </Float>
  );
}


/* ── dust ── */
function Dust({ speed = 0.3 }: { speed?: number }) {
  const count = 100;
  const { scene } = useThree();
  const chipWorldPos = useRef(new THREE.Vector3());

  // Each particle = 2 triangles = 6 vertices
  const vertsPerParticle = 6;
  const total = count * vertsPerParticle;


  const directions = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta);
      const y = Math.sin(theta) * 0.2; // 👈 squish Y — lower = less up/down
      const len = Math.sqrt(x * x + y * y);
      arr[i * 2 + 0] = x / len;
      arr[i * 2 + 1] = y / len;
    }
    return arr;
  }, []);
  const timeOffsets = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * 20.0;
    return arr;
  }, []);

  const sizes = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * 0.06 + 0.01;
    return arr;
  }, []);

  const hueOffsets = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = (Math.random() - 0.5) * (100 / 360);
    return arr;
  }, []);

  // Expand per-particle data to per-vertex (6 verts per particle)
  const expand = (src: Float32Array, stride: number) => {
    const dst = new Float32Array(count * vertsPerParticle * stride);
    for (let i = 0; i < count; i++) {
      for (let v = 0; v < vertsPerParticle; v++) {
        for (let s = 0; s < stride; s++) {
          dst[(i * vertsPerParticle + v) * stride + s] = src[i * stride + s];
        }
      }
    }
    return dst;
  };

  // quad UV corner indices — tells each vertex which corner it is
  // quad layout: 2 tris = [0,1,2, 2,3,0] corners
  const cornerIds = useMemo(() => {
    const arr = new Float32Array(total);
    const corners = [0, 1, 2, 2, 3, 0];
    for (let i = 0; i < count; i++)
      for (let v = 0; v < vertsPerParticle; v++)
        arr[i * vertsPerParticle + v] = corners[v];
    return arr;
  }, []);

  const dirExpanded = useMemo(() => expand(directions, 2), [directions]);
  const timeOffsetExpanded = useMemo(() => expand(timeOffsets.map ? new Float32Array(timeOffsets) : timeOffsets, 1), [timeOffsets]);
  const sizeExpanded = useMemo(() => expand(sizes, 1), [sizes]);
  const hueExpanded = useMemo(() => expand(hueOffsets, 1), [hueOffsets]);

  // dummy positions — actual positions computed in vertex shader
  const dummyPos = useMemo(() => new Float32Array(total * 3), []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uBaseHue: { value: 0.7 },
      uOrigin: { value: new THREE.Vector3() },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3  uOrigin;

      attribute vec2  aDir;
      attribute float aTimeOffset;
      attribute float aSize;
      attribute float aHueOffset;
      attribute float aCorner;   // 0,1,2,3

      varying float vAlpha;
      varying float vHueOffset;
      varying float vT; // 0 = tail, 1 = head (for fade)

      void main() {
        float lifetime = 20.0;
        float t        = mod(uTime - aTimeOffset, lifetime);
        float progress = t / lifetime;

        // head and tail positions along fly direction
        float trailLen = aSize * 15.0;
        vec3 head = uOrigin + vec3(aDir, 0.0) * t * uSpeed;
        vec3 tail = head    - vec3(aDir, 0.0) * trailLen;

        // perpendicular for width
        vec2 perp = vec2(-aDir.y, aDir.x) * aSize * 0.05;

        // 4 corners of the quad:
        // 0 = tail-left, 1 = tail-right, 2 = head-right, 3 = head-left
        vec3 pos;
        float localT; // 0 at tail, 1 at head
        if (aCorner < 0.5) {
          pos = tail + vec3(perp, 0.0);  localT = 0.0;
        } else if (aCorner < 1.5) {
          pos = tail - vec3(perp, 0.0);  localT = 0.0;
        } else if (aCorner < 2.5) {
          pos = head - vec3(perp, 0.0);  localT = 1.0;
        } else {
          pos = head + vec3(perp, 0.0);  localT = 1.0;
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

        float fadeIn  = smoothstep(0.0, 0.1, progress);
        float fadeOut = 1.0 - smoothstep(0.6, 1.0, progress);
        vAlpha     = fadeIn * fadeOut;
        vHueOffset = aHueOffset;
        vT         = localT;
      }
    `,
    fragmentShader: `
      uniform float uBaseHue;
      varying float vAlpha;
      varying float vHueOffset;
      varying float vT;

      vec3 hsl2rgb(float h, float s, float l) {
        float c = (1.0 - abs(2.0 * l - 1.0)) * s;
        float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
        float m = l - c / 2.0;
        vec3 rgb;
        if      (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
        else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
        else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
        else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
        else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
        else                   rgb = vec3(c, 0.0, x);
        return rgb + m;
      }

      void main() {
        float h = mod(uBaseHue + vHueOffset, 1.0);
        vec3 col = hsl2rgb(h, 1.0, 0.6) * 10.0;

        // tail fades to transparent, head stays bright
        float trailFade = vT;
        gl_FragColor = vec4(col, trailFade * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  useEffect(() => {
    mat.uniforms.uSpeed.value = speed;
  }, [speed, mat]);

  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const chip = scene.getObjectByName('Chip');
    if (chip) {
      chip.getWorldPosition(chipWorldPos.current);
      mat.uniforms.uOrigin.value.copy(chipWorldPos.current);
    }
    mat.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={ref} material={mat}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[dummyPos, 3]} />
        <bufferAttribute attach="attributes-aDir" args={[dirExpanded, 2]} />
        <bufferAttribute attach="attributes-aTimeOffset" args={[timeOffsetExpanded, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizeExpanded, 1]} />
        <bufferAttribute attach="attributes-aHueOffset" args={[hueExpanded, 1]} />
        <bufferAttribute attach="attributes-aCorner" args={[cornerIds, 1]} />
      </bufferGeometry>
    </mesh>
  );
}

/* ── vignette plane baked from canvas ── */
function Vignette() {
  const texture = useMemo(() => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.72);
    g.addColorStop(0, "rgba(17,17,18,0)");
    g.addColorStop(0.45, "rgba(17,17,18,0.21)");
    g.addColorStop(1, "rgba(17,17,18,0.97)");
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

function SoftShadows() {
  return (
    <AccumulativeShadows
      temporal          // accumulates over multiple frames = super soft
      frames={80}       // more = softer, but slower to settle
      alphaTest={0.75}
      scale={12}
      position={[0, -1.5, 0]}  // adjust Y to sit just under your model
      color="#7fffd4"           // tint to match your cyan theme ✨
      colorBlend={0.6}
      opacity={0.85}
    >
      <RandomizedLight
        amount={8}          // number of shadow samples
        radius={6}          // spread of the light = softness
        intensity={10.2}
        ambient={0.4}
        position={[0, 0, 0]}
        bias={0.001}
      />
    </AccumulativeShadows>
  )
}

function Lighting() {
  const pulsRef = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    if (pulsRef.current)
      pulsRef.current.intensity = 2.0 + Math.sin(clock.getElapsedTime() * 1.2) * 0.5;
  });
  return (
    <>
      {/* <ambientLight intensity={0.1} /> */}
      {/* <pointLight position={[0, 10, 10]} intensity={100.5} color={COLOR_CYAN} /> */}
      {/* <pointLight ref={pulsRef} position={[-4, 3, -2]} intensity={10.0} color="#4488ff" /> */}
      {/* <pointLight position={[4, -3, -1]} intensity={10.2} color="#00ffcc" /> */}
      <SoftShadows />
    </>
  );
}

function Env() {
  return (
    <Environment
      preset='apartment'
      background={false}
      environmentIntensity={.8}
      environmentRotation={[0, -0.15, 0]}
    />
  )
}

/* ── main export ── */
export default function HeroSection() {
  const mouse = useRef({ x: 0, y: 0 });

  return (
    <section
      style={{ position: "relative", width: "100%", height: "100vh", minHeight: 600, background: COLOR_BG, overflow: "hidden" }}
      onMouseMove={(e) => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0, 7], fov: 55 }}
        style={{ position: "absolute", inset: 0 }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[COLOR_BG]} />
        <group position={[0, -3.65, 0]}>
          <HoloSphere mouse={mouse} />
          <AccumulativeShadows
            temporal
            frames={200}
            color="#4488ff"
            colorBlend={0.5}
            opacity={2}
            scale={15}
            alphaTest={1.55}
          >
            <RandomizedLight
              amount={8}
              radius={5}
              ambient={0.5}
              position={[5, 8, 3]}
              bias={0.001}
            />
          </AccumulativeShadows>
        </group>
        <Vignette />
        {/* <Dust /> */}
        {/* <Lighting /> */}
        <Env />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.1}
          maxPolarAngle={Math.PI / 2.1}
        />

        <EffectComposer>
          <Bloom
            intensity={1}        /* strength of the glow */
            luminanceThreshold={.9} /* only bright parts glow */
            luminanceSmoothing={0.8}
            mipmapBlur            /* smoother, less pixelated bloom */
          />
        </EffectComposer>
      </Canvas>

      {/* CSS vignette layer */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        // background: "radial-gradient(50% 50%, transparent 65.63%, rgba(240, 240, 240, 0.55) 87.39%, rgba(240, 240, 240, 0.96))"
      }} />

      {/* text overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-start",
        padding: "0 clamp(1.5rem,5vw,6rem)"
      }}>
        <div
          style={{
            background: "rgba(255, 255, 255, .75)",
            padding: "40px",
            borderRadius: "18px",
          }}
        >
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "rgba(20,40,60,0.5)",
              margin: "0 0 1.4rem",
            }}
          >
            {" "}
            <span style={{ color: "#2a7a4a", marginRight: "0.5em" }}>●</span> Full-stack
            AI studio{" "}
          </p>{" "}
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: "clamp(2.8rem,7vw,6.5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#0d1f2d",
              margin: "0 0 1.4rem",
              maxWidth: "14ch",
            }}
          >
            {" "}
            Full-stack systems,{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.5px #0d1f2d",
                opacity: 0.45,
              }}
            >
              {" "}
              built and operated{" "}
            </span>{" "}
            by AI.{" "}
          </h1>{" "}
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: "clamp(1rem,1.6vw,1.2rem)",
              color: "rgba(13,31,45,0.6)",
              margin: "0 0 2.8rem",
              maxWidth: "42ch",
              lineHeight: 1.6,
            }}
          >
            {" "}
            Websites, SaaS platforms, backend infrastructure, AI agents.{" "}
            <em style={{ fontStyle: "normal", color: "#0d1f2d", opacity: 0.85 }}>
              One studio.
            </em>{" "}
          </p>{" "}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              pointerEvents: "auto",
            }}
          >
            {" "}
            <a
              href="#work"
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: "0.9rem",
                background: "#0d1f2d",
                color: "#f7f7f6",
                padding: "0.65rem 1.4rem",
                borderRadius: "999px",
                textDecoration: "none",
              }}
            >
              View work →
            </a>{" "}
            <a
              href="#contact"
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 500,
                fontSize: "0.9rem",
                color: "rgba(13,31,45,0.6)",
                padding: "0.65rem 1.4rem",
                borderRadius: "999px",
                border: "1px solid rgba(13,31,45,0.2)",
                textDecoration: "none",
              }}
            >
              Start a conversation
            </a>{" "}
          </div>{" "}
        </div>
      </div>


    </section>
  );
}

useGLTF.preload("/hero-asset.glb");
