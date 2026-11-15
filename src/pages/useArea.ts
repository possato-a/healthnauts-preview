// Dados de uma área para as telas: detalhe (avaliações atuais), resumo do /overview e os últimos 7 dias.
import { useEffect, useMemo, useState } from 'react';
import { worstLevel } from '../../shared/config/levels.js';
import { api, type ApiRecord, type Assessment, type DisplayLevel } from '../services/api';
import type { AreaId } from '../config/api';
import { useStore } from '../store/useStore';
import { DAY_MS, mean, startOfToday } from '../lib/format';
import { info } from '../lib/content';
import { isFlagged } from '../lib/levels';

export interface AlsoItem { label: string; level: DisplayLevel; message: string }

export function useArea(areaId: AreaId) {
  const loadArea = useStore((s) => s.loadArea);
  const detail = useStore((s) => s.details[areaId]);
  const summary = useStore((s) => s.overview?.areas.find((a) => a.areaId === areaId));
  const version = useStore((s) => s.version);
  const [week, setWeek] = useState<ApiRecord[]>([]);
  useEffect(() => { loadArea(areaId).catch(() => undefined); }, [areaId]);
  useEffect(() => {
    let live = true;
    api.history(areaId, new Date(startOfToday() - 7 * DAY_MS), new Date(Date.now() + 60000)).then((h) => { if (live) setWeek(h.records); }).catch(() => undefined);
    return () => { live = false; };
  }, [areaId, version]);

  return useMemo(() => {
    const assessments: Assessment[] = detail?.assessments ?? [];
    const a = (indicator: string) => assessments.find((x) => x.indicator === indicator);
    /** Avaliação mais recente do indicador (pode haver uma por série: fonte, método, missão). */
    const newest = (indicator: string) => assessments.filter((x) => x.indicator === indicator)
      .reduce<Assessment | undefined>((top, x) => !top || (Date.parse(x.recordedAt ?? '') || 0) > (Date.parse(top.recordedAt ?? '') || 0) ? x : top, undefined);
    const latest = (indicator: string) => detail?.latestRecords.find((r) => r.indicator === indicator);
    /** Média dos últimos 7 dias, sem hoje (só descritivo). */
    const avg7 = (indicator: string, map: (v: number) => number = (v) => v) =>
      mean(week.filter((r) => r.indicator === indicator && Date.parse(r.recordedAt) < startOfToday()).map((r) => map(Number(r.value))));
    /** Pior nível entre indicadores, com a mesma prioridade da API. */
    const worst = (ids: string[]) => worstLevel(assessments.filter((x) => ids.includes(x.indicator))).displayLevel as DisplayLevel;
    /** Outras avaliações com nível, além da manchete, para o resumo do dia. */
    const also = (exclude?: string | null): AlsoItem[] => assessments.filter((x) => isFlagged(x.displayLevel) && x.indicator !== exclude)
      .map((x) => ({ label: info(x.indicator).label, level: x.displayLevel, message: x.message }));
    /** Os valores dos últimos 7 dias de um indicador, para a linhazinha do número. */
    const serie = (indicator: string, map: (v: number) => number = (v) => v) =>
      week.filter((r) => r.indicator === indicator).map((r) => map(Number(r.value))).filter((v) => Number.isFinite(v));
    /** As linhas de aviso do alto da tela: a manchete da área e os outros itens com nível. */
    const avisos = () => !summary ? [] : [
      { label: info(summary.headline.indicator ?? '').label, level: summary.displayLevel, message: summary.headline.message ?? '' },
      ...also(summary.headline.indicator).map((x) => ({ label: x.label, level: x.level, message: x.message })),
    ];
    return { detail, summary, assessments, a, newest, latest, avg7, serie, avisos, worst, also, week, ready: !!detail && !!summary };
  }, [detail, summary, week]);
}
