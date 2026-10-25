/* Netlify Function：Lexi 的 DeepSeek 代理（/.netlify/functions/lexi）
   职责只有转发：把前端的 chat/completions 请求原样转给 DeepSeek，把响应原样带回。
   Key 的两种用法（二选一，代理优先用环境变量）：
   1. 推荐：Netlify 后台配环境变量 DEEPSEEK_API_KEY，前端不用存 Key；
   2. 兼容：环境变量未配时，转发前端自带的 Authorization 头（Key 仍在本机）。 */
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: { message: "Method Not Allowed" } }) };

  const envKey = process.env.DEEPSEEK_API_KEY;
  const headerKey = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  const key = envKey || headerKey;

  if (!key)
    return { statusCode: 401, headers: CORS,
      body: JSON.stringify({ error: { message: "代理未配置 DEEPSEEK_API_KEY 环境变量，且请求未携带 Key" } }) };

  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: event.body,
    });
    const text = await r.text();
    /* DeepSeek 的状态码原样透传（401/402/429…），前端已有友好映射 */
    return { statusCode: r.status, headers: CORS, body: text };
  } catch (e) {
    return { statusCode: 502, headers: CORS,
      body: JSON.stringify({ error: { message: "代理请求失败: " + (e && e.message || e) } }) };
  }
};
