import { color as tokens } from '../../design/tokens';
// Traço ao vivo (canvas): o eletrocardiograma no ritmo do coração ou a onda da respiração, correndo para a esquerda.
// É ilustração do ritmo que o sensor simulado manda (bpm e respirações por minuto), não um ECG medido.
import { useEffect, useRef } from 'react';

/** Forma de um batimento (0..1 do ciclo): onda P, QRS e onda T. */
function ecg(ph: number) {
  const g = (c: number, w: number, a: number) => a * Math.exp(-Math.pow((ph - c) / w, 2));
  return g(0.12, 0.025, 0.12) - g(0.245, 0.008, 0.14) + g(0.265, 0.011, 1) - g(0.285, 0.01, 0.28) + g(0.48, 0.05, 0.26);
}

export function LiveTrace({ rate, kind, color = tokens.text, height = 56 }: { rate: number | null; kind: 'ecg' | 'breath'; color?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rateRef = useRef(rate); rateRef.current = rate;
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pr = Math.min(devicePixelRatio, 2);
    let w = 0, h = 0;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * pr; cv.height = h * pr; ctx.setTransform(pr, 0, 0, pr, 0, 0); };
    const ro = new ResizeObserver(size); ro.observe(cv); size();
    const SPEED = 46; // px por segundo
    let raf = 0; const t0 = performance.now();
    const value = (t: number) => {
      const r = rateRef.current; if (!r) return 0;
      const period = 60 / r; const ph = (t % period) / period;
      return kind === 'ecg' ? ecg(ph) : Math.sin(ph * Math.PI * 2) * 0.42;
    };
    const draw = (now: number) => {
      const t = reduced ? 10 : (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const mid = kind === 'ecg' ? h * 0.66 : h * 0.5; const amp = kind === 'ecg' ? h * 0.58 : h * 0.62;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, color + '00'); grad.addColorStop(0.35, color + '55'); grad.addColorStop(1, color);
      ctx.strokeStyle = grad; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= w; x += 1) {
        const y = mid - value(t - (w - x) / SPEED) * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      const yEnd = mid - value(t) * amp;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(w - 1.5, yEnd, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(w - 1.5, yEnd, 7, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, color]);
  return <canvas ref={ref} className="block w-full" style={{ height }} aria-hidden="true" />;
}
