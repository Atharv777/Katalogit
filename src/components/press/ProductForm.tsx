import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  ExtrudeGeometry,
  MathUtils,
  Object3D,
  Shape,
  ShaderMaterial,
  Vector2,
  type Group,
  type InstancedMesh,
} from "three";
import {
  inkFieldFragment,
  inkFieldVertex,
  scanFragment,
  scanVertex,
} from "./shaders";
import { pressState, type InkLabPalette } from "./state";

const BODY_W = 1.74;
const BODY_H = 1.66;
const BODY_D = 0.5;
const HANDLE_R = 0.46;

const scratch = new Object3D();

function roundedRect(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function registrationCross(size: number, bar: number) {
  const s = new Shape();
  s.moveTo(-bar, -size);
  s.lineTo(bar, -size);
  s.lineTo(bar, -bar);
  s.lineTo(size, -bar);
  s.lineTo(size, bar);
  s.lineTo(bar, bar);
  s.lineTo(bar, size);
  s.lineTo(-bar, size);
  s.lineTo(-bar, bar);
  s.lineTo(-size, bar);
  s.lineTo(-size, -bar);
  s.lineTo(-bar, -bar);
  s.closePath();
  return s;
}

type ScanUniforms = {
  deep: string;
  warm: string;
  accent: string;
  rim: string;
};

export function useScanMaterial(u: ScanUniforms) {
  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: scanVertex,
      fragmentShader: scanFragment,
      uniforms: {
        uTime: { value: 0 },
        uGlint: { value: 0 },
        uBulge: { value: 0 },
        uPointer: { value: new Vector2(0, 0) },
        uInkDeep: { value: new Color(u.deep) },
        uInkWarm: { value: new Color(u.warm) },
        uAccent: { value: new Color(u.accent) },
        uRim: { value: new Color(u.rim) },
      },
    });
  }, [u.deep, u.warm, u.accent, u.rim]);

  useEffect(() => () => material.dispose(), [material]);

  return material;
}

type PartProps = {
  base: [number, number, number];
  dir: [number, number, number];
  dist: number;
  children: ReactNode;
};

function Part({ base, dir, dist, children }: PartProps) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const e = pressState.explode;
    g.position.set(
      base[0] + dir[0] * dist * e,
      base[1] + dir[1] * dist * e,
      base[2] + dir[2] * dist * e,
    );
  });
  return (
    <group ref={ref} position={base}>
      {children}
    </group>
  );
}

