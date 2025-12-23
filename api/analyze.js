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

    // List of models to try in order. If one fails, we try the next.
    // This makes the backend "Self-Healing" against 404 errors.
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-pro' // Fallback to 1.0 Pro if all else fails
    ];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Attempting to use model: ${model}`);
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        });

        const data = await response.json();

        if (response.ok) {
          // Success! Return immediately.
          return res.status(200).json(data);
        } else {
          console.warn(`Model ${model} failed with ${response.status}:`, JSON.stringify(data));
          lastError = data;
          // Loop continues to the next model...
        }
      } catch (err) {
        console.error(`Network error with ${model}:`, err);
        lastError = { message: err.message };
      }
    }

    // If we exit the loop, all models failed.
    console.error("All models failed.");
    return res.status(500).json({
      message: "All AI models failed to respond. Please check your API Key permissions in Google AI Studio.",
      error: lastError
    });

  } catch (error) {
    console.error("CRITICAL SERVER ERROR:", error.message);
    return res.status(500).json({ 
      message: "Internal Server Error: " + error.message 
    });
  }
}
