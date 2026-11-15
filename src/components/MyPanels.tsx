// "My panels" da Overview: até 10 indicadores escolhidos pela pessoa, mais graves primeiro, em grade de 2 colunas.
// Lista disponível = catálogo de cada área (indicatorDefinitions do /areas/:id) + indicadores que a API avalia
// sem estar no catálogo (ex.: dose de carreira, NEWS2), sem os legados e sem os que repetem outro (COVERED_BY).
// Valor, unidade e nível vêm da API; seta = compare.ts. A escolha fica na Overview (os cartões de área não repetem valor).
import { useEffect, useMemo, useState } from 'react';
import { api, type ApiRecord, type AreaDetail, type Assessment, type DisplayLevel, type Overview } from '../services/api';
import { AREA, type AreaId } from '../config/api';
import { useStore } from '../store/useStore';
import { AREA_LABEL, AREA_PATH, info } from '../lib/content';
import { DAY_MS, deltaText, fmtDuration, fmtHours, startOfToday } from '../lib/format';
import { weekCompare, type WeekCompare } from '../lib/compare';
import { COVERED_BY, DEFAULT_PANELS, MAX_PANELS, panelId, sortPanels, togglePanel } from '../lib/panels';
import { indicatorHref } from './scene/sceneMapping';
import { Modal } from './ui';
import { Numero, NumerosGrid, Painel } from '../ui/pecas';
import { groups } from '../../shared/config/research.js';

const AREAS: AreaId[] = [AREA.isolation, AREA.gravity, AREA.cabin, AREA.radiation, AREA.distance];
const GROUPS = groups as Record<string, Record<string, string[]>>;

export interface Available { id: string; areaId: AreaId; indicator: string; label: string; unit: string | null; scaleMax?: number; includes: string[] }
interface Panel extends Available { value: unknown; shown: string | null; level: DisplayLevel | null; week: WeekCompare | null; kind: 'hours' | 'number'; trend: number[] }

/** Indicadores disponíveis por área: catálogo (sem os legados) + avaliados fora do catálogo; os repetidos ficam dentro do que os cobre. */
export function availablePanels(details: Partial<Record<AreaId, AreaDetail>>): Available[] {
  return AREAS.flatMap((areaId) => {
    const d = details[areaId]; if (!d) return [];
    const defs = d.indicatorDefinitions.filter((x: any) => !x.deprecated);
    const ids = new Set<string>(defs.map((x: any) => x.id));
    const extra = [...new Set(d.assessments.map((a) => a.indicator))].filter((i) => !ids.has(i));
    const all: Available[] = [
      ...defs.map((x: any): Available => ({ id: panelId(areaId, x.id), areaId, indicator: x.id, label: x.label ?? info(x.id).label, unit: x.displayUnit ?? x.unit ?? null, scaleMax: x.scale?.max, includes: [] })),
      ...extra.map((i): Available => { const a = d.assessments.find((x) => x.indicator === i); return { id: panelId(areaId, i), areaId, indicator: i, label: info(i).label, unit: typeof a?.unit === 'string' ? a.unit : null, includes: [] }; }),
    ];
    const present = new Set(all.map((x) => x.indicator));
    const kept = all.filter((x) => !(COVERED_BY[x.indicator] && present.has(COVERED_BY[x.indicator])));
    for (const x of kept) x.includes = all.filter((y) => COVERED_BY[y.indicator] === x.indicator).map((y) => y.label);
    return kept;
  });
}

const newest = (xs: Assessment[], indicator: string) => xs.filter((x) => x.indicator === indicator)
  .reduce<Assessment | undefined>((top, x) => !top || (Date.parse(x.recordedAt ?? '') || 0) > (Date.parse(top.recordedAt ?? '') || 0) ? x : top, undefined);

/** Nível do grupo que a API devolve em /overview (para indicador sem nível próprio). */
function groupLevel(o: Overview | null, areaId: string, indicator: string): DisplayLevel | null {
  const g = Object.entries(GROUPS[areaId] ?? {}).find(([, ids]) => ids.includes(indicator))?.[0];
  return (g && o?.areas.find((a) => a.areaId === areaId)?.groups?.[g]?.displayLevel) || null;
}

const num = (v: number) => (Number.isInteger(v) ? String(v) : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

/** Texto do valor como a API devolveu: número com unidade, sim/não para escalas 0–1, texto ou lista. Ausente = null. */
function show(v: unknown, unit: string | null, scaleMax?: number): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    if (unit === 'h') return fmtHours(v);
    if (unit === 's') return fmtDuration(v);
    if (scaleMax === 1 && !unit) return v ? 'Yes' : 'No';
    return unit && unit !== 'count' ? `${num(v)} ${unit}` : num(v);
  }
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.length ? `${v.length} reported` : 'None';
  if (typeof v === 'object') {
    const parts = Object.values(v as Record<string, unknown>).filter((x): x is number => typeof x === 'number').map(num);
    return parts.length ? parts.join(' · ') : null;
  }
  return null;
}

/** Carrega o detalhe das 5 áreas (o store passa a atualizá-las a cada refresh). */
export function useAllAreas() {
  const loadArea = useStore((s) => s.loadArea);
  useEffect(() => { AREAS.forEach((id) => loadArea(id).catch(() => undefined)); }, []);
  return useStore((s) => s.details);
}

