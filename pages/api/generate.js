// pages/api/generate.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  const { message = "", mode = "default" } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Message required" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const TENOR_API_KEY = process.env.TENOR_API_KEY;
  const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

  if (!OPENAI_API_KEY) return res.status(500).json({ error: "OpenAI key not configured" });

  // 1) Ask OpenAI to return a tiny structured reply (caption + gif search query)
  const systemPrompt = `
You are MemeMate — a fun, chaotic friend that replies ONLY in a short meme caption and a single short GIF search keyword.
Respond in this exact JSON format (no extra text):
{
  "caption": "<one short witty caption, 1-2 lines>",
  "query": "<1-4 word GIF search query to find a matching meme>",
  "tone": "<short tone e.g. 'sassy' or 'wholesome'>"
}
  `.trim();

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",       // small/fast model; change if you have/need another
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User: ${message}` },
        ],
        max_tokens: 120,
        temperature: 0.9,
      }),
    });

    const openaiJson = await openaiRes.json();
    const text = openaiJson?.choices?.[0]?.message?.content ?? openaiJson?.choices?.[0]?.text ?? "";
    // Try parse JSON
    let reply = { caption: "", query: message, tone: "chaotic" };
    try {
      reply = JSON.parse(text);
    } catch (err) {
      // fallback: parse lines
      const lines = text.split("\n").filter(Boolean);
      reply.caption = lines[0] ?? `*${message}*`;
      reply.query = lines[1] ?? lines[0] ?? message;
      reply.tone = lines[2] ?? "chaotic";
    }

    // 2) Use Tenor (preferred) to fetch a GIF URL
    const q = encodeURIComponent(reply.query || message);
    let gifUrl = null;

    if (TENOR_API_KEY) {
      const tenorResp = await fetch(`https://tenor.googleapis.com/v2/search?q=${q}&key=${TENOR_API_KEY}&limit=1`);
      const tenorJson = await tenorResp.json();
      if (tenorJson?.results?.[0]) {
        // Tenor v2: media_formats
        gifUrl = tenorJson.results[0].media_formats?.gif?.url || tenorJson.results[0].media_formats?.mp4?.uri;
      }
    }

    // 3) Fallback to GIPHY if Tenor fails and GIPHY key exists
    if (!gifUrl && GIPHY_API_KEY) {
      const giphyResp = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${q}&limit=1`);
      const giphyJson = await giphyResp.json();
      if (giphyJson?.data?.[0]) {
        gifUrl = giphyJson.data[0].images?.original?.url;
      }
    }

    return res.status(200).json({ caption: reply.caption, query: reply.query, tone: reply.tone, gifUrl });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

