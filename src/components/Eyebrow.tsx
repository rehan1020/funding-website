import { clsx } from "@/lib/cx";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={clsx("eyebrow text-navy/50", className)}>{children}</p>
  );
}
