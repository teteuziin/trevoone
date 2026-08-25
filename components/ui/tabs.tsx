import React from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className = "",
  size = "md",
}: TabsProps<T>) {
  const containerPadding = size === "sm" ? "p-0.5" : "p-1";
  const itemPadding = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm";

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`inline-flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl ${containerPadding} gap-1 ${className}`.trim()}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all duration-150 ease-out select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none ${itemPadding} ${
              isActive
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold leading-none ${
                  isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)]"
                    : "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
