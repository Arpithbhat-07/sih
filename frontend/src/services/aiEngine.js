/**
 * Sentinel AI Engine Entry Point
 *
 * Facade delegating to the grounded intelligence layer in sentinelAI.js.
 * Preserves backwards compatibility while providing the pluggable analytical architecture.
 */

export {
  askSentinel,
  investigateHighestRisk,
  detectIntent,
  fetchContext,
  generateResponse,
  SUGGESTED_PROMPTS,
  DISCLAIMER,
  INTENT_TYPES,
} from './sentinelAI';
