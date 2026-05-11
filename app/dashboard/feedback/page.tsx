'use client';

import { useState, useEffect } from 'react';
import { Flag, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SQL = `CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  issue_type TEXT CHECK (issue_type IN ('bug', 'feature', 'downtime', 'other')),
  description TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_self_insert" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_self_select" ON public.feedback FOR SELECT USING (auth.uid() = user_id);`;

export default function FeedbackPage() {
  const [email, setEmail] = useState('');
  const [issueType, setIssueType] = useState('bug');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_type: issueType, description, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 md:p-10 max-w-2xl">
      <div className="mb-10">
        <p className="mono-label mb-2">Support</p>
        <div className="flex items-center gap-3 mb-2">
          <Flag className="text-accent" size={22} strokeWidth={1.7} />
          <h1 className="text-3xl font-bold text-text tracking-tight">Report an Issue</h1>
        </div>
        <p className="text-text-muted text-sm">
          Found a bug or have a feature request? We review every submission.
        </p>
      </div>

      <details className="mb-8 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 mono-label hover:text-accent transition-colors select-none">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Database setup SQL
        </summary>
        <div className="mt-3 p-4 rounded-xl bg-bg-elevated border border-border">
          <pre className="text-xs text-text-muted leading-relaxed overflow-x-auto whitespace-pre font-mono">{SQL}</pre>
        </div>
      </details>

      {submitted ? (
        <div className="card rounded-xl p-12 text-center">
          <CheckCircle className="text-signal-green mx-auto mb-4" size={40} strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-text mb-2">Thanks for the feedback!</h2>
          <p className="text-text-muted text-sm">We'll look into this within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card rounded-xl p-8 space-y-6">
          <div>
            <label className="mono-label block mb-2">Issue Type</label>
            <select
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent/50 transition"
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature Request</option>
              <option value="downtime">Downtime / Outage</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mono-label block mb-2">Description</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition resize-none"
            />
          </div>

          <div>
            <label className="mono-label block mb-2">Screenshot (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setScreenshot(e.target.files?.[0] || null)}
              className="w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:bg-bg-elevated file:text-text-muted file:font-mono file:text-[11px] file:uppercase file:tracking-widest hover:file:text-text hover:file:border-accent/40 transition"
            />
            {screenshot && (
              <p className="mt-2 font-mono text-[11px] text-text-dim">{screenshot.name}</p>
            )}
          </div>

          <div>
            <label className="mono-label block mb-2">Your email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition"
            />
          </div>

          {error && <p className="text-signal-red text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
            {loading ? 'Submitting…' : 'Submit report'}
          </button>
        </form>
      )}
    </div>
  );
}
