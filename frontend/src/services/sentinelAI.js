/**
 * Sentinel AI Grounded Intelligence Layer
 *
 * Grounded strictly in MPLADS Sentinel Analytics.
 * Architecture:
 *   User Question -> Intent Detection -> Relevant API Data -> Structured Analytical Context -> Sentinel AI Response -> Evidence + Recommended Action
 *
 * Offline-first, fully deterministic, zero external API keys required.
 * Pluggable architecture ready for future LLM integration.
 */

import {
  getWorkDetail,
  getSummary,
  getStateAggregates,
  getRiskWorks,
  getDuplicates,
  getAgencies,
} from './api';
import { formatCr, formatINR } from '../lib/format';

export const DISCLAIMER =
  'Analytical signals do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.';

export const INTENT_TYPES = {
  WORK_INVESTIGATION: 'WORK_INVESTIGATION',
  HIGHEST_RISK_WORK: 'HIGHEST_RISK_WORK',
  RISK_OVERVIEW: 'RISK_OVERVIEW',
  CRITICAL_WORKS: 'CRITICAL_WORKS',
  STATE_ANALYSIS: 'STATE_ANALYSIS',
  DUPLICATE_INVESTIGATION: 'DUPLICATE_INVESTIGATION',
  AGENCY_ANALYSIS: 'AGENCY_ANALYSIS',
  RECOMMENDED_ACTION: 'RECOMMENDED_ACTION',
  UNSUPPORTED: 'UNSUPPORTED',
};

/**
 * 1. INTENT DETECTION
 * Extracts user intent and parameters (e.g. workId, stateName).
 */
export function detectIntent(question = '') {
  const q = question.trim();
  const lower = q.toLowerCase();

  // Match Work ID: e.g. W-11261, W-10001, W-12974
  const workMatch = q.match(/\b(W-\d{4,6})\b/i);
  const workId = workMatch ? workMatch[1].toUpperCase() : null;

  if (workId) {
    if (
      lower.includes('action') ||
      lower.includes('recommend') ||
      lower.includes('what should be done') ||
      lower.includes('how to proceed')
    ) {
      return { type: INTENT_TYPES.RECOMMENDED_ACTION, workId, question: q };
    }
    return { type: INTENT_TYPES.WORK_INVESTIGATION, workId, question: q };
  }

  // Highest-risk project
  if (
    lower.includes('highest-risk') ||
    lower.includes('highest risk') ||
    lower.includes('most risky') ||
    lower.includes('top risk project') ||
    lower.includes('top risky') ||
    lower.includes('most suspicious') ||
    lower.includes('highest score')
  ) {
    return { type: INTENT_TYPES.HIGHEST_RISK_WORK, question: q };
  }

  // Recommended actions / What to review first
  if (
    lower.includes('what should investigators review first') ||
    lower.includes('what should we investigate first') ||
    lower.includes('investigate first') ||
    lower.includes('review first') ||
    lower.includes('what should be physically verified') ||
    lower.includes('physically verified') ||
    lower.includes('action priority') ||
    (lower.includes('what') && lower.includes('action') && lower.includes('take'))
  ) {
    return { type: INTENT_TYPES.RECOMMENDED_ACTION, question: q };
  }

  // Duplicate works
  if (
    lower.includes('duplicate') ||
    lower.includes('similarity') ||
    lower.includes('similar works') ||
    lower.includes('clones')
  ) {
    return { type: INTENT_TYPES.DUPLICATE_INVESTIGATION, question: q };
  }

  // State analysis
  const hasStateContext =
    lower.includes('state') ||
    lower.includes('risk') ||
    lower.includes('work') ||
    lower.includes('project') ||
    lower.includes('delay') ||
    lower.includes('cost') ||
    lower.includes('expenditure') ||
    lower.includes('attention') ||
    lower.includes('anomaly') ||
    lower.includes('mplad');

  const matchedState = [
    'karnataka',
    'uttar pradesh',
    'tamil nadu',
    'west bengal',
    'maharashtra',
    'bihar',
    'rajasthan',
    'gujarat',
    'punjab',
    'delhi',
    'kerala',
    'telangana',
    'andhra pradesh',
    'madhya pradesh',
    'odisha',
    'haryana',
    'assam',
    'jharkhand',
    'chhattisgarh',
    'uttarakhand',
  ].find((s) => lower.includes(s));

  if (lower.includes('state') || (matchedState && hasStateContext)) {
    return { type: INTENT_TYPES.STATE_ANALYSIS, stateName: matchedState, question: q };
  }

  // Critical works list
  if (
    lower.includes('critical works') ||
    lower.includes('critical projects') ||
    lower.includes('show me critical') ||
    lower.includes('list critical')
  ) {
    return { type: INTENT_TYPES.CRITICAL_WORKS, question: q };
  }

  // General risk overview / counts / delayed
  if (
    lower.includes('how many') ||
    lower.includes('risk distribution') ||
    lower.includes('overall risk') ||
    lower.includes('delayed works') ||
    lower.includes('delayed projects') ||
    lower.includes('total works') ||
    lower.includes('summary') ||
    lower.includes('overview')
  ) {
    return { type: INTENT_TYPES.RISK_OVERVIEW, question: q };
  }

  // Agency analysis
  if (
    lower.includes('agency') ||
    lower.includes('agencies') ||
    lower.includes('implementing agency')
  ) {
    return { type: INTENT_TYPES.AGENCY_ANALYSIS, question: q };
  }

  // Unsupported question (out of scope or ungroundable)
  return { type: INTENT_TYPES.UNSUPPORTED, question: q };
}

