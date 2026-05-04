export type Feature =
  | 'basic_analytics'
  | 'advanced_analytics'
  | 'ai_coach'
  | 'csv_import'
  | 'challenge_tracker'
  | 'multi_account'
  | 'mistake_tracking_summary'
  | 'risk_status'
  | 'journal'
  | 'csv_export';

const PLAN_GATES: Record<Feature, string[]> = {
  basic_analytics:          ['trial', 'core', 'pro', 'prop'],
  risk_status:              ['trial', 'core', 'pro', 'prop'],
  journal:                  ['trial', 'core', 'pro', 'prop'],
  csv_export:               ['trial', 'core', 'pro', 'prop'],
  advanced_analytics:       ['pro', 'prop'],
  ai_coach:                 ['pro', 'prop'],
  csv_import:               ['pro', 'prop'],
  mistake_tracking_summary: ['pro', 'prop'],
  challenge_tracker:        ['prop'],
  multi_account:            ['prop'],
};

export function canAccess(userPlan: string, feature: Feature): boolean {
  return PLAN_GATES[feature]?.includes(userPlan) ?? false;
}

export function requiredPlanLabel(feature: Feature): string {
  const plans = PLAN_GATES[feature] || [];
  if (plans.length === 1 && plans[0] === 'prop') return 'Prop Trader';
  if (plans.includes('pro')) return 'Pro';
  return 'Core';
}
