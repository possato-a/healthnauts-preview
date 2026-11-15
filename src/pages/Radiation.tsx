// Radiation: exposição, não saúde. Dose de carreira e evento solar vêm avaliados da API.
import { rules } from '../../shared/config/research.js';
import { AREA } from '../config/api';
import { useArea } from './useArea';
import { Pagina } from '../ui/Pagina';
import { Avisos, Numero, NumerosGrid, Painel } from '../ui/pecas';
import { More, SourcesList, WhyBlock } from '../components/ui';
import { LEVEL_UI } from '../lib/levels';
import { color as tk } from '../design/tokens';
import { ORGAN_LIMITS } from '../lib/content';
import { ago } from '../lib/format';

const BANDS = rules.career.bands as number[]; // 75, 90, 100 (% do limite)
const LIMIT = rules.career.limit as number; // 600 mSv

export default function Radiation() {
  const d = useArea(AREA.radiation);
  if (!d.ready) return <p className="p-8 text-[13px] text-ink-3">Loading…</p>;
  const career = d.a('career_effective_dose');
  const solar = d.assessments.find((x) => x.group === 'solar');
  const pct = typeof career?.percentOfLimit === 'number' ? career.percentOfLimit : null;
  const barra = career && career.displayLevel !== 'normal' && career.displayLevel !== 'unavailable' ? LEVEL_UI[career.displayLevel].color : tk.brand;

  return (
    <Pagina contexto="Space radiation" titulo="Radiation" sub="Exposure, not health: how much you have absorbed against the career limit.">
      <Avisos itens={d.avisos()} />

      <NumerosGrid n={4}>
        <Numero indicator="career_effective_dose" nome="Career dose" valor={pct === null ? '—' : `${pct.toFixed(1)}%`} nivel={career?.displayLevel ?? 'unavailable'}
          definicao={`NASA career limit: ${LIMIT} mSv`} comparacao={career?.value !== undefined ? `${career.value} of ${LIMIT} mSv` : career?.message} />
        <Numero nome="This mission" valor={career?.missionValue !== undefined ? `${career.missionValue} mSv` : '—'} definicao="Continuous dosimeter ledger" />
        <Numero nome="Prior flights" valor={career?.priorValue !== undefined ? `${career.priorValue} mSv` : '—'} definicao="Attested prior history" />
        <Numero indicator="solar_event_simulated" nome="Solar particle event" valor={solar?.recordedAt ? ago(solar.recordedAt) : 'No event'} nivel={solar?.displayLevel ?? 'normal'}
          definicao={solar?.message ?? 'No solar event recorded.'} />
      </NumerosGrid>

      <Painel titulo="Career effective dose" 
        valor={pct === null ? undefined : `${pct.toFixed(1)}%`} nota={career?.message}>
        <div>
          <div className="relative h-2 overflow-hidden rounded-full bg-track">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: barra }} />
            {BANDS.map((b) => <span key={b} className="absolute inset-y-0 w-px bg-mark" style={{ left: `${b}%` }} />)}
          </div>
          <div className="relative mt-1 h-4 text-[11px] text-ink-3">{BANDS.map((b) => <span key={b} className="absolute -translate-x-1/2" style={{ left: `${Math.min(b, 97)}%` }}>{b}%</span>)}</div>
        </div>
        {career?.limitation && <p className="text-[12px] text-ink-3">{career.limitation}</p>}
      </Painel>

      <Painel titulo="Organ limits (reference only)" legenda={<span className="text-[12px] text-ink-3">mGy-Eq</span>}>
          <table className="tabela">
            <thead><tr><th>Organ</th><th>30 days</th><th>1 year</th><th>Career</th></tr></thead>
            <tbody>{ORGAN_LIMITS.map(([o, a, b, c]) => <tr key={o}><td>{o}</td><td className="num">{a}</td><td className="num">{b}</td><td className="num">{c}</td></tr>)}</tbody>
          </table>
          <SourcesList ids={['s1']} />
        </Painel>
      <More title="Why measure this? · Sources">
        <WhyBlock ids={['career_effective_dose', 'solar_event_simulated']} />
        <ul className="mt-4 grid gap-1.5 text-[13px] text-ink-2">
          <li><b className="text-ink">Gy</b> · energy absorbed per kg of tissue.</li>
          <li><b className="text-ink">mGy-Eq</b> · absorbed dose adjusted for the type of radiation, used in organ limits.</li>
          <li><b className="text-ink">Sv and mSv</b> · effective dose, estimates the risk for the whole body.</li>
          <li><b className="text-ink">Dose rate</b> · mSv per day.</li>
        </ul>
        <p className="mt-4 text-[12px] text-ink-3">Radiation risk is mainly long term; no symptom is attributed to radiation automatically. The app does not calculate organ dose. Career bands are demonstration bands at {BANDS[0]}% and {BANDS[1]}%.</p>
      </More>
    </Pagina>
  );
}
