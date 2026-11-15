// Corpo da Overview em 3D (three.js, desenho nosso): milhares de pontos que se montam na tela, giram devagar e
// respondem ao mouse (arrastar gira; passar o mouse acende a região; clicar abre o detalhe).
// As 3 regiões são as de sceneMapping.bodyRegions: cabeça e pescoço = Isolation, peito = sinais vitais,
// braços e pernas = Gravity. Cor de cada região = nível que a API devolveu (nada aqui decide nível).
// O peito pulsa no ritmo do coração e o tronco respira no ritmo da respiração do sensor ao vivo (quando há leitura).
// Acessível: as etiquetas ao lado são botões (teclado e leitor de tela) com o nome do nível.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { LiveTrace } from './LiveTrace';
import { LEVEL_UI } from '../../lib/levels';
import { color, level } from '../../design/tokens';
import { StatusPill } from '../ui';
import { bodyRegions, indicatorHref, type BodyRegion, type BodyRegionKey, type SceneState } from './sceneMapping';
import type { DisplayLevel } from '../../services/api';

type V3 = [number, number, number];
/** Um anel de um corpo "loftado": o centro, a largura (a, no eixo x) e a profundidade (b) do corte, perpendicular ao caminho. */
type Ring = { c: V3; a: number; b: number };
type Part = { kind: 'ellipsoid'; c: V3; r: V3; region: number } | { kind: 'loft'; rings: Ring[]; region: number };

// 0 = sem área ligada · 1 = cabeça e pescoço · 2 = peito · 3 = braços e pernas
const REGION_INDEX: Record<BodyRegionKey, number> = { head: 1, chest: 2, limbs: 3 };
const mirror = (p: V3): V3 => [-p[0], p[1], p[2]];
/** Anel pelo centro (x, y, z) e as duas medidas. */
const ring = (x: number, y: number, z: number, a: number, b: number): Ring => ({ c: [x, y, z], a, b });

/**
 * O corpo humano (homem adulto de ~1,78 m, em pé, braços um pouco afastados), desenhado como cortes que se encadeiam
 * (o "loft" da modelagem 3D): cada parte é uma sequência de anéis com a largura e a profundidade do corte naquele ponto.
 * Proporções de um corpo de verdade: cabeça com crânio e queixo, pescoço, trapézio, caixa torácica que afina na cintura,
 * quadril, ombro (deltoide), braço com bíceps e antebraço, mão com dedos, coxa, panturrilha e pé com calcanhar e dedos.
 */
