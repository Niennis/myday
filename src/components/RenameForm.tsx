// Campo para cambiar el nombre de algo, en el mismo lugar donde estaba el nombre.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

interface Props {
  title: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

export function RenameForm({ title, onSave, onCancel }: Props) {
  const uid = useId();
  const [name, setName] = useState(title);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const t = name.trim();
    if (!t) { ref.current?.focus(); return; }
    onSave(t);
  };

  return (
    <form className="rename" onSubmit={save}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); } }}>
      <label htmlFor={`${uid}-name`}>Nombre</label>
      <input id={`${uid}-name`} ref={ref} type="text" autoComplete="off" required value={name} onChange={(e) => setName(e.target.value)} />
      <div className="item-actions">
        <button type="submit" className="btn btn-primary btn-small">Guardar</button>
        <button type="button" className="btn btn-small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
