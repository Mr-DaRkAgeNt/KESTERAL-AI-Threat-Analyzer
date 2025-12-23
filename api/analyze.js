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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("ERROR: GEMINI_API_KEY environment variable is missing.");
      return res.status(500).json({ message: "Server Configuration Error: API Key missing." });
    }

    // PRIMARY STRATEGY: Gemini 1.5 Flash (Fastest, Newest)
    // We use v1beta as it is the most permissive endpoint right now.
    const urlFlash = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // BACKUP STRATEGY: Gemini Pro (Older, Extremely Stable)
    const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    // Helper function to try a fetch
    async function tryModel(url, modelName) {
      console.log(`Attempting connection to ${modelName}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
          // REMOVED generationConfig to prevent 'Invalid JSON Payload' errors
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Error ${response.status}`);
      }
      return data;
    }

    let finalData = null;

    try {
      // Try Flash first
      finalData = await tryModel(urlFlash, 'Gemini 1.5 Flash');
    } catch (flashError) {
      console.warn("Flash failed, switching to backup...", flashError.message);
      try {
        // If Flash fails, Try Pro
        finalData = await tryModel(urlPro, 'Gemini Pro (Backup)');
      } catch (proError) {
        // If both fail, it's definitely an API Key/Account issue
        console.error("All models failed.");
        return res.status(500).json({ 
          message: "Google API Error: Check your API Key permissions.",
          detail: proError.message
        });
      }
    }

    // Success
    return res.status(200).json(finalData);

  } catch (error) {
    console.error("CRITICAL SERVER ERROR:", error.message);
    return res.status(500).json({ 
      message: "Internal Server Error: " + error.message 
    });
  }
}
