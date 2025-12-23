export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { prompt, type } = req.body;
    if (!prompt) throw new Error("No input provided");

    // 2. Load API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Server configuration error: GEMINI_API_KEY is missing");
    }

    // 3. Construct the Analyst Persona
    const systemPrompt = `
      You are Kestrel AI, an elite cybersecurity threat analysis engine.
      Analyze the following input for security threats, phishing, malware, or social engineering.
      
      INPUT TYPE: ${type || 'general'}
      INPUT DATA: "${prompt}"

      Analysis Criteria:
      1. GIBBERISH/MASHING: Check for random strings (e.g. "sdhsajhksab") -> Mark SUSPICIOUS.
      2. MALICIOUS URLS: Check for IP hostnames, suspicious TLDs, typosquatting.
      3. CONTENT: Check for Pornography, Gambling, Crypto Scams, or Phishing Keywords.
      4. TONE: Check for urgency ("act now", "suspended").

      Return a strictly valid JSON object with these keys:
      {
        "verdict": "SAFE" | "SUSPICIOUS" | "MALICIOUS",
        "risk_score": (number 0-100),
        "summary": "Brief, technical explanation of the finding.",
        "details": ["List", "of", "3-5", "specific", "technical", "flags"]
      }
    `;

    // 4. Call Google Gemini API
    // UPDATED: Using 'gemini-1.5-flash-latest' and handling potential model aliases
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(`Gemini API Error: ${errData.error?.message || response.statusText}`);
    }

    // 5. Parse AI Response
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error("Empty response from Neural Engine");

    // Safe JSON parsing
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      // Fallback: strip markdown if present
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleaned);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Analysis failed:", error);
    return res.status(500).json({
      verdict: "ERROR",
      risk_score: 0,
      summary: "Neural Engine Connection Failure",
      details: [error.message]
    });
  }
}
