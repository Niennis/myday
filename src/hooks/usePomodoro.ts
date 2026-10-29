// Pomodoro: 25 minutos de concentración y 5 de descanso, salvo que la persona elija otros tiempos.
// El descanso empieza solo; el siguiente pomodoro, cuando la persona quiera.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Day } from '../lib/dates.ts';
import type { Repo } from '../data/types.ts';
import { notify, setTrayTooltip } from '../platform.ts';

// En desarrollo, con ?rapido en la dirección, los minutos duran un segundo.
const MIN = import.meta.env.DEV && location.search.includes('rapido') ? 1000 : 60000;
export const PHASES = {
  focus: { name: 'Concentración' },
  rest: { name: 'Descanso' },
} as const;
export type Phase = keyof typeof PHASES;
/** Minutos de cada fase. */
export type Lens = Record<Phase, number>;
export const DEFAULT_LENS: Lens = { focus: 25, rest: 5 };
export const MAX_MIN = 180;
const validLen = (n: unknown) => (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_MIN ? n : null);
export type Status = 'idle' | 'running' | 'paused';

export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Un sonido suave de dos notas al terminar. */
function chime() {
  try {
    const ctx = new AudioContext();
    [523, 659].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.25);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch { /* sin audio */ }
}

export function usePomodoro(repo: Repo | null, today: Day, announce: (msg: string) => void) {
  const [phase, setPhase] = useState<Phase>('focus');
  const [status, setStatus] = useState<Status>('idle');
  const [lens, setLensState] = useState<Lens>(DEFAULT_LENS);
  const [left, setLeft] = useState<number>(DEFAULT_LENS.focus * MIN);
  const [done, setDone] = useState(0);
  const endAt = useRef(0);
  const lensRef = useRef(lens);
  lensRef.current = lens;
  const lenOf = (p: Phase) => lensRef.current[p] * MIN;

  // Los tiempos elegidos se recuerdan.
  useEffect(() => {
    repo?.getSetting('pomodoro-tiempos').then((v) => {
      const saved = v ? JSON.parse(v) : null;
      const focus = validLen(saved?.focus);
      const rest = validLen(saved?.rest);
      if (focus && rest) {
        setLensState({ focus, rest });
        setLeft((l) => (l === DEFAULT_LENS.focus * MIN ? focus * MIN : l));
      }
    });
  }, [repo]);

  // Cuántos van hoy (se guarda, por si la app se reinicia).
  useEffect(() => {
    repo?.getSetting('pomodoros').then((v) => {
      const s = v ? JSON.parse(v) : null;
      setDone(s?.day === today ? s.done : 0);
    });
  }, [repo, today]);

  const reset = useCallback((p: Phase, start = false) => {
    setPhase(p);
    setLeft(lenOf(p));
    setStatus(start ? 'running' : 'idle');
    if (start) endAt.current = Date.now() + lenOf(p);
  }, []); // lenOf lee los tiempos de una referencia: no hace falta recrear esta función

  // Solo hay un temporizador mientras corre.
  useEffect(() => {
    if (status !== 'running') return;
    const tick = () => {
      const ms = Math.max(0, endAt.current - Date.now());
      setLeft(ms);
      if (ms > 0) return;
      chime();
      if (phase === 'focus') {
        const n = done + 1;
        setDone(n);
        repo?.setSetting('pomodoros', JSON.stringify({ day: today, done: n }));
        reset('rest', true);
        const rest = `${lensRef.current.rest} ${lensRef.current.rest === 1 ? 'minuto' : 'minutos'}`;
        announce(`Terminó el pomodoro. Buen trabajo: toca descansar ${rest}.`);
        notify('Terminó el pomodoro', `Buen trabajo: toca descansar ${rest}.`);
      } else {
        reset('focus');
        announce('Terminó el descanso. Cuando quieras, empezamos otro.');
        notify('Terminó el descanso', 'Cuando quieras, empezamos otro.');
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, phase, done, repo, today, reset, announce]);

  // El tiempo, en el título de la ventana y en el ícono de la bandeja.
  useEffect(() => {
    const text = status === 'idle' ? '' : `${mmss(left)}${phase === 'rest' ? ' de descanso' : ''}${status === 'paused' ? ' (en pausa)' : ''}`;
    document.title = text ? `${mmss(left)} · Mi día` : 'Mi día';
    setTrayTooltip(text ? `Mi día · ${text}` : 'Mi día');
  }, [left, phase, status]);

  const toggle = useCallback(() => {
    if (status === 'running') {
      setLeft(Math.max(0, endAt.current - Date.now()));
      setStatus('paused');
    } else {
      endAt.current = Date.now() + left;
      setStatus('running');
    }
  }, [status, left]);

  /** Reiniciar (en concentración) o saltar el descanso. */
  const stop = useCallback(() => {
    const skipping = phase === 'rest';
    reset('focus');
    announce(skipping ? 'Descanso saltado. Listo para otro pomodoro.' : 'Pomodoro reiniciado.');
  }, [phase, reset, announce]);

  /** Cambia los tiempos (con el pomodoro detenido). */
  const setLens = useCallback((next: Lens) => {
    const clean = { focus: validLen(next.focus) ?? lens.focus, rest: validLen(next.rest) ?? lens.rest };
    setLensState(clean);
    lensRef.current = clean;
    repo?.setSetting('pomodoro-tiempos', JSON.stringify(clean));
    if (status === 'idle') setLeft(clean[phase] * MIN);
  }, [lens, repo, status, phase]);

  return { phase, status, left, done, lens, total: lenOf(phase), toggle, stop, setLens };
}
