const handler = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var body = req.body || {};
  var url = body.url;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  var prompt = 'You are BookLens, an AI market intelligence tool for KDP authors. The user provided this book URL: ' + url + '. Analyze the market for this book niche. Respond ONLY with valid JSON (no markdown) in this exact structure: {"title":"Book title","author":"Author name","category":"Main category","opportunityScore":73,"tags":["tag1","tag2","tag3"],"readerProfile":{"headline":"One-line reader description","primaryMotivation":"Why they buy","demographics":"Age and background","readingContext":"When/where they read","keyInsight":"Key insight about this reader"},"positiveSignals":["Signal 1","Signal 2","Signal 3"],"negativeSignals":["Gap 1","Gap 2","Gap 3"],"marketOpportunity":{"headline":"Biggest opportunity","gaps":["Gap detail 1","Gap detail 2","Gap detail 3"],"yourEdge":"Advice for new author"},"revenue":{"monthlyLow":180,"monthlyHigh":680,"annualEstimate":"2160-8160","bsr_estimate":"Top 5000-15000","priceRecommendation":"$4.99-$6.99","kuStrategy":"KU advice","confidenceNote":"Caveat"},"nextBookIdea":"Concrete next book idea"}';

  try {
    var response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
        })
      }
    );

    if (!response.ok) {
      var errText = await response.text();
      return res.status(500).json({ error: 'Gemini error ' + response.status, detail: errText });
    }

    var data = await response.json();
    var rawText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      rawText = data.candidates[0].content.parts[0].text || '';
    }

    var clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    var report = JSON.parse(clean);
    return res.status(200).json(report);

  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
};

module.exports = handler;
