import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Verify server-side Gemini API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[Warning] GEMINI_API_KEY is not defined in the environment.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

// Server-side health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Server-side LLM route to generate drafts safely
app.post("/api/generate-draft", async (req, res) => {
  const { type, eventName, details } = req.body;

  const allowedTypes = [
    "speaker",
    "sponsor",
    "newsletter"
  ];

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      error: "Invalid AI draft type."
    });
  }

  if (!details?.trim()) {
    return res.status(400).json({
      error: "Please provide some context before generating a draft."
    });
  }

  const gdgVoice = `
You are writing on behalf of a student-led Google Developer Group
On Campus chapter.

Your writing should sound like a real university student organizer:
clear, confident, friendly, direct, and thoughtful.

The goal is to sound professional without sounding corporate.

WRITING STYLE:
- Use natural, conversational professional English.
- Prefer short and medium-length sentences.
- Get to the point quickly.
- Sound like a real organizer, not a marketing department.
- Be warm without being overly enthusiastic.
- Be confident without exaggerating.
- Use specific information provided by the organizer.
- Keep paragraphs short.
- Make the message easy to skim.

DO NOT:
- Invent facts.
- Invent a relationship with the recipient.
- Claim that you have followed someone's work unless the organizer explicitly says so.
- Invent attendance numbers.
- Invent sponsorship benefits.
- Invent dates, locations, companies, projects, achievements, or credentials.
- Use generic corporate language.
- Overuse adjectives.
- Use fake enthusiasm.
- Use unnecessary emojis.
- Use phrases such as:
  "bridge the gap between theory and practice"
  "empowering the next generation"
  "unlock your potential"
  "highly engaged community"
  "mutually beneficial partnership"
  "state-of-the-art"
  "resounding success"
  "we are thrilled"
  "we would be honored"
  "we would be delighted"
  "passionate learners, builders, and innovators"
  "make a meaningful impact"
  unless the organizer explicitly asks for that wording.

If important information is missing, use a simple placeholder such as
[Date], [Link], [Name], or [Company] rather than making something up.

Do not explain your writing choices.
Return only the finished draft.
`;

  let prompt = "";

  if (type === "speaker") {
    prompt = `
${gdgVoice}

Create a speaker outreach email.

EVENT:
${eventName || "[Event Name]"}

ORGANIZER-PROVIDED CONTEXT:
${details}

The email should:

1. Have a concise, natural subject line.
2. Introduce the organizer and GDG chapter briefly.
3. Explain why the organizer is reaching out.
4. Explain the event and what the speaker would be invited to do.
5. Include the relevant event details supplied by the organizer.
6. Explain why the speaker could be a good fit only using information supplied by the organizer.
7. Give a clear, low-pressure next step.
8. End with a simple professional sign-off.

Do not write a long description of GDG.
Do not create a fake personal connection with the speaker.

Target length:
250–400 words.

Format:
Subject:
[subject]

[email body]
`;
  }

  if (type === "sponsor") {
    prompt = `
${gdgVoice}

Create a sponsorship outreach email.

EVENT:
${eventName || "[Event Name]"}

ORGANIZER-PROVIDED CONTEXT:
${details}

The email should:

1. Have a concise subject line.
2. Introduce the organizer and chapter in 1–2 sentences.
3. Explain the event clearly.
4. State what the organization is looking for from the sponsor.
5. Explain why this company is being approached, but only using information provided by the organizer.
6. Clearly describe the relevant sponsor opportunities supplied by the organizer.
7. Give a simple next step for discussing the opportunity.
8. Keep the email focused on the actual sponsorship request.

Do not make unsupported claims about:
- recruitment access
- audience size
- talent quality
- brand reach
- ROI
- social media exposure
- event attendance

unless the organizer explicitly provides those details.

Avoid turning the email into a sponsorship brochure.

Target length:
300–450 words.

Format:
Subject:
[subject]

[email body]
`;
  }

  if (type === "newsletter") {
    prompt = `
${gdgVoice}

Create a GDG On Campus newsletter using the information provided.

NEWSLETTER CONTEXT:
${details}

The newsletter should feel like something a student developer community
would actually send to its members.

Prioritize:
- upcoming events
- important announcements
- useful resources
- deadlines
- opportunities
- clear calls to action

Use headings only when they improve readability.

Do not pad the newsletter with generic motivational language.

Do not invent:
- events
- dates
- speakers
- resources
- statistics
- announcements
- links

Use placeholders when necessary.

Target length:
300–500 words.

Format the newsletter so it can be copied into an email platform with
minimal editing.
`;
  }

  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      const generatedText = response.text || "";

      if (!generatedText.trim()) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      const lines = generatedText
        .split("\n")
        .filter(line => line.trim());

      let title = `${type} draft`;

      if (lines.length > 0) {
        const firstLine = lines[0]
          .replace(/^#+\s*/, "")
          .replace(/^subject:\s*/i, "")
          .trim();

        if (firstLine) {
          title = firstLine;
        }
      }

      return res.json({
        success: true,
        title,
        content: generatedText
      });

    } catch (err: any) {
      lastError = err;

      const status =
        err?.status ??
        err?.error?.code;

      console.error(
        `Gemini generation attempt ${attempt}/${maxAttempts} failed:`,
        err
      );

      if (
        (status === 503 ||
          status === 429 ||
          status === 500) &&
        attempt < maxAttempts
      ) {
        const delay = attempt * 2000;

        await new Promise(resolve =>
          setTimeout(resolve, delay)
        );

        continue;
      }

      break;
    }
  }

  const status =
    lastError?.status ??
    lastError?.error?.code;

  if (status === 503) {
    return res.status(503).json({
      error:
        "Gemini is temporarily unavailable. Please try again in a moment."
    });
  }

  if (status === 429) {
    return res.status(429).json({
      error:
        "Gemini rate limit reached. Please wait a moment and try again."
    });
  }

  return res.status(500).json({
    error:
      lastError?.message ||
      "Unable to generate the draft."
  });
});

