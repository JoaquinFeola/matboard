/** Logo de la app: el mismo trazo del ícono. */
export function AppLogo() {
  return (
    <div class="flex items-center gap-2.5">
      <svg viewBox="0 0 1024 1024" class="size-8" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#6366f1" />
            <stop offset="1" stop-color="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect x="64" y="64" width="896" height="896" rx="208" fill="url(#logo-g)" />
        <path
          d="M250 690 C 330 420, 420 380, 470 520 S 610 700, 680 470 S 760 300, 790 330"
          fill="none"
          stroke="#fff"
          stroke-width="72"
          stroke-linecap="round"
        />
      </svg>
      <span class="text-[17px] font-semibold tracking-tight">Matboard</span>
    </div>
  );
}
