// Today (a tela inicial). Quatro coisas, nesta ordem:
//   1. a frase do dia e a rotina (o que fazer agora)   2. o corpo em 3D com os sinais ao vivo
//   3. os 5 hazards RIDGE, um estado por linha          4. "Your panels": os números que você escolheu (até 10)
// Cada informação aparece uma vez: os números ficam nos painéis; os hazards só dizem o estado. Nada aqui decide nível.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { MissionClock } from '../components/AppShell';
import { CREW_NAME } from '../config/api';
import { routineProgress, useReminders } from '../components/Notifications';
import { useStore } from '../store/useStore';
import { useSim } from '../components/DemoPanel';
import { Pagina } from '../ui/Pagina';
import { Avisos, Painel } from '../ui/pecas';
import { Margens, Radar, type Margem } from '../ui/graficos';
import { rules } from '../../shared/config/research.js';
import { Body3D } from '../components/scene/Body3D';
import { RoutineBar } from '../components/TodayRoutine';
import { MyPanels, useAllAreas } from '../components/MyPanels';
import { StatusPill } from '../components/ui';
import { indicatorHref, sceneState, todaySummary } from '../components/scene/sceneMapping';
import { AREA } from '../config/api';
import { AREA_LABEL, AREA_PATH, REFERENCE, info } from '../lib/content';
import { ago, fmtHours } from '../lib/format';
import { DEFAULT_PANELS, clearPanels, loadPanels, savePanels } from '../lib/panels';

// RIDGE, na ordem da NASA.
const RIDGE = [
  { id: AREA.radiation, letter: 'R' }, { id: AREA.isolation, letter: 'I' }, { id: AREA.distance, letter: 'D' },
  { id: AREA.gravity, letter: 'G' }, { id: AREA.cabin, letter: 'E' },
] as const;

