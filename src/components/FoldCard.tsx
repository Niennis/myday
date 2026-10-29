// Tarjeta de la columna "Hoy" que se minimiza con un clic en su título.
// Minimizada muestra un resumen al lado del título ("3 pendientes").
import { forwardRef, useId, type ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  icon: ReactNode;
  summary: string;
  folded: boolean;
  onFold: (folded: boolean) => void;
  className?: string;
  children: ReactNode;
  /** Lo que se ve aunque esté minimizada (por ejemplo, el aviso para soltar algo). */
  after?: ReactNode;
  foldRef?: React.Ref<HTMLButtonElement>;
}

export const FoldCard = forwardRef<HTMLElement, Props>(function FoldCard(
  { id, title, icon, summary, folded, onFold, className = '', children, after, foldRef }, ref,
) {
  const uid = useId();
  return (
    <section ref={ref} id={id} className={`card ${className}${folded ? ' folded' : ''}`} aria-labelledby={`${uid}-t`}>
      <div className="card-head">
        {icon}
        <h3>
          <button type="button" className="fold" ref={foldRef} aria-expanded={!folded} aria-controls={`${uid}-b`} onClick={() => onFold(!folded)}>
            <span id={`${uid}-t`}>{title}</span>
            {/* La coma oculta separa el título del resumen al leerlo en voz alta. */}
            <span className="fold-sum">{summary && <><span className="sr-only">, </span>{summary}</>}</span>
            <span className="chev" aria-hidden="true">›</span>
          </button>
        </h3>
      </div>
      <div className="card-body" id={`${uid}-b`} hidden={folded}>{children}</div>
      {after}
    </section>
  );
});
