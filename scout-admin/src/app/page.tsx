import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-50 flex items-center justify-center">
      <main className="max-w-2xl mx-auto px-8 text-center">
        <h1 className="text-4xl font-semibold mb-4">Otomate Management</h1>
        <p className="text-zinc-400 mb-8">
          Internal dashboards for leads, clients, projects, and billing.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium"
          >
            Main Dashboard
          </Link>
          <Link
            href="/clients"
            className="inline-block px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors font-medium border border-zinc-800"
          >
            Clients
          </Link>
          <Link
            href="/leads"
            className="inline-block px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors font-medium border border-zinc-800"
          >
            Leads
          </Link>
        </div>
        <div className="mt-12 p-6 bg-zinc-900 rounded-lg text-left">
          <h2 className="text-lg font-semibold mb-4">API Endpoints</h2>
          <p className="text-sm text-zinc-400 mb-2">POST /api/leads</p>
          <pre className="text-xs bg-black p-4 rounded overflow-x-auto">
            {JSON.stringify({
              name: "John Doe",
              company: "Acme Corp",
              email: "john@acme.com",
              budget_bracket: "High",
              status: "New",
              pain_point: "Need automation for customer support"
            }, null, 2)}
          </pre>
          <p className="text-sm text-zinc-400 mt-6 mb-2">POST /api/clients</p>
          <pre className="text-xs bg-black p-4 rounded overflow-x-auto">
            {JSON.stringify({
              name: "Jane Client",
              company: "Client Co",
              email: "jane@client.co"
            }, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  );
}
