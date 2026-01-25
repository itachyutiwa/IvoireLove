// SafetyEngine: détection simple anti-arnaque (MVP)
// Objectif: attribuer un score + flags sans casser l'existant.

function normalize(input = '') {
  return (input || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

/**
 * Analyse un message texte et retourne un score de risque + flags.
 * @param {string} content
 * @returns {{ riskScore: number, riskFlags: string[], action: 'allow'|'flag'|'block' }}
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

