import path from 'node:path';
import type { TestCase } from '@playwright/test/reporter';

type TestClassification = {
  parentSuite: 'UI Desktop' | 'UI Mobile' | 'API' | 'Security' | 'DB / Integratie';
  suite: string;
  feature: string;
  domain: string;
  phase: number;
  type: 'ui' | 'api' | 'security' | 'integration';
};

const FILE_CLASSIFICATIONS: Record<string, TestClassification> = {
  'audit-log.spec.ts': { parentSuite: 'API', suite: 'Audit Log', feature: 'Audit & Security', domain: 'audit', phase: 16, type: 'api' },
  'auth.spec.ts': { parentSuite: 'UI Desktop', suite: 'Login', feature: 'Authenticatie', domain: 'auth', phase: 4, type: 'ui' },
  'customer-timesheet-api.spec.ts': { parentSuite: 'API', suite: 'Customer Timesheets', feature: 'Klanturenstaten', domain: 'customer-timesheets', phase: 10, type: 'api' },
  'dashboard.spec.ts': { parentSuite: 'UI Desktop', suite: 'Dashboard', feature: 'Dashboard', domain: 'dashboard', phase: 15, type: 'ui' },
  'email-queue.spec.ts': { parentSuite: 'API', suite: 'Email Queue', feature: 'E-mailverwerking', domain: 'email', phase: 12, type: 'api' },
  'invoice-lock.spec.ts': { parentSuite: 'DB / Integratie', suite: 'Invoice Locking', feature: 'Facturatie', domain: 'invoices', phase: 11, type: 'integration' },
  'invoices.spec.ts': { parentSuite: 'UI Desktop', suite: 'Facturen', feature: 'Facturatie', domain: 'invoices', phase: 11, type: 'ui' },
  'mobile-ui.spec.ts': { parentSuite: 'UI Mobile', suite: 'Mobile Experience', feature: 'Mobile Experience', domain: 'mobile', phase: 15, type: 'ui' },
  'notifications.spec.ts': { parentSuite: 'API', suite: 'Notifications', feature: 'Notificaties', domain: 'notifications', phase: 15, type: 'api' },
  'password-reset.spec.ts': { parentSuite: 'Security', suite: 'Password Reset / Rate Limiting', feature: 'Audit & Security', domain: 'auth', phase: 13, type: 'security' },
  'period-management.spec.ts': { parentSuite: 'API', suite: 'Period Management', feature: 'Periodebeheer', domain: 'periods', phase: 15, type: 'api' },
  'production-safety.spec.ts': { parentSuite: 'Security', suite: 'Production Safety', feature: 'Audit & Security', domain: 'production-safety', phase: 14, type: 'security' },
  'roles-api.spec.ts': { parentSuite: 'Security', suite: 'Role Scope', feature: 'Audit & Security', domain: 'authorization', phase: 4, type: 'security' },
  'security.spec.ts': { parentSuite: 'Security', suite: 'CSRF & Authentication', feature: 'Audit & Security', domain: 'auth', phase: 5, type: 'security' },
  'timesheet-review-flow.spec.ts': { parentSuite: 'DB / Integratie', suite: 'Optimistic Locking', feature: 'Correctie & Goedkeuring', domain: 'review', phase: 9, type: 'integration' },
  'timesheet-review-ui.spec.ts': { parentSuite: 'UI Desktop', suite: 'Correcties', feature: 'Correctie & Goedkeuring', domain: 'review', phase: 9, type: 'ui' },
  'timesheet-write.spec.ts': { parentSuite: 'API', suite: 'Timesheets', feature: 'Urenregistratie', domain: 'timesheets', phase: 8, type: 'api' },
  'user-management.spec.ts': { parentSuite: 'API', suite: 'User Management', feature: 'Gebruikersbeheer', domain: 'users', phase: 13, type: 'api' },
};

