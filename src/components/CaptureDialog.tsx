// Captura rápida: se escribe con palabras y debajo se ve cómo se entendió.
// La fecha es un botón que abre un calendario para corregirla (respaldo, no otra forma de crear).
import { useEffect, useMemo, useRef, useState } from 'react';
import { dateLabel, fmt, fromIsoDate, isoDate, startOfDay } from '../lib/dates.ts';
import { parse } from '../lib/parse.ts';
import type { DayActions } from '../state/useDay.ts';
import { useAnnounce } from './Announcer.tsx';
import { ToneTag } from './Steps.tsx';

interface Props {
  open: boolean;
  now: Date;
  actions: DayActions;
  onClose: () => void;
}

export function CaptureDialog({ open, now, actions, onClose }: Props) {
  const announce = useAnnounce();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [showDate, setShowDate] = useState(false);
  // Fecha elegida en el calendario; si es undefined, manda lo escrito.
  const [override, setOverride] = useState<Date | null | undefined>(undefined);

  const p = useMemo(() => parse(text, now), [text, now]);
  const date = override !== undefined ? override : p.date;
  const today = startOfDay(now);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      setText('');
      setOverride(undefined);
      setShowDate(false);
      dlg.showModal();
      inputRef.current?.focus();
    } else if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    dlg.addEventListener('cancel', onCancel);
    return () => dlg.removeEventListener('cancel', onCancel);
  }, [onClose]);

  const save = () => {
    if (!p.title) { inputRef.current?.focus(); return; }
    const forToday = !date || isoDate(date) === isoDate(today);
    actions.add(p, date);
    if (forToday && p.time !== null) announce(`Agregado a hoy a las ${fmt(p.time)}: ${p.title}.`);
    else if (forToday) announce(`Anotado en lo de hoy: ${p.title}.`);
    else announce(`Anotado para ${dateLabel(date!, today, true)}${p.time !== null ? ` a las ${fmt(p.time)}` : ''}: ${p.title}.`);
    onClose();
  };

  const rest = [p.time !== null ? fmt(p.time) : '', p.alert ? 'con aviso' : ''].filter(Boolean);

  return (
    <dialog ref={ref} aria-labelledby="capture-title">
      <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <h2 id="capture-title">Anotar algo</h2>
        <label className="sr-only" htmlFor="capture-input">Qué quieres anotar</label>
        <input className="capture-input" id="capture-input" ref={inputRef} type="text" autoComplete="off"
          placeholder="llamar al dentista el viernes 10:00" aria-describedby="capture-help capture-preview"
          value={text} onChange={(e) => setText(e.target.value)} />
        <p className="sr-only" id="capture-help">
          Escribe con tus palabras. Puedes incluir una fecha (mañana, el viernes, 15/10), una hora (10:00, a las 5 de la tarde)
          y la palabra avisar para recibir un aviso. Para marcarla: sin falta, rrrápido, con tiempo o con calma.
        </p>
        <div className="preview" id="capture-preview" hidden={!p.title}>
          <strong>{p.title}</strong>
          <span aria-hidden="true">·</span>
          <button type="button" className="chip" aria-expanded={showDate} aria-controls="date-row" onClick={() => {
            setShowDate(!showDate);
            if (!showDate) requestAnimationFrame(() => {
              dateRef.current?.focus();
              try { dateRef.current?.showPicker(); } catch { /* no todos los navegadores lo permiten */ }
            });
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="3" y="4.5" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3 8.5h14M7 2.75v3.5M13 2.75v3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <span className="sr-only">Cambiar fecha: </span>{date ? dateLabel(date, today) : 'sin fecha'}
          </button>
          {rest.length > 0 && <span>· {rest.join(' · ')}</span>}
          {p.tone && <span>· <ToneTag tone={p.tone} /></span>}
        </div>
        <div className="date-row" id="date-row" hidden={!showDate}>
          <label htmlFor="capture-date">Fecha</label>
          <input type="date" id="capture-date" ref={dateRef} min={isoDate(today)} value={date ? isoDate(date) : ''}
            onChange={(e) => setOverride(e.target.value ? fromIsoDate(e.target.value) : null)} />
          <button type="button" className="btn btn-small" onClick={() => setOverride(null)}>Sin fecha</button>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Guardar</button>
        </div>
      </form>
    </dialog>
  );
}
