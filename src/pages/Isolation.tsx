// Isolation (mente e sono). Molde de toda tela: cabeçalho → avisos → números → registrar → gráficos → referência.
import { isolationMonitoring } from '../../shared/config/isolation.js';
import { AREA } from '../config/api';
import { useStore, dayKey } from '../store/useStore';
import { useArea } from './useArea';
import { Pagina } from '../ui/Pagina';
import { Avisos, Numero, NumerosGrid, Painel, Registrar } from '../ui/pecas';
import { MapaDeCalor, Margens } from '../ui/graficos';
import { useReminders } from '../components/Notifications';
import { CompareRow, Trends, compareItem, useTrends, type TopicDef } from '../components/lean/TopicDetail';
import { BarsChart, ScaleHeat, TrendChart, hoursFmt, sleepRefs } from '../components/charts';
import { More, Section, WhyBlock } from '../components/ui';
import { SupportTools } from '../components/SupportTools';
import { DAY_MS, ago, deltaText, fmtHours, startOfToday } from '../lib/format';
import { KSS_LABELS, REFERENCE, SP_LABELS } from '../lib/content';

const TOPICS: TopicDef[] = [
  { id: 'sleep', label: 'Sleep', indicators: ['sleep_duration', 'sleep_quality'] },
  { id: 'alertness', label: 'Alertness', indicators: ['sleepiness_kss', 'fatigue_samn_perelli', 'pvt_response_speed', 'pvt_lapses'], also: ['pvt_false_starts'] },
  { id: 'mind', label: 'Mind', indicators: ['stress', 'mood_score'] },
];
// Réguas do gráfico de sono: os mesmos cortes das regras de shared/config/isolation.js.
const sleepRule = (id: string) => isolationMonitoring.sleep_duration.rules.find((r: any) => r.id === id)?.value as number;
const SLEEP_REFS = sleepRefs(REFERENCE.sleepPlanH, sleepRule('sleep_six_hours'), sleepRule('sleep_four_hours'));
const rtMs = (speed: number) => 1000 / speed; // velocidade média 1/RT → tempo aproximado em ms (só leitura)