export default function Overview() {
  const o = useStore((s) => s.overview);
  const reports = useStore((s) => s.ground?.reports);
  const mission = useStore((s) => s.mission);
  useAllAreas();
  const reminders = useReminders();
  const { total, next } = routineProgress(reminders);
  const sim = useSim();
  const [aberto, setAberto] = useState(false);
  const [chosen, setChosen] = useState<string[]>(() => loadPanels());
  const choose = (next: string[]) => { setChosen(next); if (next.join() === DEFAULT_PANELS.join()) clearPanels(); else savePanels(next); };
  const det = useStore((st) => st.details); const exercicioHoje = useStore((st) => st.exerciseToday);
  if (!o) return null;

  const m = sim.lastVitals?.measurements;
  const scene = sceneState({ overview: o, reports, now: Date.now(), live: m ? { heartRate: Number(m.heart_rate.value), respiratoryRate: Number(m.respiratory_rate.value) } : null });
  const today = todaySummary(o, (id) => AREA_LABEL[id] ?? id);

  // A saudação (como a da Atehra): o dia, "Good morning, Alex." e duas frases simples do que importa agora.
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Good morning' : hora < 18 ? 'Good afternoon' : 'Good evening';
  const atencao = today.level !== 'normal' && today.level !== 'unavailable';
  const frase1 = atencao
    ? `${today.indicator ? info(today.indicator).label : 'One item'} needs your attention${today.also.length ? `, and ${today.also.length} more ${today.also.length === 1 ? 'item is' : 'items are'} off range.` : '. Everything else looks normal.'}`
    : 'All five hazard areas are within the expected range today.';
  const frase2 = next ? ` Next on your routine: ${next.title.toLowerCase()}.` : total ? ' Your routine is done for today.' : '';
  // As margens: o quanto falta para o limite ou o plano de cada coisa (os valores e os níveis vêm da API; a conta da barra é só desenho).
  const aval = (area: string, ind: string) => det[area as keyof typeof det]?.assessments.find((x) => x.indicator === ind);
  const co2 = aval(AREA.cabin, 'co2_partial_pressure'); const carreira = aval(AREA.radiation, 'career_effective_dose');
  const aerobica = aval(AREA.gravity, 'aerobic_capacity');
  const sonoReg = det[AREA.isolation]?.latestRecords.find((r) => r.indicator === 'sleep_duration');
  const lim = rules.co2.limit as number; const sono = sonoReg ? Number(sonoReg.value) : null;
  const margens: Margem[] = [
    { nome: 'Cabin CO₂', valor: typeof co2?.value === 'number' ? `${co2.value.toFixed(2)} of ${lim} mmHg` : '—', fracao: typeof co2?.value === 'number' ? co2.value / (lim * 1.25) : 0, limite: 0.8, nivel: co2?.displayLevel, to: '/environment?indicator=co2_partial_pressure' },
    { nome: 'Career dose', valor: typeof carreira?.percentOfLimit === 'number' ? `${carreira.percentOfLimit.toFixed(1)}% of limit` : '—', fracao: typeof carreira?.percentOfLimit === 'number' ? carreira.percentOfLimit / 100 : 0, nivel: carreira?.displayLevel, to: '/radiation' },
    { nome: 'Sleep last night', valor: sono === null ? '—' : `${fmtHours(sono)} of ${REFERENCE.sleepPlanH} h plan`, fracao: sono === null ? 0 : sono / 10, limite: REFERENCE.sleepPlanH / 10, to: '/isolation?indicator=sleep_duration' },
    { nome: 'Aerobic capacity', valor: typeof aerobica?.percentOfReference === 'number' ? `${Math.round(aerobica.percentOfReference)}% of pre-flight` : '—', fracao: typeof aerobica?.percentOfReference === 'number' ? aerobica.percentOfReference / 100 : 0, limite: 0.8, nivel: aerobica?.displayLevel, to: '/gravity?indicator=aerobic_capacity' },
    { nome: 'Exercise today', valor: `${Math.round(exercicioHoje)} of ${REFERENCE.exercisePlanMin} min`, fracao: exercicioHoje / REFERENCE.exercisePlanMin, to: '/gravity?indicator=exercise_duration' },
  ];

  const avisos = today.also.map((i) => ({ label: i.label, level: i.level, message: i.message }));

  return (
    <Pagina contexto={mission ? `${mission.input.destination} · Day ${Math.floor((Date.now() - Date.parse(mission.input.startedAt)) / 86400000) + 1}` : undefined} titulo={`${saudacao}, ${CREW_NAME}.`} sub={frase1 + frase2}
      direita={mission && <span className="inline-flex items-center gap-2 text-[12px] text-ink-3">Mission time <span className="font-mono text-ink-2"><MissionClock startedAt={mission.input.startedAt} /></span></span>}>
      <Avisos itens={avisos} />

      <div className="-mb-2 mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Your panels</h2>
        <button type="button" className="btn-ghost !min-h-[34px] !py-1" onClick={() => setAberto(true)} aria-haspopup="dialog"><SlidersHorizontal size={14} aria-hidden="true" />Customize</button>
      </div>

      {/* O alto: o corpo à esquerda; à direita, os números, o radar dos cinco riscos e as margens até os limites */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,11fr)_minmax(0,13fr)]">
        <section className="bloco relative min-h-[560px] overflow-hidden rise">
          <p className="eyebrow pointer-events-none absolute left-5 top-4 z-10">Body · live</p>
          <div className="absolute inset-0"><Body3D scene={scene} height="100%" /></div>
        </section>
        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-5">
          <MyPanels chosen={chosen} onChange={choose} aberto={aberto} onFechar={() => setAberto(false)} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
            <Painel titulo="The five hazards" legenda={<span className="text-[12px] text-ink-3">RIDGE</span>}>
              <Radar pontos={RIDGE.map(({ id, letter }) => {
                const a = o.areas.find((x) => x.areaId === id);
                return { letra: letter, nome: AREA_LABEL[id], nivel: a?.displayLevel ?? 'unavailable', mensagem: a?.headline.message ?? '', to: indicatorHref(AREA_PATH[id], a?.headline.indicator ?? null) };
              })} />
            </Painel>
            <Painel titulo="Margins" legenda={<span className="text-[12px] text-ink-3">Tick = limit or plan</span>}>
              <Margens itens={margens} />
            </Painel>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2">
        <RoutineBar />
        <Painel preenche titulo="Hazards · RIDGE">
          <ul className="-mx-5 -mb-5 -mt-2 grid auto-rows-fr divide-y-[.5px] divide-[rgb(var(--border))]">
            {RIDGE.map(({ id, letter }) => {
              const a = o.areas.find((x) => x.areaId === id); if (!a) return null;
              return (
                <li key={id}>
                  <Link to={indicatorHref(AREA_PATH[id], a.headline.indicator)} className="group grid h-full grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-x-4 px-5 py-3 transition-colors hover:bg-hover">
                    <span className="font-mono text-[12px] text-ink-3">{letter}</span>
                    <span className="min-w-0"><span className="block text-[14px] font-medium text-ink">{AREA_LABEL[id]}</span><span className="block truncate text-[12px] text-ink-3">{a.headline.message}</span></span>
                    <StatusPill level={a.displayLevel} small />
                    <span className="flex items-center gap-2 text-[12px] text-ink-3"><span className="max-md:hidden">{ago(a.lastRecordedAt)}</span><ArrowUpRight size={14} className="transition-colors group-hover:text-ink" aria-hidden="true" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Painel>
      </div>
    </Pagina>
  );
}
