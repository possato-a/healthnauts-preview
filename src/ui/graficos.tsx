// Gráficos do painel que não são de série no tempo (os de série estão em src/components/charts.tsx). Todos leem as cores de
// src/design/tokens.ts e a legenda é a mesma regra de sempre: cor + texto (nunca só cor).
//   Radar   · uma figura dos cinco riscos (R-I-D-G-E): quanto mais perto da borda, mais tranquilo. Só reflete o nível que a API devolveu.
//   Anel    · um progresso num anel com o valor no meio (a rotina do dia).
//   Margens · barras com uma marca no limite: o quanto falta para o limite de cada coisa.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { color, comAlfa, level as niveis } from '../design/tokens';
import type { DisplayLevel } from '../services/api';
import { StatusPill } from '../components/ui';
import { cn } from '../lib/utils';

/** Quanto do raio cada nível ocupa no radar (só desenho: o nível em si vem da API). */
const RAIO: Record<DisplayLevel, number> = { normal: 0.92, advisory: 0.76, caution: 0.6, warning: 0.4, emergency: 0.2, unavailable: 0.08 };

export interface PontoDoRadar { letra: string; nome: string; nivel: DisplayLevel; mensagem: string; to: string }

/** O radar dos cinco riscos. Passar o mouse numa ponta diz o risco e o estado; clicar abre a tela dele. */
export function Radar({ pontos }: { pontos: PontoDoRadar[] }) {
  const [em, setEm] = useState<number | null>(null);
  const W = 280, H = 250, cx = W / 2, cy = 128, R = 88;
  const n = pontos.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const xy = (i: number, f: number) => [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f] as const;
  const poligono = (f: (i: number) => number) => pontos.map((_, i) => xy(i, f(i)).join(',')).join(' ');
  const foco = em !== null ? pontos[em] : null;
  return (
    <div className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="The five hazards at a glance">
        {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={poligono(() => f)} fill="none" stroke={color.border} strokeWidth="1" />)}
        {pontos.map((_, i) => <line key={i} x1={cx} y1={cy} x2={xy(i, 1)[0]} y2={xy(i, 1)[1]} stroke={color.border} strokeWidth="1" />)}
        <polygon points={poligono((i) => RAIO[pontos[i].nivel])} fill={comAlfa(color.brand, 0.12)} stroke={color.brand} strokeWidth="1.5" strokeLinejoin="round"
          className="origin-center" style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'radar-in 0.9s cubic-bezier(0.32, 0.72, 0, 1) both' }} />
        {pontos.map((p, i) => {
          const [x, y] = xy(i, RAIO[p.nivel]); const [lx, ly] = xy(i, 1.2);
          const c = p.nivel === 'normal' ? color.brand : niveis[p.nivel].color;
          return (
            <g key={p.letra} onMouseEnter={() => setEm(i)} onMouseLeave={() => setEm(null)} className="cursor-pointer">
              <Link to={p.to} aria-label={`${p.nome}: ${p.nivel}`}>
                <circle cx={x} cy={y} r={em === i ? 6 : 4} fill={c} stroke={color.card} strokeWidth="2" style={{ transition: 'r .15s' }} />
                <circle cx={x} cy={y} r="14" fill="transparent" />
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize="12" fontWeight={em === i ? 600 : 500} fill={em === i ? color.text : color.text2}>{p.letra}</text>
              </Link>
            </g>
          );
        })}
      </svg>
      <div className="flex min-h-[24px] items-center justify-center gap-2 text-[13px]">
        {foco ? <><span className="font-medium text-ink">{foco.nome}</span><StatusPill level={foco.nivel} small /></>
          : <span className="text-ink-3">Closer to the edge is calmer · hover a point</span>}
      </div>
    </div>
  );
}

/** Um anel de progresso com o valor no meio. */
export function Anel({ feito, total, tamanho = 44, children }: { feito: number; total: number; tamanho?: number; children?: ReactNode }) {
  const r = (tamanho - 6) / 2, c = 2 * Math.PI * r, f = total ? Math.min(1, feito / total) : 0;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="-rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={color.track} strokeWidth="4" />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={color.brand} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(0.32, 0.72, 0, 1)' }} />
      </svg>
      <span className="absolute text-[12px] font-medium num">{children}</span>
    </span>
  );
}

export interface Margem { nome: string; valor: string; fracao: number; limite?: number; nivel?: DisplayLevel | null; nota?: string; to?: string }

