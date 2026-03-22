'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const SHUTDOWN_DEADLINE = new Date('2026-03-23T00:00:00Z').getTime();

function useCountdown(deadline: number) {
  const [timeLeft, setTimeLeft] = useState(deadline - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(deadline - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const total = Math.max(0, timeLeft);
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, expired: total === 0 };
}

function ShutdownNotice() {
  const { hours, minutes, seconds, expired } = useCountdown(SHUTDOWN_DEADLINE);

  return (
    <div className="fixed top-4 right-4 z-50 w-80 rounded-xl border border-amber-700/60 bg-neutral-900/95 backdrop-blur p-4 shadow-2xl space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="font-semibold text-amber-300">Projects are out!</span>
      </div>
      <p className="text-neutral-300 leading-relaxed">
        Gemini CLI projects have launched. Check the discussion for more:{' '}
        <a
          href="https://github.com/google-gemini/gemini-cli/discussions/23391"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition break-all"
        >
          google-gemini/gemini-cli #23391
        </a>
      </p>
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 space-y-1">
        <p className="text-neutral-500 text-xs uppercase tracking-wider">Site shuts down in</p>
        {expired ? (
          <p className="text-red-400 font-mono font-semibold">Shut down</p>
        ) : (
          <p className="font-mono text-lg font-bold text-white tabular-nums">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
        )}
      </div>
      <p className="text-neutral-500 text-xs">
        All subscriber data will be permanently deleted when the countdown ends.
      </p>
    </div>
  );
}

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
        body: JSON.stringify({ email }),
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
      <ShutdownNotice />
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
              disabled
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition opacity-50 cursor-not-allowed"
            />
            <button
              type="submit"
              disabled
              className="w-full rounded-lg bg-emerald-600 disabled:opacity-50 px-4 py-3 font-semibold transition cursor-not-allowed"
            >
              Notify me
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
