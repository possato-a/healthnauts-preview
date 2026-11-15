// Teste PVT-B (Basner 2011), o mesmo protocolo do Reaction Self Test da NASA na ISS (do protótipo).
// Tempo medido com performance.now(), nunca Date.now(). Os eventos vão para pvt-sessions; a API calcula o resultado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { pvtProtocol } from '../../shared/calculations.js';
import { api } from '../services/api';
import { useStore, XP_PER_PVT } from '../store/useStore';
import { Modal, Stat } from './ui';

const ISI_MIN_MS = 1000, ISI_MAX_MS = 4000, FEEDBACK_MS = 1000; // espera de 1 a 4 s, contando 1 s de feedback [31]
const DEMO_MS = 30000;
type Phase = 'intro' | 'wait' | 'stim' | 'feedback' | 'done';
type Ev = { kind: 'response'; atMs: number; rtMs: number } | { kind: 'false_start' | 'timeout'; atMs: number };

function usePvtEngine(active: boolean) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [counter, setCounter] = useState(0);
  const [msg, setMsg] = useState('');
  const r = useRef({ start: 0, startedAt: new Date(), stimAt: 0, events: [] as Ev[], timer: 0 as any, raf: 0, dur: 0, endedMs: 0 });
  const phaseRef = useRef<Phase>('intro'); phaseRef.current = phase;
  const clear = () => { clearTimeout(r.current.timer); cancelAnimationFrame(r.current.raf); };
  const elapsed = () => performance.now() - r.current.start;

  const finish = useCallback(() => { clear(); r.current.endedMs = elapsed(); setPhase('done'); }, []);

  const scheduleStim = useCallback((minMs: number, maxMs: number) => {
    setPhase('wait');
    r.current.timer = setTimeout(() => {
      if (elapsed() >= r.current.dur) return finish();
      r.current.stimAt = performance.now(); setPhase('stim');
      const tick = () => {
        const el = performance.now() - r.current.stimAt; setCounter(Math.floor(el));
        if (el >= pvtProtocol.timeoutMs) { r.current.events.push({ kind: 'timeout', atMs: r.current.stimAt + pvtProtocol.timeoutMs - r.current.start }); feedback('No response'); return; }
        r.current.raf = requestAnimationFrame(tick);
      };
      r.current.raf = requestAnimationFrame(tick);
    }, minMs + Math.random() * (maxMs - minMs));
  }, [finish]);

  const feedback = (text: string) => {
    cancelAnimationFrame(r.current.raf); setMsg(text); setPhase('feedback');
    r.current.timer = setTimeout(() => {
      if (elapsed() >= r.current.dur) return finish();
      scheduleStim(0, ISI_MAX_MS - FEEDBACK_MS);
    }, FEEDBACK_MS);
  };

  const respond = () => {
    const p = phaseRef.current; const at = elapsed();
    const last = r.current.events.at(-1)?.atMs ?? -1;
    if (p === 'wait') { clearTimeout(r.current.timer); if (at > last) r.current.events.push({ kind: 'false_start', atMs: at }); feedback('Too early'); return; }
    if (p === 'stim') {
      const rt = performance.now() - r.current.stimAt;
      if (rt >= pvtProtocol.timeoutMs) { r.current.events.push({ kind: 'timeout', atMs: r.current.stimAt + pvtProtocol.timeoutMs - r.current.start }); feedback('No response'); return; }
      r.current.events.push({ kind: 'response', atMs: at, rtMs: rt });
      feedback(rt < pvtProtocol.falseStartBelowMs ? 'Too early' : `${Math.round(rt)} ms${rt >= pvtProtocol.lapseMs ? ' · lapse' : ''}`);
    }
  };

  const begin = (demo: boolean) => {
    r.current = { ...r.current, start: performance.now(), startedAt: new Date(), events: [], dur: demo ? DEMO_MS : pvtProtocol.durationMs, endedMs: 0 };
    scheduleStim(ISI_MIN_MS, ISI_MAX_MS);
  };
  const reset = () => { clear(); setPhase('intro'); };

  useEffect(() => {
    if (!active) { reset(); return; }
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); respond(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const running = phase === 'wait' || phase === 'stim' || phase === 'feedback';
  return { phase, counter, msg, begin, respond, reset, running, data: r };
}

export function PvtTest() {
  const open = useStore((s) => s.pvtOpen); const setOpen = useStore((s) => s.setPvtOpen);
  const { refresh, addXp } = useStore();
  const [demo, setDemo] = useState(true);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const e = usePvtEngine(open);
  const close = () => { e.reset(); setResult(null); setError(null); setOpen(false); };

  // Ao terminar, envia os eventos brutos; a API calcula velocidade média (1/RT), lapsos e falsos inícios.
  useEffect(() => {
    if (e.phase !== 'done') return;
    const d = e.data.current; const completed = d.dur === pvtProtocol.durationMs;
    const durationMs = Math.min(d.endedMs, pvtProtocol.durationMs + pvtProtocol.timeoutMs);
    api.pvtSession({ startedAt: d.startedAt.toISOString(), endedAt: new Date(d.startedAt.getTime() + Math.max(1, Math.ceil(durationMs))).toISOString(),
      // Toque sem estímulo só conta dentro da janela de 3 min do protocolo.
      durationMs, completed, events: d.events.filter((x) => x.atMs <= durationMs && (x.kind !== 'false_start' || x.atMs < pvtProtocol.durationMs)) })
      .then(async (res) => { setResult(res.operation); if (res.operation.status === 'completed') addXp(XP_PER_PVT); await refresh(); })
      .catch((err) => setError(err?.message ?? 'Could not save.'));
  }, [e.phase]);

  const c = result?.calculation;
  return (
    <Modal open={open} onClose={close} title="Reaction check · PVT-B" sub="3 minutes · the reaction test NASA uses on the ISS" icon={<Timer size={18} />}>
      {e.phase === 'intro' && (
        <div className="text-[13px] text-ink-2 space-y-3">
          <p>Tap the panel (or press Space) as soon as the counter starts. Don't tap before it appears.</p>
          <p className="text-ink-3 text-[12px]">Responses of {pvtProtocol.lapseMs} ms or slower count as lapses. Taps before the counter count as false starts.</p>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={demo} onChange={(ev) => setDemo(ev.target.checked)} className="accent-brand" />Demo mode: 30 seconds (saved as a demo run, not scored)</label>
          <button onClick={() => e.begin(demo)} className="btn-primary w-full py-3">Start</button>
        </div>
      )}
      {e.running && (
        <button onPointerDown={e.respond} className="w-full h-64 rounded-2xl border border-line bg-black grid place-items-center select-none">
          {e.phase === 'stim' && <span className="font-mono text-6xl text-ink tabular-nums">{e.counter}</span>}
          {e.phase === 'feedback' && <span className="font-mono text-xl text-ink-2">{e.msg}</span>}
          {e.phase === 'wait' && <span className="text-slate-600 text-[13px]">Wait for the counter…</span>}
        </button>
      )}
      {e.phase === 'done' && (
        <div>
          {!result && !error && <p className="text-[13px] text-ink-3">Saving…</p>}
          {error && <p className="text-[13px] text-red-300">{error}</p>}
          {result && (
            <>
              {result.status === 'interrupted' && <p className="text-[13px] text-ink mb-3">Demo run, not scored. Only a full 3-minute test is compared with your usual range.</p>}
              {result.status === 'no_valid_responses' && <p className="text-[13px] text-ink mb-3">No valid responses were recorded.</p>}
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Mean speed" value={c?.responseSpeed ? `${c.responseSpeed.toFixed(2)} /s` : '—'} sub={c?.responseSpeed ? `≈ ${Math.round(1000 / c.responseSpeed)} ms` : undefined} />
                <Stat label="Lapses" value={c?.lapses ?? '—'} />
                <Stat label="False starts" value={c?.falseStarts ?? '—'} />
              </div>
              <p className="text-[12px] text-ink-3 mt-3">{c?.validResponses ?? 0} valid responses. Calculated by the onboard service; open Alertness to see how it compares with your usual range.</p>
            </>
          )}
          <button onClick={close} className="mt-4 w-full bg-brand hover:bg-brand-soft text-space-bg font-semibold rounded-xl py-3">{result?.status === 'completed' ? `Done (+${XP_PER_PVT} XP)` : 'Close'}</button>
        </div>
      )}
    </Modal>
  );
}
