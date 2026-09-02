function value(body, key) {
  return String((body && body[key]) || "").trim();
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  return req.body;
}

function textField(label, content) {
  return label + ": " + (content || "—");
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "method" });
  }

  const body = parseBody(req);
  const name = value(body, "name");
  const phone = value(body, "phone");
  const need = value(body, "need");
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name || !need || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return res.status(400).json({ ok: false, error: "required" });
  }

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_TO) {
    console.error("RESEND_API_KEY and MAIL_TO must be configured in Vercel");
    return res.status(503).json({ ok: false, error: "configuration" });
  }

  const fields = [
    textField("Имя", name),
    textField("Телефон", phone),
    textField("Email", value(body, "email")),
    textField("Адрес", value(body, "address")),
    textField("Категория", value(body, "category")),
    textField("Объём", value(body, "volume")),
    textField("Срок", value(body, "deadline")),
    textField("Доставка", body.delivery ? "да" : "нет"),
    textField("Потребность", need)
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "ВЕКСНАБ <onboarding@resend.dev>",
        to: [process.env.MAIL_TO],
        subject: "Заявка ВЕКСНАБ",
        text: fields
      })
    });

    if (!response.ok) {
      console.error("Resend returned", response.status, await response.text());
      return res.status(502).json({ ok: false, error: "provider" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Email request failed", error);
    return res.status(502).json({ ok: false, error: "provider" });
  }
};
