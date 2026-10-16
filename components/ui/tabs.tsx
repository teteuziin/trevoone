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
  variant?: "default" | "dark";
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className = "",
  size = "md",
  variant = "default",
}: TabsProps<T>) {
  const containerPadding = size === "sm" ? "p-0.5" : "p-1";
  const itemPadding = size === "sm" ? "px-2.5 py-1 text-xs min-h-[36px]" : "px-3.5 py-2 text-xs sm:text-sm min-h-[44px]";
  const isDark = variant === "dark";

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`inline-flex items-center ${
        isDark
          ? "bg-[#111215] border border-[#303238]"
          : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
      } rounded-xl ${containerPadding} gap-1 ${className}`.trim()}
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
            className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 ease-out select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${itemPadding} ${
              isActive
                ? isDark
                  ? "bg-[#1B1D21] text-white shadow-xs border border-[#303238] font-bold"
                  : "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-200 dark:border-white/[0.1] font-bold"
                : isDark
                ? "text-[#C2C8CF] hover:text-white hover:bg-[#1B1D21]/60 border border-transparent"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                  isActive
                    ? isDark
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : isDark
                    ? "bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
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
