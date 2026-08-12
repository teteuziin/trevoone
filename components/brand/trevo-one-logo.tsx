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
    <div className={`relative inline-block ${className}`}>
      <Image
        src="/trevo-one-logo.png"
        alt="Trevo One Logo"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-auto object-contain"
      />
    </div>
  );
}
