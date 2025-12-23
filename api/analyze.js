export default async function handler(req, res) {
  // 1. Enable CORS for the frontend (Standard security practice)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request (Browser checking if server is safe)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    
    // SANITIZATION: Clean the key to ensure no copy-paste whitespace
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

    if (!apiKey) {
      return res.status(500).json({ message: "Server Error: GEMINI_API_KEY is missing in Vercel." });
    }

    // MODERN STANDARD (2025): Using Gemini 1.5 Flash via v1beta
    // This is the fastest, most cost-effective model for real-time applications.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Minimal Payload: We remove all complex configs to ensure maximum compatibility.
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // ERROR HANDLING: If Google says no, we report EXACTLY what Google said.
    if (!response.ok) {
      console.error("Google API Error:", JSON.stringify(data, null, 2));
      
      const errorMsg = data.error?.message || "Unknown Google API Error";
      const errorStatus = data.error?.status || response.status;

      return res.status(response.status).json({ 
        message: `Google API Blocked Request: ${errorMsg}`,
        status: errorStatus,
        details: data // Sending full details for debugging
      });
    }

    // Success!
    return res.status(200).json(data);

  } catch (error) {
    console.error("SERVER INFRASTRUCTURE ERROR:", error.message);
    return res.status(500).json({ 
      message: "Internal Server Infrastructure Error: " + error.message 
    });
  }
}
