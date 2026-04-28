const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const AIKey = require("../models/AIKey.model");
const { getAIIntegrationConfig } = require("./platformSettings.utils");

// ----------------------------------------------------------------
// AI SERVICE — Smart key rotation with fallback
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// HELPER — Available keys fetch karo (priority order mein)
// ----------------------------------------------------------------
const getAvailableKeys = async (provider) => {
  const keys = await AIKey.find({
    provider,
    isActive: true,
  })
    .sort({ priority: 1 }) // Low number = high priority
    .select("+apiKey");

  // Available keys filter karo
  return keys.filter((key) => key.isAvailable());
};

// ----------------------------------------------------------------
// HELPER — Gemini se response lo
// ----------------------------------------------------------------
const callGemini = async (apiKey, model, systemPrompt, messages, userMessage) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: model || "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  });

  // History — pehla message user ka hona chahiye
  const history = messages
    .filter((msg) => msg.role === "user" || msg.role === "bot")
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

  while (history.length > 0 && history[0].role === "model") {
    history.shift();
  }

  const chat = geminiModel.startChat({ history: history.slice(-10) });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
};

// ----------------------------------------------------------------
// HELPER — Groq se response lo
// ----------------------------------------------------------------
const callGroq = async (apiKey, model, systemPrompt, messages, userMessage) => {
  const groq = new Groq({ apiKey });

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await groq.chat.completions.create({
    model: model || "llama-3.1-8b-instant",
    messages: chatMessages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "";
};

// ----------------------------------------------------------------
// HELPER — Custom/Other provider call
// ----------------------------------------------------------------
const callCustom = async (apiKey, model, systemPrompt, messages, userMessage, baseUrl) => {
  const axios = require("axios");
  const response = await axios.post(
    baseUrl || "https://api.openai.com/v1/chat/completions",
    {
      model: model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10).map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        })),
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
  return response.data.choices[0]?.message?.content || "";
};

// ----------------------------------------------------------------
// MAIN FUNCTION — Smart AI response with rotation
// ----------------------------------------------------------------
const getLanguageInstruction = (replyLanguage) => {
  if (replyLanguage === "hi") return "Respond strictly in Hindi (Devanagari script).";
  if (replyLanguage === "hinglish")
    return "Respond in Hinglish using natural Roman Hindi mixed with English. Do not switch to Devanagari script unless user uses Devanagari.";
  if (replyLanguage === "en") return "Respond strictly in English.";
  return "Respond in the same language style as the latest user message.";
};

const getFormatInstruction = () =>
  [
    "RESPONSE STYLE:",
    "1. Be conversational and natural — respond like a helpful person, not a robot or search engine.",
    "2. For simple questions, give a direct answer in 2-4 sentences.",
    "3. For list-style questions (features, steps, products, options), use a brief intro line followed by a numbered or bulleted list.",
    "4. Keep each list item concise — title first, then a short explanation.",
    "5. If a relevant link exists, weave it naturally into your answer — never dump a link alone without context.",
    "6. Don't start responses with filler like 'Great question!' or 'Sure!' — get to the point naturally.",
    "7. IMPORTANT: Only mention information that exists in your knowledge base. Do not add details from your own training data or general knowledge.",
  ].join("\n");

