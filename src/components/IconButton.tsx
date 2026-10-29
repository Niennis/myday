// Botón con solo un ícono y un tooltip que dice qué hace.
// El tooltip aparece con el mouse y con el teclado (Tab), se puede leer pasando el mouse por encima
// y se cierra con Escape (WCAG 1.4.13). Los lectores de pantalla leen el nombre del botón (aria-label).
import { forwardRef, useState, type ReactNode } from 'react';

interface Props {
  /** Lo que se lee y se muestra: "Cambiar nombre". */
  tip: string;
  /** Nombre completo para lectores de pantalla, si necesita más contexto ("Borrar Diseño"). */
  label?: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton({ tip, label, onClick, className = '', children }, ref) {
  const [hidden, setHidden] = useState(false);
  return (
    <span className={`tip-wrap${hidden ? ' tip-off' : ''}`} onMouseLeave={() => setHidden(false)}>
      <button type="button" ref={ref} className={`icon-btn ${className}`} aria-label={label ?? tip} onClick={onClick}
        onBlur={() => setHidden(false)}
        onKeyDown={(e) => {
          // La primera vez, Escape solo cierra el tooltip (sin cerrar la ventana en la que está).
          if (e.key === 'Escape' && !hidden) { e.preventDefault(); e.stopPropagation(); setHidden(true); }
        }}>
        {children}
      </button>
      <span className="tip" aria-hidden="true">{tip}</span>
    </span>
  );
});

export const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M13.5 3.5l3 3L7 16H4v-3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M11.5 5.5l3 3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M3.5 5.5h13M8 5.5V3.5h4v2M5.5 5.5l.8 11h7.4l.8-11M8.5 8.5v5M11.5 8.5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
