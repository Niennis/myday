// Pasos de una tarea o de un bloque, con un campo para agregar más y la marca opcional.
// En el panel de una tarea, arriba van el lápiz (cambiar nombre) y el basurero (borrar);
// en la tarjeta de un bloque, esos íconos van junto al título (ver BlockDialog).
import { useId, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { TONES, toneOf, type Tone } from '../lib/tones.ts';
import type { Item, Step } from '../data/types.ts';
import { useAnnounce } from './Announcer.tsx';
import { IconButton, PencilIcon, TrashIcon } from './IconButton.tsx';
import { RenameForm } from './RenameForm.tsx';

export const stepCount = (item: Item) => `${item.steps.filter((s) => s.done).length} de ${item.steps.length}`;

export function ToneTag({ tone }: { tone: Tone | null }) {
  const t = toneOf(tone);
  return t ? <span className="tone" data-mood={t.mood}>{t.name}</span> : null;
}

interface Props {
  item: Item;
  onSteps: (steps: Step[]) => void;
  onTone: (tone: Tone | null) => void;
  /** Con estas dos, se muestran el lápiz y el basurero arriba del panel. */
  onRename?: (title: string) => void;
  onDelete?: () => void;
  addRef?: Ref<HTMLInputElement>;
  /** Escape con el campo vacío. */
  onEscape?: () => void;
}

export function Steps({ item, onSteps, onTone, onRename, onDelete, addRef, onEscape }: Props) {
  const uid = useId();
  const announce = useAnnounce();
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const pencilRef = useRef<HTMLButtonElement>(null);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && !draft && onEscape) { e.preventDefault(); onEscape(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onSteps([...item.steps, { id: crypto.randomUUID(), title: title.charAt(0).toUpperCase() + title.slice(1), done: false }]);
    setDraft('');
    announce(`Paso agregado: ${title}.`);
  };

  const endRename = () => {
    setRenaming(false);
    requestAnimationFrame(() => pencilRef.current?.focus());
  };

  return (
    <>
      {onRename && onDelete && (renaming ? (
        <RenameForm title={item.title} onCancel={endRename} onSave={(t) => {
          if (t !== item.title) { onRename(t); announce(`Nuevo nombre: ${t}.`); }
          endRename();
        }} />
      ) : (
        <div className="item-tools">
          <IconButton tip="Cambiar nombre" label={`Cambiar nombre de ${item.title}`} ref={pencilRef} onClick={() => setRenaming(true)}><PencilIcon /></IconButton>
          <IconButton tip="Borrar" label={`Borrar ${item.title}`} onClick={onDelete}><TrashIcon /></IconButton>
        </div>
      ))}
      <ul>
        {item.steps.map((s) => (
          <li key={s.id} className={`sub${s.done ? ' done' : ''}`}>
            <label className="check">
              <input type="checkbox" checked={s.done}
                onChange={(e) => onSteps(item.steps.map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)))} />
              <span className="title">{s.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="sr-only" htmlFor={`${uid}-add`}>Nuevo paso para {item.title}</label>
      <input className="add-sub" id={`${uid}-add`} ref={addRef} type="text" autoComplete="off" placeholder="+ Nuevo paso (Enter)"
        value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
      <fieldset className="tone-pick">
        <legend>Marca (opcional)</legend>
        <div className="tone-opts">
          {[{ id: null, name: 'Sin marca', mood: null }, ...TONES].map((t) => (
            <label key={t.id ?? 'none'}>
              <input type="radio" name={`${uid}-tone`} checked={(item.tone ?? null) === t.id}
                onChange={() => { onTone(t.id); announce(t.id ? `Marca: ${t.name}.` : 'Sin marca.'); }} />
              {t.mood ? <span className="tone" data-mood={t.mood}>{t.name}</span> : t.name}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
