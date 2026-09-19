import Image from "next/image";

interface TrevoOneLogoProps {
  priority?: boolean;
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

export function TrevoOneLogo({
  priority = false,
  className = "",
  size = 36,
  showWordmark = false,
}: TrevoOneLogoProps) {
  // Normalize visual size: cap at 44px for header layouts while allowing explicit compact sizes
  const normalizedSize = Math.min(Math.max(size, 24), 44);

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`.trim()}
    >
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: `${normalizedSize}px`, height: `${normalizedSize}px` }}
      >
        <Image
          src="/trevo-one-logo.png"
          alt="Trevo One"
          width={normalizedSize}
          height={normalizedSize}
          priority={priority}
          className="w-full h-full object-contain drop-shadow-none"
        />
      </div>
      {showWordmark && (
        <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
          Trevo <span className="text-[var(--brand)]">One</span>
        </span>
      )}
    </div>
  );
}
