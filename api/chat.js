res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const prompt = body && body.prompt ? String(body.prompt) : "";

    if (!prompt) {
      res.status(400).json({ error: "Missing 'prompt' in body" });
      return;
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      res.status(500).json({ error: "HUGGINGFACE_API_KEY not configured" });
      return;
    }

    // Modelo gratuito de ejemplo: "tiiuae/falcon-7b-instruct"
    const apiRes = await fetch("https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.HUGGINGFACE_API_KEY
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      res.status(apiRes.status).json({
        error: "Upstream error",
        detail: data
      });
      return;
    }

    // Hugging Face devuelve un array con "generated_text"
    const reply = Array.isArray(data) && data[0] && data[0].generated_text
      ? data[0].generated_text
      : JSON.stringify(data);

    res.status(200).json({ reply: reply });
  } catch (err) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

