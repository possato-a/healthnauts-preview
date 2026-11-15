// Componentes visuais compartilhados: StatusPill, Card, Section, More, Modal, SourcesList, Stat.
// Calm Instrument: o Normal é quieto (um ponto e o nome); só o que pede atenção ganha cor, sempre com ícone e texto (regra 2.1).
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ExternalLink, X } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { LEVEL_UI, INK_3, LINE } from '../lib/levels';
import { info, SOURCES } from '../lib/content';
import { cn } from '../lib/utils';
import { TickerValue } from './magic/number-ticker';
import type { DisplayLevel } from '../services/api';

/** Regra 2.1: cor + ícone + texto, nunca só cor. No Normal, o ícone é o ponto verde e o texto fica em cinza. */
export function StatusPill({ level, small }: { level: DisplayLevel; small?: boolean }) {
  const ui = LEVEL_UI[level] ?? LEVEL_UI.unavailable; const Icon = ui.Icon;
  if (level === 'normal') return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2 ${small ? 'text-[12px]' : 'text-[13px]'}`}>
      <span className="relative grid place-items-center w-2 h-2" aria-hidden="true">
        <span className="absolute inset-0 rounded-full breathe" style={{ background: ui.color, opacity: 0.35 }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ui.color }} />
      </span>{ui.label}
    </span>
  );
  if (level === 'unavailable') return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2 ${small ? 'text-[12px]' : 'text-[13px]'}`}>
      <Icon size={small ? 12 : 13} strokeWidth={2} aria-hidden="true" style={{ color: INK_3 }} />{ui.label}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${small ? 'text-[12px] px-2 py-[1px]' : 'text-[13px] px-2.5 py-0.5'}`}
      style={{ color: ui.text, background: ui.soft }}>
      <Icon size={small ? 12 : 13} strokeWidth={2.2} aria-hidden="true" style={{ color: ui.color }} />{ui.label}
    </span>
  );
}

export function Card({ title, sub, icon, right, children, className = '' }: {
  title?: string; sub?: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn('bloco grid min-w-0 grid-cols-[minmax(0,1fr)] rise', className)}>
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4 px-5 pt-4 pb-5">
        {(title || right) && (
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-start gap-2">
              {icon && <span className="mt-0.5 shrink-0 text-ink-3 [&_svg]:size-[15px]">{icon}</span>}
              <div className="min-w-0"><h2 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h2>{sub && <p className="mt-0.5 text-[12px] text-ink-3">{sub}</p>}</div>
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** Um gráfico ou bloco da grade de painéis da tela: o mesmo painel de sempre, com o título pequeno.
 * `indicator`: âncora para abrir este parâmetro direto (?indicator=<id>). Vários ids separados por espaço. */
export function Section({ title, children, right, indicator }: { title: string; children: ReactNode; right?: ReactNode; indicator?: string }) {
  return (
    <section data-indicator={indicator} className="bloco grid min-w-0 grid-cols-[minmax(0,1fr)] rise">
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4 px-5 pt-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><h2 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h2>{right}</div>
        {children}
      </div>
    </section>
  );
}

/** A referência, recolhida: um painel que abre ao clicar. */
export function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="bloco group min-w-0">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[14px] font-semibold tracking-[-0.01em] text-ink">
        {title}<ChevronDown size={16} className="text-ink-3 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

/** Janela central (check-in, teste, formulários). */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Diálogo acessível: role="dialog", Esc fecha, Tab fica dentro dele e o foco volta para quem abriu. */
export function Modal({ open, onClose, title, sub, icon, children, wide }: {
  open: boolean; onClose: () => void; title: string; sub?: string; icon?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => (box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current)?.focus(), 0);
    return () => { window.clearTimeout(t); back?.focus?.(); };
  }, [open]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  // No <body> (portal): um elemento com animação de transform acima dele faria o `fixed` se prender a ele e a janela sair do lugar.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto"
          style={{ background: 'rgb(26 26 24 / 0.22)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1} onKeyDown={onKey}
            initial={{ y: 16, opacity: 0, scale: 0.985 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full ${wide ? 'max-w-2xl' : 'max-w-xl'} bg-white rounded-xl p-6 relative my-8 outline-none`} style={{ boxShadow: 'var(--sombra-flutua)' }}>
            <button onClick={onClose} className="absolute right-4 top-4 grid size-8 !min-h-0 !min-w-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-black/[.05] hover:text-ink" aria-label="Close"><X size={16} /></button>
            <div className="mb-5 pr-10">
              {icon && <span className="block mb-3 text-ink-3 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>}
              <h2 id={`${id}-t`} className="display text-[22px] leading-tight text-ink">{title}</h2>
              {sub && <p className="mt-1 text-[13px] text-ink-3">{sub}</p>}
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function SourcesList({ ids }: { ids: string[] }) {
  return (
    <ul className="mt-1.5 space-y-1">
      {ids.map((s) => {
        const src = SOURCES[s]; if (!src) return null;
        return <li key={s} className="text-[13px]">{src.url
          ? <a className="link text-ink-2 hover:text-ink inline-flex items-center gap-1" href={src.url} target="_blank" rel="noreferrer">{src.label}<ExternalLink size={11} /></a>
          : <span className="text-ink-2">{src.label}</span>}</li>;
      })}
    </ul>
  );
}

/** "Why measure this? · Sources" para uma lista de indicadores. */
export function WhyBlock({ ids }: { ids: string[] }) {
  return (
    <div className="space-y-5">
      {ids.map((id) => { const i = info(id); return (
        <div key={id}>
          <p className="text-[14px] font-medium text-ink">{i.label}</p>
          {i.why && <p className="text-[14px] text-ink-2 mt-1 leading-relaxed">{i.why}</p>}
          {i.team && <p className="text-[13px] text-ink-2 mt-1">Team rule (no source): {i.team}</p>}
          <SourcesList ids={i.sources} />
        </div>
      ); })}
    </div>
  );
}

export const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) => (
  <div className="py-1">
    <p className="text-[13px] text-ink-2">{label}</p>
    <p className="text-[22px] num font-[420] mt-1 text-ink"><TickerValue value={value} /></p>
    {sub && <p className="text-[12px] text-ink-3 mt-0.5">{sub}</p>}
  </div>
);

/** Eixos dos gráficos: linha quase invisível e rótulos pequenos em cinza. */
export const axisProps = { stroke: LINE, tick: { fill: INK_3, fontSize: 11 }, tickLine: false, axisLine: false } as const;