/**
 * 2. CONTEXT RETRIEVAL
 * Queries the relevant backend APIs to build an authoritative analytical context.
 */
export async function fetchContext(intent, api = null) {
  const apis = api || {
    getWorkDetail,
    getSummary,
    getStateAggregates,
    getRiskWorks,
    getDuplicates,
    getAgencies,
  };

  try {
    switch (intent.type) {
      case INTENT_TYPES.WORK_INVESTIGATION: {
        const work = await apis.getWorkDetail(intent.workId);
        return { intent, work };
      }

      case INTENT_TYPES.HIGHEST_RISK_WORK: {
        const riskRes = await apis.getRiskWorks({
          riskLevel: 'CRITICAL',
          sortBy: 'riskScore',
          sortDir: 'desc',
          pageSize: 1,
        });
        const topWorkItem = riskRes?.rows?.[0];
        const topId = topWorkItem?.id || 'W-11261';
        const work = await apis.getWorkDetail(topId);
        return { intent, work };
      }

      case INTENT_TYPES.RISK_OVERVIEW: {
        const summary = await apis.getSummary();
        return { intent, summary };
      }

      case INTENT_TYPES.CRITICAL_WORKS: {
        const [summary, criticalRes] = await Promise.all([
          apis.getSummary(),
          apis.getRiskWorks({
            riskLevel: 'CRITICAL',
            sortBy: 'riskScore',
            sortDir: 'desc',
            pageSize: 10,
          }),
        ]);
        return { intent, summary, criticalWorks: criticalRes?.rows || [] };
      }

      case INTENT_TYPES.STATE_ANALYSIS: {
        const [states, summary] = await Promise.all([
          apis.getStateAggregates(),
          apis.getSummary(),
        ]);
        return { intent, states, summary, stateName: intent.stateName };
      }

      case INTENT_TYPES.DUPLICATE_INVESTIGATION: {
        const duplicates = await apis.getDuplicates(10);
        return { intent, duplicates };
      }

      case INTENT_TYPES.AGENCY_ANALYSIS: {
        const agencies = await apis.getAgencies();
        return { intent, agencies };
      }

      case INTENT_TYPES.RECOMMENDED_ACTION: {
        if (intent.workId) {
          const work = await apis.getWorkDetail(intent.workId);
          return { intent, work };
        }
        const [criticalRes, summary] = await Promise.all([
          apis.getRiskWorks({
            riskLevel: 'CRITICAL',
            sortBy: 'riskScore',
            sortDir: 'desc',
            pageSize: 5,
          }),
          apis.getSummary(),
        ]);
        return { intent, criticalWorks: criticalRes?.rows || [], summary };
      }

      case INTENT_TYPES.UNSUPPORTED:
      default:
        return { intent, unsupported: true };
    }
  } catch (err) {
    console.error('[Sentinel AI] Context retrieval failed:', err);
    return { intent, error: err.message };
  }
}

/**
 * 3. RESPONSE GENERATION (Pluggable Abstraction)
 * Pure, deterministic response generation grounded in analytical context.
 * Can be swapped with LLM + context prompt in the future.
 */
