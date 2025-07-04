// Global type declarations for modules without TypeScript support

declare module 'framer-motion' {
  export const motion: any;
  export const AnimatePresence: any;
}

declare module 'lucide-react' {
  export const ChevronDown: any;
  export const Globe: any;
  export const Database: any;
  export const Image: any;
  export const Users: any;
  export const Calendar: any;
  export const DollarSign: any;
  export const Clock: any;
  export const CheckCircle: any;
  export const XCircle: any;
  export const Loader: any;
  export const Play: any;
  export const Pause: any;
  export const RotateCcw: any;
  export const ExternalLink: any;
}

declare module 'tailwind-merge' {
  export function cn(...classes: (string | undefined | null | false)[]): string;
}

declare module 'clsx' {
  export default function clsx(...args: any[]): string;
}