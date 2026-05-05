/**
 * One-time script to create Paystack subscription plans.
 * Run with: npx ts-node -r tsconfig-paths/register scripts/create-paystack-plans.ts
 *
 * After running, copy the returned plan codes into your .env.local:
 *   PAYSTACK_PLAN_CORE=PLN_xxx
 *   PAYSTACK_PLAN_PRO=PLN_xxx
 *   PAYSTACK_PLAN_PROP=PLN_xxx
 */

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!SECRET_KEY) {
  console.error('PAYSTACK_SECRET_KEY not set');
  process.exit(1);
}

const PLANS = [
  { name: 'TradeLog Pro – Core',        amount: 190000, interval: 'monthly' as const },
  { name: 'TradeLog Pro – Pro',         amount: 250000, interval: 'monthly' as const },
  { name: 'TradeLog Pro – Prop Trader', amount: 300000, interval: 'monthly' as const },
];

async function createPlan(name: string, amount: number, interval: string) {
  const res = await fetch('https://api.paystack.co/plan', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, amount, interval, currency: 'KES' }),
  });
  return res.json();
}

(async () => {
  for (const plan of PLANS) {
    const result = await createPlan(plan.name, plan.amount, plan.interval);
    if (result.status) {
      console.log(`✓ ${plan.name} → ${result.data.plan_code}`);
    } else {
      console.error(`✗ ${plan.name}:`, result.message);
    }
  }
})();
