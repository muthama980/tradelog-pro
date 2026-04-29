import { createClient } from '@/lib/supabase/server';
import { CreditCard, User, Database, AlertTriangle, Palette } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const planLabels: Record<string, string> = {
    trial:     'Free Trial',
    core:      'Core ($19/mo)',
    pro:       'Pro ($25/mo)',
    prop:      'Prop Trader ($30/mo)',
    cancelled: 'Cancelled',
  };

  return (
    <div className="p-8 md:p-10 max-w-3xl">
      <div className="mb-10">
        <p className="mono-label mb-2">Settings</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Account & Billing</h1>
      </div>

      <Section icon={User} label="Account">
        <Row label="Name"         value={profile?.full_name || '—'} />
        <Row label="Email"        value={profile?.email || user?.email || '—'} />
        <Row label="Member since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'} />
      </Section>

      <Section icon={CreditCard} label="Plan & Billing">
        <Row label="Current plan" value={planLabels[profile?.plan || 'trial']} />
        {profile?.plan === 'trial' && (
          <Row label="Trial ends" value={profile?.trial_ends_at ? new Date(profile.trial_ends_at).toLocaleDateString() : '—'} />
        )}
        <div className="pt-5 border-t border-border mt-2">
          <p className="text-sm text-text-muted mb-4 leading-relaxed">
            Manage your subscription, switch plans, or update your payment method via the Lemon Squeezy portal.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-secondary text-sm">Compare plans</Link>
            {profile?.ls_customer_id && (
              <a href="https://app.lemonsqueezy.com/billing" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
                Manage billing →
              </a>
            )}
          </div>
          <p className="mt-5 mono-label tracking-wider">
            All major cards via Lemon Squeezy
          </p>
        </div>
      </Section>

      <Section icon={Palette} label="Appearance">
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          Choose your preferred interface theme. Your selection is saved locally.
        </p>
        <ThemeToggle />
      </Section>

      <Section icon={Database} label="Your Data">
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          Your trade history belongs to you. Export it anytime — no questions asked, no friction.
        </p>
        <Link href="/api/trades?format=csv" className="btn-secondary text-sm">
          Export all trades (CSV)
        </Link>
      </Section>

      <Section icon={AlertTriangle} label="Danger Zone" tone="danger">
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          Deleting your account is permanent. All trades, reports, and history will be erased and cannot be recovered.
        </p>
        <button className="text-sm border border-signal-red/40 hover:border-signal-red text-signal-red px-4 py-2 rounded-lg transition">
          Delete account
        </button>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, label, tone, children }: any) {
  return (
    <section className={`card rounded-xl p-7 mb-5 ${tone === 'danger' ? 'border-signal-red/20' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <Icon className={tone === 'danger' ? 'text-signal-red' : 'text-accent'} size={17} strokeWidth={1.7} />
        <h2 className="font-bold text-lg text-text">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
      <span className="mono-label">{label}</span>
      <span className="text-text-muted text-sm">{value}</span>
    </div>
  );
}
