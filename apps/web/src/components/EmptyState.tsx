// apps/web/src/components/EmptyState.tsx
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-xl bg-white p-6 flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3 text-xl">
        ∅
      </div>
      <h3 className="text-base font-semibold text-zinc-800">{title}</h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}