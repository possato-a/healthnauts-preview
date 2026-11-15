// Rotas do app. O sensor simulado começa ligado quando o site abre (ajuste aprovado nº 4).
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from './store/useStore';
import { sim } from './sim/liveSensors';
import { AppShell } from './components/AppShell';
import { Splash } from './components/Splash';
import Overview from './pages/Overview';
import Isolation from './pages/Isolation';
import Environment from './pages/Environment';
import Radiation from './pages/Radiation';
import Gravity from './pages/Gravity';
import Distance from './pages/Distance';
import Profile from './pages/Profile';

/** Transição suave entre páginas (só opacidade: transform criaria contêiner para a gaveta fixa do detalhe). Desligada com prefers-reduced-motion. */
function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

const POLL_MS = 15000; // prazos de confirmação e status do relatório andam com o relógio

export default function App() {
  const { init, refresh, ready, error } = useStore();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined; let cancelled = false;
    init().then(() => {
      if (cancelled) return;
      sim.start(() => { refresh().catch(() => undefined); });
      timer = setInterval(() => refresh().catch(() => undefined), POLL_MS);
    });
    return () => { cancelled = true; clearInterval(timer); sim.stop(); };
  }, []);

  // A tela de carregamento fica pelo menos 2,8 s (a animação respira) e some quando os dados chegam.
  const [minimo, setMinimo] = useState(false);
  const [fim, setFim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMinimo(true), 2800); return () => clearTimeout(t); }, []);
  useEffect(() => { document.getElementById('boot')?.remove(); }, []);
  const acabou = useCallback(() => setFim(true), []);

  if (error) return <div className="p-8 text-bad">{error}</div>;
  return (
    <>
    {!fim && <Splash saindo={ready && minimo} onFim={acabou} />}
    {ready && <HashRouter>
      <AppShell>
        <PageTransition>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/isolation" element={<Isolation />} />
          <Route path="/environment" element={<Environment />} />
          <Route path="/ground" element={<Navigate to="/distance?tab=reports" replace />} />
          <Route path="/radiation" element={<Radiation />} />
          <Route path="/gravity" element={<Gravity />} />
          <Route path="/distance" element={<Distance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PageTransition>
      </AppShell>
    </HashRouter>}
    </>
  );
}
