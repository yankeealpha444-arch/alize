// Central state store for Alize Startup OS

export interface StartupIdea {
  name: string;
  problem: string;
  solution: string;
  audience: string;
}

export interface ValidationMetrics {
  surveys: number;
  feedback: number;
  priceIntent: number;
  emails: number;
}

export interface PMFMetrics {
  activationRate: number;
  retentionRate: number;
  conversionRate: number;
  usage: number;
  dropOff: number;
  timeOnProduct: number;
}

export interface FunnelStep {
  label: string;
  count: number;
}

export interface FunnelBenchmark {
  bad: number;
  ok: number;
  target: string;
}

export const funnelBenchmarks: Record<string, FunnelBenchmark> = {
  'Tried Product':    { bad: 10, ok: 20, target: "20%+ strong · 10–20% okay · <10% weak" },
  'Signed Up':        { bad: 30, ok: 50, target: "50%+ strong · 30–50% okay · <30% weak" },
  'Used Product':     { bad: 40, ok: 60, target: "60%+ strong · 40–60% okay · <40% weak" },
  'Returned':         { bad: 30, ok: 50, target: "50%+ strong · 30–50% okay · <30% weak" },
  'Paid / Pre-order': { bad: 10, ok: 20, target: "20%+ strong · 10–20% okay · <10% weak" },
};

export type FunnelStatus = 'good' | 'ok' | 'bad';

export const getFunnelStepStatus = (label: string, rate: number): FunnelStatus => {
  const bench = funnelBenchmarks[label];
  if (!bench) return 'good';
  if (rate < bench.bad) return 'bad';
  if (rate < bench.ok) return 'ok';
  return 'good';
};

export const funnelInsights: Record<string, { meaning: string; whyItMatters: string; nextAction: string; expectedImpact: string; improvements: string[] }> = {
  'Tried Product': {
    meaning: 'Visitors saw your page but didn\'t try the product.',
    whyItMatters: 'Your hero section isn\'t converting curiosity into action.',
    nextAction: 'Rewrite your headline to focus on the benefit, not the feature. Add a clear CTA above the fold. Add social proof next to the CTA.',
    expectedImpact: 'May improve visitor-to-trial rate by 15–30%',
    improvements: ['Rewrite headline as a benefit statement', 'Add social proof or testimonials near CTA', 'Make CTA button more visible and action-oriented'],
  },
  'Signed Up': {
    meaning: 'Users wanted to try but didn\'t complete signup.',
    whyItMatters: 'Your signup flow has too much friction or doesn\'t feel trustworthy.',
    nextAction: 'Reduce signup to email-only. Add trust signals (e.g. "No credit card required"). Show a product preview before asking for signup.',
    expectedImpact: 'May improve trial-to-signup rate by 20–40%',
    improvements: ['Simplify signup to email-only', 'Add trust signals near form', 'Show product preview before signup'],
  },
  'Used Product': {
    meaning: 'Users signed up but didn\'t use the product.',
    whyItMatters: 'Your onboarding isn\'t guiding users to value fast enough.',
    nextAction: 'Reduce onboarding from 3 steps to 1 step. Add a demo state after signup. Move the first useful action above the fold.',
    expectedImpact: 'May improve activation by 15–30%',
    improvements: ['Reduce onboarding steps', 'Show a quick win in first 30 seconds', 'Add guided tutorial or demo state'],
  },
  'Returned': {
    meaning: 'Users tried the product once but didn\'t come back.',
    whyItMatters: 'The product solves a problem but doesn\'t create a habit or ongoing need.',
    nextAction: 'Add email reminders with value hooks. Save user progress so they have a reason to return. Add a dashboard showing their data over time.',
    expectedImpact: 'May improve return rate by 10–25%',
    improvements: ['Add reminder emails with value hooks', 'Save progress and show reason to return', 'Add dashboard showing data over time'],
  },
  'Paid / Pre-order': {
    meaning: 'Users like the product but aren\'t paying.',
    whyItMatters: 'Your pricing or value communication needs work.',
    nextAction: 'Test different price points. Add a limited free trial with clear upgrade triggers. Show ROI or time saved clearly on pricing page.',
    expectedImpact: 'May improve conversion by 5–15%',
    improvements: ['Test different price points', 'Add limited free trial', 'Show ROI or savings clearly'],
  },
};

