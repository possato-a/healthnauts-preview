// Lembretes da rotina ("caixa de remédio") e sino com bolinha vermelha (do protótipo).
// Lembrete não é nível: só diz o que falta fazer hoje. O painel do sino tem a lista completa (Ready / Done / Later);
// a Overview mostra só a barra "Next up" (TodayRoutine.tsx). Bolinha vermelha = itens Ready.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Bell, Check, ClipboardCheck, Dumbbell, Scale, Timer, type LucideIcon } from 'lucide-react';
import { LEVEL_UI, severity } from '../lib/levels';
import { AREA_LABEL, AREA_PATH, info } from '../lib/content';
import { StatusPill } from './ui';
import { pvtCollection } from '../../shared/config/isolation.js';
import { dayKey, useStore } from '../store/useStore';
import { DAY_MS, startOfToday } from '../lib/format';
import { REFERENCE } from '../lib/content';
import { AREA } from '../config/api';

/** Status neutro da rotina: nunca "atrasado". Later = ainda não é a vez (ex.: PVT-B a cada 4 dias). */
export type RoutineStatus = 'ready' | 'done' | 'later';
export interface Reminder {
  id: string; icon: LucideIcon; title: string; sub: string; status: RoutineStatus;
  moment: 'Morning' | 'Today' | 'This week';
  /** Tempo estimado que o app já informa (check-in ~1 min, PVT-B 3 min, plano de exercício). */
  estimate?: string; go: () => void;
}

const PVT_EVERY_DAYS: number = (pvtCollection.schedule.find((s: any) => s.kind === 'interval') as { days?: number } | undefined)?.days ?? 4;
const WEIGH_EVERY_DAYS = 7;

export function useReminders(): Reminder[] {
  const nav = useNavigate();
  const ui = useStore((s) => s.ui); const details = useStore((s) => s.details); const exerciseToday = useStore((s) => s.exerciseToday);
  const setCheckinOpen = useStore((s) => s.setCheckinOpen); const setPvtOpen = useStore((s) => s.setPvtOpen);
  const latest = (area: string, id: string) => (details as any)[area]?.latestRecords?.find((r: any) => r.indicator === id)?.recordedAt as string | undefined;
  const lastPvt = latest(AREA.isolation, 'pvt_response_speed'); const lastMass = latest(AREA.gravity, 'body_mass');
  const daysSince = (iso?: string) => iso ? (Date.now() - Date.parse(iso)) / DAY_MS : Infinity;
  const checkinDone = ui.checkins.includes(dayKey());
  const pvtDays = daysSince(lastPvt);
  const pvtToday = !!lastPvt && Date.parse(lastPvt) >= startOfToday();
  const pvt: RoutineStatus = pvtDays >= PVT_EVERY_DAYS ? 'ready' : pvtToday ? 'done' : 'later';
  const plan = REFERENCE.exercisePlanMin;
  const weighed = daysSince(lastMass) < WEIGH_EVERY_DAYS;
  // MorningCheckin e PvtTest ficam montados no AppShell: "Start" abre a tarefa direto, sem trocar de página.
  return [
    { id: 'checkin', icon: ClipboardCheck, title: 'Morning check-in', moment: 'Morning', estimate: 'About 1 min',
      sub: checkinDone ? 'Done today' : 'Sleep, mood and stress · about 1 min', status: checkinDone ? 'done' : 'ready', go: () => setCheckinOpen(true) },
    { id: 'pvt', icon: Timer, title: 'Reaction check (PVT-B)', moment: 'Today', estimate: '3 min',
      sub: pvt === 'later' ? `Next in ${Math.ceil(PVT_EVERY_DAYS - pvtDays)} days · every ${PVT_EVERY_DAYS} days` : `Every ${PVT_EVERY_DAYS} days · 3 min`, status: pvt, go: () => setPvtOpen(true) },
    { id: 'exercise', icon: Dumbbell, title: 'Exercise today', moment: 'Today', estimate: `Plan about ${plan} min`,
      sub: `${Math.round(exerciseToday)} of ${plan} min logged`, status: exerciseToday >= plan ? 'done' : 'ready', go: () => nav('/gravity', { state: { focus: 'exercise' } }) },
    { id: 'weigh', icon: Scale, title: 'Weekly weigh-in', moment: 'This week',
      sub: weighed ? 'Done this week' : 'Once a week', status: weighed ? 'done' : 'ready', go: () => nav('/gravity', { state: { focus: 'weigh' } }) },
  ];
}

/** Contagem da rotina com os mesmos itens da lista: x = Done, y = todos os itens. */
export function routineProgress(items: Reminder[]) {
  return { done: items.filter((r) => r.status === 'done').length, total: items.length, next: items.find((r) => r.status === 'ready') ?? null };
}

const STATUS_LABEL: Record<RoutineStatus, string> = { ready: 'Ready', done: 'Done', later: 'Later' };

/** Status neutro, na cor da marca (nunca as cores de nível de alerta). Done com um check animado curto. */
export function StatusChip({ status }: { status: RoutineStatus }) {
  const reduced = useReducedMotion();
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[12px] text-ink whitespace-nowrap">
      <motion.span className="grid place-items-center w-4 h-4 rounded-full bg-brand text-space-bg" aria-hidden="true"
        initial={reduced ? false : { scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.3, ease: 'backOut' }}>
        <Check size={11} strokeWidth={3} />
      </motion.span>Done
    </span>
  );
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] whitespace-nowrap ${status === 'ready' ? 'border-brand/60 text-brand-soft' : 'border-line text-ink-2'}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** O sino é só de ALERTAS (Caution ou acima). A rotina do dia mora na tela Today. */
export function Notifications() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const active = useStore((st) => st.alerts?.active ?? []);
  const sorted = [...active].sort((a, b) => severity(b.level) - severity(a.level));
  const top = sorted[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="relative w-11 h-11 rounded-full bg-white grid place-items-center text-ink-2 hover:text-ink transition-colors [box-shadow:var(--shadow-card)]"
        aria-label={`Alerts: ${active.length} active`}>
        <Bell size={18} strokeWidth={1.75} />
        {top && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold grid place-items-center text-white" style={{ background: LEVEL_UI[top.level].color }}>{active.length}</span>}
      </button>
      {open && (
        <>
          <button aria-label="Close" className="fixed inset-0 z-40 cursor-default !min-h-0 !min-w-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-2 z-50 rise" style={{ boxShadow: 'var(--shadow-float)' }}>
            <p className="eyebrow px-3 pt-3 pb-2">Alerts</p>
            {sorted.length === 0 ? (
              <p className="px-3 pb-3 text-[14px] text-ink-2 inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#2F9E6A]" />No active alerts</p>
            ) : (
              <ul>
                {sorted.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => { setOpen(false); nav(`${AREA_PATH[a.areaId as keyof typeof AREA_PATH] ?? '/'}?indicator=${encodeURIComponent(a.indicator)}`); }}
                      className="w-full text-left rounded-xl p-3 hover:bg-paper transition-colors">
                      <span className="flex items-center gap-2 text-[12px] text-ink-2"><StatusPill level={a.level} small />{AREA_LABEL[a.areaId]} · {info(a.indicator).label}</span>
                      <span className="block text-[13px] text-ink mt-1.5 line-clamp-2">{a.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => { setOpen(false); nav('/profile#alerts'); }} className="w-full text-left px-3 py-3 mt-1 text-[13px] text-ink-2 hover:text-ink border-t transition-colors" style={{ borderColor: 'rgb(var(--border))' }}>See alert history →</button>
          </div>
        </>
      )}
    </div>
  );
}