function bodyParts(): Part[] {
  const side = (s: 1 | -1): Part[] => {
    const m = (r: Ring[]) => (s === 1 ? r : r.map((q) => ({ ...q, c: mirror(q.c) })));
    const mp = (p: V3): V3 => (s === 1 ? p : mirror(p));
    return [
      { kind: 'ellipsoid', c: mp([0.222, 1.385, 0.0]), r: [0.05, 0.056, 0.052], region: 3 },                // ombro (deltoide)
      { kind: 'loft', region: 3, rings: m([ring(0.222, 1.385, 0, 0.05, 0.05), ring(0.238, 1.32, 0.004, 0.052, 0.054), ring(0.255, 1.23, 0.008, 0.045, 0.048), ring(0.27, 1.15, 0.01, 0.036, 0.038), ring(0.277, 1.11, 0.012, 0.031, 0.032)]) }, // braço
      { kind: 'loft', region: 3, rings: m([ring(0.277, 1.11, 0.012, 0.032, 0.033), ring(0.285, 1.04, 0.03, 0.039, 0.036), ring(0.298, 0.95, 0.055, 0.032, 0.03), ring(0.31, 0.875, 0.072, 0.023, 0.022)]) }, // antebraço
      { kind: 'loft', region: 3, rings: m([ring(0.31, 0.875, 0.072, 0.024, 0.018), ring(0.316, 0.835, 0.082, 0.036, 0.013), ring(0.322, 0.795, 0.09, 0.034, 0.011), ring(0.326, 0.765, 0.095, 0.02, 0.008), ring(0.327, 0.75, 0.097, 0.006, 0.004)]) }, // mão
      { kind: 'loft', region: 3, rings: m([ring(0.098, 0.90, -0.004, 0.07, 0.08), ring(0.098, 0.80, -0.004, 0.09, 0.094), ring(0.1, 0.72, 0.0, 0.086, 0.088), ring(0.102, 0.60, 0.006, 0.072, 0.076), ring(0.104, 0.49, 0.01, 0.057, 0.058), ring(0.105, 0.43, 0.01, 0.047, 0.05)]) }, // coxa
      { kind: 'loft', region: 3, rings: m([ring(0.105, 0.43, 0.01, 0.048, 0.05), ring(0.106, 0.36, 0.0, 0.049, 0.056), ring(0.106, 0.27, -0.012, 0.044, 0.056), ring(0.106, 0.17, -0.008, 0.034, 0.04), ring(0.105, 0.09, -0.01, 0.027, 0.03)]) }, // perna
      { kind: 'loft', region: 3, rings: m([ring(0.105, 0.045, -0.055, 0.027, 0.042), ring(0.105, 0.055, -0.01, 0.034, 0.048), ring(0.107, 0.036, 0.06, 0.04, 0.032), ring(0.11, 0.024, 0.125, 0.045, 0.024), ring(0.112, 0.014, 0.18, 0.041, 0.013), ring(0.112, 0.01, 0.2, 0.012, 0.006)]) }, // pé
    ];
  };
  return [
    // Cabeça: crânio, face, maxilar e queixo
    { kind: 'loft', region: 1, rings: [ring(0, 1.795, 0.0, 0.003, 0.003), ring(0, 1.785, 0.0, 0.045, 0.05), ring(0, 1.765, 0.0, 0.07, 0.083), ring(0, 1.735, 0.002, 0.077, 0.094), ring(0, 1.695, 0.008, 0.078, 0.097), ring(0, 1.655, 0.012, 0.074, 0.09), ring(0, 1.615, 0.017, 0.062, 0.076), ring(0, 1.58, 0.024, 0.044, 0.056), ring(0, 1.56, 0.03, 0.022, 0.03), ring(0, 1.555, 0.032, 0.004, 0.006)] },
    // Pescoço
    { kind: 'loft', region: 1, rings: [ring(0, 1.62, -0.004, 0.044, 0.05), ring(0, 1.56, -0.008, 0.046, 0.052), ring(0, 1.50, -0.012, 0.05, 0.056), ring(0, 1.46, -0.012, 0.072, 0.068)] },
    // Tronco: do trapézio ao peito (região 2) e do peito à pelve
    { kind: 'loft', region: 2, rings: [ring(0, 1.46, -0.012, 0.082, 0.068), ring(0, 1.43, -0.008, 0.16, 0.088), ring(0, 1.39, 0.0, 0.19, 0.105), ring(0, 1.33, 0.012, 0.186, 0.118), ring(0, 1.26, 0.016, 0.172, 0.118), ring(0, 1.19, 0.012, 0.158, 0.108)] },
    { kind: 'loft', region: 0, rings: [ring(0, 1.19, 0.012, 0.158, 0.108), ring(0, 1.12, 0.008, 0.146, 0.1), ring(0, 1.05, 0.004, 0.134, 0.094), ring(0, 0.98, 0.0, 0.14, 0.097), ring(0, 0.91, -0.006, 0.162, 0.108), ring(0, 0.84, -0.012, 0.172, 0.114), ring(0, 0.78, -0.01, 0.16, 0.106), ring(0, 0.72, -0.004, 0.1, 0.085), ring(0, 0.69, 0.0, 0.03, 0.03)] },
    ...side(1), ...side(-1),
  ];
}

/** Área aproximada de uma elipse (perímetro de Ramanujan) e de uma peça: para pôr a mesma densidade de pontos em todo o corpo. */
const perimetro = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
const DENSIDADE = 12500; // pontos por unidade² de superfície (≈ 24 mil no corpo todo)