// New secure endpoint for the intelligent sponsor pitch builder and budget calculator
app.post("/api/generate-sponsor-pitch", async (req, res) => {
  const { eventName, budgetDetails, sponsorObjective, sponsorshipTier, chapterName, benefits } = req.body;

  if (!eventName) {
    return res.status(400).json({ error: "An Event Name is required to formulate a localized pitch." });
  }

  const prompt = `You are a professional Community Organizer of GDG On Campus (Google Developer Groups On Campus), managing college partnerships and corporate event sponsorships.
Draft a highly persuasive, professional, and customized corporate Sponsor Pitch Letter.

Context:
- Chapter Title: "${chapterName || "GDG On Campus College Chapter"}"
- Event Name: "${eventName}"
- Required Capital / Budget Context: "${budgetDetails || "General student refreshment catering and community swag prints"}"
- Target Partner/Sponsor: "${sponsorObjective || "Local technology company or tech division"}"
- Sponsorship Tier / Investment: "${sponsorshipTier || "General Supporter tier"}"
- Incentives & Key Benefits: "${benefits || "Logo brand placement, attendee résumé book collection, and brief intro speaking slot"}"

Outline format for the proposal:
1. Subject line format: "Sponsorship Proposal: Partner with GDG On Campus for ${eventName}"
2. Executive Summary: Pitch the university developer ecosystem and direct benefits of sponsoring GDG On Campus.
3. Event Overview: Explain the focal technical subject, estimated university student turnout, and educational outcomes.
4. Sponsorship Placement details: Map out their direct support tier (${sponsorshipTier}) and connect it to their direct ROI benefits (${benefits}), detailing why this is a prime opportunity for recruitment or technical brand awareness.
5. Simple next steps / Next-stage call-to-action.

Make the response polished, professional, and readable. Use markdown formatting with clear bold headings, bullets, and standard placement brackets (e.g. [Contact Name], [Target Date]) where appropriate. Keep the tone sophisticated, inviting, and confident.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({
      success: true,
      content: response.text || "Failed to establish response from Gemini."
    });
  } catch (err: any) {
    console.error("Sponsor Pitch Creator Error:", err);
    res.status(500).json({ error: err.message || "Failed to create pitch content via Gemini." });
  }
});

// AI Announcement generator for Discord
app.post("/api/generate-discord-announcement", async (req, res) => {
  const { eventName, date, description, style } = req.body;

  if (!eventName) {
    return res.status(400).json({ error: "An Event Name is required to formulate the Discord announcement." });
  }

  const prompt = `You are a Community Organizer for GDG On Campus (Google Developer Groups On Campus), managing a busy student developer Discord server.
Draft a highly persuasive, visually engaging, and readable Discord announcement post for our upcoming event: "${eventName}".

Context details:
- Event Date & Timing: "${date || "TBD (Check community page)"}"
- Event Focus / Key Highlights: "${description || "Hands-on tech learning and workshop series"}"
- Chosen Writing Style: "${style || "emoji"}" (Format styles: 'emoji' = highly interactive with fun tech emoji list bullets, 'formal' = professional university alert, 'casual' = peer-to-peer student focus)

Guidelines:
1. Leverage Discord's native markdown elements:
   - Use bold (**text**) for important items.
   - Use structural subtitles or headers (e.g. ### 🚀 Event Highlights) to divide sections.
   - Use lists and bullet symbols elegantly to prevent text-walls.
   - Include a code-block highlighting key details (e.g.
     \`\`\`text
     Date: ${date || "TBD"}
     Platform: GDG Community Platform
     \`\`\`
     ) so that it stands out beautifully on mobile and desktop views.
2. Formulate 2-3 visual reaction suggestions to drive community interaction (e.g. "React with :fire: if you are ready!").
3. Include standard role tag placeholder at the top (e.g., "@everyone", "@here") based on the topic importance.
4. Conclude with an RSVP call-to-action link placeholder (e.g. [RSVP here to secure badging!]).

Write a complete, ready-to-use template. Keep it punchy, enthusiastic, and strictly under 1500 characters so it fits comfortably within Discord's payload limits.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({
      success: true,
      content: response.text || "Failed to compose Discord template using Gemini."
    });
  } catch (err: any) {
    console.error("Gemini Discord Composer Error:", err);
    res.status(500).json({ error: err.message || "Could not spin Discord announcement via Gemini API." });
  }
});

// Test connection to user's Discord Webhook
app.post("/api/test-discord-webhook", async (req, res) => {
  const { webhookUrl } = req.body;

  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return res.status(400).json({ error: "Invalid Webhook URL. Webhook URLs must begin with 'https://discord.com/api/webhooks/'" });
  }

  try {
    const testPayload = {
      username: "GDG On Campus AI Hub",
      avatar_url: "https://lh3.googleusercontent.com/COxitSgY75OIOMj6_g67vW0N3SBo_t8-AAdp_zscA2l3kXF8Gg0n8A=w120",
      embeds: [
        {
          title: "✅ Discord Webhook API Connected Successfully!",
          description: "Your GDG On Campus Chapter Hub is now connected to this Discord channel. You can broadcast event announcements, AI marketing drafts, and chapter updates directly from the hub.",
          color: 5814783, // Discord Blurple color
          fields: [
            { name: "Status", value: "Active & Ready", inline: true },
            { name: "Integration", value: "Discord Webhook API v10", inline: true },
            { name: "Connected At", value: new Date().toLocaleTimeString(), inline: true }
          ],
          footer: { text: "GDG On Campus Organizer Hub • Discord API Integration" }
        }
      ]
    };

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload)
    });

    if (discordResponse.ok) {
      res.json({ 
        success: true, 
        message: "Test ping sent! Check your Discord channel to confirm receipt." 
      });
    } else {
      const errText = await discordResponse.text();
      res.status(discordResponse.status).json({ 
        error: `Discord API returned status ${discordResponse.status}: ${errText || discordResponse.statusText}` 
      });
    }
  } catch (err: any) {
    console.error("Discord webhook test error:", err);
    res.status(500).json({ error: err.message || "Network error testing Discord API connection." });
  }
});

// Real-time backend proxy to send messages or rich embeds to user's Discord Webhook
app.post("/api/dispatch-discord", async (req, res) => {
  const { webhookUrl, message, useEmbed, eventData } = req.body;

  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return res.status(400).json({ error: "A valid Discord server Webhook URL is required." });
  }

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Announcement content cannot be empty." });
  }

  try {
    let payload: any = {
      username: "GDG On Campus AI Broadcaster",
      avatar_url: "https://lh3.googleusercontent.com/COxitSgY75OIOMj6_g67vW0N3SBo_t8-AAdp_zscA2l3kXF8Gg0n8A=w120"
    };

    if (useEmbed && eventData) {
      payload.content = "@everyone 🚀 **New GDG Event Alert!**";
      payload.embeds = [
        {
          title: `📢 ${eventData.name || "GDG Chapter Event"}`,
          description: message.substring(0, 2048),
          color: 4360181, // Google Blue / Emerald Green hybrid
          fields: [
            { name: "📅 Date", value: eventData.date || "TBA", inline: true },
            { name: "📍 Target RSVPs", value: `${eventData.targetRegistration || 100} Attendees`, inline: true },
            { name: "🏷️ Category", value: eventData.status || "Upcoming Event", inline: true }
          ],
          footer: { text: "GDG On Campus Student Developer Chapter • Bevy & Discord Hub" },
          timestamp: new Date().toISOString()
        }
      ];
    } else {
      payload.content = message.substring(0, 2000);
    }

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (discordResponse.ok) {
      res.json({ success: true, message: "Announcement cleanly deployed to your Discord channel!" });
    } else {
      const errorText = await discordResponse.text();
      res.status(discordResponse.status).json({ 
        error: `Discord API returned an error: ${errorText || discordResponse.statusText}` 
      });
    }
  } catch (err: any) {
    console.error("Discord Proxy Dispatch Error:", err);
    res.status(500).json({ error: err.message || "Network exception while transmitting to Discord server." });
  }
});

// Configure Vite middleware in development or serve built files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve fallback index.html for React router support
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] GDG Hub backend listening on http://localhost:${PORT}`);
  });
}

startServer();
