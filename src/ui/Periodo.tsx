// O filtro de datas (o mesmo do dashboard da Atehra): um botão com o período e, aberto, os atalhos à esquerda e dois
// meses para escolher do dia X ao dia Y (o primeiro clique é o começo, o segundo o fim; passando o mouse a faixa aparece),
// com quantos dias e "Apply". Só se escolhem dias até ontem (hoje é o dia que se compara).
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Periodo { de: string; ate: string; atalho?: 7 | 14 | 30 }

const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SEMANA = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // segunda primeiro
const DIA_MS = 86400000;

export const isoDia = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const diasEntre = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DIA_MS) + 1;
const somarMes = (mes: string, n: number) => new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const curto = (d: string) => `${+d.slice(8, 10)} ${MESES[+d.slice(5, 7) - 1].slice(0, 3)}`;

/** Os atalhos: os últimos N dias, sem hoje. */
export const atalhos = (ontem: string): { nome: string; p: Periodo }[] =>
  ([7, 14, 30] as const).map((n) => ({ nome: `Last ${n} days`, p: { de: isoDia(utc(ontem) - (n - 1) * DIA_MS), ate: ontem, atalho: n } }));

export const nomeDoPeriodo = (p: Periodo) => p.atalho ? `Last ${p.atalho} days` : `${curto(p.de)} – ${curto(p.ate)}`;

function semanasDo(mes: string): (string | null)[][] {
  const [a, m] = [+mes.slice(0, 4), +mes.slice(5, 7)];
  const primeiro = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const c: (string | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)];
  while (c.length % 7) c.push(null);
  return Array.from({ length: c.length / 7 }, (_, s) => c.slice(s * 7, s * 7 + 7));
}

function Mes({ mes, max, escolhido, faixa, onDia, onPassar, antes, depois, escondeAntes }: {
  mes: string; max: string; escolhido: (d: string) => boolean; faixa: (d: string) => boolean; onDia: (d: string) => void; onPassar: (d: string | null) => void;
  antes?: () => void; depois?: () => void; escondeAntes?: boolean;
}) {
  return (
    <div className="grid w-[224px] gap-1.5" onMouseLeave={() => onPassar(null)}>
      <div className="flex h-7 items-center">
        <span className="flex-1 pl-1.5 text-[13px] font-semibold">{MESES[+mes.slice(5, 7) - 1]} {mes.slice(0, 4)}</span>
        {antes && <button type="button" onClick={antes} aria-label="Previous month" className={cn('grid size-7 !min-h-0 !min-w-0 place-items-center rounded-md text-ink-2 hover:bg-black/[.05]', escondeAntes && 'sm:hidden')}><ChevronLeft size={15} strokeWidth={1.6} /></button>}
        {depois && <button type="button" onClick={depois} aria-label="Next month" className="grid size-7 !min-h-0 !min-w-0 place-items-center rounded-md text-ink-2 hover:bg-black/[.05]"><ChevronRight size={15} strokeWidth={1.6} /></button>}
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-ink-3">{SEMANA.map((s, i) => <span key={i} className="h-6 leading-6">{s}</span>)}</div>
      <div role="grid" className="grid gap-px">
        {semanasDo(mes).map((sem, i) => (
          <div key={i} role="row" className="grid grid-cols-7">
            {sem.map((d, j) => {
              if (!d) return <span key={j} />;
              const sel = escolhido(d); const na = !sel && faixa(d); const fora = d > max;
              return (
                <button key={j} type="button" role="gridcell" aria-selected={sel} disabled={fora} onClick={() => onDia(d)} onMouseEnter={() => onPassar(d)}
                  className={cn('relative grid h-8 !min-h-0 !min-w-0 place-items-center rounded-md text-[13px] tabular-nums transition-colors',
                    sel ? 'bg-brand text-white' : na ? 'rounded-none bg-green-soft text-brand-soft' : 'hover:bg-black/[.05]', fora && 'text-disabled hover:bg-transparent')}>
                  {+d.slice(8, 10)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FiltroPeriodo({ periodo, onChange }: { periodo: Periodo; onChange: (p: Periodo) => void }) {
  const ontem = isoDia(Date.now() - DIA_MS);
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState<string | null>(periodo.de);
  const [ate, setAte] = useState<string | null>(periodo.ate);
  const [passando, setPassando] = useState<string | null>(null);
  const [mes, setMes] = useState(periodo.ate.slice(0, 7));
  const raiz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const abrir = () => { setDe(periodo.de); setAte(periodo.ate); setMes(periodo.ate.slice(0, 7)); setAberto((v) => !v); };
  const aplicar = (p: Periodo) => { setAberto(false); onChange(p); };
  const escolher = (d: string) => { if (!de || ate) { setDe(d); setAte(null); } else if (d < de) setDe(d); else setAte(d); };
  const fim = ate ?? (de && passando && passando >= de ? passando : null);
  const naFaixa = (d: string) => !!de && !!fim && d > de && d < fim;
  const n = de && fim ? diasEntre(de, fim) : 0;

  return (
    <span ref={raiz} className="relative flex items-center gap-2 text-[13px]">
      <span className="text-ink-3 max-sm:hidden">Compare today with</span>
      <button type="button" onClick={abrir} aria-haspopup="dialog" aria-expanded={aberto} className="btn-ghost !min-h-[34px] !py-1">
        <CalendarDays size={15} strokeWidth={1.6} />{nomeDoPeriodo(periodo)}<ChevronDown size={12} strokeWidth={2} className="opacity-60" />
      </button>
      {aberto && (
        <div role="dialog" aria-label="Choose the period" className="absolute right-0 top-full z-40 mt-2 w-[min(680px,calc(100vw-32px))] rounded-lg bg-white rise [box-shadow:var(--sombra-flutua)]">
          <div className="flex flex-col sm:flex-row">
            <div className="grid content-start gap-px border-b border-line p-2 sm:w-[168px] sm:border-b-0 sm:border-r">
              {atalhos(ontem).map(({ nome, p }) => (
                <button key={nome} type="button" onClick={() => aplicar(p)}
                  className={cn('h-8 !min-h-0 rounded-md px-2.5 text-left text-[13px] transition-colors', p.atalho === periodo.atalho ? 'bg-black/[.055] font-semibold' : 'hover:bg-black/[.04]')}>{nome}</button>
              ))}
            </div>
            <div className="grid gap-3 p-3">
              <div className="flex justify-center gap-4">
                <span className="hidden sm:block"><Mes mes={somarMes(mes, -1)} max={ontem} escolhido={(d) => d === de || d === fim} faixa={naFaixa} onDia={escolher} onPassar={setPassando} antes={() => setMes(somarMes(mes, -1))} /></span>
                <Mes mes={mes} max={ontem} escolhido={(d) => d === de || d === fim} faixa={naFaixa} onDia={escolher} onPassar={setPassando} antes={() => setMes(somarMes(mes, -1))} escondeAntes
                  {...(mes < ontem.slice(0, 7) ? { depois: () => setMes(somarMes(mes, 1)) } : {})} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-[12px] text-ink-2">
                <span className="tabular-nums">{de && fim ? `${curto(de)} – ${curto(fim)} · ${n} ${n === 1 ? 'day' : 'days'}` : de ? 'Pick the last day' : 'Pick the first day'}</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setAberto(false)} className="btn-ghost !min-h-[34px] !py-1">Cancel</button>
                  <button type="button" disabled={!de || !ate} onClick={() => de && ate && aplicar({ de, ate })} className="btn-primary !min-h-[34px] !py-1">Apply</button>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
