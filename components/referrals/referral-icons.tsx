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

export function Link2({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function Share2({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function Copy({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function Check({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Image({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function FileText({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function Download({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function DollarSign({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function Users({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function MousePointerClick({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M14 4.1 12 6" />
      <path d="m5.1 8-2.9-.8" />
      <path d="m6 12-1.9 2" />
      <path d="M7.2 2.2 8 5.1" />
      <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
    </svg>
  );
}

export function Clock({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function CheckCircle2({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function XCircle({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function ExternalLink({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function KeyRound({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

export function ChevronDown({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronUp({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function Sparkles({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M12 3l1.912 4.924a3 3 0 0 0 1.664 1.664L20.5 11.5l-4.924 1.912a3 3 0 0 0-1.664 1.664L12 20l-1.912-4.924a3 3 0 0 0-1.664-1.664L3.5 11.5l4.924-1.912a3 3 0 0 0 1.664-1.664L12 3z" />
    </svg>
  );
}

export function X({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function MessageCircle({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function Plus({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function Search({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function Filter({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function Archive({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

export function Eye({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SlidersHorizontal({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <line x1="21" y1="4" x2="14" y2="4" />
      <line x1="10" y1="4" x2="3" y2="4" />
      <line x1="21" y1="12" x2="12" y2="12" />
      <line x1="8" y1="12" x2="3" y2="12" />
      <line x1="21" y1="20" x2="16" y2="20" />
      <line x1="12" y1="20" x2="3" y2="20" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="16" y1="18" x2="16" y2="22" />
    </svg>
  );
}

export function Settings({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function AlertCircle({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function UserCheck({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

export function UserPlus({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

export function CheckSquare({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function Square({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  );
}

export function Upload({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function Video({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

export function Info({ className = "w-4 h-4", strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
