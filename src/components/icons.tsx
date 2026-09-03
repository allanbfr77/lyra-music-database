/**
 * Conjunto único de ícones do projeto.
 * Todos em SVG, herdam a cor do texto (currentColor) e aceitam tamanho.
 * Nenhum caractere solto (♪, ×, ▶, ↗) é usado como ícone no site.
 */

type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function Line({ size = 18, strokeWidth = 2, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Solid({ size = 18, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function MusicNoteIcon(props: IconProps) {
  return (
    <Solid {...props}>
      <path d="M20 3.4a1 1 0 0 0-1.2-1L9.6 4.3A1 1 0 0 0 8.8 5.3v9.1a3.6 3.6 0 1 0 1.9 3.2V9.2l7.4-1.5v4.6a3.6 3.6 0 1 0 1.9 3.2Z" />
    </Solid>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Line>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Line>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <path d="m9 5 7 7-7 7" />
    </Line>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <path d="m5 9 7 7 7-7" />
    </Line>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <path d="M3.2 8.2A8.5 8.5 0 1 1 3 12" />
      <path d="M3.2 3.5v4.8h4.8" />
    </Line>
  );
}

export function TextSmallerIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M3 18 8 6l5 12" />
      <path d="M4.9 14h6.2" />
      <path d="M16.5 12H22" />
    </Line>
  );
}

export function TextLargerIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M3 18 8 6l5 12" />
      <path d="M4.9 14h6.2" />
      <path d="M16.5 12H22M19.25 9.25v5.5" />
    </Line>
  );
}

export function WrapTextIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h13.5a3 3 0 0 1 0 6H14" />
      <path d="m16 16-2 2 2 2" />
      <path d="M4 18h6" />
    </Line>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Solid {...props}>
      <path d="M8 5.2a1 1 0 0 1 1.5-.87l10 6.8a1 1 0 0 1 0 1.74l-10 6.8A1 1 0 0 1 8 18.8Z" />
    </Solid>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Solid {...props}>
      <rect x="6.5" y="5" width="3.8" height="14" rx="1.2" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1.2" />
    </Solid>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Line>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.2} {...props}>
      <path d="M5 12h14" />
    </Line>
  );
}

/** Padrão dos três pontos conectados (Android, WhatsApp, web em geral). */
export function ShareIcon(props: IconProps) {
  return (
    <Line strokeWidth={1.9} {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </Line>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Line strokeWidth={2.4} {...props}>
      <path d="m5 13 4 4 10-10" />
    </Line>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10.5 13.5" />
      <path d="M18 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
    </Line>
  );
}

export function YouTubeIcon(props: IconProps) {
  return (
    <svg
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox="0 0 24 24"
      className={props.className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#ff0000"
        d="M23.5 6.2a3.05 3.05 0 0 0-2.14-2.16C19.4 3.6 12 3.6 12 3.6s-7.4 0-9.36.44A3.05 3.05 0 0 0 .5 6.2 32 32 0 0 0 0 12a32 32 0 0 0 .5 5.8 3.05 3.05 0 0 0 2.14 2.16C4.6 20.4 12 20.4 12 20.4s7.4 0 9.36-.44A3.05 3.05 0 0 0 23.5 17.8 32 32 0 0 0 24 12a32 32 0 0 0-.5-5.8Z"
      />
      <path fill="#fff" d="M9.75 15.5v-7L16.5 12Z" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.5 18.5 3.5 20l1.5-4Z" />
    </Line>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Line strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.4v2.2M12 19.4v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </Line>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Line strokeWidth={2} {...props}>
      <path d="M20.2 14.4A8.4 8.4 0 0 1 9.6 3.8a8.4 8.4 0 1 0 10.6 10.6Z" />
    </Line>
  );
}
