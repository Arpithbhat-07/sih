/**
 * Canonical State Mapping & Normalization Utility
 * Normalizes variations in state names, state codes, and abbreviations
 * into standard ISO 3166-2:IN codes and canonical display names.
 */

// Master registry of all 36 Indian States and Union Territories
export const CANONICAL_STATES = [
  { code: 'IN-AP', name: 'Andhra Pradesh', short: 'AP', aliases: ['andhra pradesh', 'ap'] },
  { code: 'IN-AR', name: 'Arunachal Pradesh', short: 'AR', aliases: ['arunachal pradesh', 'ar'] },
  { code: 'IN-AS', name: 'Assam', short: 'AS', aliases: ['assam', 'as'] },
  { code: 'IN-BR', name: 'Bihar', short: 'BR', aliases: ['bihar', 'br'] },
  { code: 'IN-CT', name: 'Chhattisgarh', short: 'CG', aliases: ['chhattisgarh', 'chattisgarh', 'cg', 'ct'] },
  { code: 'IN-GA', name: 'Goa', short: 'GA', aliases: ['goa', 'ga'] },
  { code: 'IN-GJ', name: 'Gujarat', short: 'GJ', aliases: ['gujarat', 'gj'] },
  { code: 'IN-HR', name: 'Haryana', short: 'HR', aliases: ['haryana', 'hr'] },
  { code: 'IN-HP', name: 'Himachal Pradesh', short: 'HP', aliases: ['himachal pradesh', 'hp'] },
  { code: 'IN-JH', name: 'Jharkhand', short: 'JH', aliases: ['jharkhand', 'jh'] },
  { code: 'IN-KA', name: 'Karnataka', short: 'KA', aliases: ['karnataka', 'ka'] },
  { code: 'IN-KL', name: 'Kerala', short: 'KL', aliases: ['kerala', 'kl'] },
  { code: 'IN-MP', name: 'Madhya Pradesh', short: 'MP', aliases: ['madhya pradesh', 'mp'] },
  { code: 'IN-MH', name: 'Maharashtra', short: 'MH', aliases: ['maharashtra', 'mh'] },
  { code: 'IN-MN', name: 'Manipur', short: 'MN', aliases: ['manipur', 'mn'] },
  { code: 'IN-ML', name: 'Meghalaya', short: 'ML', aliases: ['meghalaya', 'ml'] },
  { code: 'IN-MZ', name: 'Mizoram', short: 'MZ', aliases: ['mizoram', 'mz'] },
  { code: 'IN-NL', name: 'Nagaland', short: 'NL', aliases: ['nagaland', 'nl'] },
  { code: 'IN-OR', name: 'Odisha', short: 'OD', aliases: ['odisha', 'orissa', 'od', 'or'] },
  { code: 'IN-PB', name: 'Punjab', short: 'PB', aliases: ['punjab', 'pb'] },
  { code: 'IN-RJ', name: 'Rajasthan', short: 'RJ', aliases: ['rajasthan', 'rj'] },
  { code: 'IN-SK', name: 'Sikkim', short: 'SK', aliases: ['sikkim', 'sk'] },
  { code: 'IN-TN', name: 'Tamil Nadu', short: 'TN', aliases: ['tamil nadu', 'tamilnadu', 'tn'] },
  { code: 'IN-TG', name: 'Telangana', short: 'TS', aliases: ['telangana', 'telengana', 'ts', 'tg'] },
  { code: 'IN-TR', name: 'Tripura', short: 'TR', aliases: ['tripura', 'tr'] },
  { code: 'IN-UP', name: 'Uttar Pradesh', short: 'UP', aliases: ['uttar pradesh', 'uttarpradesh', 'up'] },
  { code: 'IN-UT', name: 'Uttarakhand', short: 'UK', aliases: ['uttarakhand', 'uttaranchal', 'uk', 'ut'] },
  { code: 'IN-WB', name: 'West Bengal', short: 'WB', aliases: ['west bengal', 'westbengal', 'wb'] },
  // Union Territories
  { code: 'IN-AN', name: 'Andaman and Nicobar Islands', short: 'AN', aliases: ['andaman and nicobar islands', 'andaman and nicobar', 'an'] },
  { code: 'IN-CH', name: 'Chandigarh', short: 'CH', aliases: ['chandigarh', 'ch'] },
  { code: 'IN-DN', name: 'Dadra and Nagar Haveli', short: 'DN', aliases: ['dadra and nagar haveli', 'dnh', 'dn'] },
  { code: 'IN-DD', name: 'Daman and Diu', short: 'DD', aliases: ['daman and diu', 'dd'] },
  { code: 'IN-DL', name: 'Delhi', short: 'DL', aliases: ['delhi', 'nct of delhi', 'dl'] },
  { code: 'IN-JK', name: 'Jammu and Kashmir', short: 'JK', aliases: ['jammu and kashmir', 'jammu & kashmir', 'jk'] },
  { code: 'IN-LA', name: 'Ladakh', short: 'LA', aliases: ['ladakh', 'la'] },
  { code: 'IN-LD', name: 'Lakshadweep', short: 'LD', aliases: ['lakshadweep', 'ld'] },
  { code: 'IN-PY', name: 'Puducherry', short: 'PY', aliases: ['puducherry', 'pondicherry', 'py'] },
];

const aliasToState = new Map();
CANONICAL_STATES.forEach((item) => {
  aliasToState.set(item.code.toUpperCase(), item);
  aliasToState.set(item.name.toLowerCase().trim(), item);
  aliasToState.set(item.short.toLowerCase().trim(), item);
  item.aliases.forEach((a) => aliasToState.set(a.toLowerCase().trim(), item));
});

/**
 * Normalizes any state string (name, ISO code, or abbreviation)
 * to its canonical state descriptor.
 */
export function normalizeState(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();
  const upper = input.trim().toUpperCase();

  if (aliasToState.has(upper)) return aliasToState.get(upper);
  if (aliasToState.has(clean)) return aliasToState.get(clean);

  // Partial match fallback
  for (const item of CANONICAL_STATES) {
    if (clean.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(clean)) {
      return item;
    }
  }
  return null;
}

/**
 * Builds a fast, normalized multi-key lookup table from an array of state aggregate objects.
 * Indexes by canonical ISO code (`IN-UP`), short code (`UP`), and lowercased name.
 */
export function buildStateLookup(statesArray = []) {
  const byCode = {};
  const byName = {};

  statesArray.forEach((item) => {
    if (!item) return;
    const rawCode = item.code || item.stateCode || '';
    const rawName = item.name || item.state || '';
    const norm = normalizeState(rawCode) || normalizeState(rawName);

    const enriched = {
      ...item,
      code: norm ? norm.code : rawCode,
      name: norm ? norm.name : rawName,
      state: norm ? norm.name : rawName,
      short: norm ? norm.short : (rawCode.replace('IN-', '') || ''),
    };

    if (enriched.code) {
      byCode[enriched.code] = enriched;
      byCode[enriched.code.toUpperCase()] = enriched;
    }
    if (enriched.name) {
      byName[enriched.name.toLowerCase().trim()] = enriched;
    }
    if (norm?.short) {
      byCode[norm.short] = enriched;
    }
  });

  return {
    get: (key) => {
      if (!key) return null;
      const upper = String(key).trim().toUpperCase();
      const lower = String(key).trim().toLowerCase();
      if (byCode[upper]) return byCode[upper];
      if (byName[lower]) return byName[lower];
      const norm = normalizeState(key);
      if (norm && byCode[norm.code]) return byCode[norm.code];
      return null;
    },
    byCode,
    byName,
  };
}
