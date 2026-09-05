// apps/web/src/components/Card.tsx
import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:border-zinc-300 transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}