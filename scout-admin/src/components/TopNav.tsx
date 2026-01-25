import Link from 'next/link';

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
        'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-900',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export function TopNav() {
  return (
    <header
      data-topnav="1"
      className="sticky top-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-50"
          >
            Otomate
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink href="/clients" label="Clients" />
            <NavLink href="/leads" label="Leads" />
          </nav>
        </div>
      </div>
    </header>
  );
}