export const getFunnelDropOffAction = (funnel: FunnelStep[]): { action: string; detail: string; step: string; nextStep: string; expectedImpact: string } => {
  let worstStep = '';
  let worstRate = 100;
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count;
    if (prev === 0) continue;
    const rate = (funnel[i].count / prev) * 100;
    const status = getFunnelStepStatus(funnel[i].label, rate);
    if (status === 'bad' && rate < worstRate) {
      worstRate = rate;
      worstStep = funnel[i].label;
    } else if (status === 'ok' && worstStep === '' && rate < worstRate) {
      worstRate = rate;
      worstStep = funnel[i].label;
    }
  }
  if (!worstStep) return { action: 'Funnel looks healthy', detail: 'All steps are performing well. Keep testing and improving.', step: '', nextStep: '', expectedImpact: '' };
  const insight = funnelInsights[worstStep];
  const actionMap: Record<string, string> = {
    'Tried Product': 'Improve Landing Page',
    'Signed Up': 'Improve Signup Flow',
    'Used Product': 'Improve Onboarding',
    'Returned': 'Improve Core Product',
    'Paid / Pre-order': 'Improve Pricing',
  };
  return {
    action: actionMap[worstStep] || 'Improve funnel',
    detail: insight?.whyItMatters || 'This step needs improvement.',
    step: worstStep,
    nextStep: insight?.nextAction || '',
    expectedImpact: insight?.expectedImpact || '',
  };
};

export interface AppState {
  currentStep: number;
  idea: StartupIdea | null;
  validationMetrics: ValidationMetrics;
  pmfMetrics: PMFMetrics;
  funnel: FunnelStep[];
  mvpGenerated: boolean;
  versions: Array<{ version: number; changes: string; date: string }>;
  setIdea: (idea: StartupIdea) => void;
  setCurrentStep: (step: number) => void;
  setMvpGenerated: (val: boolean) => void;
  setValidationMetrics: (m: Partial<ValidationMetrics>) => void;
  setPmfMetrics: (m: Partial<PMFMetrics>) => void;
}

export const defaultValidationMetrics: ValidationMetrics = {
  surveys: 12,
  feedback: 8,
  priceIntent: 1,
  emails: 24,
};

export const defaultPMFMetrics: PMFMetrics = {
  activationRate: 18,
  retentionRate: 8,
  conversionRate: 2,
  usage: 45,
  dropOff: 62,
  timeOnProduct: 3.2,
};

export const defaultFunnel: FunnelStep[] = [
  { label: 'Visitors', count: 340 },
  { label: 'Tried Product', count: 89 },
  { label: 'Signed Up', count: 52 },
  { label: 'Used Product', count: 28 },
  { label: 'Returned', count: 14 },
  { label: 'Paid / Pre-order', count: 2 },
];

export const isValidated = (m: ValidationMetrics) =>
  m.surveys >= 40 && m.feedback >= 40 && m.priceIntent >= 3;

export const hasPMF = (m: PMFMetrics) =>
  m.activationRate >= 40 && m.retentionRate >= 20 && m.conversionRate >= 5;

export const getNextBestAction = (vm: ValidationMetrics, pm: PMFMetrics, funnel: FunnelStep[]) => {
  const totalVisitors = funnel[0]?.count ?? 0;
  if (totalVisitors === 0) return { action: 'Get your first 10 users', detail: 'Share your screener and survey link with friends to start collecting data.', nextStep: 'Post your link in 3 communities where your target audience hangs out. Ask 5 friends to share it with 3 people each.', expectedImpact: 'First 10–30 users within 48 hours' };

  const funnelAction = getFunnelDropOffAction(funnel);
  if (funnelAction.step) {
    return { action: funnelAction.action, detail: funnelAction.detail, nextStep: funnelAction.nextStep, expectedImpact: funnelAction.expectedImpact };
  }

  if (!isValidated(vm)) return { action: 'Continue validation', detail: `You need ${Math.max(0, 40 - vm.surveys)} more surveys, ${Math.max(0, 40 - vm.feedback)} more feedback, and ${Math.max(0, 3 - vm.priceIntent)} more price intents.`, nextStep: 'Share your survey link with 10 more people today. Focus on people who match your target audience.', expectedImpact: 'Reach validation threshold within 1–2 weeks' };
  if (!hasPMF(pm)) return { action: 'Improve product usage', detail: 'You\'re validated! Now focus on activation, retention, and conversion metrics.', nextStep: 'Run the top suggested test on the Tests page. Focus on the metric with the biggest gap to target.', expectedImpact: 'Each winning test adds 2–5 PMF points' };
  return { action: 'You\'re crushing it!', detail: 'Both validation and PMF targets reached. Consider scaling.', nextStep: 'Start planning your growth channels. Consider paid ads, partnerships, or content marketing.', expectedImpact: 'Ready for growth phase' };
};
