// A rotina do dia, num painel (o mesmo molde da lista de riscos). Cada linha: o que é, quanto leva e o estado.
// A próxima a fazer tem o botão em destaque. O anel conta quantas já foram.
import { Check } from 'lucide-react';
import { routineProgress, useReminders } from './Notifications';
import { cn } from '../lib/utils';
import { Anel } from '../ui/graficos';
import { Painel } from '../ui/pecas';

export function RoutineBar() {
  const items = useReminders();
  const { done, total, next } = routineProgress(items);
  return (
    <Painel preenche titulo="Today's routine" legenda={<span role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Routine done today"><Anel feito={done} total={total} tamanho={28}>{''}</Anel></span>}>
      <ul className="-mx-5 -mb-5 -mt-2 grid auto-rows-fr divide-y-[.5px] divide-[rgb(var(--border))]">
        {items.map(({ id, icon: Icon, title, sub, estimate, status, go }) => {
          const isNext = next?.id === id;
          return (
            <li key={id} className="flex items-center gap-4 px-5 py-3">
              <Icon size={16} strokeWidth={1.6} aria-hidden="true" className={status === 'done' ? 'text-ink-3' : 'text-ink'} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[14px]', status === 'done' ? 'text-ink-3 line-through decoration-[rgb(var(--border))]' : 'font-medium text-ink')}>{title}</p>
                <p className="mt-0.5 truncate text-[12px] text-ink-3">{status === 'done' ? 'Done' : estimate ?? sub}</p>
              </div>
              {status === 'done' ? <Check size={16} className="text-good" aria-label="Done" />
                : status === 'later' ? <span className="text-[12px] text-ink-3">Later</span>
                : <button type="button" onClick={go} className={cn(isNext ? 'btn-primary' : 'btn-ghost', '!min-h-[32px] !px-4')}>Start<span className="sr-only">: {title}</span></button>}
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}