/** Pontos na superfície de cada peça, com a normal (para pulsar e respirar) e uma posição espalhada (para a montagem). */
function sample(parts: Part[]) {
  // A quantidade de cada peça vem da área dela.
  const quadros = parts.map((p) => {
    if (p.kind === 'ellipsoid') {
      const [a, b, c] = p.r; const q = 1.6075;
      return { p, n: Math.round(4 * Math.PI * Math.pow((Math.pow(a * b, q) + Math.pow(a * c, q) + Math.pow(b * c, q)) / 3, 1 / q) * DENSIDADE), segs: [] as number[] };
    }
    const segs = p.rings.slice(0, -1).map((r, i) => {
      const t = p.rings[i + 1]; const L = Math.hypot(t.c[0] - r.c[0], t.c[1] - r.c[1], t.c[2] - r.c[2]);
      return L * (perimetro(r.a, r.b) + perimetro(t.a, t.b)) / 2;
    });
    return { p, n: Math.round(segs.reduce((x, y) => x + y, 0) * DENSIDADE), segs };
  });
  const total = quadros.reduce((x, q) => x + q.n, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), scat = new Float32Array(total * 3);
  const reg = new Float32Array(total), seed = new Float32Array(total);
  let k = 0;
  const rnd = mulberry(7);
  const put = (p: THREE.Vector3, n: THREE.Vector3, region: number) => {
    pos.set([p.x, p.y, p.z], k * 3);
    nor.set([n.x, n.y, n.z], k * 3);
    // espalhado numa nuvem em volta do corpo
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = 0.9 + rnd() * 1.4;
    scat.set([s * Math.cos(th) * rr, 0.95 + u * rr * 0.9, s * Math.sin(th) * rr], k * 3);
    reg[k] = region; seed[k] = rnd(); k++;
  };
  const dir = () => { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); return new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)); };
  const X = new THREE.Vector3(1, 0, 0);
  for (const { p: part, n, segs } of quadros) {
    if (part.kind === 'ellipsoid') {
      for (let i = 0; i < n; i++) {
        const d = dir();
        put(new THREE.Vector3(part.c[0] + d.x * part.r[0], part.c[1] + d.y * part.r[1], part.c[2] + d.z * part.r[2]),
          new THREE.Vector3(d.x / part.r[0], d.y / part.r[1], d.z / part.r[2]).normalize(), part.region);
      }
      continue;
    }
    // os eixos de cada anel: o caminho (tangente), a largura (x tirado o caminho) e a profundidade
    const cs = part.rings.map((r) => new THREE.Vector3(...r.c));
    const frames = cs.map((c, i) => {
      const T = (cs[Math.min(i + 1, cs.length - 1)].clone().sub(cs[Math.max(i - 1, 0)])).normalize();
      const e1 = X.clone().sub(T.clone().multiplyScalar(X.dot(T))).normalize();
      return { e1, e2: T.clone().cross(e1).normalize() };
    });
    const soma = segs.reduce((x, y) => x + y, 0);
    for (let i = 0; i < n; i++) {
      // escolhe o trecho pela área, e um ponto dentro dele
      let r = rnd() * soma, j = 0;
      while (j < segs.length - 1 && r > segs[j]) { r -= segs[j]; j++; }
      const t = rnd(), th = rnd() * Math.PI * 2;
      const A = part.rings[j], B = part.rings[j + 1];
      const a = A.a + (B.a - A.a) * t, b = A.b + (B.b - A.b) * t;
      const e1 = frames[j].e1.clone().lerp(frames[j + 1].e1, t).normalize();
      const e2 = frames[j].e2.clone().lerp(frames[j + 1].e2, t).normalize();
      const c = cs[j].clone().lerp(cs[j + 1], t);
      const ct = Math.cos(th), st = Math.sin(th);
      put(c.addScaledVector(e1, a * ct).addScaledVector(e2, b * st), e1.clone().multiplyScalar(ct / a).addScaledVector(e2, st / b).normalize(), part.region);
    }
  }
  return { pos, nor, scat, reg, seed, total };
}

