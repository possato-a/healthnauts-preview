// Alertas ativos (Caution ou acima) no topo de todas as telas, com Acknowledge em Warning e Emergency (2.3).
// Tudo vem de GET /alerts: prazo, escalonamento e resolução são calculados pela API a cada consulta.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Siren } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Alert } from '../services/api';
import { LEVEL_UI, severity } from '../lib/levels';
import { acknowledgement } from '../../shared/config/levels.js';
import { AREA_LABEL, info } from '../lib/content';
import { fmtTime } from '../lib/format';
import { StatusPill } from './ui';

/** Texto obrigatório da especificação 2.3. */
export const NO_ACK_TEXT = 'No acknowledgement does not mean loss of consciousness.';

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

const countdown = (iso: string | null, now: number) => {
  if (!iso) return '';
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (s <= 0) return 'deadline passed';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`;
};

function AckStatus({ a, now }: { a: Alert; now: number }) {
  const ack = useStore((s) => s.acknowledge); const [busy, setBusy] = useState(false);
  if (!a.requiresAcknowledgement) return null;
  const go = async () => { setBusy(true); try { await ack(a.id); } finally { setBusy(false); } };
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      {a.acknowledgementStatus === 'acknowledged'
        ? <span className="text-ink-2">Acknowledged at {fmtTime(a.acknowledgedAt)} · stays active until the condition returns to normal</span>
        : <>
          <button onClick={go} disabled={busy} className="btn-primary !min-h-[30px] !h-[30px]">Acknowledge</button>
          {a.acknowledgementStatus === 'not_acknowledged'
            ? <span style={{ color: LEVEL_UI.warning.text }}>Not acknowledged in time · sent to the Crew Medical Officer and a second crew member</span>
            : <span className="text-ink-2 font-mono">{countdown(a.acknowledgeBy, now)}</span>}
        </>}
      {a.groundReportId && <span className="text-ink-3">· Ground report {a.groundReportId.slice(3, 11)}</span>}
    </div>
  );
}

export function AlertBanner() {
  const active = useStore((s) => s.alerts?.active ?? []);
  const now = useNow();
  if (!active.length) return null;
  const sorted = [...active].sort((a, b) => severity(b.level) - severity(a.level));
  const needsAck = sorted.some((a) => a.requiresAcknowledgement);
  // Uma linha por alerta, na largura da página: a cor só no fio da esquerda e na etiqueta; o texto inteiro fica na dica.
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-2 px-4 pt-3 sm:px-8 md:pt-4" role="alert">
      {sorted.map((a) => {
        const c = LEVEL_UI[a.level].color;
        return (
          <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-white px-4 py-2.5 [box-shadow:var(--sombra-bloco)] [border:1px_solid_rgb(var(--border))]" style={{ borderLeft: `3px solid ${c}` }}>
            <StatusPill level={a.level} small />
            <span className="text-[13px] font-medium text-ink">{AREA_LABEL[a.areaId]} · {info(a.indicator).label}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3" title={a.message}>{a.message}</span>
            <span className="whitespace-nowrap text-[12px] text-ink-3">since {fmtTime(a.shownAt)}</span>
            <AckStatus a={a} now={now} />
          </div>
        );
      })}
      {needsAck && <p className="text-[12px] text-ink-3">{NO_ACK_TEXT} The device may be far away, switched off or offline.</p>}
    </div>
  );
}

/** Bipe simples enquanto o Emergency não é confirmado (especificação 2.1: tela cheia + som). */
function useAlarm(on: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!on) return;
    const beep = () => {
      try {
        ctx.current ??= new AudioContext();
        const o = ctx.current.createOscillator(); const g = ctx.current.createGain();
        o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ctx.current.destination);
        o.start(); o.stop(ctx.current.currentTime + 0.25);
      } catch { /* sem áudio: segue só visual */ }
    };
    beep(); const t = setInterval(beep, 1500);
    return () => clearInterval(t);
  }, [on]);
}

/** Tela cheia para Emergency ainda não confirmado. */
export function EmergencyOverlay() {
  const active = useStore((s) => s.alerts?.active ?? []);
  const ground = useStore((s) => s.ground);
  const ack = useStore((s) => s.acknowledge);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const open = active.filter((a) => a.level === 'emergency' && a.requiresAcknowledgement && a.acknowledgementStatus !== 'acknowledged');
  useAlarm(open.length > 0);
  const report = ground?.reports.find((r) => r.id === open[0]?.groundReportId);
  const go = async () => { setBusy(true); try { for (const a of open) await ack(a.id); } finally { setBusy(false); } };
  return (
    <AnimatePresence>
      {open.length > 0 && (
        <motion.div className="fixed inset-0 z-[100] bg-red-950/95 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-modal="true">
          <div className="max-w-2xl w-full text-center">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="mx-auto w-20 h-20 rounded-full bg-red-500 grid place-items-center"><Siren size={40} className="text-white" /></motion.div>
            <p className="mt-5 text-[13px] font-semibold tracking-widest text-red-200">EMERGENCY</p>
            <div className="mt-3 space-y-3">
              {open.map((a) => (
                <div key={a.id}>
                  <p className="text-[12px] text-red-200/80">{AREA_LABEL[a.areaId]} · {info(a.indicator).label}</p>
                  <p className="text-2xl md:text-3xl font-bold text-white leading-snug">{a.message}</p>
                </div>
              ))}
            </div>
            <button onClick={go} disabled={busy} className="mt-8 w-full max-w-sm rounded-2xl bg-white text-red-700 text-lg font-bold py-4 hover:bg-red-50 disabled:opacity-60">Acknowledge</button>
            <p className="mt-3 text-[13px] text-red-100 font-mono">
              {open[0].acknowledgementStatus === 'not_acknowledged'
                ? 'Not acknowledged in time · sent to the Crew Medical Officer and a second crew member'
                : `Acknowledge within ${acknowledgement.deadlineMs.emergency / 60000} minutes · ${countdown(open[0].acknowledgeBy, now)}`}
            </p>
            <p className="mt-6 text-base font-semibold text-white">{NO_ACK_TEXT}</p>
            <p className="text-[13px] text-red-100/80">The device may be far away, switched off or offline.</p>
            {report && <p className="mt-4 text-[12px] text-red-100/80">Immediate ground report {report.transmission.status.toLowerCase()} · {report.transmission.message}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