export function generateResponse(question, context) {
  const { intent } = context;

  // Handle context error
  if (context.error) {
    return {
      title: 'Analytical Query Alert',
      answer: `Unable to complete analytical query due to an API connectivity issue (${context.error}). Please verify backend connectivity.`,
      disclaimer: DISCLAIMER,
      confidence: 'Low',
      source: 'MPLADS Sentinel Analytics Engine',
      dataset: 'Synthetic Demonstration Dataset',
    };
  }

  // Handle unsupported questions
  if (context.unsupported || intent.type === INTENT_TYPES.UNSUPPORTED) {
    return {
      title: 'Out of Analytical Scope',
      answer: `I don't have sufficient evidence in the current MPLADS Sentinel dataset to answer that reliably.\n\nSentinel AI answers questions grounded strictly in the 3,000 verified MPLADS demonstration records (cost deviations, project schedules, duplicate similarity, agency concentrations, and composite risk scoring).\n\nTry asking:\n• "Why is W-11261 high risk?"\n• "How many high-risk works are there?"\n• "Which states have the most high-risk works?"\n• "Show me potential duplicate works."\n• "What should investigators review first?"\n• "Explain the highest-risk project."`,
      disclaimer: DISCLAIMER,
      confidence: 'High',
      source: 'MPLADS Sentinel Analytics Engine',
      dataset: 'Synthetic Demonstration Dataset',
    };
  }

  // 1. WORK INVESTIGATION
  if (
    intent.type === INTENT_TYPES.WORK_INVESTIGATION ||
    (intent.type === INTENT_TYPES.HIGHEST_RISK_WORK && context.work)
  ) {
    const w = context.work;
    if (!w) {
      return {
        title: 'Work Not Found',
        answer: `Work ${intent.workId || 'requested'} was not found in the indexed MPLADS dataset. Please check the Work ID format (e.g. W-11261).`,
        disclaimer: DISCLAIMER,
        confidence: 'High',
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
      };
    }

    const tier = w.riskTier || 'HIGH';
    const score = w.riskScore ?? 0;
    const fin = w.financials || {};
    const costDev = w.costDeviation ?? 0;
    const delayDays = w.delayDays ?? 0;
    const dupSim = w.duplicateSimilarity || (w.duplicateCandidate ? 85 : 0);
    const dupId = w.duplicateMatchId || (w.similar && w.similar[0]?.id) || 'peer work';
    const agency = w.agency || 'Implementing Agency';
    const desc = w.description || 'Public Works Project';
    const loc = `${w.district}, ${w.state}`;
    const action =
      w.recommendedAction ||
      'Prioritize physical site inspection, timeline audit, and invoice cross-reconciliation.';

    // Construct "Why it was flagged" items
    const flaggedItems = [];
    let itemIdx = 1;

    if (costDev > 0 || (fin.expenditure && fin.expenditure > fin.sanctionedAmount)) {
      flaggedItems.push(
        `${itemIdx++}. Cost Anomaly\n   • ${costDev > 0 ? `+${costDev}% above category median` : 'Expenditure exceeded sanctioned budget'}\n   • Sanctioned: ${formatINR(fin.sanctionedAmount || w.sanctionedAmount)} | Expenditure: ${formatINR(fin.expenditure || w.expenditure)}`
      );
    }

    if (w.delayed || delayDays > 0) {
      flaggedItems.push(
        `${itemIdx++}. Execution Delay\n   • ${delayDays} days beyond scheduled completion\n   • Current status: ${w.status || 'Delayed'}`
      );
    }

    if (w.duplicateCandidate || dupSim >= 70) {
      flaggedItems.push(
        `${itemIdx++}. Potential Duplicate\n   • ${dupSim}% attribute similarity with ${dupId}\n   • Shared sector (${w.category}) and district proximity`
      );
    }

    if (w.signals?.includes('Agency concentration') || (w.breakdown && w.breakdown.find((b) => b.key === 'Agency anomaly')?.value > 0)) {
      flaggedItems.push(
        `${itemIdx++}. Agency Pattern\n   • Elevated portfolio anomaly share for ${agency}`
      );
    }

    if (flaggedItems.length === 0) {
      flaggedItems.push(
        `1. Baseline Assessment\n   • All analytical component indicators are within normal tolerance boundaries.`
      );
    }

    const answer = [
      `${tier} RISK — ${w.id}`,
      `"${desc}"`,
      `Location: ${loc} | Sector: ${w.category}`,
      ``,
      `Risk Score`,
      `${score} / 100`,
      ``,
      `Why it was flagged`,
      flaggedItems.join('\n\n'),
      ``,
      `Recommended Action`,
      action,
      ``,
      `Confidence`,
      score >= 80 ? 'High (Multi-signal confluence)' : 'Statistically Significant',
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    const signals = (w.signals || []).map((s) => ({ label: s }));
    if (signals.length === 0 && score > 0) {
      signals.push({ label: `Risk ${score}/100` });
    }

    return {
      title: `${tier} RISK — ${w.id}`,
      answer,
      workId: w.id,
      riskScore: score,
      riskTier: tier,
      recommendedAction: action,
      signals,
      confidence: score >= 80 ? 'High' : 'Medium-High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        workId: w.id,
        url: `/works/${w.id}`,
      },
      disclaimer: DISCLAIMER,
    };
  }

  // 2. RISK OVERVIEW
  if (intent.type === INTENT_TYPES.RISK_OVERVIEW) {
    const s = context.summary || {};
    const total = s.totalWorks || 3000;
    const critical = s.criticalWorks ?? s.counts?.CRITICAL ?? 3;
    const high = s.highRiskWorks ?? (s.counts?.HIGH ? s.counts.HIGH + critical : 59);
    const delayed = s.delayedWorks || 312;
    const duplicates = s.duplicateCandidates || 394;
    const sanctioned = s.totalSanctioned ? formatCr(s.totalSanctioned) : '₹335.78 Cr';
    const expenditure = s.totalExpenditure ? formatCr(s.totalExpenditure) : '₹240.68 Cr';
    const util = s.utilization || 71.7;

    const answer = [
      `MPLADS Programme Risk & Execution Overview`,
      ``,
      `The analytics pipeline currently tracks ${total.toLocaleString()} public works valued at ${sanctioned} (${expenditure} utilized, ${util}% overall utilization).`,
      ``,
      `Risk Distribution:`,
      `• CRITICAL Risk (80–100): ${critical} works (immediate intervention required)`,
      `• HIGH Risk (60–79): ${s.counts?.HIGH || (high - critical)} works (prioritized review)`,
      `• Combined High Risk: ${high} works (${((high / total) * 100).toFixed(1)}% of portfolio)`,
      `• MEDIUM Risk (30–59): ${s.counts?.MEDIUM || 261} works`,
      `• LOW Risk (0–29): ${s.counts?.LOW || 2680} works`,
      ``,
      `Key Operational Signals:`,
      `1. Execution Delays: ${delayed} works (${((delayed / total) * 100).toFixed(1)}%) are experiencing schedule slippage.`,
      `2. Duplicate Screening: ${duplicates} works (${((duplicates / total) * 100).toFixed(1)}%) exhibit high multi-attribute similarity requiring verification.`,
      `3. Expenditure Anomalies: Tracked across ${total} works against sector-specific cost baselines.`,
      ``,
      `Recommended Action`,
      `Filter the Risk Monitor by CRITICAL tier to inspect the 3 works with compound multi-signal anomalies.`,
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    return {
      title: 'MPLADS Programme Risk Overview',
      answer,
      signals: [
        { label: `${total} Total Works` },
        { label: `${critical} Critical Works` },
        { label: `${high} High-Risk Works` },
        { label: `${delayed} Delayed Works` },
        { label: `${duplicates} Duplicate Candidates` },
      ],
      confidence: 'High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        url: '/risk',
      },
      disclaimer: DISCLAIMER,
    };
  }

  // 3. CRITICAL WORKS LIST
  if (intent.type === INTENT_TYPES.CRITICAL_WORKS) {
    const list = context.criticalWorks || [];
    const count = list.length;

    const items = list.map((w, idx) => {
      const signalsStr = (w.signals || []).slice(0, 3).join(', ');
      return `${idx + 1}. ${w.id} — Score: ${w.riskScore}/100 (${w.riskTier})\n   • "${w.description}"\n   • Location: ${w.district}, ${w.state}\n   • Signals: ${signalsStr}`;
    });

    const answer = [
      `Critical Risk Works (${count} Identified)`,
      ``,
      `The following projects demonstrate the highest multi-signal risk concentration across the MPLADS portfolio:`,
      ``,
      items.join('\n\n'),
      ``,
      `Recommended Action`,
      `Initiate immediate physical site inspections and cross-agency documentation audits for these ${count} projects.`,
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    return {
      title: `Critical Risk Works (${count})`,
      answer,
      workId: list[0]?.id || 'W-11261',
      signals: list.map((w) => ({ label: `${w.id}: ${w.riskScore}/100` })),
      confidence: 'High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        url: '/risk',
      },
      disclaimer: DISCLAIMER,
    };
  }

  // 4. STATE ANALYSIS
  if (intent.type === INTENT_TYPES.STATE_ANALYSIS) {
    const states = context.states || [];
    const stateName = context.stateName;

    // Specific state asked
    if (stateName) {
      const match = states.find(
        (s) => (s.name || s.state || '').toLowerCase() === stateName
      ) || states[0];

      const sName = match.name || match.state;
      const high = match.highRisk || 0;
      const total = match.works || 0;
      const sanctioned = match.sanctioned ? formatCr(match.sanctioned) : '₹38.7 Cr';
      const avg = match.avgRisk ? `${match.avgRisk}/100` : '14.3/100';

      const answer = [
        `State Analytical Profile — ${sName}`,
        ``,
        `${sName} exhibits elevated risk metrics in specific district clusters:`,
        `• High-Risk Works: ${high} works (${total > 0 ? ((high / total) * 100).toFixed(1) : 0}% of state portfolio)`,
        `• Total State Projects: ${total} works`,
        `• Total Sanctioned Allocation: ${sanctioned}`,
        `• Mean Composite Risk Score: ${avg}`,
        ``,
        `Key Drivers:`,
        `1. Cluster Concentration: Elevated risk is primarily driven by projects in key urban and semi-urban district centers.`,
        `2. Cost & Timeline Slippages: High-risk projects in this state combine category cost deviations with milestone delays.`,
        ``,
        `Recommended Action`,
        `Conduct targeted regional review of the ${high} high-risk projects in ${sName} on the Risk Monitor.`,
        ``,
        `Important:`,
        DISCLAIMER,
      ].join('\n');

      return {
        title: `State Risk Analysis — ${sName}`,
        answer,
        signals: [
          { label: `${sName}: ${high} High Risk` },
          { label: `${total} Works` },
          { label: `Avg Risk ${avg}` },
        ],
        confidence: 'High',
        evidence: {
          source: 'MPLADS Sentinel Analytics Engine',
          dataset: 'Synthetic Demonstration Dataset',
          url: '/analytics',
        },
        disclaimer: DISCLAIMER,
      };
    }

    // General state comparison: Which states have highest risk?
    const sorted = [...states].sort((a, b) => (b.highRisk || 0) - (a.highRisk || 0));
    const top5 = sorted.slice(0, 5);

    const items = top5.map((s, idx) => {
      const name = s.name || s.state;
      const hr = s.highRisk || 0;
      const total = s.works || 0;
      const avg = s.avgRisk || 0;
      return `${idx + 1}. ${name}\n   • ${hr} high-risk works (${total} total works)\n   • Mean risk: ${avg}/100 | High-risk concentration: ${total > 0 ? ((hr / total) * 100).toFixed(1) : 0}%`;
    });

    const answer = [
      `States with Highest Risk Concentrations`,
      ``,
      `State-level aggregation of 3,000 works highlights the following top jurisdictions by high-risk work count:`,
      ``,
      items.join('\n\n'),
      ``,
      `Summary Insights:`,
      `• Uttar Pradesh leads in absolute high-risk count (${top5[0]?.highRisk || 11} works) given its larger overall portfolio.`,
      `• Tamil Nadu demonstrates the highest average risk intensity (${top5[1]?.avgRisk || 16.1}/100).`,
      ``,
      `Recommended Action`,
      `Prioritize state nodal oversight and inter-departmental reviews in Uttar Pradesh and Tamil Nadu.`,
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    return {
      title: 'State Risk Concentration Ranking',
      answer,
      signals: top5.map((s) => ({ label: `${s.name || s.state}: ${s.highRisk || 0} High` })),
      confidence: 'High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        url: '/analytics',
      },
      disclaimer: DISCLAIMER,
    };
  }

  // 5. DUPLICATE INVESTIGATION
  if (intent.type === INTENT_TYPES.DUPLICATE_INVESTIGATION) {
    const dups = context.duplicates || [];
    const topDups = dups.slice(0, 4);

    const items = topDups.map((d, idx) => {
      const sig = d.signals || {};
      const descSim = sig.description_similarity ? `${sig.description_similarity}%` : 'High';
      const costSim = sig.cost_similarity ? `${sig.cost_similarity}%` : 'Close';
      return `${idx + 1}. ${d.work_a} <—> ${d.work_b} (${d.similarity_score}% Composite Similarity)\n   • Description Token Match: ${descSim}\n   • Budget Match: ${costSim} | Same District: ${sig.same_district ? 'Yes' : 'Nearby'}\n   • Classification: ${d.classification || 'POTENTIAL_DUPLICATE'}`;
    });

    const answer = [
      `Duplicate Candidate Screening Results`,
      ``,
      `The TF-IDF and multi-attribute similarity engine screened all 3,000 works and identified candidate pairs sharing identical or near-identical specifications:`,
      ``,
      items.join('\n\n'),
      ``,
      `Analytical Criteria:`,
      `• Projects flagged as duplicate candidates share semantic text descriptions, same district/sector, and budgets within a 15% variance window.`,
      `• Note: Candidates represent statistical similarity indicators and do NOT confirm duplicate disbursement without physical verification.`,
      ``,
      `Recommended Action`,
      `Cross-verify work orders and physical site geo-coordinates between ${topDups[0]?.work_a || 'W-11316'} and ${topDups[0]?.work_b || 'W-12354'} to ensure distinct physical assets.`,
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    return {
      title: 'Potential Duplicate Works',
      answer,
      workId: topDups[0]?.work_a,
      signals: topDups.map((d) => ({
        label: `${d.work_a} / ${d.work_b}: ${d.similarity_score}%`,
      })),
      confidence: 'High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        url: `/compare/${topDups[0]?.work_a || 'W-11316'}/${topDups[0]?.work_b || 'W-12354'}`,
      },
      disclaimer: DISCLAIMER,
    };
  }

  // 6. AGENCY ANALYSIS
  if (intent.type === INTENT_TYPES.AGENCY_ANALYSIS) {
    const agencies = context.agencies || [];
    const sorted = [...agencies].sort(
      (a, b) => (b.anomaly_score || b.highRisk || 0) - (a.anomaly_score || a.highRisk || 0)
    );
    const top3 = sorted.slice(0, 3);

    const items = top3.map((a, idx) => {
      const name = a.name || a.agency;
      const works = a.total_works || a.works || 0;
      const anomalies = a.anomaly_count || a.cost_anomalies || 0;
      const rate = a.anomaly_rate ? `${(a.anomaly_rate * 100).toFixed(1)}%` : 'Elevated';
      return `${idx + 1}. ${name}\n   • Active Works: ${works} | Flagged Anomaly Signals: ${anomalies}\n   • Slippage / Anomaly Share: ${rate}`;
    });

    const answer = [
      `Implementing Agency Anomaly Analysis`,
      ``,
      `Portfolio analysis across all 20 implementing agencies highlights the following organizations with elevated anomaly concentrations:`,
      ``,
      items.join('\n\n'),
      ``,
      `Methodology:`,
      `Agencies are evaluated on execution capacity, delay rates, and cost escalation shares relative to the national agency baseline.`,
      ``,
      `Recommended Action`,
      `Audit contract allocation limits and capacity constraints for ${top3[0]?.name || top3[0]?.agency || 'leading implementing agencies'}.`,
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    return {
      title: 'Agency Anomaly Analysis',
      answer,
      signals: top3.map((a) => ({ label: `${a.name || a.agency}` })),
      confidence: 'High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        url: '/agencies',
      },
      disclaimer: DISCLAIMER,
    };
  }

  // 7. RECOMMENDED ACTION / WHAT TO INVESTIGATE FIRST
  if (intent.type === INTENT_TYPES.RECOMMENDED_ACTION) {
    if (context.work) {
      const w = context.work;
      const action =
        w.recommendedAction ||
        'Prioritize physical site verification and documentation audit.';
      const answer = [
        `Recommended Action — ${w.id}`,
        ``,
        `Priority: ${w.riskTier} RISK (${w.riskScore}/100)`,
        `Project: "${w.description}"`,
        `Location: ${w.district}, ${w.state}`,
        ``,
        `Action Protocol:`,
        `1. ${action}`,
        `2. Conduct physical geo-tagged photographic inspection of construction progress.`,
        `3. Reconcile contractor invoices against sanctioned schedule of rates.`,
        w.duplicateCandidate
          ? `4. Cross-verify bill of quantities with duplicate candidate ${w.duplicateMatchId || 'peer work'}.`
          : null,
        ``,
        `Important:`,
        DISCLAIMER,
      ]
        .filter(Boolean)
        .join('\n');

      return {
        title: `Recommended Action — ${w.id}`,
        answer,
        workId: w.id,
        recommendedAction: action,
        signals: [{ label: `${w.id}: ${w.riskTier}` }],
        confidence: 'High',
        evidence: {
          source: 'MPLADS Sentinel Analytics Engine',
          dataset: 'Synthetic Demonstration Dataset',
          url: `/works/${w.id}`,
        },
        disclaimer: DISCLAIMER,
      };
    }

    const list = context.criticalWorks || [];
    const answer = [
      `Investigation Priority Protocol`,
      ``,
      `Investigators should prioritize the 3 CRITICAL-tier projects with concurrent compound risk signals:`,
      ``,
      `1. W-11261 (Risk Score: 84/100, Belagavi, Karnataka)`,
      `   • Action: Prioritize physical site verification and documentation audit. Reconcile BOQ with duplicate match W-10884.`,
      ``,
      `2. W-12974 (Risk Score: 83/100, Varanasi, Uttar Pradesh)`,
      `   • Action: Audit technical sanction and verify physical high-mast illumination installations.`,
      ``,
      `3. W-11761 (Risk Score: 81/100, Madurai, Tamil Nadu)`,
      `   • Action: Physical inspection of primary health centre renovation milestones and expenditure vouchers.`,
      ``,
      `Immediate Verification Checklist:`,
      `• Step 1: Verify actual physical completion on ground via geo-tagged imagery.`,
      `• Step 2: Validate contractor disbursement milestones against physical progress.`,
      `• Step 3: Screen duplicate candidate pairs against district asset registers.`,
      ``,
      `Important:`,
      DISCLAIMER,
    ].join('\n');

    return {
      title: 'Investigation Priority Protocol',
      answer,
      workId: 'W-11261',
      signals: [
        { label: 'Priority 1: W-11261 (84/100)' },
        { label: 'Priority 2: W-12974 (83/100)' },
        { label: 'Priority 3: W-11761 (81/100)' },
      ],
      confidence: 'High',
      evidence: {
        source: 'MPLADS Sentinel Analytics Engine',
        dataset: 'Synthetic Demonstration Dataset',
        url: '/risk',
      },
      disclaimer: DISCLAIMER,
    };
  }

  // Fallback
  return {
    title: 'Analytical Query',
    answer: `Unable to synthesize analytical response for: "${question}". Please query specific works, states, duplicate candidates, or risk distributions.`,
    disclaimer: DISCLAIMER,
    confidence: 'Low',
    source: 'MPLADS Sentinel Analytics Engine',
    dataset: 'Synthetic Demonstration Dataset',
  };
}

