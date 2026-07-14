import { RequestHandler } from "express";
import { z } from "zod";

const requestSchema = z.object({
  mode: z.enum(["subject", "inbox"]),
  subject: z.string().trim().max(200),
  preheader: z.string().trim().max(300),
  message: z.string().trim().max(12000),
});

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  context: z.object({ subject: z.string().max(200), preheader: z.string().max(300), message: z.string().max(12000) }),
});

export const generateCampaignCopy: RequestHandler = async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid campaign content" });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "DeepSeek is not configured in this workspace." });

  const { mode, subject, preheader, message } = parsed.data;
  const request = mode === "subject"
    ? "Suggest three concise newsletter subject lines and one preheader. Return JSON with subject and preheader strings only."
    : "Improve this newsletter for inbox clarity. Return JSON with subject, preheader, and message strings only. Keep the original meaning and use a warm, concise tone.";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are a careful email editor. Never add claims, links, or personal data. Return valid JSON only." },
        { role: "user", content: `${request}\n\nCurrent subject: ${subject}\nCurrent preheader: ${preheader}\nCurrent message:\n${message}` },
      ],
    }),
  });
  if (!response.ok) return res.status(502).json({ error: "DeepSeek could not complete the suggestion." });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.replace(/^```json\s*|\s*```$/g, "").trim();
  if (!content) return res.status(502).json({ error: "DeepSeek returned an empty suggestion." });
  try {
    const result = JSON.parse(content) as { subject?: string; preheader?: string; message?: string };
    return res.json({
      subject: typeof result.subject === "string" ? result.subject.slice(0, 200) : subject,
      preheader: typeof result.preheader === "string" ? result.preheader.slice(0, 300) : preheader,
      message: typeof result.message === "string" ? result.message.slice(0, 12000) : message,
    });
  } catch {
    return res.status(502).json({ error: "DeepSeek returned an invalid suggestion." });
  }
};

export const chatWithDeepSeek: RequestHandler = async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid chat message" });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "DeepSeek is not configured in this workspace." });
  const { message, context } = parsed.data;
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", temperature: 0.7, messages: [
      { role: "system", content: "You are a concise newsletter editor. Help the operator improve subject lines, inbox previews, tone, and clarity. Never send emails, add claims, or invent personal data." },
      { role: "user", content: `Campaign context:\nSubject: ${context.subject}\nPreheader: ${context.preheader}\nMessage: ${context.message}\n\nOperator question: ${message}` },
    ] }),
  });
  if (!response.ok) return res.status(502).json({ error: "DeepSeek could not answer the chat." });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) return res.status(502).json({ error: "DeepSeek returned an empty answer." });
  return res.json({ answer });
};
