export function MountainMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-xl bg-forest ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]">
        <path
          d="M2.5 19.5 L9.5 7 L13.5 14.5 L16.5 9.8 L21.5 19.5 Z"
          fill="#f6f4ed"
          stroke="#f6f4ed"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <circle cx="17.8" cy="6.6" r="1.9" fill="var(--trail)" />
      </svg>
    </span>
  );
}
