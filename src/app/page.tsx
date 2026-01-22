import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-50 flex items-center justify-center">
      <main className="max-w-2xl mx-auto px-8 text-center">
        <h1 className="text-4xl font-semibold mb-4">Lead Management Dashboard</h1>
        <p className="text-zinc-400 mb-8">
          Manage your automation business leads in one place
        </p>
        <Link
          href="/leads"
          className="inline-block px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium"
        >
          View Leads Dashboard
        </Link>
        <div className="mt-12 p-6 bg-zinc-900 rounded-lg text-left">
          <h2 className="text-lg font-semibold mb-4">API Endpoint</h2>
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
        </div>
      </main>
    </div>
  );
}
