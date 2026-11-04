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

  if (!type) {
    return res.status(400).json({ error: "Draft 'type' is required." });
  }

  let prompt = "";
  if (type === "newsletter") {
    prompt = `You are an expert community manager for GDG On Campus (Google Developer Groups On Campus).
Create a comprehensive, engaging Community Newsletter Draft based on these details:
"${details || "General announcements, tech trends, and upcoming workshop highlights"}"

The newsletter must include:
1. An exciting subject line or header.
2. A warm welcome note.
3. Upcoming GDG event alerts (use "${eventName || "our upcoming workshops"}" if provided).
4. Interactive tech trivia/facts.
5. Next steps and call-to-actions.

Format the output clearly with high-quality markdown, spacing, and professional, exciting developer community tone. Make it highly readable.`;
  } else if (type === "sponsor") {
    prompt = `You are an experienced organizer for GDG On Campus (Google Developer Groups On Campus) drafting a sponsor invitation.
Event Name: "${eventName || "Annual DevFest/Hackathon"}"
Sponsor Details / Value Proposition: "${details || "A vibrant tech talent audience of eager university students, sponsor tier highlights, and logo placements"}"

Write a highly professional Sponsor Invitation letter.
Include:
1. Subject line format: "Sponsorship Invitation: ${eventName || "GDG Campus Event"} - Empowering Next-Gen Developers"
2. Why partner with GDG (describe demographic and direct recruitment values).
3. The details of the event and expectations.
4. Call-to-action for scheduling a sponsorship sync.

Format custom placeholders with brackets (e.g. [Sponsor Contact Title], [Due Date]). Deliver a highly polished and effective request.`;
  } else if (type === "speaker") {
    prompt = `You are a Community Developer Lead for GDG On Campus writing an invitation to a prospective expert speaker.
Event Name: "${eventName || "Special Tech Talk Session"}"
Topic & Background details: "${details || "Deep dive into web developer tools, career advice, and Q&A"}"

Write an elegant, personal, yet professional Speaker Invitation.
Include:
1. Subject line format: "Speaker Invitation: ${eventName || "GDG Campus"} - Sharing Expertise with Our Developers"
2. Warm greeting.
3. What makes our GDG community unique and why we selected them specifically.
4. Logical schedule information and event outline placeholders.
5. Next steps to confirm and select convenient slots.

Format as beautiful markdown. Keep tone respectful, welcoming, and inspiring.`;
  } else {
    // Event page details
    prompt = `You are an event architect for GDG On Campus.
Draft a highly compelling, searchable, and professional Event Announcement page copy for:
Event Name: "${eventName || "DevFest University Event"}"
Core topics and context: "${details || "Hands-on workshops, keynotes from Google Developers, and team networking"}"

Include:
1. Title and bold Hook statement.
2. Event schedule placeholders.
3. Clear highlights of key customer value/takeaways (What attendees will learn).
4. Prerequisites or items attendees should bring.

Make it clean, readable, and ready to list on the community portal.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    const generatedText = response.text || "";
    // Simple logic to guess a title from first line or generate standard one
    const lines = generatedText.split("\n").filter(l => l.trim().length > 0);
    let title = `${type.toUpperCase()} Draft for ${eventName || "GDG Event"}`;
    if (lines.length > 0 && (lines[0].startsWith("#") || lines[0].toLowerCase().includes("subject"))) {
      title = lines[0].replace(/^[#\s]+|subject:\s*/gi, "").trim();
    }

    res.json({
      title,
      content: generatedText,
      success: true
    });
  } catch (err: any) {
    console.error("Gemini Generation Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate draft content from Gemini." });
  }
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
