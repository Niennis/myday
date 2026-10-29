// Tarjeta con los pasos de algo (un bloque de hoy o algo de la semana), junto a él.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clamp } from '../lib/schedule.ts';
import type { Item } from '../data/types.ts';
import type { DayActions } from '../state/useDay.ts';
import { useAnnounce } from './Announcer.tsx';
import { CloseIcon, IconButton, PencilIcon, TrashIcon } from './IconButton.tsx';
import { RenameForm } from './RenameForm.tsx';
import { Steps } from './Steps.tsx';

interface Props {
  item: Item | null;
  /** Cuándo es: "9:00 – 11:00" o "Viernes 30 de octubre · 10:00". */
  when: string;
  /** Lo que se ve en pantalla: para ubicar la tarjeta a su lado. */
  anchor: () => HTMLElement | null | undefined;
  /** Solo los bloques de hoy se pueden pasar a la lista desde aquí. */
  canToList: boolean;
  actions: DayActions;
  onDelete: (id: string) => void;
  onClose: (toListId?: string) => void;
}

export function BlockDialog({ item, when, anchor, canToList, actions, onDelete, onClose }: Props) {
  const announce = useAnnounce();
  const ref = useRef<HTMLDialogElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const [renaming, setRenaming] = useState(false);
  const open = item !== null;
  useEffect(() => { if (!open) setRenaming(false); }, [open]);
  const endRename = () => {
    setRenaming(false);
    requestAnimationFrame(() => pencilRef.current?.focus());
  };

  useLayoutEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (!open) { if (dlg.open) dlg.close(); return; }
    if (dlg.open) return;
    dlg.showModal();
    // Junto a lo que se abrió: a la derecha si cabe, si no a la izquierda, si no centrada.
    const r = anchor()?.getBoundingClientRect();
    if (r) {
      const w = dlg.offsetWidth;
      const h = dlg.offsetHeight;
      let left = r.right + 8;
      if (left + w > innerWidth - 8) left = r.left - w - 8;
      if (left < 8) left = (innerWidth - w) / 2;
      dlg.style.left = `${left}px`;
      dlg.style.top = `${clamp(r.top, 8, Math.max(8, innerHeight - h - 8))}px`;
    }
    (dlg.querySelector<HTMLInputElement>('.sub input') ?? addRef.current)?.focus();
  }, [open, anchor]);

  // Escape o clic fuera también cierran.
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    const onClick = (e: MouseEvent) => { if (e.target === dlg) onClose(); };
    dlg.addEventListener('cancel', onCancel);
    dlg.addEventListener('click', onClick);
    return () => { dlg.removeEventListener('cancel', onCancel); dlg.removeEventListener('click', onClick); };
  }, [onClose]);

  return (
    <dialog ref={ref} className="block-dialog" aria-labelledby="bd-title" aria-describedby="bd-time">
      {item && (
        <div className="bd-inner">
          <div className="bd-head">
            <div className="bd-name">
              {/* Al cambiar el nombre, el título queda solo para lectores de pantalla y el campo toma su lugar. */}
              <h2 id="bd-title" className={renaming ? 'sr-only' : ''}>{item.title}</h2>
              {renaming && (
                <RenameForm title={item.title} onCancel={endRename} onSave={(t) => {
                  if (t !== item.title) { actions.rename(item.id, t); announce(`Nuevo nombre: ${t}.`); }
                  endRename();
                }} />
              )}
              <p className="muted" id="bd-time">{when}</p>
            </div>
            <div className="bd-tools">
              {!renaming && (
                <>
                  <IconButton tip="Cambiar nombre" label={`Cambiar nombre de ${item.title}`} ref={pencilRef} onClick={() => setRenaming(true)}><PencilIcon /></IconButton>
                  <IconButton tip="Borrar" label={`Borrar ${item.title}`} onClick={() => onDelete(item.id)}><TrashIcon /></IconButton>
                </>
              )}
              <IconButton tip="Cerrar" onClick={() => onClose()}><CloseIcon /></IconButton>
            </div>
          </div>
          <div className="bd-steps">
            <Steps item={item} addRef={addRef} onSteps={(s) => actions.setSteps(item.id, s)} onTone={(t) => actions.setTone(item.id, t)} />
          </div>
          {canToList && (
            <div className="bd-foot">
              <button type="button" className="btn btn-small" onClick={() => {
                actions.toTask(item.id);
                announce(`«${item.title}» pasó a la lista de tareas.`);
                onClose(item.id);
              }}>Pasar a la lista de tareas</button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
