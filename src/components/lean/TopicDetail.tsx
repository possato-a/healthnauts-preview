// As tendências de uma tela. Antes: uma gaveta por cima da página (e depois abas). Agora: TODOS os tópicos na grade de painéis
// da própria tela, cada um com um título pequeno, e o filtro de período no cabeçalho ("Compare today with"). Um nível só.
// Compara hoje com os últimos 7 dias (padrão) ou com um período escolhido; o período chama /history?from&to.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { api, type ApiRecord, type Assessment, type DisplayLevel } from '../../services/api';
import type { AreaId } from '../../config/api';
import { DAY_MS, deltaText, fmtDay, mean, startOfToday } from '../../lib/format';
import { FiltroPeriodo, atalhos, isoDia, type Periodo } from '../../ui/Periodo';
import { useStore } from '../../store/useStore';
import { Grupo } from '../../ui/Pagina';
import { ComUnidade } from '../../ui/pecas';
import { StatusPill } from '../ui';

/** `also`: outros indicadores mostrados no tópico (só para abrir o tópico certo a partir de ?indicator=). */
export interface TopicDef { id: string; label: string; indicators: string[]; also?: string[] }

export interface TopicCtx {
  /** Registros do período escolhido (antes de hoje). */
  compare: ApiRecord[];
  /** Registros de hoje. */
  today: ApiRecord[];
  /** Período + hoje, em ordem, para os gráficos. */
  chart: ApiRecord[];
  periodLabel: string;
  assessment: (indicator: string) => Assessment | undefined;
  series: (indicator: string, from?: ApiRecord[]) => ApiRecord[];
}

/** Indicador pedido na URL (?indicator=<id>), vindo de "Your panels" ou do corpo na Today. */
export const useIndicatorParam = () => useSearchParams()[0].get('indicator');

/** Rola até o parâmetro pedido em ?indicator=<id> e põe o foco nele (marcado com data-indicator). Espera os dados
 * carregarem (até 4 s). Fica no AppShell. A rolagem é a da área do painel (#rolagem). */
export function useIndicatorFocus() {
  const wanted = useIndicatorParam();
  const loc = useLocation();
  useEffect(() => {
    if (!wanted) return;
    const sel = `[data-indicator~="${CSS.escape(wanted)}"]`;
    const until = Date.now() + 4000;
    let raf = 0;
    const find = () => {
      const el = document.querySelector(`section${sel}`) ?? document.querySelector(sel);
      if (el instanceof HTMLElement) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        el.classList.add('indicator-focus');
        window.setTimeout(() => el.classList.remove('indicator-focus'), 2500);
        return;
      }
      if (Date.now() < until) raf = requestAnimationFrame(find);
    };
    raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
  }, [wanted, loc.key]);
}

const dayStart = (d: string) => new Date(d + 'T00:00:00').getTime();

/** O contexto das tendências de uma área e o filtro de período (que a tela põe no cabeçalho). */
export function useTrends(areaId: AreaId, assessments: Assessment[]) {
  const today0 = startOfToday();
  const [period, setPeriod] = useState<Periodo>(() => atalhos(isoDia(today0 - DAY_MS))[0].p);
  const [records, setRecords] = useState<ApiRecord[] | null>(null);
  const version = useStore((s) => s.version);
  // O período é sempre antes de hoje: hoje é o dia que se compara com ele.
  const range = { from: dayStart(period.de), to: dayStart(period.ate) + DAY_MS };
  useEffect(() => {
    let live = true;
    api.history(areaId, new Date(Math.min(range.from, today0)), new Date(Date.now() + 60000))
      .then((h) => { if (live) setRecords(h.records); }).catch(() => { if (live) setRecords([]); });
    return () => { live = false; };
  }, [areaId, range.from, range.to, version]);

  const ctx = useMemo<TopicCtx | null>(() => {
    if (!records) return null;
    const t = Date.parse;
    const compare = records.filter((r) => t(r.recordedAt) >= range.from && t(r.recordedAt) < Math.min(range.to, today0));
    const today = records.filter((r) => t(r.recordedAt) >= today0);
    const periodLabel = period.atalho ? `last ${period.atalho} days` : `${fmtDay(new Date(range.from).toISOString())} to ${fmtDay(new Date(range.to - 1).toISOString())}`;
    return { compare, today, chart: [...compare, ...today], periodLabel,
      assessment: (id) => assessments.find((a) => a.indicator === id),
      series: (id, from = [...compare, ...today]) => from.filter((r) => r.indicator === id) };
  }, [records, range.from, range.to, assessments, period.atalho]);

  const filtro = <FiltroPeriodo periodo={period} onChange={setPeriod} />;
  return { ctx, filtro };
}

/** A grade das tendências: cada tópico com o seu título pequeno e os painéis dele, duas colunas em tela larga.
 * Se o tópico tem um número ímpar de painéis, o último ocupa a linha inteira (nunca sobra um buraco ao lado). */
export function Trends({ ctx, topics, children }: { ctx: TopicCtx | null; topics: TopicDef[]; children: (topic: string, ctx: TopicCtx) => ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {topics.map((t) => (
        <div key={t.id} className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2 xl:[&>section:last-of-type:nth-of-type(odd)]:col-span-2 [&>p]:col-span-full">
          {topics.length > 1 && <Grupo nome={t.label} />}
          {ctx ? children(t.id, ctx) : <p className="text-[13px] text-ink-3">Loading…</p>}
        </div>
      ))}
    </div>
  );
}

export interface Cmp { label: string; today: string; avg: string; diff: string; level?: DisplayLevel; note?: string; indicator?: string }

/** Linha "hoje vs período": uma faixa leve de texto (nome, valor de hoje, variação e o nível), sem caixas. */
export function CompareRow({ items, periodLabel }: { items: Cmp[]; periodLabel: string }) {
  return (
    <div className="col-span-full flex flex-wrap items-end gap-x-10 gap-y-3 px-1">
      {items.map((c) => (
        <div key={c.label} data-indicator={c.indicator} className="grid gap-1" title={`Average over the ${periodLabel}: ${c.avg}`}>
          <span className="text-[12px] text-ink-3">{c.label}</span>
          <span className="flex items-baseline gap-2.5">
            <span className="serif text-[22px] leading-none num"><ComUnidade valor={c.today} /></span>
            <span className="text-[12px] text-ink-3">{c.diff} vs {periodLabel}</span>
            {c.level && c.level !== 'normal' && <StatusPill level={c.level} small />}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Monta um item de comparação: último valor do indicador vs média do período. */
export function compareItem(ctx: TopicCtx, indicator: string, label: string, fmt: (v: number) => string, kind: 'hours' | 'number' | 'ms' = 'number', map: (v: number) => number = (v) => v): Cmp {
  const all = ctx.series(indicator);
  const last = all.at(-1);
  const prev = ctx.series(indicator, ctx.compare).filter((r) => r !== last).map((r) => map(Number(r.value)));
  const today = last ? map(Number(last.value)) : NaN; const avg = mean(prev);
  return { label, indicator, today: last ? fmt(today) : '—', avg: prev.length ? fmt(avg) : '—', diff: deltaText(today, avg, kind),
    level: ctx.assessment(indicator)?.displayLevel, note: !prev.length ? 'No other value in this period.' : undefined };
}
