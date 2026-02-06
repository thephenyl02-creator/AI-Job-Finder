interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-5 w-5" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="3" width="8" height="18" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="13" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="20" y="3" width="2.5" height="18" rx="0.75" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

export function LogoMark({ className = "h-6 w-6" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="4" width="10" height="24" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="15" y="4" width="6" height="24" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="24" y="4" width="4" height="24" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  );
}
