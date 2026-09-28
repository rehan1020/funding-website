import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-dashed border-sky/70 bg-white/90 backdrop-blur">
      <div className="container-tr flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium uppercase tracking-eyebrow text-navy"
        >
          The Capital Room
        </Link>
        <nav className="flex items-center gap-6 text-sm text-navy/80">
          <Link href="/submit" className="hover:text-navy">
            Submit a pitch
          </Link>
          <Link href="/network-legal" className="hover:text-navy">
            Network &amp; legal
          </Link>
        </nav>
      </div>
    </header>
  );
}
