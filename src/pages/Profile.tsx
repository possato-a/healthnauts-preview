// Astronaut Profile (3.8): referências pré-missão, faixas pessoais, lista "em observação" e histórico de alertas.
import { useStore } from '../store/useStore';
import { AREA } from '../config/api';
import { StatusPill } from '../components/ui';
import { Pagina } from '../ui/Pagina';
import { Numero, NumerosGrid, Painel } from '../ui/pecas';
import { AREA_LABEL, info } from '../lib/content';
import { fmtDateTime } from '../lib/format';
import { ASTRONAUT_ID, CREW_NAME } from '../config/api';

const ACK: Record<string, string> = { acknowledged: 'Acknowledged', pending: 'Pending', not_acknowledged: 'Not acknowledged', resolved_before_acknowledgement: 'Resolved first', not_required: '—' };
const fmtVal = (v: any, unit: any) => typeof v === 'number' ? `${Number(v.toFixed(2))}${typeof unit === 'string' ? ' ' + unit : ''}` : v && typeof v === 'object' ? Object.values(v).join(' / ') : '—';

export default function Profile() {
  const mission = useStore((s) => s.mission); const alerts = useStore((s) => s.alerts); const iso = useStore((s) => s.details[AREA.isolation]);
  const refs = useStore((s) => s.missionRefs);
  const baselines = (iso?.assessments ?? []).filter((a) => a.baseline);
  const history = [...(alerts?.notifications ?? [])].sort((a, b) => Date.parse(b.shownAt) - Date.parse(a.shownAt));

  return (
    <Pagina contexto={`Crew · ${CREW_NAME}`} titulo="Me" sub="Your baseline before the mission, the alerts you have had and how your personal ranges are built.">
      {refs?.length ? (
        <NumerosGrid n={refs.length}>
          {refs.map((r: any) => (
            <Numero key={r.id} nome={`${info(r.input.indicator).label.replace(/ \(.*\)/, '')} · pre-flight`} valor={`${r.input.value} ${r.input.unit ?? ''}`.trim()} comparacao={r.input.method} />
          ))}
        </NumerosGrid>
      ) : <Painel titulo="Pre-flight baseline"><p className="text-[13px] text-ink-2">No pre-flight references recorded.</p></Painel>}

      <div id="alerts" className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <Painel titulo="In observation">
          {!(alerts?.inObservation.length) ? <p className="text-[13px] text-ink-2">Nothing in observation.</p> : (
            <ul className="grid gap-2">{alerts!.inObservation.map((o: any) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 text-[13px]"><StatusPill level={o.displayLevel ?? o.level} small /><span>{AREA_LABEL[o.areaId]} · {info(o.indicator).label}</span><span className="text-[12px] text-ink-3">since {fmtDateTime(o.since)}</span></li>
            ))}</ul>
          )}
        </Painel>
        <Painel titulo="Alert history">
          {!history.length ? <p className="text-[13px] text-ink-2">No alerts yet.</p> : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Shown</th><th>Level</th><th>Parameter</th><th>Value</th><th>Message</th><th>Acknowledgement</th><th>Status</th></tr></thead>
                <tbody>{history.map((a) => (
                  <tr key={a.id}>
                    <td className="nowrap">{fmtDateTime(a.shownAt)}</td><td><StatusPill level={a.peakLevel} small /></td>
                    <td>{info(a.indicator).label}</td><td className="nowrap">{fmtVal(a.value, a.unit)}</td><td className="min-w-[18rem]">{a.message}</td>
                    <td className="nowrap">{ACK[a.acknowledgementStatus]}{a.acknowledgedAt ? ` · ${fmtDateTime(a.acknowledgedAt)}` : ''}</td>
                    <td className="nowrap">{a.active ? 'Active' : `Resolved ${fmtDateTime(a.resolvedAt)}`}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Painel>
      </div>

      <Painel titulo="Personal ranges" legenda={<span className="text-[12px] text-ink-3">Mean ± 2 SD, first 7 mission days</span>}>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Parameter</th><th>Status</th><th>Mean</th><th>Range</th><th>Samples</th></tr></thead>
            <tbody>{baselines.map((a) => { const b = a.baseline!; return (
              <tr key={a.indicator}>
                <td>{info(a.indicator).label}</td><td>{b.status === 'ready' ? 'Ready' : b.status === 'collecting' ? 'Collecting' : 'Insufficient'}</td>
                <td className="num">{typeof b.mean === 'number' ? b.mean.toFixed(2) : '—'}</td><td className="num">{b.status === 'ready' ? `${b.lower!.toFixed(2)} to ${b.upper!.toFixed(2)}` : '—'}</td><td className="num">{b.sampleCount ?? '—'}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      </Painel>
    </Pagina>
  );
}
