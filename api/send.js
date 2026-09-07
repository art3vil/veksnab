const nodemailer = require("nodemailer");

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

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.MAIL_TO) {
    console.error("SMTP_USER, SMTP_PASS and MAIL_TO must be configured in Vercel");
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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mail.ru",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.MAIL_TO,
      replyTo: value(body, "email") || undefined,
      subject: "Заявка ВЕКСНАБ",
      text: fields
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Mail.ru SMTP request failed", error);
    return res.status(502).json({ ok: false, error: "provider" });
  }
};
