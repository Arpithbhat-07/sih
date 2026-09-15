/**
 * Unit & Integration Tests for Sentinel AI Grounded Intelligence Engine
 * Verifies intent detection, context retrieval, grounded response generation,
 * offline fallback, and the exact demo question specifications.
 */

import {
  detectIntent,
  fetchContext,
  generateResponse,
  askSentinel,
  investigateHighestRisk,
  INTENT_TYPES,
  DISCLAIMER,
} from '../sentinelAI';

function createMockApi() {
  return {
    getWorkDetail: jest.fn(async (id) => ({
      id,
      workId: id,
      description: 'Construction of community hall, Sector 4',
      state: 'Karnataka',
      stateCode: 'IN-KA',
      district: 'Belagavi',
      agency: 'Belagavi Rural Works Agency',
      category: 'Community Infrastructure',
      riskScore: 84,
      riskTier: 'CRITICAL',
      costDeviation: 68,
      delayDays: 142,
      delayed: true,
      status: 'Delayed',
      duplicateCandidate: true,
      duplicateSimilarity: 92,
      duplicateMatchId: 'W-10884',
      signals: [
        'Cost anomaly',
        'Project delay',
        'Potential duplicate work',
        'Agency concentration',
      ],
      recommendedAction:
        'Prioritize physical site verification and documentation audit. Reconcile BOQ with duplicate match W-10884.',
      financials: {
        sanctionedAmount: 2200000,
        expenditure: 3100000,
      },
    })),

    getSummary: jest.fn(async () => ({
      totalWorks: 3000,
      totalSanctioned: 3357804000,
      totalExpenditure: 2406764000,
      highRiskWorks: 59,
      criticalWorks: 3,
      delayedWorks: 312,
      duplicateCandidates: 394,
      utilization: 71.7,
      counts: {
        CRITICAL: 3,
        HIGH: 56,
        MEDIUM: 261,
        LOW: 2680,
      },
    })),

    getStateAggregates: jest.fn(async () => [
      { name: 'Uttar Pradesh', code: 'IN-UP', highRisk: 11, works: 344, avgRisk: 14.3 },
      { name: 'Tamil Nadu', code: 'IN-TN', highRisk: 8, works: 266, avgRisk: 16.1 },
      { name: 'West Bengal', code: 'IN-WB', highRisk: 5, works: 216, avgRisk: 13.7 },
      { name: 'Maharashtra', code: 'IN-MH', highRisk: 4, works: 277, avgRisk: 12.9 },
      { name: 'Punjab', code: 'IN-PB', highRisk: 4, works: 87, avgRisk: 13.3 },
    ]),

    getRiskWorks: jest.fn(async ({ riskLevel }) => ({
      rows: [
        {
          id: 'W-11261',
          description: 'Construction of community hall, Sector 4',
          district: 'Belagavi',
          state: 'Karnataka',
          riskScore: 84,
          riskTier: 'CRITICAL',
          signals: ['Cost anomaly', 'Project delay', 'Potential duplicate work'],
        },
        {
          id: 'W-12974',
          description: 'High-mast LED flood lights installation',
          district: 'Varanasi',
          state: 'Uttar Pradesh',
          riskScore: 83,
          riskTier: 'CRITICAL',
          signals: ['Cost anomaly', 'Project delay'],
        },
      ],
      total: 2,
    })),

    getDuplicates: jest.fn(async (limit) => [
      {
        work_a: 'W-11316',
        work_b: 'W-12354',
        similarity_score: 98,
        signals: {
          description_similarity: 100.0,
          cost_similarity: 98.8,
          same_district: true,
        },
        classification: 'POTENTIAL_DUPLICATE',
      },
      {
        work_a: 'W-10484',
        work_b: 'W-12390',
        similarity_score: 97,
        signals: {
          description_similarity: 100.0,
          cost_similarity: 88.4,
          same_district: true,
        },
        classification: 'POTENTIAL_DUPLICATE',
      },
    ]),

    getAgencies: jest.fn(async () => [
      {
        name: 'Pragati Construction Cell',
        total_works: 162,
        anomaly_count: 68,
        anomaly_rate: 0.42,
      },
      {
        name: 'Meridian Infra Works',
        total_works: 155,
        anomaly_count: 59,
        anomaly_rate: 0.38,
      },
    ]),
  };
}

