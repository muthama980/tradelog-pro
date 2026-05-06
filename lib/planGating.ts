export type Feature = 'ai_coach';

export function canAccess(_userPlan: string, _feature: Feature): boolean {
  return true;
}

export function requiredPlanLabel(_feature: Feature): string {
  return 'Pro';
}
