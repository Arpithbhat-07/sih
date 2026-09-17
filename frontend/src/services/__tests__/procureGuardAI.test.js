/**
 * Unit & Integration Tests for ProcureGuard AI Intelligence Engine
 * Verifies all 7 hackathon demo queries:
 *   1. Anchor Case (TND-2026-01842)
 *   2. Top Vendor by Awards
 *   3. Price Anomalies (>25% Threshold)
 *   4. Relationship Links (V-1042)
 *   5. Similar Bids in Information Technology
 *   6. Department Risk Summary
 *   7. Delayed Contracts Investigation Priority
 */

import { askProcureGuardAI, detectIntent, INTENT_TYPES, DISCLAIMER } from '../procureGuardAI';
import { askSentinel, investigateHighestRisk } from '../aiEngine';

describe('ProcureGuard AI - 7 Query Verification Suite', () => {
  // Query 1: Anchor Case
  test('Query 1: Explains why TND-2026-01842 is flagged as critical risk', async () => {
    const q = 'Why is TND-2026-01842 flagged as critical risk?';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.TENDER_INVESTIGATION);
    expect(intent.tenderId).toBe('TND-2026-01842');

    const res = await askProcureGuardAI(q);
    expect(res.riskScore).toBe(84);
    expect(res.riskTier).toBe('CRITICAL');
    expect(res.answer).toContain('TND-2026-01842');
    expect(res.answer).toContain('+65.8%');
    expect(res.answer).toContain('Price Anomaly Detector');
    expect(res.answer).toContain('Bid Participation Detector');
    expect(res.answer).toContain('Synergy Bonus');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Query 2: Top Vendor by Awards
  test('Query 2: Identifies the vendor with the highest number of awards', async () => {
    const q = 'Which vendor has received the highest number of awards?';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.VENDOR_ANALYSIS);

    const res = await askProcureGuardAI(q);
    expect(res.answer).toContain('V-1042');
    expect(res.answer).toContain('awards');
    expect(res.answer).toContain('Information Technology Directorate');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Query 3: Price Anomalies Above Threshold
  test('Query 3: Shows price anomalies above 25% threshold', async () => {
    const q = 'Show price anomalies above 25% threshold.';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.PRICE_ANALYSIS);

    const res = await askProcureGuardAI(q);
    expect(res.answer).toContain('576 tenders');
    expect(res.answer).toContain('TND-2026-01842');
    expect(res.answer).toContain('+65.8%');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Query 4: Relationship Links for V-1042
  test('Query 4: Retrieves relationship links for V-1042 Enterprise Logistics', async () => {
    const q = 'What are the relationship links for V-1042 Enterprise Logistics?';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.VENDOR_ANALYSIS);
    expect(intent.vendorId).toBe('V-1042');

    const res = await askProcureGuardAI(q);
    expect(res.answer).toContain('Information Technology Directorate');
    expect(res.answer).toContain('170 recorded contract awards');
    expect(res.answer).toContain('37.3%');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Query 5: Similar Bids in IT
  test('Query 5: Shows potentially similar bids in Information Technology', async () => {
    const q = 'Show potentially similar bids in Information Technology.';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.SIMILAR_BIDS);

    const res = await askProcureGuardAI(q);
    expect(res.answer).toContain('Information Technology');
    expect(res.answer).toContain('Jaccard token similarity');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Query 6: Summarize Risk Across Departments
  test('Query 6: Summarizes procurement risk across all departments', async () => {
    const q = 'Summarize procurement risk across all departments.';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.DEPARTMENT_ANALYSIS);

    const res = await askProcureGuardAI(q);
    expect(res.answer).toContain('10 procuring departments');
    expect(res.answer).toContain('Critical Priority');
    expect(res.answer).toContain('Information Technology Directorate');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Query 7: Delayed Contracts Investigation Priority
  test('Query 7: Recommends investigation priority for delayed contracts', async () => {
    const q = 'What is the recommended investigation priority for delayed contracts?';
    const intent = detectIntent(q);
    expect(intent.type).toBe(INTENT_TYPES.DELAYED_CONTRACTS);

    const res = await askProcureGuardAI(q);
    expect(res.answer).toContain('1,232 tenders');
    expect(res.answer).toContain('Tier 1');
    expect(res.answer).toContain('Tier 2');
    expect(res.disclaimer).toBe(DISCLAIMER);
  });

  // Quick Action Shortcut & Facade Verification
  test('Shortcut: investigateHighestRisk delegates directly to anchor case', async () => {
    const res = await investigateHighestRisk();
    expect(res.riskScore).toBe(84);
    expect(res.riskTier).toBe('CRITICAL');
    expect(res.tenderId).toBe('TND-2026-01842');
  });

  test('Facade: askSentinel delegates to askProcureGuardAI', async () => {
    const res = await askSentinel('Why is TND-2026-01842 flagged as critical risk?');
    expect(res.riskScore).toBe(84);
  });
});
