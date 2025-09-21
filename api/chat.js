// Vercel Serverless Function: /api/chat
// Maneja CORS, valida token y llama a OpenAI. Devuelve { reply: "..." }.

const allowCors = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-App-Token");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return handler(req, res);
};

module.exports = allowCors(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Vercel parsea JSON automáticamente si el header Content-Type es application/json
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const prompt = body && body.prompt ? String(body.prompt) : "";

    if (!prompt) {
      res.status(400).json({ error: "Missing 'prompt' in body" });
      return;
    }

    const appToken = req.headers["x-app-token"];
    if (!process.env.APP_TOKEN) {
      // Si no configuras APP_TOKEN en Vercel, no bloqueamos (solo para pruebas)
    } else if (appToken !== process.env.APP_TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY not configured" });
      return;
    }

    // Llamada a OpenAI
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      res.status(apiRes.status).json({
        error: "Upstream error",
        detail: data
      });
      return;
    }

    const reply =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "";

    if (!reply) {
      res.status(502).json({ error: "Empty reply from model", raw: data });
      return;
    }

    res.status(200).json({ reply: reply });
  } catch (err) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});
