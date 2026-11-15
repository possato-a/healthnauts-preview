// Gráficos "puros" (estilo do protótipo): recebem registros por props.
// Normal fica neutro (cinza quente); só o último ponto ganha a cor do nível que a API devolveu.
// As réguas (linhas de referência) vêm de shared/config ou de REFERENCE, nunca decidem nível.
import { useId, useState } from 'react';
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ApiRecord, DisplayLevel } from '../services/api';
import { LEVEL_UI, NEUTRAL, BAND, GREEN, INK, INK_2, INK_3, LINE } from '../lib/levels';
import { fmtDateTime, fmtDay, fmtHours, fmtTime } from '../lib/format';
import { axisProps } from './ui';
import { color, comAlfa } from '../design/tokens';
import { ComUnidade } from '../ui/pecas';

const tickEvery = (n: number) => (n > 16 ? Math.ceil(n / 8) - 1 : 0);
const lastColor = (level?: DisplayLevel) => level && level !== 'normal' && level !== 'unavailable' ? LEVEL_UI[level].color : GREEN;

export interface RefLine { y: number; label: string; color?: string }

export function Legend({ color, text, soft, dashed }: { color: string; text: string; soft?: boolean; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={dashed ? { border: `1px dashed ${color}` } : { background: color, opacity: soft ? 0.45 : 1 }} />{text}
    </span>
  );
}

/** O valor em destaque no alto do gráfico: o que o mouse está sobre (ou o clicado, ou o último), com o dia embaixo. */
function CabecaDoGrafico({ valor, quando, preso, onSolta }: { valor: string; quando: string; preso: boolean; onSolta: () => void }) {
  return (
    <div className="flex min-h-[28px] items-baseline justify-between gap-3">
      <span className="flex items-baseline gap-2.5">
        <span className="serif num text-[22px] leading-none whitespace-nowrap"><ComUnidade valor={valor} /></span>
        <span className="text-[12px] text-ink-3">{quando}</span>
      </span>
      {preso && <button type="button" onClick={onSolta} className="!min-h-0 !min-w-0 text-[12px] text-ink-3 hover:text-ink">Pinned · clear</button>}
    </div>
  );
}

/** Um hook só para o jeito de usar: passar o mouse mostra o valor, clicar fixa, clicar de novo solta. */
function useDestaque(n: number) {
  const [hover, setHover] = useState<number | null>(null);
  const [preso, setPreso] = useState<number | null>(null);
  const idx = (st: any) => { if (st?.isTooltipActive === false) return null; const i = Number(st?.activeTooltipIndex); return Number.isFinite(i) && i >= 0 && i < n ? i : null; };
  const eventos = {
    onMouseMove: (st: any) => setHover(idx(st)),
    onMouseLeave: () => setHover(null),
    onClick: (st: any) => { const i = idx(st); if (i !== null) setPreso((p) => (p === i ? null : i)); },
  };
  const ativo = hover ?? preso ?? n - 1;
  return { hover, preso, ativo, eventos, solta: () => setPreso(null) };
}

