import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function Section({ id, title, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2
        id={id}
        className="text-sm font-medium uppercase tracking-widest text-foreground/60"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
