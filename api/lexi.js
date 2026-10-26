/* Vercel Function：Lexi 的 DeepSeek 代理（/api/lexi）
   职责只有转发：把前端的 chat/completions 请求原样转给 DeepSeek，把响应原样带回。
   Key 的两种用法（二选一，代理优先用环境变量）：
   1. 推荐：Vercel 后台配环境变量 DEEPSEEK_API_KEY，前端不用存 Key；
   2. 兼容：环境变量未配时，转发前端自带的 Authorization 头（Key 仍在本机）。
   与 Netlify 版差异：入参从 (event) 改为 (req, res)，body 已自动解析为对象。 */
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: { message: "Method Not Allowed" } });

  const envKey = process.env.DEEPSEEK_API_KEY;
  const headerKey = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const key = envKey || headerKey;

  if (!key)
    return res.status(401).json({ error: { message: "代理未配置 DEEPSEEK_API_KEY 环境变量，且请求未携带 Key" } });

  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      // Vercel 会把 JSON body 解析成对象，转发前需还原成字符串
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });
    const text = await r.text();
    /* DeepSeek 的状态码原样透传（401/402/429…），前端已有友好映射 */
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: { message: "代理请求失败: " + (e && e.message || e) } });
  }
};
