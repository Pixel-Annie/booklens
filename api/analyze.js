module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment variables' });

  const prompt = `You are BookLens, an AI market intelligence tool for self-published authors on Amazon KDP.

The user has provided this book URL: ${url}

Your task:
1. Identify the book (title, author, genre/category) from the URL and your knowledge
2. Analyze the market, readers, and competitive landscape for this book's niche
3. Provide actionable intelligence based on real patterns in this category

Respond ONLY with a valid JSON object (no markdown, no explanation) in exactly this structure:

{
  "title": "Book title",
  "author": "Author name",
  "category": "Main category",
  "opportunityScore": 73,
  "tags": ["Knowledge Books", "Amazon Kindle", "Non-fiction"],
  "readerProfile": {
    "headline": "One-line description of the target reader",
    "primaryMotivation": "Why they buy this type of book",
    "demographics": "Age range and background",
    "readingContext": "When/where they read",
    "keyInsight": "One sharp insight about this reader that most authors miss"
  },
  "positiveSignals": [
    "What readers consistently praise about books in this niche",
    "Another strength signal",
    "A third signal"
  ],
  "negativeSignals": [
    "Most common complaint about books in this niche",
    "Another gap or frustration",
    "A third weakness in current offerings"
  ],
  "marketOpportunity": {
    "headline": "The single biggest untapped opportunity in this niche",
    "gaps": [
      "Specific gap 1 with detail",
      "Specific gap 2 with detail",
      "Specific gap 3 with detail"
    ],
    "yourEdge": "Specific advice for a new author entering this niche today"
  },
  "revenue": {
    "monthlyLow": 180,
    "monthlyHigh": 680,
    "annualEstimate": "2,160 – 8,160",
    "bsr_estimate": "Top 5,000–15,000 in category",
    "priceRecommendation": "$4.99 – $6.99",
    "kuStrategy": "Whether KU enrollment makes sense and why",
    "confidenceNote": "Brief honest caveat about these estimates"
  },
  "nextBookIdea": "One concrete book concept this author should write next, based on market gaps"
}

Make insights specific and actionable, not generic. Be honest about revenue estimates.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini error:', err);
      return res.status(500).json({ error: `Gemini error ${response.status}`, detail: err });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown fences if present
    const clean = rawText.replace(/```json|```/g, '').trim();
    const report = JSON.parse(clean);

    return res.status(200).json(report);

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
}