const getAIResponse = async (bot, conversationMessages, userMessage, options = {}) => {
  const { replyLanguage = "auto", quickLink = null } = options;

  const basePrompt =
    bot.systemPrompt ||
    `You are ${bot.name}, a helpful assistant for ${bot.websiteName || "this website"}.`;

  let quickLinkHint = "";
  if (quickLink?.url) {
    quickLinkHint = `\n\nRELEVANT LINK: A relevant link is available for this query: ${quickLink.url} (type: ${quickLink.intent}). Naturally include this link in your response along with relevant explanation from your knowledge base. Do not return just the link alone.`;
  }

  const systemPrompt = `${basePrompt}${quickLinkHint}\n\nLANGUAGE RULE: ${getLanguageInstruction(replyLanguage)}\n\n${getFormatInstruction()}`;

  // ----------------------------------------------------------------
  // Step 1: Saare active providers ke keys fetch karo
  // ----------------------------------------------------------------
  const [geminiKeys, groqKeys, openaiKeys, anthropicKeys, customKeys] = await Promise.all([
    getAvailableKeys("gemini"),
    getAvailableKeys("groq"),
    getAvailableKeys("openai"),
    getAvailableKeys("anthropic"),
    getAvailableKeys("custom"),
  ]);

  // Priority order: gemini → groq → openai → anthropic → custom
  // Sirf available keys include karo
  const allKeys = [
    ...geminiKeys,
    ...groqKeys,
    ...openaiKeys,
    ...anthropicKeys,
    ...customKeys,
  ];

  // ----------------------------------------------------------------
  // Step 2: Ek ek key try karo
  // ----------------------------------------------------------------
  for (const keyDoc of allKeys) {
    try {
      let response = "";

      if (keyDoc.provider === "gemini") {
        response = await callGemini(
          keyDoc.apiKey,
          keyDoc.model,
          systemPrompt,
          conversationMessages,
          userMessage
        );
      } else if (keyDoc.provider === "groq") {
        response = await callGroq(
          keyDoc.apiKey,
          keyDoc.model,
          systemPrompt,
          conversationMessages,
          userMessage
        );
      } else if (["openai", "anthropic", "custom"].includes(keyDoc.provider)) {
        response = await callCustom(
          keyDoc.apiKey,
          keyDoc.model,
          systemPrompt,
          conversationMessages,
          userMessage
        );
      }

      // Success!
      await keyDoc.markSuccess();

      return {
        response,
        model: keyDoc.model,
        provider: keyDoc.provider,
        keyName: keyDoc.name,
      };
    } catch (error) {
      const errMsg = error.message || "";

      // Rate limit detect karo
      if (
        errMsg.includes("429") ||
        errMsg.includes("Too Many Requests") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("RATE_LIMIT")
      ) {
        // Retry after parse karo
        const retryMatch = errMsg.match(/retry.*?(\d+)/i);
        const retrySeconds = retryMatch ? parseInt(retryMatch[1]) : 60;

        console.warn(
          `⚠️ Rate limited: ${keyDoc.name} (${keyDoc.provider}) — retry in ${retrySeconds}s`
        );
        await keyDoc.markRateLimited(retrySeconds);
      } else {
        // Other error
        console.warn(
          `⚠️ Key failed: ${keyDoc.name} (${keyDoc.provider}) — ${errMsg.substring(0, 100)}`
        );
        await keyDoc.markFailed(errMsg);
      }

      // Next key try karo
      continue;
    }
  }

  // ----------------------------------------------------------------
  // Step 3: Sab keys fail — .env fallback try karo
  // ----------------------------------------------------------------
  console.warn("⚠️ All AI keys failed — trying .env fallback...");

  const integrationAI = await getAIIntegrationConfig();

  // Gemini Integrations fallback
  if (integrationAI.gemini.enabled && integrationAI.gemini.apiKey) {
    try {
      const response = await callGemini(
        integrationAI.gemini.apiKey,
        process.env.GEMINI_MODEL || "gemini-2.5-flash",
        systemPrompt,
        conversationMessages,
        userMessage
      );

      return {
        response,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        provider: "gemini",
        keyName: "integrations.gemini",
      };
    } catch (err) {
      console.warn("Gemini integrations fallback failed:", err.message);
    }
  }

  // Groq Integrations fallback
  if (integrationAI.groq.enabled && integrationAI.groq.apiKey) {
    try {
      const response = await callGroq(
        integrationAI.groq.apiKey,
        process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        systemPrompt,
        conversationMessages,
        userMessage
      );

      return {
        response,
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        provider: "groq",
        keyName: "integrations.groq",
      };
    } catch (err) {
      console.warn("Groq integrations fallback failed:", err.message);
    }
  }

  // Gemini .env fallback
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        systemInstruction: systemPrompt,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      });

      const history = conversationMessages
        .filter((m) => m.role === "user" || m.role === "bot")
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        }));

      while (history.length > 0 && history[0].role === "model") history.shift();

      const chat = model.startChat({ history: history.slice(-10) });
      const result = await chat.sendMessage(userMessage);
      const response = result.response.text();

      return {
        response,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        provider: "gemini",
        keyName: ".env fallback",
      };
    } catch (err) {
      console.warn("Gemini .env fallback failed:", err.message);
    }
  }

  // Groq .env fallback
  if (process.env.GROQ_API_KEY) {
    try {
      const Groq = require("groq-sdk");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...conversationMessages.slice(-10).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        { role: "user", content: userMessage },
      ];

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "";

      return {
        response,
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        provider: "groq",
        keyName: ".env fallback",
      };
    } catch (err) {
      console.warn("Groq .env fallback failed:", err.message);
    }
  }

  // ----------------------------------------------------------------
  // Step 4: Sab fail — default message
  // ----------------------------------------------------------------
  return {
    response:
      bot.behavior?.fallbackMessage ||
      "I'm sorry, I'm having trouble responding right now. Please try again later.",
    model: "fallback",
    provider: "fallback",
    keyName: "fallback",
  };
};

module.exports = { getAIResponse };
