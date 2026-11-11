const key = process.env.DESTINYAI_API_KEY;

async function checkHeaders() {
  console.log("=== 1. HEADERS DE GET /v1/models ===");
  const r1 = await fetch("https://api.destinyai.com.br/v1/models", {
    headers: { Authorization: "Bearer " + key },
  });
  console.log("Status:", r1.status);
  for (const [k, v] of r1.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\n=== 2. HEADERS DE POST /v1/chat/completions ===");
  const r2 = await fetch("https://api.destinyai.com.br/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Ping" }],
      max_tokens: 5,
    }),
  });
  console.log("Status:", r2.status);
  for (const [k, v] of r2.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  const text2 = await r2.text();
  console.log("Body snippet:", text2.slice(0, 300));
}

checkHeaders().catch(console.error);
