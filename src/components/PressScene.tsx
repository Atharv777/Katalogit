import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  type Points,
} from "three";
import ProductArt from "./ProductArt";
import {
  InkField,
  ProductForm,
  RegistrationChips,
} from "./press/ProductForm";
import { heroPalette, type InkLabPalette } from "./press/state";

class SceneBoundary extends Component<
  { children: ReactNode; color: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ProductArt color={this.props.color} className="scene-poster" />
    ) : (
      this.props.children
    );
  }
}

function Motes({ active }: { active: boolean }) {
  const ref = useRef<Points>(null);
  const clock = useRef(0);

  const geometry = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 2.4 + Math.random() * 4.2;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = Math.random() * 3 - 3.6;
      speeds[i] = 0.1 + Math.random() * 0.22;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("speed", new BufferAttribute(speeds, 1));
    return g;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (active) clock.current += dt;
    const t = clock.current;
    const points = ref.current;
    if (!points) return;
    const position = points.geometry.getAttribute("position") as BufferAttribute;
    const speed = points.geometry.getAttribute("speed") as BufferAttribute;
    for (let i = 0; i < speed.count; i++) {
      const y = position.getY(i) + dt * speed.getX(i);
      position.setY(i, y > 3 ? -3 : y);
      position.setX(
        i,
        position.getX(i) + Math.sin(t * 0.6 + i * 0.37) * dt * 0.06,
      );
    }
    position.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.036}
        color="#F0C46A"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function PressScene({
  active,
  mode = "hero",
  palette = heroPalette,
}: {
  active: boolean;
  mode?: "hero" | "parts";
  palette?: InkLabPalette;
}) {
  const compact = useMedia("(max-width: 900px)");
  const [offset, scale] =
    mode === "parts"
      ? compact
        ? [[0, 0.3, 0], 0.46]
        : [[2.05, 0.05, 0], 0.5]
      : compact
        ? [[0, 0.8, 0], 0.58]
        : [[2.0, 0.02, 0], 0.62];

  return (
    <SceneBoundary color={palette.hot}>
      <Canvas
        shadows={mode === "hero"}
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.35, 7.4], fov: 36 }}
        frameloop={active ? "always" : "demand"}
        gl={{ antialias: true, alpha: true }}
        fallback={<ProductArt color={palette.hot} className="scene-poster" />}
      >
        <InkField palette={palette} active={active} />
        <RegistrationChips active={active && mode === "hero"} />
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[4, 6, 6]}
          intensity={2.4}
          color="#FFF0D6"
          castShadow={mode === "hero"}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <pointLight position={[-4, -1, 3]} intensity={9} color="#C8963E" />
        <group position={offset as [number, number, number]} scale={scale}>
          <ProductForm
            palette={palette}
            active={active}
            tilt={mode === "parts" ? 0.6 : 0}
          />
        </group>
        <Motes active={active} />
      </Canvas>
    </SceneBoundary>
  );
}