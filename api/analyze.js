export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { prompt, type } = req.body; // 'type' can be 'url' or 'message'
    if (!prompt) throw new Error("No input provided");

    const text = prompt.toLowerCase();
    let score = 0;
    let details = [];
    
    // Auto-detect if it looks like a URL even if user selected 'message'
    let isUrlLike = text.includes('http') || text.includes('www.') || (text.includes('.') && !text.includes(' '));

    // --- 1. GIBBERISH / ANOMALY DETECTION (The Fix) ---
    // If text is not a URL, check for keyboard mashing (e.g., "asdfghjkl", "dihdhjdwkjnd")
    if (!isUrlLike && text.length > 6) {
      const vowels = (text.match(/[aeiou]/g) || []).length;
      const ratio = vowels / text.length;
      
      // Heuristic: Very low vowel usage usually means random mashing
      if (ratio < 0.1) { 
        score += 35; 
        details.push("ANOMALY: High consonant density (Possible gibberish/random text)"); 
      }
      
      // Check for repeated characters (e.g., "lllll")
      if (/(.)\1{3,}/.test(text)) {
        score += 30;
        details.push("ANOMALY: Repetitive character pattern");
      }
    }

    // --- 2. KEYWORD SCANNING ---
    const suspicionKeywords = [
      'verify', 'suspended', 'urgent', 'account locked', 'password', 
      'credential', 'login', 'confirm identity', 'bank', 'wallet', 
      'unlock', 'expires', 'immediately', 'action required', 'prize',
      'winner', 'btc', 'bitcoin', 'investment'
    ];

    suspicionKeywords.forEach(word => {
      if (text.includes(word)) {
        score += 15;
        details.push(`KEYWORD_MATCH: "${word}"`);
      }
    });

    // --- 3. URL SPECIFIC CHECKS ---
    if (isUrlLike || type === 'url') {
      if (text.includes('http:') && !text.includes('https:')) {
        score += 25;
        details.push("PROTOCOL_UNSECURE (HTTP)");
      }
      
      const ipPattern = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
      if (ipPattern.test(text)) {
        score += 40;
        details.push("HOST_TYPE: RAW_IP (Highly Suspicious)");
      }

      const susTLDs = ['.xyz', '.top', '.gq', '.tk', '.ml', '.cf', '.cc', '.ru', '.cn'];
      susTLDs.forEach(tld => {
        if (text.includes(tld)) {
          score += 20;
          details.push(`SUSPICIOUS_TLD: ${tld}`);
        }
      });
      
      if (text.length > 70) {
        score += 10;
        details.push("ANOMALY: URL_LENGTH_EXCEEDED");
      }
    }

    // --- VERDICT CALCULATION ---
    let verdict = "SAFE";
    let summary = "Input parameters appear normal.";

    if (score > 100) score = 100;

    if (score >= 70) {
      verdict = "MALICIOUS";
      summary = "CRITICAL THREAT. High-risk indicators confirmed.";
    } else if (score >= 30) {
      verdict = "SUSPICIOUS";
      summary = "CAUTION ADVISED. Abnormal patterns detected.";
    }

    if (details.length === 0) details.push("No specific threat signatures found.");

    return res.status(200).json({
      verdict,
      risk_score: score,
      summary,
      details
    });

  } catch (error) {
    return res.status(500).json({
      verdict: "ERROR",
      risk_score: 0,
      summary: "Internal Engine Error",
      details: [error.message]
    });
  }
}
