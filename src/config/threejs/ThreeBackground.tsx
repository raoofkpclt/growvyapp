import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

function HexPattern() {
  const group = useRef<THREE.Group>(null!);

  useFrame((state) => {
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.08) * 0.03;
  });

  const hexes = [];

  for (let row = -8; row <= 8; row++) {
    for (let col = -10; col <= 10; col++) {
      const offset = row % 2 ? 0.6 : 0;

      hexes.push(
        <mesh
          key={`${row}-${col}`}
          position={[col * 1.2 + offset, row * 1, -2]}
        >
          <ringGeometry args={[0.18, 0.2, 6]} />

          <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} />
        </mesh>,
      );
    }
  }

  return <group ref={group}>{hexes}</group>;
}

function GridLines() {
  const group = useRef<THREE.Group>(null!);

  useFrame((state) => {
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.03;

    group.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.08) * 0.03;
  });

  const lines = [];

  for (let i = -20; i <= 20; i++) {
    lines.push(
      <line key={`h-${i}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-30, i, 0, 30, i, 0])}
            itemSize={3}
          />
        </bufferGeometry>

        <lineBasicMaterial color="#22d3ee" transparent opacity={0.04} />
      </line>,
    );

    lines.push(
      <line key={`v-${i}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([i, -30, 0, i, 30, 0])}
            itemSize={3}
          />
        </bufferGeometry>

        <lineBasicMaterial color="#22d3ee" transparent opacity={0.04} />
      </line>,
    );
  }

  return <group ref={group}>{lines}</group>;
}

function GlowOrb({
  position,
  color,
  scale,
}: {
  position: [number, number, number];
  color: string;
  scale: number;
}) {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    mesh.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime) * 0.25;

    mesh.current.rotation.z += 0.001;
  });

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />

      <meshBasicMaterial color={color} transparent opacity={0.08} />
    </mesh>
  );
}

export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 8] }}>
        <fog attach="fog" args={["#050b14", 8, 30]} />

        <ambientLight intensity={0.6} />

        {/* GRID */}
        <GridLines />

        {/* HEXAGONS */}
        <HexPattern />

        {/* CYAN GLOWS */}
        <GlowOrb position={[-4, 2, -3]} color="#22d3ee" scale={4} />

        <GlowOrb position={[4, -2, -3]} color="#06b6d4" scale={4} />

        {/* ORANGE ACCENT */}
        <GlowOrb position={[0, 3, -5]} color="#fb923c" scale={2} />
      </Canvas>
    </div>
  );
}