export function ProductForm({
  palette,
  active,
  tilt = 0,
}: {
  palette: InkLabPalette;
  active: boolean;
  tilt?: number;
}) {
  const group = useRef<Group>(null);
  const clock = useRef(0);
  const body = useScanMaterial({
    deep: palette.deep,
    warm: palette.warm,
    accent: palette.accent,
    rim: palette.hot,
  });
  const accent = useScanMaterial({
    deep: palette.hot,
    warm: palette.accent,
    accent: "#FFE3B0",
    rim: "#FFF0D0",
  });

  const shell = useMemo(() => roundedRect(BODY_W, BODY_H, 0.17), []);
  const panel = useMemo(() => roundedRect(BODY_W - 0.1, BODY_H - 0.1, 0.14), []);
  const lining = useMemo(() => roundedRect(BODY_W - 0.16, BODY_H - 0.16, 0.13), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (active) clock.current += dt;
    const t = clock.current;
    const glint = (t * 0.19) % 1;

    for (const material of [body, accent]) {
      const u = material.uniforms;
      u.uTime.value = t;
      u.uGlint.value = glint;
      const p = u.uPointer.value as Vector2;
      p.x = MathUtils.damp(p.x, pressState.pointerX * 1.9, 4, dt);
      p.y = MathUtils.damp(p.y, pressState.pointerY * 1.9, 4, dt);
      u.uBulge.value =
        material === body
          ? MathUtils.damp(u.uBulge.value as number, pressState.hover, 5, dt)
          : 0;
    }

    const g = group.current;
    if (!g) return;
    g.rotation.y = MathUtils.damp(
      g.rotation.y,
      Math.sin(t * 0.42) * 0.32 + tilt,
      3.2,
      dt,
    );
    g.rotation.x = MathUtils.damp(
      g.rotation.x,
      0.08 + Math.sin(t * 0.31) * 0.035,
      3,
      dt,
    );
    g.position.y = Math.sin(t * 0.7) * 0.05;
  });

  return (
    <group ref={group} scale={1.42}>
      <Part base={[0, 0, 0]} dir={[0, 0, 0]} dist={0}>
        <mesh castShadow receiveShadow>
          <extrudeGeometry
            args={[
              shell,
              {
                depth: BODY_D,
                bevelEnabled: true,
                bevelSegments: 4,
                bevelSize: 0.04,
                bevelThickness: 0.04,
                curveSegments: 14,
              },
            ]}
          />
          <primitive object={body} attach="material" />
        </mesh>
      </Part>

      <Part base={[0, 0, BODY_D / 2 + 0.045]} dir={[0.05, 0.12, 1]} dist={1.05}>
        <mesh castShadow>
          <extrudeGeometry
            args={[
              panel,
              {
                depth: 0.045,
                bevelEnabled: true,
                bevelSegments: 3,
                bevelSize: 0.022,
                bevelThickness: 0.02,
                curveSegments: 12,
              },
            ]}
          />
          <primitive object={body} attach="material" />
        </mesh>
      </Part>

      <Part base={[0, 0, -BODY_D / 2 - 0.2]} dir={[-0.08, -0.18, -1]} dist={1.15}>
        <mesh>
          <extrudeGeometry
            args={[lining, { depth: 0.06, bevelEnabled: false, curveSegments: 12 }]}
          />
          <primitive object={accent} attach="material" />
        </mesh>
      </Part>

      <Part base={[0, BODY_H / 2 - 0.04, 0.17]} dir={[0, 1, 0.05]} dist={1.5}>
        <mesh castShadow>
          <torusGeometry args={[HANDLE_R, 0.058, 14, 44, Math.PI]} />
          <primitive object={body} attach="material" />
        </mesh>
      </Part>

      {(
        [
          [-0.46, 0.42],
          [0.46, -0.42],
        ] as [number, number][]
      ).map(([ax, az], i) => (
        <Part
          key={i}
          base={[ax, BODY_H / 2 - 0.16, az]}
          dir={[Math.sign(ax), 0.55, Math.sign(az)]}
          dist={1.15}
        >
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.24, 0.1]} />
            <primitive object={accent} attach="material" />
          </mesh>
          <mesh position={[0, -0.17, 0.012]}>
            <sphereGeometry args={[0.035, 14, 12]} />
            <primitive object={accent} attach="material" />
          </mesh>
        </Part>
      ))}

      <Part base={[0, -0.14, BODY_D / 2 + 0.1]} dir={[0, -0.1, 1]} dist={1.3}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.2, 0.05]} />
          <primitive object={accent} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.032]}>
          <boxGeometry args={[0.015, 0.1, 0.008]} />
          <primitive object={accent} attach="material" />
        </mesh>
      </Part>

      <Part base={[0, -BODY_H / 2 + 0.03, 0]} dir={[0, -1, 0]} dist={1.25}>
        {(
          [
            [-0.62, 0.17],
            [0.62, 0.17],
            [-0.62, -0.17],
            [0.62, -0.17],
          ] as [number, number][]
        ).map(([sx, sz], i) => (
          <mesh key={i} position={[sx, 0, sz]} castShadow>
            <cylinderGeometry args={[0.05, 0.055, 0.06, 12]} />
            <primitive object={accent} attach="material" />
          </mesh>
        ))}
      </Part>
    </group>
  );
}

export function InkField({
  palette,
  active,
}: {
  palette: InkLabPalette;
  active: boolean;
}) {
  const clock = useRef(0);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: inkFieldVertex,
        fragmentShader: inkFieldFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uEnergy: { value: 0.5 },
          uScroll: { value: 0 },
          uDeep: { value: new Color(palette.deep) },
          uWarm: { value: new Color(palette.warm) },
          uHot: { value: new Color(palette.hot) },
        },
      }),
    [palette],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (active) clock.current += dt;
    material.uniforms.uTime.value = clock.current;
    material.uniforms.uScroll.value = MathUtils.damp(
      material.uniforms.uScroll.value as number,
      pressState.scroll,
      3,
      dt,
    );
    material.uniforms.uEnergy.value = MathUtils.damp(
      material.uniforms.uEnergy.value as number,
      pressState.energy,
      3,
      dt,
    );
  });

  return (
    <mesh position={[0, 0, -6]}>
      <planeGeometry args={[46, 30]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function RegistrationChips({
  active,
  count = 12,
}: {
  active: boolean;
  count?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  const clock = useRef(0);

  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(registrationCross(0.17, 0.045), {
        depth: 0.02,
        bevelEnabled: false,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (active) clock.current += dt;
    const t = clock.current;
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * 0.14;
      const radius = 2.9 + Math.sin(t * 0.6 + i * 1.7) * 0.35;
      scratch.position.set(
        Math.cos(angle) * radius,
        Math.sin(t * 0.5 + i * 0.9) * 1.35,
        Math.cos(t * 0.38 + i * 2.3) * 1.1 - 0.6,
      );
      scratch.lookAt(0, scratch.position.y * 0.3, 0);
      scratch.scale.setScalar(0.55 + 0.45 * Math.sin(t * 1.1 + i));
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshBasicMaterial color="#C8963E" transparent opacity={0.7} />
    </instancedMesh>
  );
}