/** Uma barra por registro (ex.: horas de sono por noite). Passar o mouse destaca a barra; clicar fixa. */
export function BarsChart({ records, unit, refs = [], lastLevel, domain, fmt = (v) => String(v) }: {
  records: ApiRecord[]; unit?: string; refs?: RefLine[]; lastLevel?: DisplayLevel; domain?: [number, number]; fmt?: (v: number) => string;
}) {
  const data = records.map((r) => ({ label: fmtDay(r.recordedAt), at: r.recordedAt, v: Number(r.value) }));
  const d = useDestaque(data.length);
  if (!data.length) return <p className="text-[13px] text-ink-3">No data in this period.</p>;
  const emFoco = d.hover ?? d.preso; // null = ninguém em foco: o último ganha a cor do nível
  return (
    <div className="grid gap-3">
      <CabecaDoGrafico valor={fmt(data[d.ativo].v)} quando={emFoco === null ? `Latest · ${fmtDateTime(data[d.ativo].at)}` : fmtDateTime(data[d.ativo].at)} preso={d.preso !== null} onSolta={d.solta} />
      <div className="h-[176px] cursor-pointer">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: refs.length ? 72 : 16, left: 0, bottom: 0 }} {...d.eventos}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="label" {...axisProps} fontSize={10} interval={tickEvery(data.length)} />
            <YAxis domain={domain ?? [0, 'auto']} {...axisProps} width={44} allowDecimals={false} tickFormatter={(v) => `${v}${unit ?? ''}`} />
            {refs.map((r) => <ReferenceLine key={r.label} y={r.y} stroke={r.color ?? INK_3} strokeDasharray="4 4" label={{ value: r.label, position: 'right', fill: r.color ?? INK_3, fontSize: 10 }} />)}
            <Tooltip content={() => null} cursor={{ fill: 'rgb(11 107 74 / 0.06)' }} />
            <Bar dataKey="v" radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={700} animationEasing="ease-out">
              {data.map((_, i) => (
                <Cell key={i} fill={i === emFoco || (emFoco === null && i === data.length - 1) ? (i === data.length - 1 ? lastColor(lastLevel) : GREEN) : NEUTRAL}
                  fillOpacity={emFoco !== null && i !== emFoco ? 0.55 : 1} style={{ transition: 'fill-opacity .15s' }} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const sleepRefs = (planned: number, advisory: number, warning: number): RefLine[] => [
  { y: planned, label: `${planned} h plan`, color: LEVEL_UI.advisory.color },
  { y: advisory, label: `${advisory} h`, color: LEVEL_UI.advisory.color },
  { y: warning, label: `${warning} h`, color: LEVEL_UI.warning.color },
];

/** Faixa de calor para escalas ordinais (KSS 1-9, Samn-Perelli 1-7). Passar o mouse diz o que o número significa. */
export function ScaleHeat({ records, max, labels, lastLevel }: { records: ApiRecord[]; max: number; labels: string[]; lastLevel?: DisplayLevel }) {
  const n = records.length;
  const [hover, setHover] = useState<number | null>(null);
  if (!n) return <p className="text-[13px] text-ink-3">No data in this period.</p>;
  const ativo = hover ?? n - 1; const rv = Number(records[ativo].value);
  return (
    <div className="grid gap-3">
      <div className="flex min-h-[28px] items-baseline gap-2.5">
        <span className="serif num text-[22px] leading-none">{rv}</span>
        <span className="text-[12px] text-ink-3">{labels[rv - 1] ?? ''} · {hover === null ? 'Latest' : fmtDay(records[ativo].recordedAt)}</span>
      </div>
      <div onMouseLeave={() => setHover(null)}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
          {records.map((r, i) => {
            const v = Number(r.value); const last = i === n - 1 && lastLevel && lastLevel !== 'normal' && lastLevel !== 'unavailable';
            return <div key={r.id} onMouseEnter={() => setHover(i)} className="grid h-9 cursor-default place-items-center rounded-md text-[12px] font-semibold transition-[transform,opacity] duration-150"
              style={{ ...(last ? { background: LEVEL_UI[lastLevel!].color, color: color.card } : { background: comAlfa(color.brand, 0.1 + (v / max) * 0.5), color: v / max > 0.6 ? color.card : INK }),
                opacity: hover !== null && hover !== i ? 0.55 : 1, transform: hover === i ? 'translateY(-2px)' : undefined }}>
              {last ? (() => { const I = LEVEL_UI[lastLevel!].Icon; return <span className="inline-flex items-center gap-0.5"><I size={12} aria-label={LEVEL_UI[lastLevel!].label} />{v}</span>; })() : v}
            </div>;
          })}
        </div>
        <div className="mt-1 grid text-[12px] text-ink-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
          {records.map((r, i) => <span key={r.id} className="truncate text-center">{n <= 10 || i === n - 1 || i % Math.ceil(n / 8) === 0 ? fmtDay(r.recordedAt) : ''}</span>)}
        </div>
      </div>
    </div>
  );
}

/** Linha ao longo do tempo + faixa pessoal sombreada + réguas. Passar o mouse mostra o valor e o dia no alto, com a linha
 * de guia e o ponto; clicar fixa o ponto. */
export function TrendChart({ records, band, refs = [], lastLevel, domain, unit, height = 176, fmt = (v) => String(v), dayTicks = true }: {
  records: ApiRecord[]; band?: { lower: number; upper: number } | null; refs?: RefLine[]; lastLevel?: DisplayLevel;
  domain?: [number | 'auto', number | 'auto']; unit?: string; height?: number; fmt?: (v: number) => string; dayTicks?: boolean;
}) {
  // Leituras de sensor podem ser centenas: mostra no máximo ~300 pontos, sempre com o último.
  const step = Math.ceil(records.length / 300);
  const shown = step > 1 ? records.filter((_, i) => i % step === 0 || i === records.length - 1) : records;
  const sameDay = new Set(shown.map((r) => fmtDay(r.recordedAt))).size === 1;
  const data = shown.map((r) => ({ at: r.recordedAt, label: dayTicks && !sameDay ? fmtDay(r.recordedAt) : fmtTime(r.recordedAt),
    v: Number(r.value), band: band ? [band.lower, band.upper] : undefined }));
  const d = useDestaque(data.length);
  const veu = useId().replace(/:/g, '');
  if (!data.length) return <p className="text-[13px] text-ink-3">No data in this period.</p>;
  const emFoco = d.hover ?? d.preso;
  return (
    <div className="grid gap-3">
      <CabecaDoGrafico valor={fmt(data[d.ativo].v)} quando={emFoco === null ? `Latest · ${fmtDateTime(data[d.ativo].at)}` : fmtDateTime(data[d.ativo].at)} preso={d.preso !== null} onSolta={d.solta} />
      <div style={{ height }} className="cursor-pointer">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} {...d.eventos}>
            <defs><linearGradient id={veu} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={GREEN} stopOpacity="0.16" /><stop offset="1" stopColor={GREEN} stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="label" {...axisProps} fontSize={10} interval={tickEvery(data.length)} />
            <YAxis domain={domain ?? ['auto', 'auto']} {...axisProps} fontSize={10} unit={unit} width={46} tickCount={5} tickFormatter={(v) => String(+Number(v).toFixed(2))} />
            {band && <Area dataKey="band" fill={BAND} fillOpacity={0.9} stroke="none" isAnimationActive={false} />}
            {refs.map((r) => <ReferenceLine key={r.label} y={r.y} stroke={r.color ?? INK_3} strokeDasharray="4 4" label={{ value: r.label, position: 'insideTopRight', fill: r.color ?? INK_3, fontSize: 10 }} />)}
            <Area dataKey="v" type="linear" stroke="none" fill={`url(#${veu})`} isAnimationActive={false} />
            <Tooltip content={() => null} cursor={{ stroke: INK_3, strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Line dataKey="v" type="linear" stroke={GREEN} strokeWidth={1.75} animationDuration={900} animationEasing="ease-out"
              activeDot={{ r: 5, fill: GREEN, stroke: color.card, strokeWidth: 2 }}
              dot={(p: any) => {
                const last = p.index === data.length - 1; const fixo = p.index === d.preso;
                return <circle key={p.index} cx={p.cx} cy={p.cy} r={fixo ? 5 : last ? 4.5 : 2} fill={last ? lastColor(lastLevel) : GREEN} stroke={fixo ? color.card : 'none'} strokeWidth={2} />;
              }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const hoursFmt = (v: number) => fmtHours(v);
