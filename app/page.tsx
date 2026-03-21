'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const DOC_URL = process.env.NEXT_PUBLIC_DOC_URL ?? '';

type Check = { checked_at: string; changed: number; notified: number };
type LogsData = {
  checks: Check[];
  state?: { last_changed: string | null; doc_url: string };
};

function StatusBanner() {
  const params = useSearchParams();
  const status = params.get('status');
  if (!status) return null;

  const messages: Record<string, string> = {
    confirmed: "✓ Subscription confirmed. We'll email you when the doc changes.",
    'already-confirmed': "You're already subscribed.",
    unsubscribed: "You've been unsubscribed.",
    invalid: 'Invalid or expired link.',
  };

  return (
    <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-5 py-4 text-emerald-300">
      {messages[status] ?? 'Something happened.'}
    </div>
  );
}

function Logs() {
  const [data, setData] = useState<LogsData | null>(null);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      const json = await res.json();
      setData(json);
    } catch {}
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!data || data.checks.length === 0) {
    return (
      <p className="text-neutral-600 text-sm">No checks yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {data.state?.last_changed && (
        <p className="text-xs text-neutral-500">
          Last change detected:{' '}
          <span className="text-emerald-400">
            {new Date(data.state.last_changed).toLocaleString()}
          </span>
        </p>
      )}
      <div className="rounded-lg border border-neutral-800 overflow-hidden text-sm font-mono">
        <div className="grid grid-cols-3 px-4 py-2 bg-neutral-900 text-neutral-500 text-xs uppercase tracking-wider">
          <span>Time</span>
          <span>Status</span>
          <span>Notified</span>
        </div>
        <div className="divide-y divide-neutral-800/50 max-h-64 overflow-y-auto">
          {data.checks.map((c, i) => (
            <div key={i} className="grid grid-cols-3 px-4 py-2 text-xs">
              <span className="text-neutral-400">
                {new Date(c.checked_at).toLocaleTimeString()}
              </span>
              <span className={c.changed ? 'text-emerald-400' : 'text-neutral-600'}>
                {c.changed ? '● changed' : '○ no change'}
              </span>
              <span className="text-neutral-500">
                {c.changed ? `${c.notified} email${c.notified !== 1 ? 's' : ''}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, docUrl: DOC_URL }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-400 text-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            watching for changes
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Get notified when the doc updates.
          </h1>
          <p className="text-neutral-400">
            No more refreshing. Drop your email and we&apos;ll ping you the moment something changes.
          </p>
        </div>

        <Suspense>
          <StatusBanner />
        </Suspense>

        {status === 'sent' ? (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-5 py-4 text-emerald-300">
            Check your inbox — we sent you a confirmation link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 font-semibold transition"
            >
              {status === 'loading' ? 'Subscribing...' : 'Notify me'}
            </button>
            {status === 'error' && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </form>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            Check log
          </h2>
          <Logs />
        </div>

        <p className="text-neutral-600 text-xs">
          Checks every minute. No spam, just updates.{' '}
          <a
            href="https://github.com/jasonmatthewsuhari/doc-change-notifier"
            className="underline hover:text-neutral-400 transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source.
          </a>
        </p>
      </div>
    </main>
  );
}
