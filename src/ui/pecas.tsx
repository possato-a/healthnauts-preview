// As peças do painel, as mesmas da Atehra (components/conselheira/pecas.tsx), com o verde deste projeto:
// Painel (o bloco com título, valor e gráfico), Numero (o número com a linha e a variação), NumerosGrid (a faixa de números
// com 1 px entre as células), Variacao (a etiqueta de variação), Aviso (uma linha de aviso), Linhazinha e ComUnidade.
// Regra de espaço: 20 px entre blocos (gap-5), 20 px por dentro (px-5), em TODAS as telas.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { GREEN, INK_3, LEVEL_UI } from '../lib/levels';
import { color } from '../design/tokens';
import type { DisplayLevel } from '../services/api';
import { StatusPill } from '../components/ui';
import { NumberTicker } from '../components/magic/number-ticker';

const Seta = () => <ChevronRight size={12} strokeWidth={1.75} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />;

/** O valor com a unidade pequena e em cinza: "63 bpm", "2.02 mmHg", "270 ms", "193 mSv". O número fica grande. */
export function ComUnidade({ valor }: { valor: string }) {
  const m = /^([−-]?[\d.,:/]+%?)\s+(\S.*)$/.exec(valor);
  const so = /^(\d+)(?:\.(\d+))?$/.exec(valor);
  if (so) return <NumberTicker value={Number(valor)} decimalPlaces={so[2]?.length ?? 0} />;
  if (!m) return <>{valor}</>;
  const num = /^(\d+)(?:\.(\d+))?$/.exec(m[1]);
  return <>{num ? <NumberTicker value={Number(m[1])} decimalPlaces={num[2]?.length ?? 0} /> : m[1]}<span className="font-sans text-[0.5em] font-normal tracking-normal text-ink-3 ml-[0.25em]">{m[2]}</span></>;
}

/** Um bloco do painel: o título (com `to`, leva ao detalhe), a legenda à direita e o conteúdo. Com `valor`, a resposta vem
 * antes do gráfico (o número grande no alto, com a variação ou uma nota ao lado). */