describe('Sentinel AI Intelligence Engine', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = createMockApi();
  });

  // ================= 1. INTENT DETECTION =================
  describe('Intent Detection', () => {
    test('detects WORK_INVESTIGATION from work ID', () => {
      const res = detectIntent('Why is W-11261 high risk?');
      expect(res.type).toBe(INTENT_TYPES.WORK_INVESTIGATION);
      expect(res.workId).toBe('W-11261');
    });

    test('detects WORK_INVESTIGATION from explain work ID', () => {
      const res = detectIntent('Explain W-12974');
      expect(res.type).toBe(INTENT_TYPES.WORK_INVESTIGATION);
      expect(res.workId).toBe('W-12974');
    });

    test('detects HIGHEST_RISK_WORK intent', () => {
      const res = detectIntent('Explain the highest-risk project.');
      expect(res.type).toBe(INTENT_TYPES.HIGHEST_RISK_WORK);
    });

    test('detects RISK_OVERVIEW intent', () => {
      const res = detectIntent('How many high-risk works are there?');
      expect(res.type).toBe(INTENT_TYPES.RISK_OVERVIEW);
    });

    test('detects STATE_ANALYSIS intent', () => {
      const res = detectIntent('Which states have the most high-risk works?');
      expect(res.type).toBe(INTENT_TYPES.STATE_ANALYSIS);
    });

    test('detects DUPLICATE_INVESTIGATION intent', () => {
      const res = detectIntent('Show me potential duplicate works.');
      expect(res.type).toBe(INTENT_TYPES.DUPLICATE_INVESTIGATION);
    });

    test('detects RECOMMENDED_ACTION intent', () => {
      const res = detectIntent('What should investigators review first?');
      expect(res.type).toBe(INTENT_TYPES.RECOMMENDED_ACTION);
    });

    test('detects UNSUPPORTED for out-of-scope query', () => {
      const res = detectIntent('What is the weather in Delhi tomorrow?');
      expect(res.type).toBe(INTENT_TYPES.UNSUPPORTED);
    });
  });

  // ================= 2. GROUNDED WORK INVESTIGATION =================
  describe('Work Investigation Grounding', () => {
    test('produces structured evidence-first response for W-11261', async () => {
      const res = await askSentinel('Why is W-11261 high risk?', mockApi);

      expect(mockApi.getWorkDetail).toHaveBeenCalledWith('W-11261');
      expect(res.workId).toBe('W-11261');
      expect(res.riskScore).toBe(84);
      expect(res.riskTier).toBe('CRITICAL');
      expect(res.title).toContain('CRITICAL RISK — W-11261');

      // Verify "Why it was flagged" sections
      expect(res.answer).toContain('Why it was flagged');
      expect(res.answer).toContain('+68% above category median');
      expect(res.answer).toContain('142 days beyond scheduled completion');
      expect(res.answer).toContain('92% attribute similarity with W-10884');
      expect(res.answer).toContain('Belagavi Rural Works Agency');

      // Verify Recommended Action and Disclaimer
      expect(res.answer).toContain('Recommended Action');
      expect(res.answer).toContain(DISCLAIMER);
      expect(res.evidence.source).toBe('MPLADS Sentinel Analytics Engine');
      expect(res.evidence.url).toBe('/works/W-11261');
    });
  });

  // ================= 3. RISK OVERVIEW =================
  describe('Risk Overview Grounding', () => {
    test('produces grounded portfolio distribution for summary questions', async () => {
      const res = await askSentinel('How many high-risk works are there?', mockApi);

      expect(mockApi.getSummary).toHaveBeenCalled();
      expect(res.answer).toContain('3,000 public works');
      expect(res.answer).toContain('CRITICAL Risk (80–100): 3 works');
      expect(res.answer).toContain('59 works');
      expect(res.answer).toContain('312 works');
      expect(res.answer).toContain('394 works');
      expect(res.answer).toContain(DISCLAIMER);
    });
  });

  // ================= 4. STATE ANALYSIS =================
  describe('State Analysis Grounding', () => {
    test('ranks states by high-risk concentration', async () => {
      const res = await askSentinel('Which states have the most high-risk works?', mockApi);

      expect(mockApi.getStateAggregates).toHaveBeenCalled();
      expect(res.answer).toContain('Uttar Pradesh');
      expect(res.answer).toContain('11 high-risk works');
      expect(res.answer).toContain('Tamil Nadu');
      expect(res.answer).toContain('8 high-risk works');
      expect(res.answer).toContain(DISCLAIMER);
    });
  });

  // ================= 5. DUPLICATE INVESTIGATION =================
  describe('Duplicate Investigation Grounding', () => {
    test('returns top duplicate candidate pairs with similarity scores', async () => {
      const res = await askSentinel('Show me potential duplicate works.', mockApi);

      expect(mockApi.getDuplicates).toHaveBeenCalledWith(10);
      expect(res.answer).toContain('W-11316 <—> W-12354 (98% Composite Similarity)');
      expect(res.answer).toContain('W-10484 <—> W-12390 (97% Composite Similarity)');
      expect(res.answer).toContain('Recommended Action');
      expect(res.answer).toContain(DISCLAIMER);
    });
  });

  // ================= 6. RECOMMENDED ACTIONS =================
  describe('Recommended Action Grounding', () => {
    test('returns prioritized review checklist for critical works', async () => {
      const res = await askSentinel('What should investigators review first?', mockApi);

      expect(mockApi.getRiskWorks).toHaveBeenCalled();
      expect(res.answer).toContain('Investigation Priority Protocol');
      expect(res.answer).toContain('W-11261 (Risk Score: 84/100');
      expect(res.answer).toContain('W-12974 (Risk Score: 83/100');
      expect(res.answer).toContain('Step 1: Verify actual physical completion');
      expect(res.answer).toContain(DISCLAIMER);
    });
  });

  // ================= 7. EXPLAIN HIGHEST-RISK PROJECT =================
  describe('Highest Risk Shortcut', () => {
    test('investigates and explains the highest risk project', async () => {
      const res = await investigateHighestRisk(mockApi);

      expect(mockApi.getRiskWorks).toHaveBeenCalled();
      expect(mockApi.getWorkDetail).toHaveBeenCalledWith('W-11261');
      expect(res.workId).toBe('W-11261');
      expect(res.riskScore).toBe(84);
      expect(res.answer).toContain('CRITICAL RISK — W-11261');
    });
  });

  // ================= 8. UNSUPPORTED / OUT OF SCOPE =================
  describe('Unsupported Questions', () => {
    test('refuses to hallucinate on out-of-scope query', async () => {
      const res = await askSentinel('Who will win the election next year?', mockApi);

      expect(res.title).toBe('Out of Analytical Scope');
      expect(res.answer).toContain("I don't have sufficient evidence in the current MPLADS Sentinel dataset");
      expect(res.answer).toContain('Try asking:');
      expect(res.answer).toContain('Why is W-11261 high risk?');
    });
  });

  // ================= 9. BACKEND UNAVAILABLE FALLBACK =================
  describe('Offline / API Unavailable Fallback', () => {
    test('uses built-in fallback methods without crashing when API throws error', async () => {
      const failingApi = {
        getWorkDetail: jest.fn(async () => {
          throw new Error('Network Error 503');
        }),
        getSummary: jest.fn(async () => {
          throw new Error('Network Error 503');
        }),
        getStateAggregates: jest.fn(async () => {
          throw new Error('Network Error 503');
        }),
        getRiskWorks: jest.fn(async () => {
          throw new Error('Network Error 503');
        }),
        getDuplicates: jest.fn(async () => {
          throw new Error('Network Error 503');
        }),
        getAgencies: jest.fn(async () => {
          throw new Error('Network Error 503');
        }),
      };

      const res = await askSentinel('Why is W-11261 high risk?', failingApi);
      expect(res.title).toBe('Analytical Query Alert');
      expect(res.answer).toContain('Unable to complete analytical query');
      expect(res.disclaimer).toBe(DISCLAIMER);
    });
  });

  // ================= 10. SCOPE-AWARE RBAC GUARDS =================
  describe('Scope-Aware RBAC Guards', () => {
    test('blocks district authority asking about national or other state rankings', () => {
      const districtContext = {
        intent: { type: INTENT_TYPES.STATE_ANALYSIS },
        user: {
          role: 'DISTRICT_AUTHORITY',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
        },
      };

      const res = generateResponse('Which states have the most high-risk works?', districtContext);
      expect(res.title).toBe('Jurisdiction Scope Boundary');
      expect(res.answer).toContain('outside your authorized scope (District Scope');
      expect(res.unauthorized).toBe(true);
      expect(res.disclaimer).toBe(DISCLAIMER);
    });

    test('blocks state authority asking about other states', () => {
      const stateContext = {
        intent: { type: INTENT_TYPES.STATE_ANALYSIS },
        user: {
          role: 'STATE_AUTHORITY',
          state: 'Karnataka',
        },
      };

      const res = generateResponse('Show me risk in Uttar Pradesh', stateContext);
      expect(res.title).toBe('Jurisdiction Scope Boundary');
      expect(res.answer).toContain('outside your authorized scope (State Scope · Karnataka)');
      expect(res.unauthorized).toBe(true);
      expect(res.disclaimer).toBe(DISCLAIMER);
    });
  });
});
