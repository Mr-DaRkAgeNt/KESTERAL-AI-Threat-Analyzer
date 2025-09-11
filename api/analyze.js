export default async function handler(req, res) {
  // We only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // This is the crucial step: Get the secret API key from Vercel's secure environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // This error will show in Vercel logs if you forget to add the key
        return res.status(500).json({ message: 'API key not configured on the server' });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    // Call the Google API securely from the server
    const googleResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!googleResponse.ok) {
      console.error('Google API Error:', await googleResponse.text());
      throw new Error(`Google API failed with status: ${googleResponse.status}`);
    }

    const data = await googleResponse.json();

    // Send the safe result back to the frontend
    res.status(200).json(data);

  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}
