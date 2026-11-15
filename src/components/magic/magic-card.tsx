// Cartão do app (mantém o nome MagicCard para as telas que já o usam). Sem o brilho que seguia o mouse:
// branco com a sombra de contato; quando é clicável (link ou botão), sobe 2 px e a sombra abre ao passar o mouse.
import type { ElementType, ReactNode, ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

type MagicCardProps<T extends ElementType> = {
  as?: T;
  children?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function MagicCard<T extends ElementType = 'div'>({ as, children, className, ...props }: MagicCardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  const clickable = Tag !== 'div' && Tag !== 'section';
  return (
    <Tag className={cn('card', clickable && 'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-float)] disabled:hover:translate-y-0', className)} {...props}>
      {children}
    </Tag>
  );
}
