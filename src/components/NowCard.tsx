import { fmt } from '../lib/dates.ts';
import type { Item } from '../data/types.ts';
import { FoldCard } from './FoldCard.tsx';
import { ToneTag } from './Steps.tsx';

interface Props {
  current: Item | undefined;
  next: Item | undefined;
  folded: boolean;
  onFold: (f: boolean) => void;
}

export function NowCard({ current, next, folded, onFold }: Props) {
  return (
    <FoldCard id="ahora" className="now" title="En este momento" folded={folded} onFold={onFold}
      summary={current ? `${current.title} hasta ${fmt(current.end!)}` : 'Tiempo libre'}
      icon={<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10 5.5V10l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}>
      <div className="now-next">
        <p>
          <span className="label">Ahora</span>{' '}
          {current
            ? <><span className="what">{current.title}</span> <span className="muted">hasta {fmt(current.end!)}</span> <ToneTag tone={current.tone} /></>
            : <span className="muted">Tiempo libre</span>}
        </p>
        <p>
          <span className="label">Después</span>{' '}
          {next
            ? <><span className="what">{next.title}</span> <span className="muted">a las {fmt(next.start!)}</span></>
            : <span className="muted">Nada más por hoy</span>}
        </p>
      </div>
    </FoldCard>
  );
}
