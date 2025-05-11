import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
}

export function Section({ children }: SectionProps) {
  return (
    <div className="mt-8 flex items-start p-4 bg-black/5 rounded-xl gap-8">
      {children}
    </div>
  );
}
