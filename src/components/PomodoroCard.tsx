import { useId, useRef, useState, type FormEvent } from 'react';
import { MAX_MIN, mmss, PHASES, type usePomodoro } from '../hooks/usePomodoro.ts';
import { useAnnounce } from './Announcer.tsx';
import { FoldCard } from './FoldCard.tsx';

const RING = 2 * Math.PI * 44;

interface Props {
  pomo: ReturnType<typeof usePomodoro>;
  folded: boolean;
  onFold: (f: boolean) => void;
}

export function PomodoroCard({ pomo, folded, onFold }: Props) {
  const { phase, status, left, done, lens, total } = pomo;
  const announce = useAnnounce();
  const uid = useId();
  const goRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ focus: String(lens.focus), rest: String(lens.rest) });

  const time = mmss(left);
  const goText = status === 'running' ? 'Pausar'
    : status === 'paused' ? 'Seguir'
    : phase === 'rest' ? 'Empezar descanso'
    : done ? 'Empezar otro' : 'Empezar';
  const summary = status === 'idle' ? '' : `${phase === 'rest' ? 'Descanso, ' : ''}${time}${status === 'paused' ? ' en pausa' : ''}`;
  // Los tiempos se cambian con el pomodoro detenido, para no mover el reloj mientras corre.
  const canEdit = status === 'idle' && phase === 'focus';

  const openEditor = () => {
    setDraft({ focus: String(lens.focus), rest: String(lens.rest) });
    setEditing(true);
    requestAnimationFrame(() => focusRef.current?.select());
  };
  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const focus = Math.round(Number(draft.focus));
    const rest = Math.round(Number(draft.rest));
    pomo.setLens({ focus, rest });
    announce(`Listo: ${focus} minutos de concentración y ${rest} de descanso.`);
    closeEditor();
  };

  return (
    <FoldCard id="pomo" className="pomo" title="Pomodoro" summary={summary} folded={folded} onFold={onFold}
      icon={<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10 11V8M8 2.75h4M15 5.5l1.25-1.25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}>
      <div className="pomo-main">
        <div className="pomo-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle className="track" cx="50" cy="50" r="44" />
            <circle className="bar" cx="50" cy="50" r="44" style={{ strokeDasharray: RING, strokeDashoffset: RING * (1 - left / total) }} />
          </svg>
          <p className="pomo-time" role="timer" aria-atomic="true"><span className="sr-only">Quedan </span>{time}</p>
        </div>
        <div className="pomo-side">
          <p className="pomo-phase">{PHASES[phase].name}{status === 'paused' ? ' (en pausa)' : ''}</p>
          <div className="pomo-actions">
            <button type="button" className="btn btn-primary btn-small" ref={goRef} onClick={() => { setEditing(false); pomo.toggle(); }}>{goText}</button>
            {!(phase === 'focus' && status === 'idle') && (
              <button type="button" className="btn btn-small" onClick={() => {
                pomo.stop();
                // El botón desaparece: el foco pasa al principal.
                goRef.current?.focus();
              }}>{phase === 'rest' ? 'Saltar descanso' : 'Reiniciar'}</button>
            )}
          </div>
          <p className="pomo-count">{done ? `Hoy llevas ${done} ${done === 1 ? 'pomodoro' : 'pomodoros'}.` : ''}</p>
        </div>
      </div>

      {canEdit && (
        <div className="pomo-times">
          <button type="button" className="toggle-sub" ref={editRef} aria-expanded={editing} aria-controls={`${uid}-ed`}
            onClick={() => (editing ? closeEditor() : openEditor())}>
            <span className="chev" aria-hidden="true">›</span> {lens.focus} min de concentración, {lens.rest} de descanso
            <span className="sr-only">. Cambiar tiempos</span>
          </button>
          <form className="pomo-edit" id={`${uid}-ed`} hidden={!editing} onSubmit={save}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeEditor(); } }}>
            <div className="pomo-field">
              <label htmlFor={`${uid}-f`}>Concentración</label>
              <span className="pomo-min">
                <input id={`${uid}-f`} ref={focusRef} type="number" inputMode="numeric" min={1} max={MAX_MIN} step={1} required
                  value={draft.focus} onChange={(e) => setDraft({ ...draft, focus: e.target.value })} /> min
              </span>
            </div>
            <div className="pomo-field">
              <label htmlFor={`${uid}-r`}>Descanso</label>
              <span className="pomo-min">
                <input id={`${uid}-r`} type="number" inputMode="numeric" min={1} max={MAX_MIN} step={1} required
                  value={draft.rest} onChange={(e) => setDraft({ ...draft, rest: e.target.value })} /> min
              </span>
            </div>
            <div className="pomo-edit-actions">
              <button type="submit" className="btn btn-primary btn-small">Listo</button>
              <button type="button" className="btn btn-small" onClick={closeEditor}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </FoldCard>
  );
}
