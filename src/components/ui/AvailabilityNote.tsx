import clsx from 'clsx';
import type { AvailabilityTone } from '@/lib/item-availability';

/** One colored line: green when free, amber for a same-day handover, red for a clash. */
export function AvailabilityNote({ note, testId }: { note: { tone: AvailabilityTone; text: string } | null; testId?: string }) {
  if (!note) return null;
  return (
    <div
      data-testid={testId}
      className={clsx(
        'text-[11px] font-medium',
        note.tone === 'clash' ? 'text-red-600' : note.tone === 'note' ? 'text-amber-700' : 'text-emerald-700',
      )}
    >
      {note.text}
    </div>
  );
}
