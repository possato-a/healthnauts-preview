// Ground Control (especificação 3.7): fila de relatórios para a Terra, simulada no mesmo navegador.
// Status, horários e a marca "not acknowledged" vêm de GET /ground-reports.
import { useState } from 'react';
import { Check, Radio, WifiOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api, type GroundReport } from '../services/api';
import { setEarthLink } from '../sim/link';
import { StatusPill, SourcesList } from '../components/ui';
import { Painel } from '../ui/pecas';
import { AREA_LABEL, info } from '../lib/content';
import { fmtDateTime, fmtTime } from '../lib/format';
import { LEVEL_UI } from '../lib/levels';
import { NO_ACK_TEXT } from '../components/AlertBanner';

const STEPS = ['QUEUED', 'SENT', 'RECEIVED', 'REPLIED'] as const;

function Pipeline({ r }: { r: GroundReport }) {
  const t = r.transmission; const at = STEPS.indexOf(t.status);
  const when = [t.queuedAt, t.sentAt, t.receivedAt ?? t.expectedArrivalAt, t.repliedAt ?? t.expectedReplyAt];
  return (
    <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s} className={`rounded-xl px-3 py-2 text-[12px] ${i <= at ? 'bg-paper-2 text-ink' : 'text-ink-3 [box-shadow:inset_0_0_0_1px_rgb(var(--border))]'}`}>
          <span className="flex items-center gap-1 font-semibold">{i <= at && <Check size={11} strokeWidth={2.5} />}{s}</span>
          <span className="block font-mono">{when[i] ? `${i > at ? 'exp. ' : ''}${fmtTime(when[i])}` : '—'}</span>
        </li>
      ))}
    </ol>
  );
}

const ACK_TEXT: Record<string, string> = {
  acknowledged: 'Acknowledged on board', pending: 'Waiting for acknowledgement', not_acknowledged: 'Not acknowledged',
  resolved_before_acknowledgement: 'Resolved before acknowledgement', not_required: 'No acknowledgement required',
};

/** Os painéis dos relatórios para a Terra (dentro de Distance): o que se registra e a lista de relatórios. */
export function ReportsToEarth() {
  const ground = useStore((s) => s.ground); const refresh = useStore((s) => s.refresh);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  if (!ground) return null;
  const { link, reports } = ground;
  const toggle = async () => { setBusy(true); try { await setEarthLink(link.status === 'unavailable'); await refresh(); } finally { setBusy(false); } };
  const manual = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try { await api.groundReport([{ recordedAt: new Date().toISOString(), description: note.trim() }]); setNote(''); await refresh(); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <Painel titulo="Manual report">
          <p className="text-[13px] text-ink-2">Describe an action taken on board. Reports carry only parameters at Caution or above; mood and stress are never sent.</p>
          <div className="flex flex-wrap gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe an action taken on board…" className="field min-w-[12rem] flex-1" maxLength={2000} />
            <button onClick={manual} disabled={busy || !note.trim()} className="btn-primary">Send manual report</button>
          </div>
        </Painel>
        <Painel titulo="Simulate the Earth link">
          <p className="text-[13px] text-ink-2">The demo runs in this browser: GitHub Pages does not send real telemetry between devices.</p>
          <div><button onClick={toggle} disabled={busy} className="btn-ghost">{link.status === 'unavailable' ? <><Radio size={14} />Restore link</> : <><WifiOff size={14} />No Earth link</>}</button></div>
        </Painel>
      </div>

      <section data-indicator="reports" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <h2 className="-mb-1 mt-3 flex items-baseline gap-3 text-[14px] font-semibold tracking-[-0.01em]">Reports to the flight surgeon <span className="text-[12px] font-normal text-ink-3">newest first</span></h2>
        {reports.length === 0 && <Painel><p className="text-[13px] text-ink-2">No reports yet.</p></Painel>}
        {reports.map((r) => (
          <section key={r.id} className="bloco grid min-w-0 grid-cols-[minmax(0,1fr)]" style={r.level ? { boxShadow: `var(--sombra-bloco), inset 3px 0 0 ${LEVEL_UI[r.level].color}` } : undefined}>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 px-5 pt-4 pb-5">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                {r.level ? <StatusPill level={r.level} small /> : <span className="chip">Manual</span>}
                {r.immediate && <span className="chip" style={{ background: LEVEL_UI.emergency.soft, color: LEVEL_UI.emergency.text }}>Immediate</span>}
                <span className="text-ink-2">Occurred {fmtDateTime(r.createdAt)} · {r.mission.destination ?? '—'}</span>
                <span className="font-mono text-ink-3">{r.id.slice(0, 14)}</span>
                {r.notAcknowledged && <span className="chip" style={{ background: LEVEL_UI.warning.soft, color: LEVEL_UI.warning.text }}>not acknowledged</span>}
              </div>
              <Pipeline r={r} />
              <p className="text-[14px] text-ink">{r.transmission.reply ?? r.transmission.message}</p>
              {r.parameters.length > 0 && (
                <ul className="grid gap-1.5">
                  {r.parameters.map((p) => (
                    <li key={p.alertId} className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                      <StatusPill level={p.level} small />{AREA_LABEL[p.areaId]} · {info(p.indicator).label}
                      <span className="text-ink-3">· measured {fmtTime(p.measuredAt)} · received {fmtTime(p.receivedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {r.actions.length > 0 && <p className="text-[13px] text-ink-2">Actions: {r.actions.map((a) => a.description).join(' · ')}</p>}
              {r.acknowledgement.status !== 'not_required' && (
                <p className="text-[13px] text-ink-2">On board: <span className="text-ink">{ACK_TEXT[r.acknowledgement.status] ?? r.acknowledgement.status}</span>
                  {r.notAcknowledged && <> · {NO_ACK_TEXT}</>}</p>
              )}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