export default function Isolation() {
  const d = useArea(AREA.isolation);
  const { ctx, filtro } = useTrends(AREA.isolation, d.assessments);
  const { ui, setCheckinOpen, setPvtOpen } = useStore();
  const reminders = useReminders();
  if (!d.ready) return <p className="p-8 text-[13px] text-ink-3">Loading…</p>;
  const checkinDone = ui.checkins.includes(dayKey());
  const v = (id: string) => { const r = d.latest(id); return r ? Number(r.value) : NaN; };
  const band = (id: string) => { const b = d.a(id)?.baseline; return b?.status === 'ready' ? { lower: b.lower!, upper: b.upper! } : null; };
  const lastCheckin = d.latest('sleepiness_kss')?.recordedAt;
  const pvt = reminders.find((r) => r.id === 'pvt');
  // O mapa dos últimos 7 dias: o último valor de cada indicador em cada dia.
  const semana = Array.from({ length: 7 }, (_, k) => { const t = startOfToday() - (6 - k) * DAY_MS; return { t, rotulo: new Date(t).toLocaleDateString('en-GB', { weekday: 'short' }) }; });
  const celula = (ind: string, t: number, max: number, texto: (n: number) => string) => {
    const r = d.week.filter((x) => x.indicator === ind && Date.parse(x.recordedAt) >= t && Date.parse(x.recordedAt) < t + DAY_MS).at(-1);
    return r ? { f: Math.min(1, Math.max(0, Number(r.value) / max)), texto: texto(Number(r.value)) } : null;
  };
  const lvl = (id: string) => d.a(id)?.displayLevel ?? 'unavailable';

  return (
    <Pagina contexto="Isolation & confinement"
      titulo="Mind and sleep" sub="How rested, alert and steady you are today." direita={filtro}>
      <Avisos itens={d.avisos()} />

      <NumerosGrid n={4}>
        <Numero nome="Sleep last night" valor={fmtHours(v('sleep_duration'))} serie={d.serie('sleep_duration')} nivel={lvl('sleep_duration')}
          comparacao={`${deltaText(v('sleep_duration'), d.avg7('sleep_duration'), 'hours')} vs 7 days`} to="?indicator=sleep_duration" />
        <Numero nome="Sleepiness" valor={Number.isFinite(v('sleepiness_kss')) ? String(v('sleepiness_kss')) : '—'} serie={d.serie('sleepiness_kss')} nivel={lvl('sleepiness_kss')}
          definicao="Karolinska Sleepiness Scale, 1 to 9" comparacao={`${deltaText(v('sleepiness_kss'), d.avg7('sleepiness_kss'))} vs 7 days`} to="?indicator=sleepiness_kss" />
        <Numero nome="Reaction time" valor={Number.isFinite(v('pvt_response_speed')) ? `${Math.round(rtMs(v('pvt_response_speed')))} ms` : '—'} serie={d.serie('pvt_response_speed', rtMs)} nivel={lvl('pvt_response_speed')}
          comparacao={`test ${ago(d.latest('pvt_response_speed')?.recordedAt)}`} to="?indicator=pvt_response_speed" />
        <Numero nome="Stress" valor={Number.isFinite(v('stress')) ? String(Math.round(v('stress'))) : '—'} serie={d.serie('stress')} nivel={lvl('stress')}
          definicao="Self-rated, 0 to 100" comparacao={`${deltaText(v('stress'), d.avg7('stress'))} vs 7 days`} to="?indicator=stress" />
      </NumerosGrid>

      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 lg:grid-cols-2">
      <Registrar className="h-full" itens={[
        { titulo: 'Morning check-in', sub: 'Sleep, mood and stress · about 1 min', feito: checkinDone, acao: 'Start', onAcao: () => setCheckinOpen(true) },
        { titulo: 'Reaction check (PVT-B)', sub: pvt?.sub ?? 'Every 4 days · 3 min', feito: pvt?.status === 'done', acao: 'Start 3-min check', onAcao: () => setPvtOpen(true) },
      ]} />
      <Painel preenche titulo="Today at a glance">
        <Margens itens={[
          { nome: 'Sleep last night', valor: Number.isFinite(v('sleep_duration')) ? `${fmtHours(v('sleep_duration'))} of ${REFERENCE.sleepPlanH} h plan` : '—', fracao: v('sleep_duration') / 10, limite: REFERENCE.sleepPlanH / 10, nivel: lvl('sleep_duration') },
          { nome: 'Sleepiness (KSS)', valor: Number.isFinite(v('sleepiness_kss')) ? `${v('sleepiness_kss')} of 9` : '—', fracao: v('sleepiness_kss') / 9, nivel: lvl('sleepiness_kss') },
          { nome: 'Stress', valor: Number.isFinite(v('stress')) ? `${Math.round(v('stress'))} of 100` : '—', fracao: v('stress') / 100, nivel: lvl('stress') },
          { nome: 'Mood', valor: Number.isFinite(v('mood_score')) ? `${Math.round(v('mood_score'))} of 100` : '—', fracao: v('mood_score') / 100, nivel: lvl('mood_score') },
        ].map((m) => ({ ...m, fracao: Number.isFinite(m.fracao) ? m.fracao : 0 }))} />
      </Painel>
      </div>

      <Painel titulo="The last 7 days" legenda={<span className="text-[12px] text-ink-3">Darker = higher</span>}>
        <MapaDeCalor dias={semana.map((x) => x.rotulo)} linhas={[
          { nome: 'Sleep (h)', celulas: semana.map((x) => celula('sleep_duration', x.t, 10, (n) => n.toFixed(1))) },
          { nome: 'Sleepiness', celulas: semana.map((x) => celula('sleepiness_kss', x.t, 9, (n) => String(Math.round(n)))) },
          { nome: 'Stress', celulas: semana.map((x) => celula('stress', x.t, 100, (n) => String(Math.round(n)))) },
          { nome: 'Mood', celulas: semana.map((x) => celula('mood_score', x.t, 100, (n) => String(Math.round(n)))) },
        ]} />
      </Painel>

      <Trends ctx={ctx} topics={TOPICS}>
        {(t, c) => (<>
          {t === 'sleep' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              compareItem(c, 'sleep_duration', 'Sleep duration', hoursFmt, 'hours'),
              compareItem(c, 'sleep_quality', 'Sleep quality (0-100)', (x) => String(Math.round(x))),
            ]} />
            <Section indicator="sleep_duration" title="Hours of sleep"><BarsChart records={c.series('sleep_duration')} unit="h" domain={[0, 10]} refs={SLEEP_REFS} fmt={hoursFmt} lastLevel={c.assessment('sleep_duration')?.displayLevel} /></Section>
            <Section indicator="sleep_quality" title="Sleep quality"><TrendChart records={c.series('sleep_quality')} band={band('sleep_quality')} domain={[0, 100]} lastLevel={c.assessment('sleep_quality')?.displayLevel} /></Section>
          </>)}
          {t === 'alertness' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              compareItem(c, 'sleepiness_kss', 'Sleepiness (KSS 1-9)', (x) => x.toFixed(1).replace('.0', '')),
              compareItem(c, 'fatigue_samn_perelli', 'Fatigue (Samn-Perelli 1-7)', (x) => x.toFixed(1).replace('.0', '')),
              compareItem(c, 'pvt_response_speed', 'Reaction time (≈)', (x) => `${Math.round(x)} ms`, 'ms', rtMs),
            ]} />
            <Section indicator="sleepiness_kss" title="Sleepiness · KSS (1-9)"><ScaleHeat records={c.series('sleepiness_kss')} max={9} labels={KSS_LABELS} lastLevel={c.assessment('sleepiness_kss')?.displayLevel} /></Section>
            <Section indicator="fatigue_samn_perelli" title="Fatigue · Samn-Perelli (1-7)"><ScaleHeat records={c.series('fatigue_samn_perelli')} max={7} labels={SP_LABELS} lastLevel={c.assessment('fatigue_samn_perelli')?.displayLevel} /></Section>
            <Section indicator="pvt_response_speed pvt_lapses pvt_false_starts" title="Reaction check (PVT-B, every 4 days)">
              <TrendChart records={c.series('pvt_response_speed')} band={band('pvt_response_speed')} fmt={(x) => `${x.toFixed(2)} /s (≈ ${Math.round(rtMs(x))} ms)`} lastLevel={c.assessment('pvt_response_speed')?.displayLevel} />
            </Section>
          </>)}
          {t === 'mind' && (<>
            <CompareRow periodLabel={c.periodLabel} items={[
              compareItem(c, 'stress', 'Stress (0-100)', (x) => String(Math.round(x))),
              compareItem(c, 'mood_score', 'Mood (0-100)', (x) => String(Math.round(x))),
            ]} />
            <Section indicator="stress" title="Stress"><TrendChart records={c.series('stress')} band={band('stress')} domain={[0, 100]} lastLevel={c.assessment('stress')?.displayLevel} /></Section>
            <Section indicator="mood_score" title="Mood"><TrendChart records={c.series('mood_score')} band={band('mood_score')} domain={[0, 100]} lastLevel={c.assessment('mood_score')?.displayLevel} /></Section>
          </>)}
        </>)}
      </Trends>

      <SupportTools />
      <More title="Why measure this? · Sources">
        <WhyBlock ids={['sleep_duration', 'sleepiness_kss', 'pvt_response_speed', 'stress']} />
        <div className="mt-4 grid gap-1.5 text-[12px] text-ink-3">
          <p>Sleep chart lines: NASA plan 8.5 h (a goal, not a cut-off), 6 h and 4 h. PVT-B: mean response speed, higher is faster.</p>
          <p>Shaded band: your usual range (mission days 1-7), when ready. No validated cut-off exists for mood and stress; they are visible only to you and your Crew Medical Officer.</p>
        </div>
      </More>
    </Pagina>
  );
}
