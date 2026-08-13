import Image from "next/image";

interface TrevoOneLogoProps {
  priority?: boolean;
  className?: string;
  size?: number;
}

export function TrevoOneLogo({
  priority = false,
  className = "",
  size = 180,
}: TrevoOneLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <Image
        src="/trevo-one-logo.png"
        alt="Trevo One"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-auto max-h-full object-contain drop-shadow-none"
      />
    </div>
  );
}
