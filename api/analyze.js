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

    /**
     * UPDATED LOGIC:
     * We are using 'v1beta' with 'gemini-1.5-flash-latest'.
     * This alias is more robust for different regions and API key types.
     */
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
        // No generationConfig here to avoid 'Unknown name' payload errors
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Error Response:", JSON.stringify(data));
      return res.status(response.status).json({
        message: data.error?.message || "The AI model is not responding. Please check your API key and region.",
        error: data.error
      });
    }

    // Success: return the data to the frontend
    return res.status(200).json(data);

  } catch (error) {
    console.error("CRITICAL SERVER ERROR:", error.message);
    return res.status(500).json({ 
      message: "Internal Server Error: " + error.message 
    });
  }
}

