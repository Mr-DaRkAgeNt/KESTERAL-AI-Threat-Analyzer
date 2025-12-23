// Import the official Google library
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "Server Error: API Key is missing in Vercel." });
    }

    // Initialize the Google SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the model.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const data = {
      candidates: [
        {
          content: {
            parts: [
              { text: text }
            ]
          }
        }
      ]
    };

    return res.status(200).json(data);

  } catch (error) {
    console.error("SDK Error:", error);
    return res.status(500).json({ 
      message: `Google SDK Error: ${error.message || 'Unknown Error'}`,
      details: error
    });
  }
}
