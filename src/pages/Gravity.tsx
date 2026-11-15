// Gravity fields: sinais vitais (NEWS2 de referência), condicionamento vs. pré-voo, equilíbrio e visão, osso.
// Osso não gera alerta: só a curva ilustrativa com selo e o acompanhamento do exercício (especificação 3.3).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Bone, Dumbbell, Eye, Scale } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AREA } from '../config/api';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useArea } from './useArea';
import { Pagina } from '../ui/Pagina';
import { Avisos, Numero, NumerosGrid, Painel } from '../ui/pecas';
import { Margens, SemanaDeAneis } from '../ui/graficos';
import type { DisplayLevel } from '../services/api';
import { CompareRow, Trends, compareItem, useTrends, type TopicDef } from '../components/lean/TopicDetail';
import { BarsChart, TrendChart } from '../components/charts';
import { VitalsCard } from '../components/VitalsCard';
import { Card, More, Section, SourcesList, StatusPill, WhyBlock, axisProps } from '../components/ui';
import { REFERENCE, info } from '../lib/content';
import { DAY_MS, ago, startOfToday } from '../lib/format';
import { NEUTRAL } from '../lib/levels';
import { color } from '../design/tokens';

const TOPICS: TopicDef[] = [
  { id: 'fitness', label: 'Fitness & bone', indicators: ['aerobic_capacity', 'muscle_strength', 'body_mass', 'vo2max'], also: ['exercise_duration'] },
  { id: 'balance', label: 'Balance & vision', indicators: ['motion_sickness', 'headache', 'dizziness', 'vision_change', 'amsler_change'] },
  { id: 'vitals', label: 'Vital signs', indicators: ['news2'], also: ['heart_rate', 'respiratory_rate', 'spo2', 'body_temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'supplemental_oxygen', 'consciousness'] },
];
const pctOf = (x: any) => (typeof x?.percentOfReference === 'number' ? `${Math.round(x.percentOfReference)}%` : '—');

function LogForms() {
  const refresh = useStore((s) => s.refresh); const mission = useStore((s) => s.mission);
  const [minutes, setMinutes] = useState(30); const [mass, setMass] = useState('');
  const [ms, setMs] = useState(0); const [headache, setHeadache] = useState(0);
  const [flags, setFlags] = useState({ dizziness: false, near_fainting: false, vision_change: false, amsler_change: false });
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (k: string, fn: () => Promise<unknown>) => { setBusy(k); try { await fn(); await refresh(); } finally { setBusy(null); } };
  const now = () => new Date().toISOString();
  // Vindo do "Start" da rotina na Overview: rola até o campo e põe o foco nele.
  const focus = (useLocation().state as { focus?: string } | null)?.focus;
  const exRef = useRef<HTMLInputElement>(null); const massRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = focus === 'exercise' ? exRef.current : focus === 'weigh' ? massRef.current : null;
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
  }, [focus]);
  const ctx = { missionId: mission?.input.missionId, method: 'scale', activity: 'routine' };
  const doneToday = Number(useStore((s) => s.exerciseToday)) || 0;
  const preMass = (useStore((s) => s.missionRefs) ?? []).find((r: any) => r.input.indicator === 'body_mass')?.input.value;
  const lastMass = useStore((s) => s.details[AREA.gravity]?.latestRecords.find((r) => r.indicator === 'body_mass'));
  // Uma faixa só (como a dos números): três células iguais, cada uma com título, campo e o botão no pé.
  const celula = 'flex min-w-0 flex-col gap-3 bg-white px-5 py-4';
  const titulo = (icone: ReactNode, t: string, sub: string) => (
    <div className="flex items-start gap-2"><span className="mt-0.5 text-ink-3 [&_svg]:size-[15px]">{icone}</span><div><h3 className="text-[14px] font-semibold tracking-[-0.01em]">{t}</h3><p className="mt-0.5 text-[12px] text-ink-3">{sub}</p></div></div>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Log</h2>
      <div className="bloco-grade grid gap-px lg:grid-cols-3">
        <div className={celula}>
          {titulo(<Dumbbell />, 'Log exercise', `About ${REFERENCE.exercisePlanMin} min a day`)}
          <div className="flex items-center gap-2"><input ref={exRef} aria-label="Exercise minutes" type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Math.max(1, +e.target.value))} className="field" /><span className="text-[13px] text-ink-3">min</span></div>
          <div>
            <dl className="flex justify-between text-[12px]"><dt className="text-ink-3">Today</dt><dd className="num text-ink">{Math.round(doneToday)} of {REFERENCE.exercisePlanMin} min</dd></dl>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${Math.min(100, (doneToday / REFERENCE.exercisePlanMin) * 100)}%` }} /></div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick durations">
            {[30, 45, 60, REFERENCE.exercisePlanMin].map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} className={`chip !min-h-0 !min-w-0 cursor-pointer ${minutes === m ? '!border-brand !bg-green-soft !text-brand-soft' : ''}`}>{m} min</button>
            ))}
          </div>
          <button disabled={!!busy} onClick={() => run('ex', () => api.records(AREA.gravity, [{ indicator: 'exercise_duration', value: minutes, unit: 'min', recordedAt: now() }]))} className="btn-primary mt-auto w-full">Save session</button>
        </div>
        <div className={celula}>
          {titulo(<Scale />, 'Weekly weigh-in', 'Against your pre-flight body mass')}
          <dl className="flex justify-between text-[12px]"><dt className="text-ink-3">Pre-flight</dt><dd className="num text-ink">{preMass ?? '—'} kg</dd></dl>
          <dl className="-mt-1.5 flex justify-between text-[12px]"><dt className="text-ink-3">Last weigh-in</dt><dd className="num text-ink">{lastMass ? `${lastMass.value} kg · ${ago(lastMass.recordedAt)}` : '—'}</dd></dl>
          <div className="flex items-center gap-2"><input ref={massRef} aria-label="Body mass in kg" type="number" step="0.1" min={30} max={200} value={mass} placeholder="Body mass" onChange={(e) => setMass(e.target.value)} className="field" /><span className="text-[13px] text-ink-3">kg</span></div>
          <button disabled={!!busy || !mass || !mission} onClick={() => run('mass', () => api.records(AREA.gravity, [{ indicator: 'body_mass', value: Number(mass), unit: 'kg', recordedAt: now(), context: ctx }]))} className="btn-primary mt-auto w-full">Save weight</button>
        </div>
        <div className={celula}>
          {titulo(<Eye />, 'Balance & vision report', 'Prototype scales, not validated instruments')}
          <label className="grid gap-1 text-[12px] text-ink-2"><span className="flex justify-between"><span>Motion sickness</span><b className="num text-ink">{ms} / 20</b></span><input type="range" min={0} max={20} value={ms} onChange={(e) => setMs(+e.target.value)} className="w-full accent-brand" /></label>
          <label className="grid gap-1 text-[12px] text-ink-2"><span className="flex justify-between"><span>Headache</span><b className="num text-ink">{headache} / 10</b></span><input type="range" min={0} max={10} value={headache} onChange={(e) => setHeadache(+e.target.value)} className="w-full accent-brand" /></label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-ink-2">
            {([['dizziness', 'Dizziness'], ['near_fainting', 'Near fainting'], ['vision_change', 'Vision changed'], ['amsler_change', 'Amsler grid differs']] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={flags[k]} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} className="accent-brand" />{l}</label>
            ))}
          </div>
          <button disabled={!!busy} onClick={() => run('sym', () => api.records(AREA.gravity, [
            { indicator: 'motion_sickness', value: ms, unit: null, recordedAt: now() }, { indicator: 'headache', value: headache, unit: null, recordedAt: now() },
            ...Object.entries(flags).map(([indicator, v]) => ({ indicator, value: v ? 1 : 0, unit: null, recordedAt: now() })),
          ]))} className="btn-primary mt-auto w-full">Save report</button>
        </div>
      </div>
    </div>
  );
}

/** Bone Loss Educational Simulation: 100 − taxa × meses. Não gera alerta. */
function BoneSimulation({ startedAt }: { startedAt?: string }) {
  const months = Array.from({ length: 13 }, (_, m) => m);
  const [lo, hi] = REFERENCE.boneRates;
  const data = months.map((m) => ({ m, low: 100 - lo * m, high: 100 - hi * m }));
  const now = startedAt ? (Date.now() - Date.parse(startedAt)) / (30 * DAY_MS) : null;
  return (
    <Card title="Bone loss · educational simulation" icon={<Bone size={15} />}>
      <div className="h-48">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={color.border} vertical={false} />
            <XAxis dataKey="m" {...axisProps} fontSize={10} unit=" mo" />
            <YAxis domain={[80, 100]} {...axisProps} fontSize={10} unit="%" />
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => `${Number(v).toFixed(1)}%`} labelFormatter={(m) => `Month ${m}`} />
            <Line dataKey="low" name={`${lo}%/month`} stroke={NEUTRAL} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="high" name={`${hi}%/month`} stroke={color.text3} strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[12px] text-ink-3">Illustrative projection ({lo}% to {hi}% a month), not a measurement{now !== null && ` · mission month ${now.toFixed(1)}`}. No alert comes from this curve.</p>
      <SourcesList ids={['s22']} />
    </Card>
  );
}

export default function Gravity() {
  const d = useArea(AREA.gravity);
  const mission = useStore((s) => s.mission);
  const { ctx, filtro } = useTrends(AREA.gravity, d.assessments);
  if (!d.ready) return <p className="p-8 text-[13px] text-ink-3">Loading…</p>;
  const lv = (id: string) => d.a(id)?.displayLevel ?? 'unavailable';
  // Bone Protection Tracker: dias da última semana com o plano de exercício cumprido (só acompanhamento).
  const byDay = new Map<number, number>();
  for (const r of d.week.filter((x) => x.indicator === 'exercise_duration')) {
    const day = new Date(r.recordedAt); day.setHours(0, 0, 0, 0);
    byDay.set(day.getTime(), (byDay.get(day.getTime()) ?? 0) + Number(r.value));
  }
  const today = byDay.get(startOfToday()) ?? 0;
  const daysOnPlan = [...byDay.values()].filter((m) => m >= REFERENCE.exercisePlanMin).length;
  const pct = (x: any) => ({ valor: typeof x?.percentOfReference === 'number' ? `${Math.round(x.percentOfReference)}% of pre-flight` : '—', fracao: typeof x?.percentOfReference === 'number' ? x.percentOfReference / 100 : 0, limite: 0.8, nivel: x?.displayLevel as DisplayLevel | undefined });
  const semana = Array.from({ length: 7 }, (_, k) => {
    const t = startOfToday() - (6 - k) * DAY_MS; const m = byDay.get(t) ?? 0;
    return { rotulo: new Date(t).toLocaleDateString('en-GB', { weekday: 'short' }), feito: m, plano: REFERENCE.exercisePlanMin, texto: `${Math.round(m)} min` };
  });
  const avisos = d.avisos().filter((x, k) => k === 0 || x.label !== info('news2').label);

  return (
    <Pagina contexto="Gravity fields" titulo="Body and balance" sub="Fitness against your pre-flight baseline, balance, vital signs and bone protection." direita={filtro}>
      <Avisos itens={avisos} />

      <NumerosGrid n={4}>
        <Numero nome="Aerobic capacity" valor={pctOf(d.newest('aerobic_capacity'))} serie={d.serie('aerobic_capacity')} nivel={d.newest('aerobic_capacity')?.displayLevel ?? 'unavailable'} definicao="Percent of your pre-flight value. NASA minimum: 80%" comparacao="of pre-flight" to="?indicator=aerobic_capacity" />
        <Numero nome="Muscle strength" valor={pctOf(d.a('muscle_strength'))} serie={d.serie('muscle_strength')} nivel={lv('muscle_strength')} definicao="Percent of your pre-flight value. NASA minimum: 80%" comparacao="of pre-flight" to="?indicator=muscle_strength" />
        <Numero nome="Body mass" valor={pctOf(d.a('body_mass'))} serie={d.serie('body_mass')} nivel={lv('body_mass')} comparacao={`of pre-flight · ${d.a('body_mass')?.observedValue ?? '—'} kg`} to="?indicator=body_mass" />
        <Numero nome="Exercise today" valor={`${Math.round(today)} min`} serie={d.serie('exercise_duration')} comparacao={`${daysOnPlan} of 7 days on plan`} definicao={`Plan: about ${REFERENCE.exercisePlanMin} min a day`} to="?indicator=exercise_duration" />
      </NumerosGrid>

      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-2">
        <Painel preenche titulo="Against your pre-flight values" legenda={<span className="text-[12px] text-ink-3">Tick = NASA minimum, 80%</span>}>
          <Margens itens={[
            { nome: 'Aerobic capacity', ...pct(d.newest('aerobic_capacity')), to: '?indicator=aerobic_capacity' },
            { nome: 'Muscle strength', ...pct(d.a('muscle_strength')), to: '?indicator=muscle_strength' },
            { nome: 'Body mass', ...pct(d.a('body_mass')), to: '?indicator=body_mass' },
          ]} />
        </Painel>
        <Painel preenche titulo="Exercise this week" legenda={<span className="text-[12px] text-ink-3">Plan: about {REFERENCE.exercisePlanMin} min a day</span>}>
          <SemanaDeAneis dias={semana} />
        </Painel>
      </div>

      <LogForms />

      <Trends ctx={ctx} topics={TOPICS}>
        {(t, c) => (<>
          {t === 'fitness' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              compareItem(c, 'body_mass', 'Body mass', (x) => `${x.toFixed(1)} kg`),
              compareItem(c, 'aerobic_capacity', 'Aerobic capacity', (x) => x.toFixed(1)),
              compareItem(c, 'muscle_strength', 'Strength', (x) => `${Math.round(x)} N`),
            ]} />
            <Section indicator="body_mass" title="Body mass"><TrendChart records={c.series('body_mass')} fmt={(x) => `${x} kg`} lastLevel={lv('body_mass')} /></Section>
            <Section indicator="exercise_duration" title="Exercise sessions"><BarsChart records={c.series('exercise_duration')} unit="m" domain={[0, 100]} refs={[{ y: REFERENCE.exercisePlanMin, label: `${REFERENCE.exercisePlanMin} min plan` }]} fmt={(x) => `${x} min`} /></Section>
            <BoneSimulation startedAt={mission?.input.startedAt} />
            <Card title="Bone protection tracker" sub="Resistance exercise done vs. plan · prevention, not diagnosis" icon={<Bone size={15} />}>
              <BarsChart records={d.week.filter((r) => r.indicator === 'exercise_duration')} unit="m" domain={[0, 100]} refs={[{ y: REFERENCE.exercisePlanMin, label: `${REFERENCE.exercisePlanMin} min plan` }]} fmt={(x) => `${x} min`} />
              <SourcesList ids={['s22']} />
            </Card>
          </>)}
          {t === 'balance' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              compareItem(c, 'motion_sickness', 'Motion sickness (0-20)', (x) => x.toFixed(0)),
              compareItem(c, 'headache', 'Headache (0-10)', (x) => x.toFixed(0)),
            ]} />
            <Section indicator="headache" title="Headache (shown next to cabin CO₂ on Environment)"><TrendChart records={c.series('headache')} domain={[0, 10]} lastLevel={lv('headache')} /></Section>
            <Section indicator="motion_sickness" title="Motion sickness"><TrendChart records={c.series('motion_sickness')} domain={[0, 20]} lastLevel={lv('motion_sickness')} /></Section>
            <Card className="col-span-full" title="Dizziness and vision">
              <ul className="grid gap-2 text-[13px]">
                {['dizziness', 'vision_change', 'amsler_change'].map((id) => <li key={id} className="flex flex-wrap items-center gap-2"><StatusPill level={lv(id)} small />{d.a(id)?.message}</li>)}
              </ul>
            </Card>
          </>)}
          {t === 'vitals' && (<>
            <div className="col-span-full"><VitalsCard detailed /></div>
            <Section indicator="heart_rate respiratory_rate spo2 news2" title="Heart rate"><TrendChart records={c.series('heart_rate')} fmt={(x) => `${x} bpm`} dayTicks={false} /></Section>
            <Section indicator="body_temperature" title="Body temperature"><TrendChart records={c.series('body_temperature')} fmt={(x) => `${x} °C`} dayTicks={false} /></Section>
            <Section indicator="blood_pressure_systolic blood_pressure_diastolic" title="Systolic blood pressure"><TrendChart records={c.series('blood_pressure_systolic')} fmt={(x) => `${x} mmHg`} dayTicks={false} /></Section>
          </>)}
        </>)}
      </Trends>

      <More title="Why measure this? · Sources">
        <WhyBlock ids={['aerobic_capacity', 'muscle_strength', 'body_mass', 'news2']} />
        <div className="mt-4 grid gap-1.5 text-[12px] text-ink-3">
          <p>On the ISS crews exercise about 1.5 h a day, 6 to 7 days a week, with loads of 2 to 3 times body weight for bone. The post-landing stand test appears only after landing.</p>
          <p>In microgravity 24-hour blood pressure drops about 8 to 10 mmHg and heart rate does not change (Norsk et al. 2015).</p>
        </div>
      </More>
    </Pagina>
  );
}