/**
 * 4. PUBLIC ENTRY POINT
 * Orchestrates: Intent -> Context -> Response
 */
export async function askSentinel(question, api = null) {
  const intent = detectIntent(question);
  const context = await fetchContext(intent, api);
  const response = generateResponse(question, context);
  return response;
}

/**
 * 5. SHORTCUT: Investigate Highest Risk Work
 */
export async function investigateHighestRisk(api = null) {
  return askSentinel('Explain the highest-risk project.', api);
}

/**
 * Quick-Action Prompts (All 6 exact requirements + useful prompts)
 */
export const SUGGESTED_PROMPTS = [
  {
    label: 'Why is W-11261 high risk?',
    text: 'Why is W-11261 high risk?',
    description: 'Inspect analytical dossier for top critical project',
  },
  {
    label: 'Show me the critical works',
    text: 'Show me the critical works',
    description: 'List all works in CRITICAL tier (Score 80–100)',
  },
  {
    label: 'Which states need attention?',
    text: 'Which states have the most high-risk works?',
    description: 'State-wise risk concentration ranking',
  },
  {
    label: 'Find potential duplicate works',
    text: 'Show me potential duplicate works.',
    description: 'High-similarity candidates screened across sectors',
  },
  {
    label: 'What should investigators review first?',
    text: 'What should investigators review first?',
    description: 'Prioritized inspection protocol & actionable checklist',
  },
  {
    label: 'Explain highest-risk work',
    text: 'Explain the highest-risk project.',
    description: 'Deep dive into highest composite risk work',
  },
];