/** Barras com uma marca no limite: `fracao` é o quanto a barra enche (0 a 1) e `limite` onde a marca fica (0 a 1). */
export function Margens({ itens }: { itens: Margem[] }) {
  return (
    <ul className="grid gap-4">
      {itens.map((m) => {
        const flagged = m.nivel && m.nivel !== 'normal' && m.nivel !== 'unavailable';
        const cor = flagged ? niveis[m.nivel!].color : color.brand;
        const corpo = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-[13px]"><span className="text-ink-2">{m.nome}</span><span className="num font-medium text-ink">{m.valor}</span></span>
            <span className="relative block h-2 rounded-full bg-track">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, Math.min(100, m.fracao * 100))}%`, background: cor, transition: 'width .8s cubic-bezier(0.32, 0.72, 0, 1)' }} />
              {m.limite !== undefined && <span className="absolute -inset-y-1.5 w-0.5 rounded-full bg-ink-3" style={{ left: `${m.limite * 100}%` }} aria-hidden="true" />}
            </span>
            {m.nota && <span className="text-[12px] text-ink-3">{m.nota}</span>}
          </>
        );
        return <li key={m.nome}>{m.to ? <Link to={m.to} className="grid gap-1.5 rounded-md transition-opacity hover:opacity-80">{corpo}</Link> : <div className="grid gap-1.5">{corpo}</div>}</li>;
      })}
    </ul>
  );
}

/** O caminho do sinal entre a nave e a Terra: um ponto que viaja e o atraso no meio. Sem enlace, a linha fica tracejada e o ponto para. */
export function Enlace({ atraso, resposta, sem }: { atraso: string; resposta?: string; sem?: boolean }) {
  return (
    <div className="grid gap-2">
      <div className="relative h-14">
        <span className="absolute left-0 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white" aria-label="Ship">Ship</span>
        <span className="absolute right-0 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-white" aria-label="Earth">Earth</span>
        <span className="absolute inset-x-12 top-1/2 border-t border-dashed" style={{ borderColor: sem ? color.disabled : color.brand }} />
        {!sem && <span className="enlace-ponto absolute left-12 top-1/2 size-2 -translate-y-1/2 rounded-full bg-brand" aria-hidden="true" />}
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[170%] whitespace-nowrap rounded-full bg-white px-3 py-0.5 text-[12px] font-medium text-ink [box-shadow:var(--sombra-bloco)] [border:1px_solid_rgb(var(--border))]">{sem ? 'No link' : `${atraso} one way`}</span>
      </div>
      {resposta && !sem && <p className="text-center text-[12px] text-ink-3">Expected ground reply in about {resposta}</p>}
    </div>
  );
}

/** Um medidor em meia-lua: o valor enche o arco até onde está, com uma marca no limite. `max` é o fim da escala. */
export function Medidor({ valor, texto, unidade, max, limite, nivel, nota }: { valor: number; texto: string; unidade: string; max: number; limite?: number; nivel?: DisplayLevel; nota?: string }) {
  const R = 78, cx = 100, cy = 98;
  const arco = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  const f = Math.max(0, Math.min(1, valor / max));
  const flagged = nivel && nivel !== 'normal' && nivel !== 'unavailable';
  const cor = flagged ? niveis[nivel!].color : color.brand;
  const marca = (g: number) => { const a = Math.PI * (1 - g); return [cx + Math.cos(a) * R, cy - Math.sin(a) * R, cx + Math.cos(a) * (R + 9), cy - Math.sin(a) * (R + 9)]; };
  const m = limite !== undefined ? marca(limite / max) : null;
  return (
    <div className="grid justify-items-center gap-1">
      <svg viewBox="0 0 200 118" className="w-full max-w-[260px]" role="img" aria-label={`${texto} ${unidade}`}>
        <path d={arco} fill="none" stroke={color.track} strokeWidth="12" strokeLinecap="round" />
        <path d={arco} fill="none" stroke={cor} strokeWidth="12" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - f} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(0.32, 0.72, 0, 1)' }} />
        {m && <line x1={m[0]} y1={m[1]} x2={m[2]} y2={m[3]} stroke={color.text3} strokeWidth="2" strokeLinecap="round" />}
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize="28" className="serif" fill={color.text}>{texto}</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="12" fill={color.text3}>{unidade}</text>
      </svg>
      {nota && <p className="text-[12px] text-ink-3">{nota}</p>}
    </div>
  );
}

export interface LinhaDoMapa { nome: string; celulas: ({ f: number; texto: string } | null)[] }

/** Um mapa de calor: uma linha por coisa, uma coluna por dia. `f` (0 a 1) decide o tom do verde; passar o mouse diz o valor. */
export function MapaDeCalor({ dias, linhas }: { dias: string[]; linhas: LinhaDoMapa[] }) {
  const [em, setEm] = useState<string | null>(null);
  const grade = { gridTemplateColumns: `112px repeat(${dias.length}, minmax(0,1fr))` };
  return (
    <div className="grid gap-1.5" onMouseLeave={() => setEm(null)}>
      <div className="grid gap-1.5 text-[12px] text-ink-3" style={grade}>
        <span />{dias.map((d) => <span key={d} className="text-center">{d}</span>)}
      </div>
      {linhas.map((l) => (
        <div key={l.nome} className="grid items-center gap-1.5" style={grade}>
          <span className="truncate text-[13px] text-ink-2">{l.nome}</span>
          {l.celulas.map((c, i) => {
            const id = `${l.nome}-${i}`;
            return (
              <span key={id} onMouseEnter={() => setEm(id)} title={c ? `${l.nome} · ${dias[i]}: ${c.texto}` : `${l.nome} · ${dias[i]}: no reading`}
                className={cn('grid h-8 place-items-center rounded-md text-[12px] num transition-[opacity,transform] duration-150', em && em !== id && 'opacity-60', em === id && '-translate-y-0.5')}
                style={c ? { background: comAlfa(color.brand, 0.08 + c.f * 0.62), color: c.f > 0.55 ? color.card : color.text2 } : { background: color.track, color: color.disabled }}>
                {c ? c.texto : '·'}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Uma semana de anéis: um por dia, cheio quando o plano do dia foi cumprido. */
export function SemanaDeAneis({ dias }: { dias: { rotulo: string; feito: number; plano: number; texto: string }[] }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {dias.map((d, i) => (
        <div key={i} className="grid justify-items-center gap-1.5" title={`${d.rotulo}: ${d.texto}`}>
          <Anel feito={d.feito} total={d.plano} tamanho={40}>{d.feito >= d.plano ? '✓' : ''}</Anel>
          <span className="text-[12px] text-ink-3">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
