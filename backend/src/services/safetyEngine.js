// SafetyEngine: détection simple anti-arnaque (MVP)
/**
 * Convert a value to a lowercase, diacritic-free normalized string.
 *
 * @param {*} input - Value to normalize; will be stringified. Defaults to an empty string when falsy.
 * @returns {string} The normalized string with Unicode canonical decomposition applied and diacritic marks removed.
 */

function normalize(input = '') {
  return (input || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Remove duplicate and falsy values from an array while preserving the order of first occurrences.
 * @param {Array} arr - Array of values to process; may contain mixed types.
 * @returns {Array} A new array with duplicates removed and all falsy values (false, 0, '', null, undefined, NaN) filtered out. 
 */
function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

/**
 * Analyze a text message and produce a risk assessment with flags and a recommended action.
 * @param {string} content - Raw message text to analyze.
 * @returns {{ riskScore: number, riskFlags: string[], action: 'allow'|'flag'|'block' }} Object containing the computed riskScore (0–100), deduplicated riskFlags, and action: 'block' if score >= 85, 'flag' if score >= 40, 'allow' otherwise.
 */
export function analyzeMessageContent(content) {
  const text = normalize(content);
  const flags = [];
  let score = 0;

  if (!text.trim()) {
    return { riskScore: 0, riskFlags: [], action: 'allow' };
  }

  // Liens
  const hasUrl = /\bhttps?:\/\/\S+|\bwww\.\S+/i.test(content);
  if (hasUrl) {
    flags.push('suspicious_link');
    score += 25;
  }

  // Numéros / WhatsApp (trop d'insistance)
  const hasPhone = /(\+?\d[\d\s().-]{6,}\d)/.test(content);
  const mentionsWhatsApp = /\bwhats\s*app\b|\bwhatsapp\b|\bwa\b/.test(text);
  if (hasPhone && mentionsWhatsApp) {
    flags.push('whatsapp_or_phone');
    score += 35;
  } else if (hasPhone) {
    flags.push('phone_number');
    score += 15;
  } else if (mentionsWhatsApp) {
    flags.push('whatsapp_mention');
    score += 15;
  }

  // Argent / paiements
  const moneyWords = [
    'argent',
    'paye',
    'payer',
    'paiement',
    'virement',
    'transfert',
    'urgent',
    'aide',
    'aider',
    'cfa',
    'fcfa',
    'franc',
    'dollar',
    'usd',
    'western union',
    'ria',
    'moneygram',
    'orange money',
    'mtn money',
    'wave',
    'paypal',
    'cashapp',
    'crypto',
    'bitcoin',
    'usdt',
  ];
  const moneyHit = moneyWords.some((w) => text.includes(w));
  if (moneyHit) {
    flags.push('money_request');
    score += 35;
  }

  // Alerte forte: money + lien/whatsapp => blocage probable
  const hardCombo = moneyHit && (hasUrl || (mentionsWhatsApp && hasPhone));
  if (hardCombo) {
    flags.push('high_risk_combo');
    score += 35;
  }

  // Cap du score
  score = Math.max(0, Math.min(100, score));

  const riskFlags = uniq(flags);
  const action = score >= 85 ? 'block' : score >= 40 ? 'flag' : 'allow';
  return { riskScore: score, riskFlags, action };
}
