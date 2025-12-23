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
    
    // SANITIZATION: Trim whitespace from the key to prevent copy-paste errors
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

    if (!apiKey) {
      console.error("ERROR: GEMINI_API_KEY environment variable is missing.");
      return res.status(500).json({ message: "Server Configuration Error: API Key missing." });
    }

    // STRATEGIES: Try different endpoints/models in sequence
    // This covers regional availability and API version differences
    const strategies = [
      { name: "v1beta Flash", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
      { name: "v1 Stable Flash", url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
      { name: "v1beta Pro (Legacy)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}` }
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
            // No generationConfig to avoid payload errors
          })
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`Success with ${strategy.name}`);
          return res.status(200).json(data);
        } else {
          console.warn(`Strategy ${strategy.name} failed:`, data);
          lastErrorDetails = data; // Store the error to show user if all fail
        }
      } catch (err) {
        console.error(`Network error with ${strategy.name}:`, err);
        lastErrorDetails = { message: err.message };
      }
    }

    // If we get here, ALL strategies failed.
    console.error("All strategies failed.");
    
    // Return the RAW error from Google so we can debug the API Key issue
    return res.status(500).json({ 
      message: "Google API Authentication Failed. Please check your API Key.",
      debug: lastErrorDetails 
    });

  } catch (error) {
    console.error("CRITICAL SERVER ERROR:", error.message);
    return res.status(500).json({ 
      message: "Internal Server Error: " + error.message 
    });
  }
}
