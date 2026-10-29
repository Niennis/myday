import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, fmt, isoDate, longToday, minutesOf, startOfDay, startOfWeek, type Day } from './lib/dates.ts';
import { nextFreeSlot } from './lib/schedule.ts';
import { isMood, toneOf, type Mood } from './lib/tones.ts';
import { openRepo } from './data/repo.ts';
import type { Item, Repo } from './data/types.ts';
import { useDay } from './state/useDay.ts';
import { useNow } from './hooks/useNow.ts';
import { usePomodoro } from './hooks/usePomodoro.ts';
import { notify, onAppEvent, SHORTCUT_KEYS, syncTray } from './platform.ts';
import { useAnnounce } from './components/Announcer.tsx';
import { NowCard } from './components/NowCard.tsx';
import { PomodoroCard } from './components/PomodoroCard.tsx';
import { YesterdayCard } from './components/YesterdayCard.tsx';
import { TasksCard } from './components/TasksCard.tsx';
import { DayView } from './components/DayView.tsx';
import { BlockDialog } from './components/BlockDialog.tsx';
import { CaptureDialog } from './components/CaptureDialog.tsx';
import { WeekView } from './components/WeekView.tsx';
import { MonthView } from './components/MonthView.tsx';

type CardId = 'ahora' | 'pomo' | 'ayer' | 'tareas';
type View = 'day' | 'week' | 'month';
const VIEWS: { id: View; name: string; title: string }[] = [
  { id: 'day', name: 'Día', title: 'Vista diaria' },
  { id: 'week', name: 'Semana', title: 'Vista semanal' },
  { id: 'month', name: 'Mes', title: 'Vista mensual' },
];
const byTime = (a: Item, b: Item) => (a.start ?? 1e9) - (b.start ?? 1e9) || a.sort - b.sort;

