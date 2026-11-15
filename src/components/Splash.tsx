// A tela de carregamento: a marca (a órbita com o tripulante) se monta, um ponto percorre a órbita, o nome sobe e uma linha fina anda.
// Aparece quando a página abre ou recarrega, fica pelo menos um instante (para a animação respirar) e some com um fade quando os dados
// chegam. O mesmo desenho está em index.html (para não ter tela em branco antes do JavaScript). Respeita "reduzir movimento".
import { useEffect, useState } from 'react';
import { color } from '../design/tokens';

const ORBITA = 'M 5 16 a 11 4.6 0 1 0 22 0 a 11 4.6 0 1 0 -22 0';

export function Splash({ saindo, onFim }: { saindo: boolean; onFim: () => void }) {
  const [reduzido] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!saindo) return;
    const t = setTimeout(onFim, 650);
    return () => clearTimeout(t);
  }, [saindo, onFim]);
  return (
    <div className={`splash fixed inset-0 z-[300] grid place-items-center bg-paper ${saindo ? 'splash-sai' : ''}`} role="status" aria-label="Loading Healthnauts">
      <div className="grid justify-items-center gap-6">
        <svg width="96" height="96" viewBox="0 0 32 32" className="splash-logo" aria-hidden="true">
          <circle cx="16" cy="16" r="15" fill={color.brand} />
          <g transform="rotate(-28 16 16)">
            <ellipse cx="16" cy="16" rx="11" ry="4.6" fill="none" stroke={color.card} strokeWidth="1.1" opacity="0.9" />
            {!reduzido && (
              <circle r="1.7" fill={color.card}>
                <animateMotion dur="2.6s" repeatCount="indefinite" path={ORBITA} />
              </circle>
            )}
            {reduzido && <circle cx="27" cy="16" r="1.7" fill={color.card} />}
          </g>
          <circle cx="16" cy="16" r="4.2" fill={color.card} />
        </svg>
        <div className="grid justify-items-center gap-1.5">
          <p className="splash-nome serif text-[30px] leading-none">Healthnauts</p>
          <p className="splash-sub eyebrow">Crew health monitor</p>
        </div>
        <span className="splash-linha relative block h-[2px] w-32 overflow-hidden rounded-full bg-track"><span className="absolute inset-y-0 w-1/3 rounded-full bg-brand" /></span>
      </div>
    </div>
  );
}
