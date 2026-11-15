// O molde de TODA tela (o da Atehra): um cabeçalho (a linha pequena em cima, o título grande, o que é da página à
// direita) e, embaixo, só blocos, com 20 px entre eles. Ordem fixa em toda tela:
//   cabeçalho → faixa de números → o que registrar → gráficos → referência.
// Tela nova = <Pagina> com os blocos de src/ui/pecas.tsx. Espaço, largura e título nunca mudam de uma tela para outra.
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/** A largura de sempre (a mesma em todas as telas). */
export const LARGURA = 'max-w-[1440px]';

/** A linha pequena de cima, igual em toda tela (como a da Atehra): o dia e onde estamos. */
const diaDeHoje = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function Pagina({ contexto, titulo, sub, direita, children }: { contexto?: string; titulo: ReactNode; sub?: ReactNode; direita?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('mx-auto grid grid-cols-[minmax(0,1fr)] gap-5 px-4 pt-3 pb-16 sm:px-8 md:pt-6', LARGURA)}>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1.5 min-w-0">
          <p className="text-[13px] text-ink-3">{diaDeHoje()}{contexto ? ` · ${contexto}` : ''}</p>
          <h1 className="titulo text-[32px] leading-[1.1] tracking-[-.015em] text-balance">{titulo}</h1>
          {sub && <p className="max-w-2xl text-[14px] leading-relaxed text-ink-2">{sub}</p>}
        </div>
        {direita && <div className="flex flex-wrap items-center gap-2">{direita}</div>}
      </header>
      {children}
    </div>
  );
}

/** Um título pequeno que separa grupos de painéis na mesma tela (o nome do tópico: Sleep, Air…). */
export function Grupo({ nome, hint }: { nome: string; hint?: string }) {
  return (
    <div className="col-span-full -mb-1 mt-3 flex items-baseline gap-3">
      <h2 className="text-[14px] font-semibold tracking-[-0.01em]">{nome}</h2>
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </div>
  );
}