export default function App() {
  const announce = useAnnounce();
  const now = useNow();
  const today = isoDate(now);
  const nowMin = minutesOf(now);

  const [repo, setRepo] = useState<Repo | null>(null);
  // Se abre una sola vez; los datos de ejemplo del navegador se fechan con el día de apertura.
  const firstDay = useRef(today);
  useEffect(() => { openRepo(firstDay.current).then(setRepo); }, []);

  // ---------- Vistas: día, semana y mes ----------
  const [view, setView] = useState<View>('day');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const todayDate = useMemo(() => startOfDay(new Date(`${today}T00:00`)), [today]);
  const weekStart = useMemo(() => addDays(startOfWeek(todayDate), weekOffset * 7), [todayDate, weekOffset]);
  const monthFirst = useMemo(() => new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset, 1), [todayDate, monthOffset]);
  const range = useMemo(() => {
    if (view === 'week') return { from: isoDate(weekStart), to: isoDate(addDays(weekStart, 6)) };
    if (view === 'month') return { from: isoDate(monthFirst), to: isoDate(new Date(monthFirst.getFullYear(), monthFirst.getMonth() + 1, 0)) };
    return null;
  }, [view, weekStart, monthFirst]);
  const goToWeekOf = useCallback((d: Date) => {
    setWeekOffset(Math.round((startOfWeek(d).getTime() - startOfWeek(todayDate).getTime()) / (7 * 86400000)));
  }, [todayDate]);

  const { loaded, items, blocks, tasks, others, overdue, actions } = useDay(repo, today, range);
  // Todo lo de un día: hoy, los bloques por hora y después las tareas; otros días, lo anotado para ellos.
  const entriesFor = useCallback((day: Day) => (day === today ? [...blocks, ...tasks] : others.filter((i) => i.date === day).sort(byTime)),
    [today, blocks, tasks, others]);
  const countFor = useCallback((day: Day) => (day === today ? items.length : others.filter((i) => i.date === day).length), [today, items, others]);
  const pomo = usePomodoro(repo, today, announce);

  // ---------- Mood: el elegido es la base; si el bloque de "Ahora" tiene marca, manda la marca ----------
  const [chosenMood, setChosenMood] = useState<Mood>('calma');
  useEffect(() => { repo?.getSetting('mood').then((m) => { if (isMood(m)) setChosenMood(m); }); }, [repo]);
  const chooseMood = useCallback((m: Mood) => { setChosenMood(m); repo?.setSetting('mood', m); }, [repo]);
  useEffect(() => onAppEvent('mood', chooseMood), [chooseMood]);

  const current = blocks.find((b) => b.start <= nowMin && b.end > nowMin);
  const next = blocks.find((b) => b.start > nowMin);
  const tone = toneOf(current?.tone);
  const mood = tone ? tone.mood : chosenMood;
  useEffect(() => { document.documentElement.dataset.mood = mood; }, [mood]);
  useEffect(() => {
    syncTray(chosenMood, tone && current ? `Ahora manda «${tone.name}» (${current.title})` : null);
  }, [chosenMood, tone, current]);

  // ---------- Tarjetas minimizadas (se recuerdan) ----------
  const [folded, setFolded] = useState<CardId[]>([]);
  useEffect(() => { repo?.getSetting('minimizadas').then((v) => { if (v) setFolded(JSON.parse(v)); }); }, [repo]);
  const fold = useCallback((id: CardId, f: boolean) => {
    setFolded((list) => {
      const nextList = list.filter((x) => x !== id).concat(f ? [id] : []);
      repo?.setSetting('minimizadas', JSON.stringify(nextList));
      return nextList;
    });
  }, [repo]);
  // Si llega una tarea nueva a la lista y está minimizada, se abre para que se vea.
  const taskCount = useRef(tasks.length);
  useEffect(() => {
    if (loaded && tasks.length > taskCount.current && folded.includes('tareas')) fold('tareas', false);
    taskCount.current = tasks.length;
  }, [tasks.length, loaded, folded, fold]);

  // ---------- Avisos: solo al empezar un bloque ----------
  const lastMin = useRef(nowMin);
  useEffect(() => {
    const from = lastMin.current;
    lastMin.current = nowMin;
    if (nowMin <= from) return;
    blocks.filter((b) => b.start > from && b.start <= nowMin).forEach((b) => notify(`Ahora: ${b.title}`, `Hasta las ${fmt(b.end)}`));
  }, [nowMin, blocks]);

  // ---------- Arrastrar entre la lista y el horario ----------
  const lanes = useRef<HTMLElement[]>([]);
  const blockEls = useRef(new Map<string, HTMLButtonElement>());
  const taskCard = useRef<HTMLElement>(null);
  const tasksFold = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<{ title: string; start: number | null } | null>(null);
  const [dropClass, setDropClass] = useState<'' | 'drop-ready' | 'drop-ready drop-target'>('');
  const freeSlot = useCallback(() => nextFreeSlot(blocks, nowMin), [blocks, nowMin]);
  const focusBlock = useCallback((id: string) => blockEls.current.get(id)?.focus(), []);

  // ---------- Pasos de algo: un bloque de hoy o algo de la semana ----------
  const [opened, setOpened] = useState<{ id: string; el: HTMLElement; when: string } | null>(null);
  const openedItem = opened ? [...items, ...others].find((i) => i.id === opened.id) ?? null : null;
  const openId = opened?.id;
  const anchor = useCallback(() => opened?.el, [opened]);
  const closeItem = useCallback((toListId?: string) => {
    const id = openId;
    setOpened(null);
    requestAnimationFrame(() => {
      // Si pasó a la lista, el foco va a esa tarea; si no, vuelve a donde se abrió (aunque se haya redibujado).
      const el = toListId
        ? document.querySelector<HTMLElement>(`[data-task="${toListId}"] input`)
        : id ? blockEls.current.get(id) ?? document.querySelector<HTMLElement>(`[data-key="${id}"]`) : null;
      el?.focus();
    });
  }, [openId]);

  // ---------- Borrar, con un aviso para deshacer (en vez de pedir confirmación) ----------
  const [undo, setUndo] = useState<Item | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const deleteItem = useCallback((id: string) => {
    const removed = actions.remove(id);
    if (!removed) return;
    setOpened(null);
    setUndo(removed);
    announce(`Se borró «${removed.title}». Puedes deshacerlo.`);
    // Lo borrado desaparece: el foco pasa a "Deshacer".
    requestAnimationFrame(() => undoRef.current?.focus());
  }, [actions, announce]);
  const undoDelete = () => {
    if (!undo) return;
    actions.restore(undo);
    announce(`«${undo.title}» volvió.`);
    const id = undo.id;
    setUndo(null);
    requestAnimationFrame(() => {
      const el = blockEls.current.get(id) ?? document.querySelector<HTMLElement>(`[data-task="${id}"] input, [data-key="${id}"]`);
      (el ?? document.getElementById('hoy'))?.focus();
    });
  };
  const closeUndo = () => {
    setUndo(null);
    document.getElementById('hoy')?.focus();
  };

  // ---------- Captura rápida: botón, atajo dentro de la ventana y atajo global ----------
  const [capturing, setCapturing] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openCapture = useCallback(() => {
    setOpened(null);
    opener.current = document.activeElement as HTMLElement | null;
    setCapturing(true);
  }, []);
  const closeCapture = useCallback(() => {
    setCapturing(false);
    requestAnimationFrame(() => { if (opener.current?.isConnected) opener.current.focus(); });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.code === 'Space') { e.preventDefault(); openCapture(); }
    };
    document.addEventListener('keydown', onKey);
    const offCapture = onAppEvent('capture', openCapture);
    const offToday = onAppEvent('open-today', () => document.getElementById('hoy')?.focus());
    return () => { document.removeEventListener('keydown', onKey); offCapture(); offToday(); };
  }, [openCapture]);

  const isFolded = (id: CardId) => folded.includes(id);

  return (
    <>
      <a className="skip" href="#hoy">Saltar al contenido principal</a>
      <header className="top">
        <div>
          <h1>Mi día</h1>
          <p>{longToday(now)}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCapture}>
          Anotar algo <span>{SHORTCUT_KEYS.map((k, i) => <span key={k}>{i > 0 && '+'}<kbd>{k}</kbd></span>)}</span>
        </button>
      </header>

      <main id="contenido">
        <section className="col" id="hoy" aria-labelledby="hoy-title" tabIndex={-1}>
          <h2 id="hoy-title">Hoy</h2>
          <NowCard current={current} next={next} folded={isFolded('ahora')} onFold={(f) => fold('ahora', f)} />
          <PomodoroCard pomo={pomo} folded={isFolded('pomo')} onFold={(f) => fold('pomo', f)} />
          <YesterdayCard items={overdue} today={today} onResolve={actions.resolveOverdue} folded={isFolded('ayer')} onFold={(f) => fold('ayer', f)}
            focusAfter={() => tasksFold.current?.focus()} />
          <TasksCard tasks={tasks} actions={actions} freeSlot={freeSlot} lanes={lanes} onPreview={setPreview}
            focusBlock={focusBlock} onDelete={deleteItem} folded={isFolded('tareas')} onFold={(f) => fold('tareas', f)}
            dropClass={dropClass} cardRef={taskCard} foldRef={tasksFold} />
        </section>

        <section className="col" aria-labelledby="view-title">
          <div className="col-head">
            <h2 id="view-title">{VIEWS.find((v) => v.id === view)!.title}</h2>
            <div className="view-switch" role="group" aria-label="Cambiar de vista">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.name}</button>
              ))}
            </div>
          </div>

          {view === 'day' && (
            <div className="view">
              <p className="hint" id="day-hint">
                Clic en un bloque para ver sus pasos. Arrástralo para moverlo (a otra hora, a la otra columna o a la lista de tareas)
                y estira su borde inferior para cambiar la duración. Con teclado: Enter, flechas y Mayús + flechas.
              </p>
              <DayView blocks={blocks} nowMin={nowMin} actions={actions} lanes={lanes} blockEls={blockEls} taskCard={taskCard}
                preview={preview} onDropState={setDropClass}
                openBlock={(b) => {
                  const el = blockEls.current.get(b.id);
                  if (el) setOpened({ id: b.id, el, when: `${fmt(b.start)} – ${fmt(b.end)}` });
                }} />
            </div>
          )}
          {view === 'week' && (
            <div className="view">
              <p className="hint" id="week-hint">
                Arrastra algo a otro día para cambiarlo de fecha (con teclado: flechas izquierda y derecha). Clic para ver sus pasos.
              </p>
              <WeekView weekStart={weekStart} today={todayDate} entriesFor={entriesFor} offset={weekOffset} setOffset={setWeekOffset}
                goToWeekOf={goToWeekOf} onMove={(item, day) => actions.moveToDate(item.id, day)}
                openItem={(item, el, when) => setOpened({ id: item.id, el, when })} />
            </div>
          )}
          {view === 'month' && (
            <div className="view">
              <p className="hint">Cada punto es algo anotado ese día. Clic en un día para verlo en su semana.</p>
              <MonthView first={monthFirst} today={todayDate} countFor={countFor} offset={monthOffset} setOffset={setMonthOffset}
                openWeek={(d) => {
                  goToWeekOf(d);
                  setView('week');
                  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`wd-${isoDate(d)}`)?.focus()));
                }} />
            </div>
          )}
        </section>
      </main>

      <BlockDialog item={openedItem} when={opened?.when ?? ''} anchor={anchor} actions={actions} onClose={closeItem} onDelete={deleteItem}
        canToList={!!openedItem && openedItem.date === today && openedItem.start !== null} />
      <CaptureDialog open={capturing} now={now} actions={actions} onClose={closeCapture} />
      {undo && (
        <div className="undo-bar">
          <p>Se borró «{undo.title}».</p>
          <div className="actions">
            <button type="button" className="btn btn-small" ref={undoRef} onClick={undoDelete}>Deshacer</button>
            <button type="button" className="icon-btn" aria-label="Cerrar aviso" onClick={closeUndo}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
