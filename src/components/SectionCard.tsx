import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional small color hint shown next to the title (chart-tag style). */
  tag?: { label: string; tone: "blue" | "purple" | "pink" | "green" | "amber" | "cyan" };
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  tag,
}: Props) {
  return (
    <section
      className={`glass-card flex flex-col p-5 animate-fadeIn ${className ?? ""}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="heading text-base">{title}</h3>
            {tag && (
              <span className={`chart-tag tag-${tag.tone}`}>{tag.label}</span>
            )}
          </div>
          {description && (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {description}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