/** Os números que a pessoa escolheu. O título "Your panels" e o botão Customize ficam na tela (Today), acima, e abrem a janela por `aberto`. */
export function MyPanels({ chosen, onChange, aberto, onFechar }: { chosen: string[]; onChange: (next: string[]) => void; aberto: boolean; onFechar: () => void }) {
  const details = useAllAreas();
  const overview = useStore((s) => s.overview);
  const version = useStore((s) => s.version);
  const [week, setWeek] = useState<ApiRecord[]>([]);

  useEffect(() => {
    let live = true;
    const from = new Date(startOfToday() - 7 * DAY_MS); const to = new Date(Date.now() + 60000);
    Promise.all(AREAS.map((id) => api.history(id, from, to).then((h) => h.records).catch(() => [] as ApiRecord[])))
      .then((all) => { if (live) setWeek(all.flat()); });
    return () => { live = false; };
  }, [version]);

  const list = useMemo(() => availablePanels(details), [details]);
  const panels = useMemo(() => {
    const today0 = startOfToday();
    const made = chosen.map((id) => list.find((x) => x.id === id)).filter((x): x is Available => !!x).map((x): Panel => {
      const d = details[x.areaId];
      const a = d ? newest(d.assessments, x.indicator) : undefined;
      const rec = d?.latestRecords.find((r) => r.indicator === x.indicator);
      const value = rec?.value ?? a?.value ?? a?.observedValue;
      const shown = show(value, x.unit, x.scaleMax);
      // Sem valor: "–" com Unavailable. Com valor: nível próprio da API; sem ele, o nível do grupo; sem grupo, sem selo.
      const own = a && a.status !== 'not_applicable' ? a.displayLevel : null;
      const level: DisplayLevel | null = shown === null ? 'unavailable' : own ?? groupLevel(overview, x.areaId, x.indicator);
      const kind = x.unit === 'h' ? 'hours' : 'number';
      // A linhazinha dos últimos 7 dias (só leitura): os registros do indicador, na ordem do tempo.
      const trend = week.filter((r) => r.indicator === x.indicator).sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
        .map((r) => Number(r.value)).filter(Number.isFinite);
      return { ...x, value, shown, level, kind, trend, week: x.scaleMax === 1 && !x.unit ? null : weekCompare(value, week, x.indicator, today0) };
    });
    return sortPanels(made, chosen);
  }, [chosen, list, details, week, overview]);

  return (
    <>
      {panels.length === 0 ? (
        <Painel><p className="text-[13px] text-ink-2">No panels chosen. Use Customize to add up to {MAX_PANELS}.</p></Painel>
      ) : (
        <NumerosGrid n={panels.length}>
          {panels.map((p) => (
            <Numero key={p.id} nome={p.label} valor={p.shown ?? '–'} serie={p.trend.length > 1 ? p.trend : undefined} nivel={p.level}
              comparacao={p.shown !== null && p.week ? `${deltaText(p.value as number, p.week.avg, p.kind)} vs 7 days` : undefined}
              to={indicatorHref(AREA_PATH[p.areaId], p.indicator)} />
          ))}
        </NumerosGrid>
      )}
      <Customize open={aberto} onClose={onFechar} list={list} chosen={chosen} onSave={(next) => { onChange(next); onFechar(); }} />
    </>
  );
}

function Customize({ open, onClose, list, chosen, onSave }: {
  open: boolean; onClose: () => void; list: Available[]; chosen: string[]; onSave: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState(chosen);
  useEffect(() => { if (open) setDraft(chosen); }, [open]);
  const full = draft.length >= MAX_PANELS;
  return (
    <Modal open={open} onClose={onClose} title="Customize my panels" sub={`Choose up to ${MAX_PANELS} indicators from the onboard catalog`} wide>
      <p className="text-[12px] text-ink-3" aria-live="polite"><span className="num text-ink">{draft.length}/{MAX_PANELS}</span> selected{full ? ' · limit reached' : ''}</p>
      <div className="mt-4 grid max-h-[55vh] gap-5 overflow-y-auto pr-1">
        {AREAS.map((areaId, gi) => {
          const items = list.filter((x) => x.areaId === areaId);
          if (!items.length) return null;
          return (
            <fieldset key={areaId}>
              <legend className="eyebrow mb-2">{AREA_LABEL[areaId]}</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {items.map((x, i) => {
                  const on = draft.includes(x.id); const disabled = !on && full;
                  return (
                    <label key={x.id} className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${on ? 'bg-green-soft text-ink [box-shadow:inset_0_0_0_1px_rgb(var(--green-line))]' : 'text-ink-2 [box-shadow:inset_0_0_0_1px_rgb(var(--border))] hover:bg-hover'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                      <input type="checkbox" className="shrink-0" checked={on} disabled={disabled} onChange={() => setDraft(togglePanel(draft, x.id))}
                        {...(gi === 0 && i === 0 ? { 'data-autofocus': true } : {})} />
                      <span className="min-w-0">
                        {x.label}{x.unit && x.unit !== 'count' ? <span className="text-ink-3"> · {x.unit}</span> : null}
                        {x.includes.length > 0 && <span className="block text-[12px] text-ink-3">Includes {x.includes.join(' and ')}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <button type="button" className="btn-ghost" onClick={() => setDraft([...DEFAULT_PANELS])}>Reset to default</button>
        <span className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => onSave(draft)}>Save</button>
        </span>
      </div>
    </Modal>
  );
}