export function Painel({ titulo, legenda, to, valor, variacao, bom = true, nota, className, children, i, indicator, preenche }: {
  titulo?: string; legenda?: ReactNode; to?: string; valor?: string; variacao?: string; bom?: boolean; nota?: string; className?: string; children: ReactNode; i?: number; indicator?: string;
  /** O painel ocupa a altura da linha e reparte o conteúdo (uma lista de linhas iguais) por ela. */
  preenche?: boolean;
}) {
  return (
    <section data-indicator={indicator} className={cn('bloco grid min-w-0 grid-cols-[minmax(0,1fr)] rise', preenche && 'h-full', className)} style={{ ['--i' as string]: i ?? 0 }}>
      <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-4 px-5 pt-4 pb-5', preenche ? 'grid-rows-[auto_minmax(0,1fr)]' : 'content-start')}>
        {(titulo || legenda) && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {titulo && (to
              ? <Link to={to} className="group inline-flex items-center gap-1.5 text-[14px] font-semibold tracking-[-0.01em] hover:underline">{titulo}<Seta /></Link>
              : <h2 className="text-[14px] font-semibold tracking-[-0.01em]">{titulo}</h2>)}
            {legenda}
          </div>
        )}
        {valor && (
          <div className="-mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="serif text-[28px] leading-none whitespace-nowrap num"><ComUnidade valor={valor} /></span>
            {variacao && <Variacao valor={variacao} bom={bom} />}
            {nota && <span className="text-[12px] text-ink-3">{nota}</span>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** A variação numa etiqueta pequena: verde (o bom), vermelho (o ruim) e, sem mudança, cinza e sem a seta. */
export function Variacao({ valor, bom = true }: { valor: string; bom?: boolean }) {
  if (!valor || valor === '—') return null;
  const igual = !/[1-9]/.test(valor);
  const sobe = !/^[−-]/.test(valor);
  const cor = igual ? color.quiet : bom ? color.good : color.bad;
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[12px] font-medium num" style={{ color: cor, background: igual ? color.quietSoft : bom ? color.goodSoft : color.badSoft }}>
      {!igual && <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden="true"><path d={sobe ? 'M5 1l4 7H1z' : 'M5 9L1 2h8z'} fill={cor} /></svg>}
      {igual ? 'no change' : valor}
    </span>
  );
}

/** A linha curta do período, na largura do cartão, com um véu leve e o ponto no valor de agora. */
export function Linhazinha({ valores, cor = GREEN }: { valores: number[]; cor?: string }) {
  if (valores.length < 2) return <span className="h-7" />;
  const L = 200, A = 32;
  const min = Math.min(...valores), max = Math.max(...valores);
  const y = (v: number) => A - 3 - ((v - min) / (max - min || 1)) * (A - 6);
  const x = (k: number) => (k / (valores.length - 1)) * (L - 4) + 1;
  const pts = valores.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const u = valores.length - 1;
  return (
    <span className="relative block h-7 w-full">
      <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs><linearGradient id="linhazinha-veu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cor} stopOpacity="0.12" /><stop offset="1" stopColor={cor} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`${x(0).toFixed(1)},${A} ${pts} ${x(u).toFixed(1)},${A}`} fill="url(#linhazinha-veu)" />
        <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: 'spark-draw 1.2s cubic-bezier(.22,1,.36,1) .15s forwards' }} />
      </svg>
      <span className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${(x(u) / L) * 100}%`, top: `${(y(valores[u]) / A) * 100}%`, background: cor, boxShadow: '0 0 0 2px #fff' }}><span className="dot-ring absolute inset-0 rounded-full" style={{ background: cor }} aria-hidden="true" /></span>
    </span>
  );
}

/** Um número: o nome, o valor, a linha do período (ou outra coisa no lugar) e o estado/a variação. Com `onClick` ou `to`, abre o detalhe.
 * A mesma altura em todos (os cartões lado a lado ficam iguais, com ou sem linha). */
export function Numero({ nome, definicao, valor, serie, nivel, variacao, bom = true, comparacao, to, onClick, grafico, indicator }: {
  nome: string; definicao?: string; valor: string; serie?: number[]; nivel?: DisplayLevel | null; variacao?: string; bom?: boolean; comparacao?: string;
  to?: string; onClick?: () => void; grafico?: ReactNode; indicator?: string;
}) {
  const conteudo = (
    <>
      <span className="flex h-4 items-center justify-between gap-2 text-[12px] text-ink-3">
        {definicao
          ? <span data-dica={definicao} title={definicao} className="min-w-0 cursor-help truncate underline decoration-dotted decoration-[1px] underline-offset-[3px]" style={{ textDecorationColor: INK_3 }}>{nome}</span>
          : <span className="min-w-0 truncate" title={nome}>{nome}</span>}
        {(to || onClick) && <Seta />}
      </span>
      {valor.length > 14
        ? <span className="line-clamp-2 min-h-[30px] text-[14px] leading-snug text-ink">{valor}</span>
        : <span className="serif text-[28px] leading-none whitespace-nowrap num"><ComUnidade valor={valor} /></span>}
      {grafico ?? (serie ? <Linhazinha valores={serie} /> : <span className="h-7" aria-hidden="true" />)}
      {/* Numa linha só, com a mesma altura: o estado do alerta, a variação e a comparação */}
      <span className="flex h-5 min-w-0 items-center gap-x-2 overflow-hidden text-[12px] whitespace-nowrap">
        {nivel && <StatusPill level={nivel} small />}
        {variacao && <Variacao valor={variacao} bom={bom} />}
        {comparacao && <span className="min-w-0 truncate text-ink-3">{comparacao}</span>}
      </span>
    </>
  );
  const classe = 'grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2.5 overflow-hidden bg-white px-5 py-4 text-left';
  if (to) return <Link to={to} data-indicator={indicator} className={cn(classe, 'group transition-colors hover:!bg-hover')}>{conteudo}</Link>;
  if (onClick) return <button type="button" data-indicator={indicator} onClick={onClick} className={cn(classe, 'group transition-colors hover:!bg-hover !min-h-0')}>{conteudo}</button>;
  return <div data-indicator={indicator} className={classe}>{conteudo}</div>;
}

/** A faixa de números: células com 1 px entre elas. Completa a última linha com células vazias (a grade nunca fica com buraco). */
export function NumerosGrid({ children, cols, n }: { children: ReactNode; cols?: 3 | 4 | 5; n: number }) {
  const c = cols ?? (n <= 4 ? (n as 1 | 2 | 3 | 4) : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : n % 5 === 0 ? 5 : 4);
  const classes: Record<number, string> = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4', 5: 'grid-cols-2 lg:grid-cols-5',
  };
  const fill = (c - (n % c)) % c;
  return (
    <div className={cn('bloco-grade grid gap-px', classes[c] ?? classes[4])}>
      {children}
      {Array.from({ length: fill }, (_, k) => <div key={`v${k}`} className="hidden bg-white lg:block" aria-hidden="true" />)}
    </div>
  );
}

/** As linhas de aviso, discretas: o estado e a frase, uma linha cada. O que já é alerta ativo (Caution ou acima) aparece no
 * banner do alto e não se repete aqui. */
export function Avisos({ itens }: { itens: { label: string; level: DisplayLevel; message: string }[] }) {
  const lista = itens.filter((a) => !['caution', 'warning', 'emergency'].includes(a.level));
  if (!lista.length) return null;
  return (
    <div className="divide-y-[.5px] divide-[rgb(var(--border))] rounded-lg bg-white [box-shadow:var(--sombra-bloco)] [border:1px_solid_rgb(var(--border))]">
      {lista.map((a, k) => (
        <div key={k} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-[13px]">
          <StatusPill level={a.level} small />
          <span className="font-medium text-ink">{a.label}</span>
          <span className="min-w-0 text-ink-3">{a.message}</span>
        </div>
      ))}
    </div>
  );
}

/** A legenda dos gráficos: o quadradinho (ou o traço) e o nome. */
export function Legenda({ itens }: { itens: { nome: string; cor: string; tracejado?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
      {itens.map((i) => (
        <span key={i.nome} className="flex items-center gap-1.5">
          {i.tracejado ? <span className="w-3.5 border-t border-dashed" style={{ borderColor: i.cor }} /> : <span className="size-2 rounded-[2px]" style={{ background: i.cor }} />}
          {i.nome}
        </span>
      ))}
    </div>
  );
}

export const corDoNivel = (l: DisplayLevel) => LEVEL_UI[l].color;

/** "O que registrar": um painel com uma linha por tarefa (título, o que é, e o botão ou o Done). */
export function Registrar({ titulo = 'Log', legenda, itens, i, className }: {
  titulo?: string; legenda?: ReactNode; i?: number; className?: string;
  itens: { titulo: string; sub: string; feito?: boolean; acao: string; onAcao: () => void; desligado?: boolean }[];
}) {
  return (
    <section className={cn('bloco grid min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] rise', className)} style={{ ['--i' as string]: i ?? 0 }}>
      <div className="flex items-center justify-between gap-4 px-5 pt-4">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em]">{titulo}</h2>{legenda}
      </div>
      <ul className="mt-2 grid auto-rows-fr divide-y-[.5px] divide-[rgb(var(--border))]">
        {itens.map((r) => (
          <li key={r.titulo} className="flex flex-wrap content-center items-center gap-x-6 gap-y-2 px-5 py-3">
            <div className="min-w-[14rem] flex-1">
              <p className="text-[14px] font-medium text-ink">{r.titulo}</p>
              <p className="mt-0.5 text-[12px] text-ink-3">{r.sub}</p>
            </div>
            {r.feito
              ? <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2"><span className="size-1.5 rounded-full bg-good" />Done</span>
              : <button type="button" onClick={r.onAcao} disabled={r.desligado} className="btn-ghost">{r.acao}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
