/**
 * The Awakening — Three.js 3D Scene
 * 
 * Replaces the 2D canvas AwakeningCanvas with a full 3D experience.
 * Phases: void → signal → breath → question → ignition
 * 
 * Uses: @react-three/fiber, @react-three/drei, custom GLSL shaders
 * Self-contained — no imports from other onboarding-v2 files.
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import {
  dissolveVertexShader,
  dissolveFragmentShader,
  shockwaveVertexShader,
  shockwaveFragmentShader,
  gridVertexShader,
  gridFragmentShader,
  particleVertexShader,
  particleFragmentShader,
} from './awakening-shaders';


// ── Types ──────────────────────────────────────────────────

export type AwakeningPhase = 'void' | 'signal' | 'breath' | 'question' | 'ignition' | 'complete';

interface Props {
  onComplete: (name: string) => void;
}

// ── Constants ──────────────────────────────────────────────

const AGENT_COLORS: THREE.Color[] = [
  new THREE.Color('#00d4ff'), // conflux
  new THREE.Color('#00cc88'), // helix
  new THREE.Color('#10b981'), // pulse
  new THREE.Color('#f59e0b'), // hearth
  new THREE.Color('#a78bfa'), // echo
  new THREE.Color('#6366f1'), // aegis
  new THREE.Color('#22c55e'), // viper
];

const AGENT_NAMES = ['Conflux', 'Helix', 'Pulse', 'Hearth', 'Echo', 'Aegis', 'Viper'];
const AGENT_AVATARS = [
  '/avatars/conflux.webp',
  '/avatars/helix.webp',
  '/avatars/pulse.webp',
  '/avatars/hearth.webp',
  '/avatars/echo.webp',
  '/avatars/aegis.webp',
  '/avatars/viper.webp',
];

const PHASE_DURATIONS = {
  void: 2.0,
  signal: 3.5,
  breath: 3.5,
  question: 999, // user-triggered
  ignition: 4.5,
};


// ── Starfield (distant points for depth) ───────────────────

function Starfield() {
  const count = 1200;
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 30 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    return { positions, sizes };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.003;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.08}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Nebula Background (large sphere with animated hue shifts) ──

function NebulaBackground({ time }: { time: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const nebulaShader = useMemo(() => ({
    vertexShader: `
      varying vec3 vPosition;
      varying vec2 vUv;
      void main() {
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vPosition;
      varying vec2 vUv;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }

      void main() {
        vec3 dir = normalize(vPosition);
        float n1 = snoise(dir * 2.0 + uTime * 0.05) * 0.5 + 0.5;
        float n2 = snoise(dir * 4.0 - uTime * 0.03) * 0.5 + 0.5;
        float n3 = snoise(dir * 1.5 + uTime * 0.08) * 0.5 + 0.5;
        float n4 = snoise(dir * 3.0 + uTime * 0.04) * 0.5 + 0.5;
        float n5 = snoise(dir * 2.5 - uTime * 0.06) * 0.5 + 0.5;

        // Cyan/teal
        vec3 c1 = vec3(0.0, 0.2 + n1 * 0.15, 0.35 + n2 * 0.2);
        // Deep purple
        vec3 c2 = vec3(0.2 + n2 * 0.15, 0.0, 0.35 + n3 * 0.15);
        // Teal/green
        vec3 c3 = vec3(0.0, 0.25 + n3 * 0.12, 0.15 + n1 * 0.08);
        // Gold/amber accent
        vec3 c4 = vec3(0.25 + n4 * 0.15, 0.15 + n4 * 0.1, 0.0);
        // Electric blue accent
        vec3 c5 = vec3(0.0, 0.1 + n5 * 0.1, 0.4 + n5 * 0.2);

        vec3 color = c1 * n1 + c2 * n2 + c3 * n3 + c4 * n4 * 0.4 + c5 * n5 * 0.3;
        float alpha = (n1 + n2 + n3 + n4 * 0.5 + n5 * 0.3) * 0.08;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), []);

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 32, 32]} />
      <shaderMaterial
        vertexShader={nebulaShader.vertexShader}
        fragmentShader={nebulaShader.fragmentShader}
        uniforms={{ uTime: { value: time } }}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ── Orbiting Colored Lights ────────────────────────────────

function OrbitingLights({ time }: { time: number }) {
  const lights = useMemo(() => [
    { color: '#00d4ff', radius: 5, speed: 0.4, y: 1.5, intensity: 0.6 },
    { color: '#6366f1', radius: 4, speed: -0.3, y: -0.5, intensity: 0.5 },
    { color: '#00cc88', radius: 6, speed: 0.25, y: 0.8, intensity: 0.4 },
    { color: '#a78bfa', radius: 3.5, speed: -0.5, y: -1, intensity: 0.3 },
  ], []);

  return (
    <>
      {lights.map((l, i) => {
        const angle = time * l.speed + i * Math.PI * 0.5;
        return (
          <pointLight
            key={i}
            color={l.color}
            intensity={l.intensity}
            distance={12}
            position={[
              Math.cos(angle) * l.radius,
              l.y + Math.sin(time * 0.5 + i) * 0.3,
              Math.sin(angle) * l.radius,
            ]}
          />
        );
      })}
    </>
  );
}

// ── Central Light (the photon / star) ──────────────────────

function CentralLight({ phase, time }: { phase: AwakeningPhase; time: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const targetScale = useMemo(() => {
    switch (phase) {
      case 'void': return 0.05;
      case 'signal': return 0.3;
      case 'breath': return 0.45;
      case 'question': return 0.4;
      case 'ignition': return 0.55;
      default: return 0.4;
    }
  }, [phase]);

  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current || !lightRef.current) return;

    // Smooth scale transition
    const current = meshRef.current.scale.x;
    const next = THREE.MathUtils.lerp(current, targetScale, delta * 2);
    meshRef.current.scale.setScalar(next);
    glowRef.current.scale.setScalar(next * 2.0);

    // Breathing effect
    const breathe = Math.sin(time * 0.8) * 0.04;
    meshRef.current.scale.multiplyScalar(1 + breathe);

    // Light intensity follows scale
    lightRef.current.intensity = next * 3;

    // Rotation
    meshRef.current.rotation.y += delta * 0.3;
    glowRef.current.rotation.y -= delta * 0.15;
  });

  return (
    <group>
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={1.4}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Point light */}
      <pointLight ref={lightRef} color="#00d4ff" intensity={0.5} distance={20} />
    </group>
  );
}

