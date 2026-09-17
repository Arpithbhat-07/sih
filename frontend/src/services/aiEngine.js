/**
 * ProcureGuard AI Engine Entry Point
 *
 * Facade delegating to the grounded intelligence layer in procureGuardAI.js.
 * Preserves backwards compatibility while providing the procurement analytical architecture.
 */

import {
  askProcureGuardAI,
  detectIntent as detectIntentPG,
  DISCLAIMER as DISCLAIMER_PG,
  INTENT_TYPES as INTENT_TYPES_PG,
} from './procureGuardAI';

export const askSentinel = askProcureGuardAI;
export const askProcureGuard = askProcureGuardAI;

export async function investigateHighestRisk() {
  return askProcureGuardAI('Why is TND-2026-01842 flagged as critical risk?');
}

export const detectIntent = detectIntentPG;
export const DISCLAIMER = DISCLAIMER_PG;
export const INTENT_TYPES = INTENT_TYPES_PG;

/**
 * Quick-Action Prompts (ProcureGuard Intelligence Queries)
 */
export const SUGGESTED_PROMPTS = [
  {
    label: 'Why is TND-2026-01842 critical?',
    text: 'Why is TND-2026-01842 flagged as critical risk?',
    description: 'Inspect multi-detector convergence for anchor case (Score: 84/100)',
  },
  {
    label: 'Top vendor by awards',
    text: 'Which vendor has received the highest number of awards?',
    description: 'Analyze award concentration and win rates across 40 vendors',
  },
  {
    label: 'Price anomalies (>25%)',
    text: 'Show price anomalies above 25% threshold.',
    description: 'Review statistical price deviation outliers against peer medians',
  },
  {
    label: 'V-1042 relationship links',
    text: 'What are the relationship links for V-1042 Enterprise Logistics?',
    description: 'Network graph connections, department ties & co-bidding patterns',
  },
  {
    label: 'Similar bids in IT',
    text: 'Show potentially similar bids in Information Technology.',
    description: 'Screen for specification overlap and potential duplicate tenders',
  },
  {
    label: 'Risk across departments',
    text: 'Summarize procurement risk across all departments.',
    description: 'Departmental risk distribution and priority case breakdown',
  },
  {
    label: 'Delayed contracts priority',
    text: 'What is the recommended investigation priority for delayed contracts?',
    description: 'Structured 3-tier triage matrix for 1,232 delayed tenders',
  },
];