function mulberry(s: number) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const VERT = /* glsl */ `
uniform float uTime, uBeat, uBreath, uScan, uSize, uPr, uAssemble;
uniform vec3 uC0, uC1, uC2, uC3;
uniform float uA0, uA1, uA2, uA3, uG0, uG1, uG2, uG3;
attribute vec3 aNormal; attribute vec3 aScatter; attribute float aRegion; attribute float aSeed;
varying vec3 vColor; varying float vAlpha;
void main() {
  float r = aRegion;
  vec3 col = r < 0.5 ? uC0 : r < 1.5 ? uC1 : r < 2.5 ? uC2 : uC3;
  float alpha = r < 0.5 ? uA0 : r < 1.5 ? uA1 : r < 2.5 ? uA2 : uA3;
  float grow = r < 0.5 ? uG0 : r < 1.5 ? uG1 : r < 2.5 ? uG2 : uG3;
  vec3 p = position;
  if (r > 1.5 && r < 2.5) p += aNormal * uBeat * 0.011;           // peito: batida
  if (r < 0.5 || (r > 1.5 && r < 2.5)) p += aNormal * uBreath * 0.005; // tronco: respiração
  p += aNormal * sin(uTime * 1.3 + aSeed * 6.2831) * 0.0016;       // vida
  float t = clamp((uAssemble - aSeed * 0.45) / 0.55, 0.0, 1.0);
  t = 1.0 - pow(1.0 - t, 3.0);
  p = mix(aScatter, p, t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float scan = exp(-pow((position.y - uScan) / 0.022, 2.0));
  gl_PointSize = uSize * uPr * (1.0 + grow + scan * 0.9) / -mv.z;
  vec3 nView = normalize(normalMatrix * aNormal);
  float facing = 0.28 + 0.72 * smoothstep(-0.5, 0.7, nView.z);
  vColor = col;
  vAlpha = (alpha * facing + scan * 0.55) * (0.25 + 0.75 * t);
}`;
const FRAG = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.15, d) * vAlpha);
}`;

const INK = new THREE.Color(color.brand); // o corpo no verde da marca; só o que tem alerta ganha a cor do nível
const MUTED = new THREE.Color(level.unavailable.color);
const colorOf = (level: DisplayLevel) => (level === 'normal' ? INK : level === 'unavailable' ? MUTED : new THREE.Color(LEVEL_UI[level].color));

// Âncoras das etiquetas (no corpo) e o lado onde a etiqueta fica.
const ANCHORS: Record<BodyRegionKey, { p: V3; side: 'left' | 'right' }> = {
  head: { p: [0.06, 1.68, 0.06], side: 'right' },
  chest: { p: [0.07, 1.31, 0.09], side: 'right' },
  limbs: { p: [-0.1, 0.62, 0.05], side: 'left' },
};
const LABEL_W = 180;

export function Body3D({ scene, height = 620 }: { scene: SceneState; height?: number | string }) {
  const nav = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hover, setHover] = useState<BodyRegionKey | null>(null);
  const regions = bodyRegions(scene);
  const live = useRef({ regions, hover, beat: scene.vitals.beatSeconds, breath: scene.vitals.breathSeconds });
  live.current = { regions, hover, beat: scene.vitals.beatSeconds, breath: scene.vitals.breathSeconds };
  const data = useMemo(() => sample(bodyParts()), []);
  const open = (r: BodyRegion) => nav(indicatorHref(r.element.route, r.indicator));
  const openRef = useRef(open); openRef.current = open;

  useEffect(() => {
    const el = wrap.current!; const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.prepend(renderer.domElement);
    renderer.domElement.style.display = 'block';
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    cam.position.set(0, 0.95, 4.35); cam.lookAt(0, 0.9, 0);
    const scn = new THREE.Scene();
    const group = new THREE.Group(); scn.add(group);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute('aNormal', new THREE.BufferAttribute(data.nor, 3));
    g.setAttribute('aScatter', new THREE.BufferAttribute(data.scat, 3));
    g.setAttribute('aRegion', new THREE.BufferAttribute(data.reg, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(data.seed, 1));
    const u = {
      uTime: { value: 0 }, uBeat: { value: 0 }, uBreath: { value: 0 }, uScan: { value: -10 }, uSize: { value: 5.2 }, uPr: { value: renderer.getPixelRatio() },
      uAssemble: { value: reduced ? 1.2 : 0 },
      uC0: { value: INK.clone() }, uC1: { value: INK.clone() }, uC2: { value: INK.clone() }, uC3: { value: INK.clone() },
      uA0: { value: 0.55 }, uA1: { value: 0.8 }, uA2: { value: 0.8 }, uA3: { value: 0.8 },
      uG0: { value: 0 }, uG1: { value: 0 }, uG2: { value: 0 }, uG3: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, transparent: true, depthWrite: false });
    const points = new THREE.Points(g, mat); group.add(points);

    // Chão: dois anéis finos, um parado e um tracejado que gira ao contrário.
    const ring = (r: number, dashed: boolean) => {
      const pts = Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const m = dashed ? new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity: 0.22, dashSize: 0.025, gapSize: 0.035 })
        : new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.1 });
      const line = new THREE.Line(geo, m); if (dashed) line.computeLineDistances(); return line;
    };
    const floor = new THREE.Group(); floor.add(ring(0.42, false)); const spin = ring(0.55, true); floor.add(spin); scn.add(floor);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h); cam.aspect = w / h;
      // painel estreito: o corpo se afasta um pouco para as etiquetas caberem dos lados
      cam.position.z = w < 520 ? 4.95 : w < 600 ? 4.7 : 4.35; cam.updateProjectionMatrix();
      if (svg.current) svg.current.setAttribute('viewBox', `0 0 ${w} ${h}`);
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    // Girar: sozinho devagar; arrastando, segue o mouse e volta a girar sozinho 2,5 s depois.
    let rotY = -0.35, target = -0.35, dragging = false, lastX = 0, idleAt = 0, moved = 0;
    const ray = new THREE.Raycaster(); ray.params.Points = { threshold: 0.03 };
    const mouse = new THREE.Vector2();
    const regionAt = (e: PointerEvent): BodyRegionKey | null => {
      const r = el.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const hit = ray.intersectObject(points)[0];
      if (!hit || hit.index == null) return null;
      const idx = data.reg[hit.index];
      return idx === 1 ? 'head' : idx === 2 ? 'chest' : idx === 3 ? 'limbs' : null;
    };
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; moved = 0; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); target += dx * 0.009; idleAt = performance.now(); return; }
      const k = regionAt(e); setHover(k); el.style.cursor = k ? 'pointer' : 'grab';
    };
    const up = (e: PointerEvent) => {
      dragging = false; idleAt = performance.now();
      if (moved < 4) { const k = regionAt(e); const reg = k && live.current.regions.find((x) => x.key === k); if (reg) openRef.current(reg); }
    };
    const leave = () => { if (!dragging) setHover(null); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointerleave', leave);

    const anchor = new THREE.Vector3();
    let raf = 0; const t0 = performance.now(); let last = t0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      const { regions: regs, hover: hv, beat, breath } = live.current;
      u.uTime.value = t;
      if (!reduced) {
        u.uAssemble.value = Math.min(1.2, u.uAssemble.value + dt / 1.9);
        if (!dragging && now - idleAt > 2500) target += dt * 0.16;
        // varredura: sobe em 3,2 s a cada 8 s
        const cyc = t % 8; u.uScan.value = cyc < 3.2 ? -0.05 + (cyc / 3.2) * 1.95 : -10;
        u.uBeat.value = beat ? Math.exp(-((t % beat) / beat) * 9) : 0;
        u.uBreath.value = breath ? Math.sin((t / breath) * Math.PI * 2) : 0;
        spin.rotation.y = -t * 0.12;
      }
      rotY += (target - rotY) * Math.min(1, dt * 6);
      group.rotation.y = rotY;

      // Cor, força e tamanho de cada região
      for (const r of regs) {
        const i = REGION_INDEX[r.key]; const lv = r.element.level;
        (u as any)[`uC${i}`].value.copy(colorOf(lv));
        const base = lv === 'normal' ? 0.7 : lv === 'unavailable' ? 0.45 : 1;
        const on = hv === r.key; const dim = hv && !on;
        (u as any)[`uA${i}`].value += ((on ? 1 : dim ? base * 0.45 : base) - (u as any)[`uA${i}`].value) * Math.min(1, dt * 8);
        (u as any)[`uG${i}`].value += ((on ? 0.55 : 0) - (u as any)[`uG${i}`].value) * Math.min(1, dt * 8);
      }
      u.uA0.value += ((hv ? 0.2 : 0.55) - u.uA0.value) * Math.min(1, dt * 8);
      renderer.render(scn, cam);

      // Etiquetas: a linha sai do ponto da região (que gira com o corpo) até a etiqueta na lateral.
      const w = el.clientWidth, h = el.clientHeight;
      for (const r of regs) {
        const a = ANCHORS[r.key]; anchor.set(...a.p).applyMatrix4(group.matrixWorld).project(cam);
        const ax = (anchor.x * 0.5 + 0.5) * w, ay = (-anchor.y * 0.5 + 0.5) * h;
        const lab = labels.current[r.key]; const path = svg.current?.querySelector<SVGPathElement>(`[data-k="${r.key}"]`);
        const dot = svg.current?.querySelector<SVGCircleElement>(`[data-d="${r.key}"]`);
        const ly = Math.max(28, Math.min(h - 70, ay - 22));
        const lx = a.side === 'right' ? Math.min(w - LABEL_W - 4, w * 0.5 + 96) : Math.max(4, w * 0.5 - 96 - LABEL_W);
        if (lab) lab.style.transform = `translate(${lx}px, ${ly}px)`;
        const ex = a.side === 'right' ? lx - 6 : lx + LABEL_W + 6; const ey = ly + 22;
        const mx = a.side === 'right' ? ex - 26 : ex + 26;
        if (path) path.setAttribute('d', `M${ax},${ay} L${mx},${ey} L${ex},${ey}`);
        if (dot) { dot.setAttribute('cx', String(ax)); dot.setAttribute('cy', String(ay)); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', leave);
      g.dispose(); mat.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [data]);

  const hr = scene.vitals.heartRate;
  const rr = scene.vitals.breathSeconds ? Math.round(60 / scene.vitals.breathSeconds) : null;
  return (
    <div ref={wrap} className="relative w-full select-none touch-none" style={{ height, cursor: 'grab' }}>
      <svg ref={svg} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        {regions.map((r) => {
          const lv = r.element.level; const c = lv === 'normal' || lv === 'unavailable' ? color.brand : LEVEL_UI[lv].color;
          const on = hover === r.key;
          return (
            <g key={r.key} style={{ transition: 'opacity .3s', opacity: hover && !on ? 0.35 : 1 }}>
              <path data-k={r.key} fill="none" stroke={c} strokeOpacity={on ? 0.9 : 0.35} strokeWidth={1} />
              <circle data-d={r.key} r={on ? 4 : 3} fill={c} />
            </g>
          );
        })}
      </svg>
      {regions.map((r) => {
        const on = hover === r.key;
        return (
          <button key={r.key} ref={(b) => { labels.current[r.key] = b; }} type="button"
            onClick={() => open(r)} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.key)} onBlur={() => setHover(null)}
            className="absolute left-0 top-0 text-left rounded-xl px-3.5 py-2.5 !min-h-0 transition-[box-shadow,opacity,background-color] duration-300"
            style={{ width: LABEL_W, background: on ? 'white' : 'rgb(255 255 255 / 0.72)', boxShadow: on ? 'var(--shadow-float)' : 'var(--shadow-card)', opacity: hover && !on ? 0.55 : 1, backdropFilter: 'blur(6px)' }}>
            <span className="eyebrow block !text-[11px]">{r.element.area}</span>
            <span className="flex items-center justify-between gap-2 mt-1">
              <span className="whitespace-nowrap text-[14px] font-medium text-ink">{r.label}</span>
              <StatusPill level={r.element.level} small />
            </span>
            {r.key === 'chest' && hr && (
              <span className="block mt-2">
                <span className="flex items-baseline justify-between text-[12px] text-ink-2"><span><span className="num text-ink text-[14px]">{hr}</span> bpm</span>{rr && <span><span className="num text-ink text-[14px]">{rr}</span> /min</span>}</span>
                <LiveTrace rate={hr} kind="ecg" color={color.brand} height={30} />
              </span>
            )}
          </button>
        );
      })}
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[12px] text-ink-3 pointer-events-none">Drag to rotate · select a region</p>
    </div>
  );
}
