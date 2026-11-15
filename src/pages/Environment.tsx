// Environment (cabine): ar, pressão, O2, conforto, ruído e checklist pós-EVA. Níveis e mensagens vêm da API.
import { useState } from 'react';
import { gas, rules } from '../../shared/config/research.js';
import { AREA } from '../config/api';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useArea } from './useArea';
import { Pagina } from '../ui/Pagina';
import { Avisos, Numero, NumerosGrid, Painel } from '../ui/pecas';
import { Margens, Medidor } from '../ui/graficos';
import { CompareRow, Trends, compareItem, useTrends, type TopicDef } from '../components/lean/TopicDetail';
import { TrendChart, type RefLine } from '../components/charts';
import { More, Section, StatusPill, WhyBlock } from '../components/ui';
import { LEVEL_UI } from '../lib/levels';
import { color } from '../design/tokens';
import { EVA_SYMPTOMS } from '../lib/content';
import { ago, fmtDateTime } from '../lib/format';

const TOPICS: TopicDef[] = [
  { id: 'air', label: 'Air', indicators: ['co2_partial_pressure', 'co2_partial_pressure_7d', 'cabin_pressure', 'inspired_oxygen_pressure'], also: ['co2_concentration', 'oxygen_fraction', 'oxygen_partial_pressure'] },
  { id: 'comfort', label: 'Comfort & noise', indicators: ['temperature_humidity', 'cabin_noise'], also: ['temperature', 'relative_humidity'] },
];
const PSIA = gas.mmHgPerUnit.psia as number;
const COMFORT = rules.climate.comfort as { temperature: number[]; humidity: number[] };
const toPsia = (mmHg: number) => mmHg / PSIA;
const n = (v: unknown, digits = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—');
// Réguas dos gráficos: os mesmos números das regras de shared/config/research.js.
const CO2_REFS: RefLine[] = [
  { y: rules.co2.limit, label: `${rules.co2.limit} mmHg (1 h, NASA)`, color: LEVEL_UI.caution.color },
  { y: rules.co2.warningAbove, label: `${rules.co2.warningAbove} mmHg`, color: LEVEL_UI.warning.color },
];
const PRESSURE_REFS: RefLine[] = [
  { y: rules.pressure.minimumPsia, label: `${rules.pressure.minimumPsia} psia`, color: LEVEL_UI.emergency.color },
  { y: rules.pressure.maximumPsia, label: `${rules.pressure.maximumPsia} psia`, color: LEVEL_UI.emergency.color },
];
const NOISE_REFS: RefLine[] = [
  { y: rules.noise.sleep, label: `${rules.noise.sleep} dBA (sleep)`, color: color.mark },
  { y: rules.noise.work, label: `${rules.noise.work} dBA (work)`, color: LEVEL_UI.advisory.color },
  { y: rules.noise.ceiling, label: `${rules.noise.ceiling} dBA`, color: LEVEL_UI.caution.color },
];

function PostEvaForm() {
  const refresh = useStore((s) => s.refresh);
  const [ended, setEnded] = useState(60); const [picked, setPicked] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const send = async () => {
    setBusy(true);
    try { await api.operation(AREA.cabin, 'post_eva', { evaEndedAt: new Date(Date.now() - ended * 60000).toISOString(), recordedAt: new Date().toISOString(), symptoms: picked }); setPicked([]); await refresh(); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4">
      <label className="inline-flex items-center gap-2 text-[12px] text-ink-3">EVA ended
        <input type="number" min={0} max={1440} value={ended} onChange={(e) => setEnded(Math.max(0, +e.target.value))} className="field !w-20 !py-1" /> min ago</label>
      <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {EVA_SYMPTOMS.map(([id, label]) => (
          <label key={id} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} className="accent-brand" />{label}
          </label>
        ))}
      </div>
      <button onClick={send} disabled={busy} className="btn-primary w-fit">{picked.length ? `Report ${picked.length} symptom${picked.length > 1 ? 's' : ''}` : 'No symptoms'}</button>
      <p className="text-[12px] text-ink-3">Check again every hour: most cases appear 60 to 240 minutes after decompression.</p>
    </div>
  );
}

export default function Environment() {
  const d = useArea(AREA.cabin);
  const grav = useStore((s) => s.details[AREA.gravity]);
  const { ctx, filtro } = useTrends(AREA.cabin, d.assessments);
  if (!d.ready) return <p className="p-8 text-[13px] text-ink-3">Loading…</p>;
  const lv = (id: string) => d.a(id)?.displayLevel ?? 'unavailable';
  const co2 = d.a('co2_partial_pressure'); const p = d.a('cabin_pressure'); const o2 = d.a('inspired_oxygen_pressure');
  const th = d.a('temperature_humidity'); const noise = d.a('cabin_noise');
  const headache = grav?.latestRecords.find((r) => r.indicator === 'headache');

  return (
    <Pagina contexto="Hostile and closed environment"
      titulo="Cabin" sub="The air you breathe, the pressure, the comfort and the noise." direita={filtro}>
      <Avisos itens={d.avisos()} />

      <NumerosGrid n={5} cols={5}>
        <Numero nome="CO₂ · 1 h avg" valor={`${n(co2?.value, 2)} mmHg`} serie={d.serie('co2_partial_pressure')} nivel={lv('co2_partial_pressure')} definicao={`NASA limit: ${rules.co2.limit} mmHg (1 h average)`} to="?indicator=co2_partial_pressure" />
        <Numero nome="Cabin pressure" valor={`${n(p?.psia ?? (typeof p?.value === 'number' ? toPsia(p.value) : undefined), 1)} psia`} serie={d.serie('cabin_pressure', toPsia)} nivel={lv('cabin_pressure')} comparacao={`Safe ${rules.pressure.minimumPsia}-${rules.pressure.maximumPsia} psia`} to="?indicator=cabin_pressure" />
        <Numero nome="Inspired O₂" valor={`${n(o2?.value, 0)} mmHg`} serie={d.serie('inspired_oxygen_pressure')} nivel={lv('inspired_oxygen_pressure')} comparacao={`Target ${rules.oxygen.normal[0]}-${rules.oxygen.normal[1]} mmHg`} to="?indicator=inspired_oxygen_pressure" />
        <Numero nome="Temp · humidity" valor={th?.value ? `${n(th.value.temperature, 1)}° · ${n(th.value.humidity, 0)}%` : '—'} serie={d.serie('temperature')} nivel={lv('temperature_humidity')} comparacao={`Comfort ${COMFORT.temperature.join('-')} °C`} to="?indicator=temperature" />
        <Numero nome="Noise" valor={`${n(noise?.value, 0)} dBA`} serie={d.serie('cabin_noise')} nivel={lv('cabin_noise')} definicao={`Work ≤ ${rules.noise.work} dBA, never above ${rules.noise.ceiling}`} to="?indicator=cabin_noise" />
      </NumerosGrid>

      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Painel preenche indicator="post_eva_symptoms reported_symptoms" titulo="Post-EVA symptom check" legenda={<StatusPill level={lv('post_eva_symptoms')} small />}>
        {d.a('post_eva_symptoms')?.message && <p className="text-[13px] text-ink-2">{d.a('post_eva_symptoms')?.message}</p>}
        <PostEvaForm />
      </Painel>
      <Painel preenche titulo="Limits" legenda={<span className="text-[12px] text-ink-3">Tick = limit</span>}>
        {typeof co2?.value === 'number' && <Medidor valor={co2.value} texto={co2.value.toFixed(2)} unidade="mmHg" max={rules.co2.limit * 1.25} limite={rules.co2.limit} nivel={lv('co2_partial_pressure')} nota={`CO₂, 1 h average · NASA limit ${rules.co2.limit} mmHg`} />}
        <Margens itens={[
          { nome: 'Cabin pressure', valor: typeof p?.value === 'number' ? `${toPsia(p.value).toFixed(1)} of ${rules.pressure.maximumPsia} psia max` : '—', fracao: typeof p?.value === 'number' ? toPsia(p.value) / (rules.pressure.maximumPsia * 1.1) : 0, limite: 1 / 1.1, nivel: lv('cabin_pressure') },
          { nome: 'Noise', valor: typeof noise?.value === 'number' ? `${Math.round(noise.value)} of ${rules.noise.ceiling} dBA` : '—', fracao: typeof noise?.value === 'number' ? noise.value / (rules.noise.ceiling * 1.2) : 0, limite: 1 / 1.2, nivel: lv('cabin_noise') },
        ]} />
      </Painel>
      </div>

      <Trends ctx={ctx} topics={TOPICS}>
        {(t, c) => (<>
          {t === 'air' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              { ...compareItem(c, 'co2_partial_pressure', 'CO₂ reading', (x) => `${x.toFixed(2)} mmHg`), level: lv('co2_partial_pressure') },
              { ...compareItem(c, 'cabin_pressure', 'Cabin pressure', (x) => `${x.toFixed(1)} psia`, 'number', toPsia), level: lv('cabin_pressure') },
              { ...compareItem(c, 'inspired_oxygen_pressure', 'Inspired O₂', (x) => `${Math.round(x)} mmHg`), level: lv('inspired_oxygen_pressure') },
            ]} />
            <Section indicator="co2_partial_pressure co2_partial_pressure_7d co2_concentration" title="CO₂ partial pressure (each reading)" right={<span className="text-[12px] text-ink-3">Headache: <b className="font-medium text-ink-2">{headache ? `${headache.value}/10 · ${fmtDateTime(headache.recordedAt)}` : 'none reported'}</b></span>}>
              <TrendChart records={c.series('co2_partial_pressure')} refs={CO2_REFS} unit="" fmt={(x) => `${x.toFixed(2)} mmHg`} lastLevel={lv('co2_partial_pressure')} />
            </Section>
            <Section indicator="cabin_pressure" title="Total cabin pressure"><TrendChart records={c.series('cabin_pressure').map((r) => ({ ...r, value: toPsia(Number(r.value)) }))} refs={PRESSURE_REFS} domain={[0, 16]} fmt={(x) => `${x.toFixed(2)} psia`} lastLevel={lv('cabin_pressure')} /></Section>
            <Section indicator="inspired_oxygen_pressure oxygen_fraction oxygen_partial_pressure" title="Inspired oxygen (PIO₂)"><TrendChart records={c.series('inspired_oxygen_pressure')} refs={[{ y: rules.oxygen.normal[0], label: `${rules.oxygen.normal[0]} mmHg`, color: LEVEL_UI.caution.color }, { y: rules.oxygen.normal[1], label: `${rules.oxygen.normal[1]} mmHg`, color: LEVEL_UI.caution.color }]} fmt={(x) => `${Math.round(x)} mmHg`} lastLevel={lv('inspired_oxygen_pressure')} /></Section>
          </>)}
          {t === 'comfort' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              { ...compareItem(c, 'temperature', 'Temperature', (x) => `${x.toFixed(1)} °C`), level: lv('temperature_humidity') },
              { ...compareItem(c, 'relative_humidity', 'Humidity', (x) => `${Math.round(x)}%`), level: lv('temperature_humidity') },
              { ...compareItem(c, 'cabin_noise', 'Noise', (x) => `${Math.round(x)} dBA`), level: lv('cabin_noise') },
            ]} />
            <Section indicator="temperature temperature_humidity" title="Temperature"><TrendChart records={c.series('temperature')} refs={COMFORT.temperature.map((y: number) => ({ y, label: `${y} °C`, color: color.mark }))} fmt={(x) => `${x} °C`} lastLevel={lv('temperature_humidity')} /></Section>
            <Section indicator="relative_humidity" title="Relative humidity"><TrendChart records={c.series('relative_humidity')} refs={COMFORT.humidity.map((y: number) => ({ y, label: `${y}%`, color: color.mark }))} fmt={(x) => `${x}%`} lastLevel={lv('temperature_humidity')} /></Section>
            <Section indicator="cabin_noise" title="Noise"><TrendChart records={c.series('cabin_noise')} refs={NOISE_REFS} fmt={(x) => `${x} dBA`} lastLevel={lv('cabin_noise')} /></Section>
          </>)}
        </>)}
      </Trends>

      <More title="Why measure this? · Sources">
        <WhyBlock ids={['co2_partial_pressure', 'cabin_pressure', 'cabin_noise']} />
        <p className="mt-4 text-[12px] text-ink-3">The CO₂ level uses the time-weighted 1-hour average ({n(co2?.value, 2)} mmHg). 7-day average: {d.a('co2_partial_pressure_7d')?.message}</p>
        <p className="mt-1.5 text-[12px] text-ink-3">Limits marked NASA come from NASA-STD-3001 Vol. 2 Rev. F (July 2026). The temperature/humidity box and noise in dBA are prototype simplifications.</p>
      </More>
    </Pagina>
  );
}
