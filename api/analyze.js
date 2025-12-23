export default async function handler(req, res) {
  // 1. Enable CORS for the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    
    // SANITIZATION: Trim whitespace from the key
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

    if (!apiKey) {
      console.error("ERROR: GEMINI_API_KEY environment variable is missing.");
      return res.status(500).json({ message: "Configuration Error: GEMINI_API_KEY is missing in Vercel." });
    }

    // STRATEGIES: Try different endpoints/models in sequence
    const strategies = [
      { name: "v1beta Flash", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
      { name: "v1 Stable Flash", url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
      { name: "v1beta Pro", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}` }
    ];

    let lastErrorDetails = null;

    for (const strategy of strategies) {
      try {
        console.log(`Attempting strategy: ${strategy.name}`);
        
        const response = await fetch(strategy.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`Success with ${strategy.name}`);
          return res.status(200).json(data);
        } else {
          console.warn(`Strategy ${strategy.name} failed:`, data);
          // Capture the specific error from Google
          lastErrorDetails = data;
        }
      } catch (err) {
        console.error(`Network error with ${strategy.name}:`, err);
        lastErrorDetails = { error: { message: err.message } };
      }
    }

    // If we get here, ALL strategies failed.
    console.error("All strategies failed. Last error:", JSON.stringify(lastErrorDetails));
    
    // EXTRACT THE REAL ERROR MESSAGE
    // Google errors usually look like { error: { code: 400, message: "..." } }
    const googleMessage = lastErrorDetails?.error?.message || "Unknown Google API Error";
    const googleCode = lastErrorDetails?.error?.code || lastErrorDetails?.error?.status || "500";

    return res.status(500).json({ 
      // Pass the REAL Google error to the frontend so the user can see it
      message: `Google Error (${googleCode}): ${googleMessage}`,
      debug: lastErrorDetails 
    });

  } catch (error) {
    console.error("CRITICAL SERVER ERROR:", error.message);
    return res.status(500).json({ 
      message: "Internal Server Error: " + error.message 
    });
  }
}
