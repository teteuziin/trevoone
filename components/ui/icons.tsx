import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const baseProps = (className = "w-5 h-5", strokeWidth = 1.8): React.SVGProps<SVGSVGElement> => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
});

export function DumbbellIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M6.5 6.5l11 11" />
      <path d="M4 9l3-3 2 2-3 3z" />
      <path d="M15 20l3-3 2 2-3 3z" />
      <path d="M2.5 10.5l4-4" />
      <path d="M17.5 21.5l4-4" />
      <path d="M9 15l-1.5 1.5" />
      <path d="M16.5 7.5L15 9" />
    </svg>
  );
}

export function UtensilsIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M12 2c1.8 2.2 1.5 4 0 5.5" />
      <path d="M8.5 7C5.2 7.5 3 10.5 3 14c0 4 3 6.5 5.5 6.5 2 0 2.5-.8 3.5-.8s1.5.8 3.5.8c2.5 0 5.5-2.5 5.5-6.5 0-3.5-2.2-6.5-5.5-7-1.2-.2-2.3.4-3.5.4S9.7 6.8 8.5 7z" />
      <path d="M12 11v5" />
    </svg>
  );
}

export function UserPlusIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

export function CreditCardIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <circle cx="7" cy="14.5" r="1.25" fill="currentColor" />
      <path d="M12 14.5h5" />
    </svg>
  );
}

export function CalendarIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M16 2.5v3.5M8 2.5v3.5M3 9.5h18" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M3 20h18M3.5 15.5l5.5-5.5 4 4 7-7.5" />
      <path d="M15.5 6.5H20V11" />
      <circle cx="13" cy="14" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function UserIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function WifiOffIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function DownloadIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function HelpCircleIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function MessageSquareIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function SparklesIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M12 3l1.912 4.924a3 3 0 0 0 1.664 1.664L20.5 11.5l-4.924 1.912a3 3 0 0 0-1.664 1.664L12 20l-1.912-4.924a3 3 0 0 0-1.664-1.664L3.5 11.5l4.924-1.912a3 3 0 0 0 1.664-1.664L12 3z" />
    </svg>
  );
}

export function CheckIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function SendIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function CloseIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function SmartphoneIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function SearchIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function ClockIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function ZapIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function SaladIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M7 21h10a5 5 0 0 0 5-5V9H2v7a5 5 0 0 0 5 5z" />
      <path d="M4 9c0-3.5 3-6 8-6s8 2.5 8 6" />
      <path d="M12 3v6" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function LayoutIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

export function LightbulbIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

export function SettingsIcon({ className = "w-5 h-5", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
