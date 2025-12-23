export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: 'API key not configured on the server' });
    }

    // UPDATED: Changed model name to 'gemini-1.5-flash' for stability
    // The previous '05-20' version is likely deprecated/removed.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: 'application/json',
        temperature: 0.7 
      },
    };

    const googleResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google API Error:', errorText);
      // If the error is a 404, it means the model name is definitely wrong or outdated
      throw new Error(`Google API failed with status: ${googleResponse.status}`);
    }

    const data = await googleResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).json({ message: 'An internal server error occurred. Check Vercel logs for details.' });
  }
}