// ── Energy Tendrils (3D lines extending from center) ───────

interface TendrilData {
  points: THREE.Vector3[];
  direction: THREE.Vector3;
  speed: number;
  length: number;
  maxLength: number;
  color: THREE.Color;
  width: number;
  alive: boolean;
}

function EnergyTendrils({ phase, time }: { phase: AwakeningPhase; time: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const tendrilsRef = useRef<TendrilData[]>([]);
  const meshRefs = useRef<THREE.Mesh[]>([]);

  // Spawn tendrils during signal phase
  useEffect(() => {
    if (phase !== 'signal') return;

    const count = 24;
    const newTendrils: TendrilData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const elevation = (Math.random() - 0.5) * 0.8;
      const dir = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.sin(elevation),
        Math.sin(angle) * Math.cos(elevation),
      ).normalize();

      newTendrils.push({
        points: [new THREE.Vector3(0, 0, 0)],
        direction: dir,
        speed: 0.8 + Math.random() * 0.6,
        length: 0,
        maxLength: 3 + Math.random() * 3,
        color: AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)].clone(),
        width: 0.015 + Math.random() * 0.02,
        alive: true,
      });
    }
    tendrilsRef.current = newTendrils;
  }, [phase]);

  useFrame((_, delta) => {
    tendrilsRef.current.forEach((t) => {
      if (!t.alive) return;
      t.length += t.speed * delta;
      if (t.length >= t.maxLength) {
        t.alive = false;
        return;
      }
      const tip = t.direction.clone().multiplyScalar(t.length);
      t.points.push(tip);
      if (t.points.length > 200) t.points.shift();
    });
  });

  // Render tendrils as tube meshes
  const geometries = useMemo(() => {
    return tendrilsRef.current.map((t) => {
      if (t.points.length < 2) return null;
      const curve = new THREE.CatmullRomCurve3(t.points);
      return new THREE.TubeGeometry(curve, Math.max(t.points.length * 2, 8), t.width, 6, false);
    });
  }, [time]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => {
        if (!geo) return null;
        const t = tendrilsRef.current[i];
        return (
          <mesh key={i} geometry={geo}>
            <meshBasicMaterial
              color={t.color}
              transparent
              opacity={t.alive ? 0.85 : 0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Ambient Particles (agent-colored, floating in space) ───

function AmbientParticles({ phase, time }: { phase: AwakeningPhase; time: number }) {
  const count = phase === 'breath' ? 200 : phase === 'ignition' ? 300 : 80;
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes, alphas } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.02 + Math.random() * 0.06;
      alphas[i] = 0.2 + Math.random() * 0.5;
    }

    return { positions, colors, sizes, alphas };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Gentle orbital motion
      const x = arr[i * 3];
      const z = arr[i * 3 + 2];
      const angle = Math.atan2(z, x) + 0.001;
      const radius = Math.sqrt(x * x + z * z);
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
      // Gentle vertical drift
      arr[i * 3 + 1] += Math.sin(time + i) * 0.0003;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Agent Orbs (ignition phase — 7 agents materialize) ─────

function AgentOrbs({ phase, time }: { phase: AwakeningPhase; time: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [textureMap, setTextureMap] = useState<Map<string, THREE.Texture>>(new Map());
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const connectionRefs = useRef<THREE.Mesh[]>([]);

  // Load avatar textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const map = new Map<string, THREE.Texture>();
    AGENT_AVATARS.forEach((url, i) => {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        map.set(AGENT_NAMES[i], tex);
        setTextureMap(new Map(map));
      });
    });
  }, []);

  // Agent positions (orbit around center)
  const agentPositions = useMemo(() => {
    return AGENT_COLORS.map((_, i) => {
      const angle = (i / AGENT_COLORS.length) * Math.PI * 2 - Math.PI / 2;
      const orbitRadius = 2.5;
      return new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle) * 0.3, // slight vertical variation
        Math.sin(angle) * orbitRadius,
      );
    });
  }, []);

  // Connection pairs (all agents connected to center + each other)
  const connections = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < AGENT_COLORS.length; i++) {
      pairs.push([i, -1]); // to center
      for (let j = i + 1; j < AGENT_COLORS.length; j++) {
        pairs.push([i, j]);
      }
    }
    return pairs;
  }, []);

  useFrame(() => {
    if (phase !== 'ignition') return;

    groupRef.current?.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh && i < AGENT_COLORS.length) {
        // Pulse each agent orb
        const pulse = 1 + Math.sin(time * 3 + i * 0.9) * 0.1;
        child.scale.setScalar(pulse);
      }
    });
  });

  if (phase !== 'ignition') return null;

  const orbitRadius = 2.5;

  return (
    <group ref={groupRef}>
      {/* Agent avatar orbs */}
      {AGENT_COLORS.map((color, i) => {
        const angle = (i / AGENT_COLORS.length) * Math.PI * 2 - Math.PI / 2 + time * 0.1;
        const pos = new THREE.Vector3(
          Math.cos(angle) * orbitRadius,
          Math.sin(angle) * 0.3,
          Math.sin(angle) * orbitRadius,
        );
        const tex = textureMap.get(AGENT_NAMES[i]);

        return (
          <group key={AGENT_NAMES[i]} position={pos}>
            {/* Avatar plane */}
            {tex && (
              <mesh>
                <planeGeometry args={[0.8, 0.8]} />
                <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Glow ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.45, 0.55, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>

            {/* Point light for glow */}
            <pointLight color={color} intensity={0.6} distance={4} />
          </group>
        );
      })}

      {/* Connection tubes */}
      {connections.map(([a, b], i) => {
        const startA = a === -1
          ? new THREE.Vector3(0, 0, 0)
          : agentPositions[a];
        const startB = b === -1
          ? new THREE.Vector3(0, 0, 0)
          : agentPositions[b];

        const mid = startA.clone().add(startB).multiplyScalar(0.5);
        mid.y += 0.5;
        const curve = new THREE.QuadraticBezierCurve3(startA, mid, startB);
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.008, 4, false);
        const color = a === -1 ? AGENT_COLORS[b] : AGENT_COLORS[a];

        return (
          <mesh key={i} geometry={tubeGeo}>
            <meshBasicMaterial color={color} transparent opacity={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Shockwave Ring (ignition burst) ────────────────────────

function ShockwaveRing({ phase, phaseTime }: { phase: AwakeningPhase; phaseTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    if (phase !== 'ignition' || !materialRef.current) return;
    const progress = Math.min(phaseTime / 1.5, 1);
    materialRef.current.uniforms.uProgress.value = progress;
    materialRef.current.uniforms.uTime.value = phaseTime;
  });

  if (phase !== 'ignition') return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[12, 12, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={shockwaveVertexShader}
        fragmentShader={shockwaveFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color('#00d4ff') },
          uRadius: { value: 1.2 },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Reflective Grid Floor ──────────────────────────────────

function GridFloor({ phase, time }: { phase: AwakeningPhase; time: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const visible = phase !== 'void';

  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = time;
    const targetOpacity = visible ? 0.6 : 0;
    const current = materialRef.current.uniforms.uOpacity.value;
    materialRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(current, targetOpacity, 0.02);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[40, 40, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#40d8ff') },
          uOpacity: { value: 0 },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Camera Controller ──────────────────────────────────────

function CameraController({ phase, time }: { phase: AwakeningPhase; time: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Gentle camera sway
    const swayX = Math.sin(time * 0.3) * 0.15;
    const swayY = Math.cos(time * 0.2) * 0.1;

    // Phase-based camera distance
    let targetZ = 8;
    switch (phase) {
      case 'void': targetZ = 12; break;
      case 'signal': targetZ = 8; break;
      case 'breath': targetZ = 6; break;
      case 'question': targetZ = 7; break;
      case 'ignition': targetZ = 8; break;
    }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, swayX, 0.02);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1 + swayY, 0.02);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.02);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ── Phase Manager (orchestrates transitions) ───────────────

function PhaseManager({
  phase,
  onPhaseChange,
  timeRef,
}: {
  phase: AwakeningPhase;
  onPhaseChange: (phase: AwakeningPhase) => void;
  timeRef: React.MutableRefObject<number>;
}) {
  const phaseStartTime = useRef(0);
  const currentPhase = useRef<AwakeningPhase>(phase);

  useEffect(() => {
    currentPhase.current = phase;
    phaseStartTime.current = timeRef.current;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (phase === 'question' || phase === 'complete') return;

    const elapsed = timeRef.current - phaseStartTime.current;
    const duration = PHASE_DURATIONS[phase as keyof typeof PHASE_DURATIONS];

    if (duration && elapsed >= duration) {
      const phases: AwakeningPhase[] = ['void', 'signal', 'breath', 'question', 'ignition', 'complete'];
      const idx = phases.indexOf(phase);
      if (idx < phases.length - 1) {
        onPhaseChange(phases[idx + 1]);
      }
    }
  });

  return null;
}

// ── Main Scene ─────────────────────────────────────────────

function AwakeningSceneInner({ onComplete }: Props) {
  const [phase, setPhase] = useState<AwakeningPhase>('void');
  const timeRef = useRef(0);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const ttsTriggeredRef = useRef(false);

  const handlePhaseChange = useCallback((newPhase: AwakeningPhase) => {
    setPhase(newPhase);
    if (newPhase === 'question' && !ttsTriggeredRef.current) {
      ttsTriggeredRef.current = true;
      setTimeout(() => {
        setShowInput(true);
        setTimeout(() => inputRef.current?.focus(), 800);
        // Conflux speaks the welcome via ElevenLabs (once only)
        invoke<{ audio_base64: string }>('tts_speak', {
          text: "Welcome to Conflux Home!! My name is Conflux! ...What is your name?",
          voice: 'TvxTBL9RtGW6tVhl4NoI',
        }).then(result => {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const binaryString = atob(result.audio_base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          ctx.decodeAudioData(bytes.buffer).then(buffer => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gain = ctx.createGain();
            gain.gain.value = 1.0;
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);
          }).catch(() => {});
        }).catch(() => {});
      }, 500);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    setShowInput(false);
    setPhase('ignition');

    // After ignition animation, complete
    setTimeout(() => {
      setPhase('complete');
      setFadingOut(true);
      setTimeout(() => {
        onComplete(inputValue.trim() || 'Friend');
      }, 800);
    }, PHASE_DURATIONS.ignition * 1000);
  }, [inputValue, onComplete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmit();
    }
  }, [inputValue, handleSubmit]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      zIndex: 9999,
      opacity: fadingOut ? 0 : 1,
      transition: 'opacity 0.8s ease-out',
    }}>
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 1, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#000000']} />

        {/* Lighting */}
        <ambientLight intensity={0.05} />

        {/* Camera */}
        <CameraController phase={phase} time={timeRef.current} />

        {/* Phase orchestrator */}
        <PhaseManager phase={phase} onPhaseChange={handlePhaseChange} timeRef={timeRef} />

        {/* Time updater */}
        <TimeUpdater timeRef={timeRef} />

        {/* Starfield */}
        <Starfield />

        {/* Nebula background */}
        <NebulaBackground time={timeRef.current} />

        {/* Central light source */}
        <CentralLight phase={phase} time={timeRef.current} />

        {/* Orbiting colored lights */}
        <OrbitingLights time={timeRef.current} />

        {/* Energy tendrils (signal phase) */}
        <EnergyTendrils phase={phase} time={timeRef.current} />

        {/* Ambient particles */}
        <AmbientParticles phase={phase} time={timeRef.current} />

        {/* Grid floor */}
        <GridFloor phase={phase} time={timeRef.current} />

        {/* Agent orbs (ignition phase) */}
        <AgentOrbs phase={phase} time={timeRef.current} />

        {/* Shockwave (ignition) */}
        <ShockwaveRing phase={phase} phaseTime={0} />

        {/* Post-processing — enhanced */}
        <EffectComposer>
          <Bloom
            intensity={1.6}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0015, 0.0015]}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      </Canvas>

      {/* Ignition flash overlay */}
      {phase === 'ignition' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,212,255,0.3), rgba(99,102,241,0.15), transparent 70%)',
          opacity: 0.8,
          animation: 'ignitionFlash 1.5s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      )}

      {/* Logo + Title overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        marginTop: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        zIndex: 2,
        opacity: phase === 'void' ? 0 : 1,
        transition: 'opacity 1.2s ease-out',
        padding: '20px 40px',
        overflow: 'visible',
      }}>
        <img
          src="/logo.png"
          alt=""
          style={{
            width: 72,
            height: 72,
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(41,193,253,0.5)) drop-shadow(0 0 48px rgba(99,102,241,0.3))',
            marginBottom: 12,
          }}
        />
        <div style={{
          fontSize: '1.6rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #29c1fd, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
          filter: 'drop-shadow(0 0 12px rgba(41,193,253,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        }}>
          Conflux Home
        </div>
      </div>

      {/* Name input overlay */}
      {showInput && (
        <div style={{
          position: 'absolute',
          bottom: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          zIndex: 3,
          width: '90%',
          maxWidth: 420,
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 300,
            color: '#29c1fd',
            letterSpacing: 2,
            textShadow: '0 0 12px rgba(41,193,253,0.3), 0 2px 4px rgba(0,0,0,0.8)',
            animation: 'fadeInUp 1.2s ease-out',
          }}>
            Who are you?
          </div>

          <div style={{ position: 'relative', width: '100%', animation: 'fadeInUp 1s ease-out 0.8s both' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Your name..."
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                if (!showHint && e.target.value.length > 0) setShowHint(true);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                width: '100%',
                padding: '16px 0',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '1.5rem',
                fontWeight: 400,
                color: '#e2e8f0',
                textAlign: 'center',
                letterSpacing: 1,
                caretColor: '#29c1fd',
                textShadow: '0 0 12px rgba(41,193,253,0.3), 0 2px 4px rgba(0,0,0,0.8)',
              }}
            />
            {/* Glowing beam underline */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: inputValue ? '100%' : '0%',
              height: 2,
              background: 'linear-gradient(90deg, transparent, #29c1fd, #6366f1, #29c1fd, transparent)',
              borderRadius: 1,
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 0 10px rgba(41,193,253,0.5), 0 0 20px rgba(41,193,253,0.3)',
            }} />
          </div>

          <div style={{
            fontSize: '0.8rem',
            color: 'rgba(226,232,240,0.3)',
            opacity: showHint ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            Press <kbd style={{
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(41,193,253,0.1)',
              border: '1px solid rgba(41,193,253,0.2)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem',
              color: '#29c1fd',
            }}>Enter</kbd> to awaken your team
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ignitionFlash {
          0% { opacity: 0; transform: scale(0.98); }
          20% { opacity: 0.5; transform: scale(1); }
          60% { opacity: 0.3; transform: scale(1.01); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Time Updater (runs inside Canvas) ──────────────────────

function TimeUpdater({ timeRef }: { timeRef: React.MutableRefObject<number> }) {
  useFrame((_, delta) => {
    timeRef.current += delta;
  });
  return null;
}

// ── Exported Component (wraps Canvas) ──────────────────────

export default function AwakeningScene({ onComplete }: Props) {
  return <AwakeningSceneInner onComplete={onComplete} />;
}
