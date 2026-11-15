// Distance from Earth: contexto da missão, atraso de comunicação, recursos a bordo e os relatórios para a Terra.
// Tudo numa página só (como as outras): avisos → números → missão → relatórios → referência.
import { useState } from 'react';
import { AREA } from '../config/api';
import { useStore } from '../store/useStore';
import { useArea } from './useArea';
import { Pagina } from '../ui/Pagina';
import { Avisos, Numero, NumerosGrid, Painel } from '../ui/pecas';
import { Enlace } from '../ui/graficos';
import { More, SourcesList, WhyBlock } from '../components/ui';
import { ReportsToEarth } from './GroundControl';
import { cn } from '../lib/utils';
import { DESTINATIONS } from '../lib/content';
import { fmtDuration } from '../lib/format';
import { setMissionDestination } from '../sim/link';

export default function Distance() {
  const d = useArea(AREA.distance);
  const link = useStore((s) => s.overview?.link); const mission = useStore((s) => s.mission); const ground = useStore((s) => s.ground);
  const refresh = useStore((s) => s.refresh);
  const [busy, setBusy] = useState(false);
  if (!d.ready || !link) return <p className="p-8 text-[13px] text-ink-3">Loading…</p>;
  const queued = ground?.reports.filter((r) => r.transmission.status === 'QUEUED').length ?? 0;
  const comm = d.a('communication_delay');
  const current = DESTINATIONS.find((x) => x.name === link.destination);
  // Seletor "Mission: ISS · Moon · Mars" (especificação 3.7): grava novo contexto pela operação de missão.
  const choose = async (x: (typeof DESTINATIONS)[number]) => {
    if (busy || x.name === link.destination) return;
    setBusy(true);
    try { await setMissionDestination(x.name, x.demoOneWaySeconds); await refresh(); } finally { setBusy(false); }
  };
  const seg = (on: boolean) => cn('h-8 !min-h-0 rounded-md px-4 text-[13px] transition-colors', on ? 'bg-white font-medium text-ink [box-shadow:var(--sombra-bloco)]' : 'text-ink-2 hover:text-ink');
  const avisos = d.avisos();
  if (avisos[0] && link.message) avisos[0] = { ...avisos[0], message: link.message };

  return (
    <Pagina contexto="Distance from Earth" titulo="Earth link" sub="How long a message takes, what you can do on your own, and what you have told the flight surgeon.">
      <Avisos itens={avisos} />

      <NumerosGrid n={4}>
        <Numero indicator="communication_delay" nome="One-way delay" valor={link.status === 'unavailable' ? 'No link' : fmtDuration(link.oneWaySeconds)} nivel={comm?.displayLevel ?? 'unavailable'} comparacao={`Mission: ${link.destination ?? '—'}`} />
        <Numero nome="Expected ground reply" valor={link.status === 'unavailable' ? '—' : fmtDuration(link.estimatedResponseSeconds)} definicao="2 × delay + 15 min to review" />
        <Numero nome="Reports waiting" valor={String(queued)} comparacao={queued ? 'Queued' : 'Nothing queued'} to="?indicator=reports" />
        <Numero indicator="onboard_medical_resources" nome="Onboard resources" valor={mission?.input.medicalResources ?? '—'} definicao="Operational context, not a clinical measure" />
      </NumerosGrid>

      <Painel titulo="Signal path"><Enlace atraso={fmtDuration(link.oneWaySeconds)} resposta={fmtDuration(link.estimatedResponseSeconds)} sem={link.status === 'unavailable'} /></Painel>

      <Painel titulo="Mission">
        <p className="text-[13px] text-ink-2">Current one-way delay: {link.status === 'unavailable' ? 'no link' : fmtDuration(link.oneWaySeconds)}{current ? ` · range for ${current.name}: ${current.delay}` : ''}</p>
        <div role="group" aria-label="Mission" className="inline-flex w-fit gap-0.5 rounded-lg bg-paper-2 p-0.5">
          {DESTINATIONS.map((x) => (
            <button key={x.name} type="button" disabled={busy} aria-pressed={x.name === link.destination} onClick={() => choose(x)} className={seg(x.name === link.destination)}>{x.name}</button>
          ))}
        </div>
      </Painel>

      <ReportsToEarth />

      <Painel titulo="Destinations">
        <table className="tabela">
          <thead><tr><th>Destination</th><th>One-way delay</th><th>Evacuation</th></tr></thead>
          <tbody>{DESTINATIONS.map((x) => (
            <tr key={x.name} className={x.name === link.destination ? 'atual' : ''}><td className="font-medium">{x.name}{x.name === link.destination ? ' (current)' : ''}</td><td>{x.delay}</td><td>{x.evacuation}</td></tr>
          ))}</tbody>
        </table>
        <SourcesList ids={['s14', 's16', 's17']} />
      </Painel>
      <More title="Why measure this? · Sources">
        <WhyBlock ids={['communication_delay']} />
        <SourcesList ids={['s15', 's16']} />
        <p className="mt-4 text-[12px] text-ink-3">The demo uses one delay inside each range of the specification (ISS 0.3 s, Moon 10 s, Mars 8 min). Mars solar conjunction: about 2 weeks without contact every ~2 years; NASA needs medical decision support that works without contact with Earth, and this module is a prototype of that.</p>
      </More>
    </Pagina>
  );
}
