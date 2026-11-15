// Ferramentas de apoio do tópico Mind (do protótipo, sem as barras mock de contato social).
import { ChevronRight, Headphones, Heart, MessageSquare, Mic, Wind } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fmtDuration } from '../lib/format';
import { Card, SourcesList } from './ui';

export function SupportTools() {
  const link = useStore((s) => s.overview?.link);
  const reply = link?.status === 'unavailable' ? 'No Earth link' : link?.estimatedResponseSeconds ? `Reply in ~${fmtDuration(link.estimatedResponseSeconds)}` : 'Async';
  const tools = [
    { icon: Wind, title: 'Guided breathing', sub: 'Relaxation exercise', tag: '4 min' },
    { icon: Mic, title: 'Private voice journal', sub: 'Only you can open it', tag: 'Anytime' },
    { icon: Heart, title: 'Recorded message to family', sub: 'Stay connected', tag: 'Async' },
    { icon: MessageSquare, title: 'Private message to the flight surgeon', sub: 'Confidential clinical support', tag: reply },
    { icon: Headphones, title: 'Music and mindfulness', sub: 'Focus and rest', tag: '15 min' },
  ];
  return (
    <Card title="Support tools" icon={<Heart size={15} />}>
      <ul className="-my-2 divide-y-[.5px] divide-[rgb(var(--border))]">
        {tools.map(({ icon: Icon, title, sub, tag }) => (
          <li key={title} className="flex w-full items-center gap-3 py-2">
            <span className="grid size-8 place-items-center rounded-md bg-paper-2 text-ink-2"><Icon size={16} /></span>
            <span className="flex-1"><span className="block text-[13px] font-medium text-ink">{title}</span><span className="block text-[12px] text-ink-3">{sub}</span></span>
            <span className="chip normal-case">{tag}</span>
            <ChevronRight size={16} className="text-ink-3" />
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-ink-3">Prototype: these tools are placeholders. Flight surgeon reply = 2 × delay + about 15 min.</p>
      <SourcesList ids={['s33', 's15']} />
    </Card>
  );
}
