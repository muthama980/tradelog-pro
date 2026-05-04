export type Feature = 'ai_coach';

const PLAN_GATES: Record<Feature, string[]> = {
  ai_coach: ['pro', 'prop'],
};

export function canAccess(userPlan: string, feature: Feature): boolean {
  return PLAN_GATES[feature]?.includes(userPlan) ?? false;
}

export function requiredPlanLabel(_feature: Feature): string {
  return 'Pro';
}
