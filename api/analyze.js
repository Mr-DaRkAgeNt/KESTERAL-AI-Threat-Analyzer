export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { prompt } = req.body;
    if (!prompt) throw new Error("No input provided");

    const text = prompt.toLowerCase();
    let score = 0;
    let details = [];
    let isUrl = text.includes('http') || text.includes('www.') || text.includes('.com') || text.includes('.net');

    // --- HEURISTIC LOGIC ENGINE ---

    // 1. Keyword Scanning (Phishing & Urgency)
    const suspicionKeywords = [
      'verify', 'suspended', 'urgent', 'account locked', 'password', 
      'credential', 'login', 'confirm identity', 'bank', 'wallet', 
      'unlock', 'expires', 'immediately', 'action required'
    ];

    suspicionKeywords.forEach(word => {
      if (text.includes(word)) {
        score += 10;
        details.push(`Detected urgency/phishing keyword: "${word}"`);
      }
    });

    // 2. URL Structural Analysis
    if (isUrl) {
      // Check for insecure HTTP
      if (text.includes('http:') && !text.includes('https:')) {
        score += 25;
        details.push("Insecure protocol (HTTP) detected");
      }

      // Check for IP Address hostname (e.g., http://192.168.1.1)
      const ipPattern = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
      if (ipPattern.test(text)) {
        score += 40;
        details.push("Raw IP address used as hostname (Highly Suspicious)");
      }

      // Check for "@" symbol (often used to obscure actual domain)
      if (text.includes('@')) {
        score += 30;
        details.push("Found '@' symbol in URL (Obfuscation tactic)");
      }

      // Check for suspicious TLDs
      const susTLDs = ['.xyz', '.top', '.gq', '.tk', '.ml', '.cf', '.cc'];
      susTLDs.forEach(tld => {
        if (text.includes(tld)) {
          score += 15;
          details.push(`Suspicious Top-Level Domain detected: ${tld}`);
        }
      });

      // Length check (super long URLs are often malicious)
      if (text.length > 70) {
        score += 10;
        details.push("URL length exceeds typical parameters");
      }
    } else {
      // Text Analysis
      if (text.length < 20) {
        details.push("Input too short for definitive analysis");
      }
      if (text.includes('click link') || text.includes('open attachment')) {
        score += 20;
        details.push("Request to open external asset detected");
      }
    }

    // --- VERDICT CALCULATION ---
    let verdict = "SAFE";
    let summary = "No significant threats detected in the provided input.";

    // Cap score at 100
    if (score > 100) score = 100;

    if (score >= 70) {
      verdict = "MALICIOUS";
      summary = "High-risk indicators found. Access is strongly discouraged.";
    } else if (score >= 30) {
      verdict = "SUSPICIOUS";
      summary = "Several caution flags detected. Proceed with care.";
    }

    // Fallback if no specific details found but score is low
    if (details.length === 0) {
      details.push("Standard heuristic scan passed.");
    }

    // Return Result
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
      summary: "Internal Analysis Error",
      details: [error.message]
    });
  }
}
