'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, Send, CheckCircle, Loader2 } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong. Please try again.'); return; }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg pt-32 pb-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10">
            <p className="mono-label mb-3">Support</p>
            <h1 className="text-4xl font-bold text-text tracking-tight mb-3">Contact Us</h1>
            <p className="text-text-muted">
              Have a question or need help? We typically respond within 24 hours.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-8 p-4 rounded-xl border border-border bg-bg-surface">
            <Mail size={16} className="text-accent shrink-0" />
            <span className="text-sm text-text-muted">
              Or email us directly at{' '}
              <a href="mailto:support@tradelogpro.xyz" className="text-accent hover:underline">
                support@tradelogpro.xyz
              </a>
            </span>
          </div>

          {submitted ? (
            <div className="card rounded-xl p-12 text-center">
              <CheckCircle className="text-signal-green mx-auto mb-4" size={40} strokeWidth={1.5} />
              <h2 className="text-xl font-bold text-text mb-2">Message sent!</h2>
              <p className="text-text-muted text-sm">
                We'll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card rounded-xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="mono-label block mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition"
                  />
                </div>
                <div>
                  <label className="mono-label block mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="mono-label block mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="How can we help?"
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition"
                />
              </div>
              <div>
                <label className="mono-label block mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us what's on your mind..."
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition resize-none"
                />
              </div>
              {error && (
                <div className="text-sm text-signal-red border border-signal-red/30 bg-signal-red/5 p-3 rounded-lg">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