const MOBILE_SUITES: Record<string, string> = {
  'MOB-H-001': 'Login & Navigatie',
  'MOB-H-002': 'Uren & Upload',
  'MOB-H-003': 'Correctie & Goedkeuring',
  'MOB-N-004': 'Facturen & Responsive',
};

const LIVING_DOCS: Record<string, string> = {
  auth: 'tests/playwright/features/auth.feature',
  authorization: 'tests/playwright/features/roles-api.feature',
  'customer-timesheets': 'tests/playwright/features/customer-timesheets.feature',
  dashboard: 'tests/playwright/features/dashboard.feature',
  invoices: 'tests/playwright/features/invoices.feature',
  mobile: 'tests/playwright/features/mobile.feature',
  review: 'tests/playwright/features/timesheets.feature',
  timesheets: 'tests/playwright/features/timesheets.feature',
};

function annotation(name: string, description: string) {
  return { type: `allure.label.${name}`, description };
}

function storyFor(classification: TestClassification, title: string): string {
  const subject = title.replace(/^\[[^\]]+\]\s*/, '').trim();
  if (classification.domain === 'invoices' && /lock|finaliseer|gelijktijd|immutable/i.test(subject)) return 'Factuur definitief maken';
  if (classification.domain === 'review') return 'Correctie en goedkeuring';
  if (classification.domain === 'timesheets') return 'Uren registreren en indienen';
  if (classification.domain === 'customer-timesheets') return 'Klanturenstaat lifecycle';
  if (classification.domain === 'auth') return 'Veilige toegang en sessies';
  return subject;
}

export default class FunctionalAllureReporter {
  onTestBegin(test: TestCase): void {
    const caseId = test.title.match(/^\[([^\]]+)\]/)?.[1];
    if (!caseId) return;

    const fileName = path.basename(test.location.file);
    const base = FILE_CLASSIFICATIONS[fileName];
    if (!base) return;

    const projectName = test.parent.project()?.name || 'unknown';
    const isMobile = projectName === 'mobile-chrome' || projectName === 'mobile-safari';
    const classification = isMobile
      ? { ...base, parentSuite: 'UI Mobile' as const, suite: MOBILE_SUITES[caseId] || base.suite, feature: 'Mobile Experience', domain: caseId === 'MOB-H-003' ? 'review' : caseId === 'MOB-N-004' ? 'invoices' : caseId === 'MOB-H-002' ? 'timesheets' : 'auth', type: 'ui' as const }
      : base;
    const flow = caseId.includes('-N-') ? 'negative' : 'happy';
    const platform = isMobile ? 'mobile' : classification.type === 'ui' ? 'desktop' : 'backend';
    const browser = projectName === 'mobile-safari' ? 'webkit' : projectName === 'mobile-chrome' || projectName === 'desktop-chromium' ? 'chromium' : 'backend';
    const device = projectName === 'mobile-safari' ? 'iPhone 13' : projectName === 'mobile-chrome' ? 'Pixel 7' : platform === 'desktop' ? 'Desktop Chrome' : 'APIRequestContext';
    const tags = [classification.type, platform, browser, flow, `fase-${classification.phase}`, classification.domain];

    test.annotations.push(
      annotation('parentSuite', classification.parentSuite),
      annotation('suite', classification.suite),
      annotation('subSuite', flow === 'happy' ? 'Happy' : 'Negative'),
      annotation('epic', 'Path Uren & Facturatie'),
      annotation('feature', classification.feature),
      annotation('story', storyFor(classification, test.title)),
      annotation('testCaseId', caseId),
      annotation('project', projectName),
      annotation('platform', platform),
      annotation('browser', browser),
      annotation('device', device),
      annotation('type', classification.type),
      annotation('domain', classification.domain),
      annotation('result', flow),
      annotation('phase', `fase-${classification.phase}`),
      annotation('livingDoc', LIVING_DOCS[classification.domain] || 'TEST-BDD-MAPPING.md'),
      ...tags.map((tag) => annotation('tag', tag)),
    );
  }
}