import React, { useState, useEffect } from "react";
import { 
  Calendar, ShieldAlert, Key, CheckCircle, RefreshCw, LogIn, LogOut, 
  HelpCircle, Link2, FileJson, Mail, Send, Radio, MessageSquareCode, 
  Sparkles, Check, Copy, AlertCircle, ExternalLink, Bot
} from "lucide-react";
import { User } from "firebase/auth";
import { EventItem } from "../mockData";

interface IntegrationsViewProps {
  user: User | null;
  gcalToken: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  isLoggingIn: boolean;
  events?: EventItem[];
}

export default function IntegrationsView({
  user,
  gcalToken,
  onLogin,
  onLogout,
  isLoggingIn,
  events = []
}: IntegrationsViewProps) {
  // Bevy connection helper states
  const [selectedBevyEventId, setSelectedBevyEventId] = useState<string>("");
  const [bevyFormat, setBevyFormat] = useState<"json" | "markdown">("json");
  const [bevyOutput, setBevyOutput] = useState<string>("");
  const [bevyLoading, setBevyLoading] = useState(false);
  const [bevyCopied, setBevyCopied] = useState(false);

  // Discord broadcast states
  const [discordWebhook, setDiscordWebhook] = useState<string>(() => {
    return localStorage.getItem("discord_webhook_url") || "";
  });
  const [selectedDiscordEventId, setSelectedDiscordEventId] = useState<string>("");
  const [discordStyle, setDiscordStyle] = useState<"emoji" | "formal" | "casual">("emoji");
  const [discordDraft, setDiscordDraft] = useState<string>("");
  const [useDiscordEmbed, setUseDiscordEmbed] = useState<boolean>(true);
  const [showDiscordGuide, setShowDiscordGuide] = useState<boolean>(false);
  const [isGeneratingDiscord, setIsGeneratingDiscord] = useState(false);
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-persist webhook across sessions for user convenience
  useEffect(() => {
    localStorage.setItem("discord_webhook_url", discordWebhook);
  }, [discordWebhook]);

  // Handle Event selection default choices on mount or event update
  useEffect(() => {
    if (events.length > 0) {
      if (!selectedBevyEventId) setSelectedBevyEventId(events[0].id);
      if (!selectedDiscordEventId) setSelectedDiscordEventId(events[0].id);
    }
  }, [events]);

  const activeBevyEvent = events.find(e => e.id === selectedBevyEventId) || events[0];
  const activeDiscordEvent = events.find(e => e.id === selectedDiscordEventId) || events[0];

  // Test Discord Webhook connection directly
  const handleTestDiscordWebhook = async () => {
    if (!discordWebhook) {
      setStatusMessage({ type: "error", text: "Please enter a Discord Webhook URL to test." });
      return;
    }
    if (!discordWebhook.startsWith("https://discord.com/api/webhooks/")) {
      setStatusMessage({ type: "error", text: "Invalid URL. Discord webhooks must start with 'https://discord.com/api/webhooks/'" });
      return;
    }

    setIsTestingDiscord(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/test-discord-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: discordWebhook })
      });

      const data = await response.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: data.message || "Test ping sent successfully! Check your Discord channel." });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to test webhook." });
      }
    } catch (err: any) {
      console.error("Test Discord Webhook Error:", err);
      setStatusMessage({ type: "error", text: "Error connecting to Discord API endpoint." });
    } finally {
      setIsTestingDiscord(false);
    }
  };

  // Helper inside Bevy Generator to outline platform compatibility
  const handleGenerateBevyDraft = () => {
    if (!activeBevyEvent) {
      setStatusMessage({ type: "error", text: "No event selected to create Bevy schema draft." });
      return;
    }

    setBevyLoading(true);
    setTimeout(() => {
      if (bevyFormat === "json") {
        // High quality Bevy compatible Event submission payload
        const payload = {
          title: activeBevyEvent.name,
          description: activeBevyEvent.description,
          event_type: "Virtual Event",
          chapter: "GDG On Campus University Chapter",
          start_date: activeBevyEvent.date,
          rsvp_limit: activeBevyEvent.targetRegistration,
          event_platform: "Bevy Virtual Platform",
          tags: ["GDG On Campus", "Google Developer Groups", "Tech Education"],
          publish_status: "DRAFT"
        };
        setBevyOutput(JSON.stringify(payload, null, 2));
      } else {
        // Custom newsletter draft specifically formulated to paste into Bevy's HTML/Markdown newsletter wizard
        const newsletterDraft = `Subject: Join us for ${activeBevyEvent.name}! 🚀
        
Hello Chapter Member,

We are thrilled to alert you of our upcoming technical gatherings on campus! 

🏆 **Event Details:** ${activeBevyEvent.name}
📅 **Target Date:** ${activeBevyEvent.date}
📍 **Platform/Location:** GDG On Campus University Auditorium

${activeBevyEvent.description}

Whether you are looking to secure certifications, expand your professional portfolio, or connect with expert peer mentors, this session is customized for you.

👉 [Save your seat & RSVP on Bevy Chapter Page]

Sincerely,
The GDG On Campus Chapter Board`;
        setBevyOutput(newsletterDraft);
      }
      setBevyLoading(false);
    }, 300);
  };

  // call server-side Gemini endpoint to create highly structured Discord messaging
  const handleGenerateDiscordAnnouncement = async () => {
    if (!activeDiscordEvent) {
      setStatusMessage({ type: "error", text: "Please select an upcoming event to draft." });
      return;
    }
    
    setIsGeneratingDiscord(true);
    setStatusMessage(null);
    setDiscordDraft("");

    try {
      const response = await fetch("/api/generate-discord-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: activeDiscordEvent.name,
          date: activeDiscordEvent.date,
          description: activeDiscordEvent.description,
          style: discordStyle
        })
      });

      const data = await response.json();
      if (data.success && data.content) {
        setDiscordDraft(data.content);
      } else {
        setStatusMessage({ type: "error", text: data.error || "The AI model encountered an error drafting announcement." });
      }
    } catch (err: any) {
      console.error("Discord compose client error:", err);
      setStatusMessage({ type: "error", text: "Failed to connect to backend server endpoint." });
    } finally {
      setIsGeneratingDiscord(false);
    }
  };

  // call server-side Discord proxy fetch posting direct to webhook
  const handleSendToDiscord = async () => {
    if (!discordWebhook) {
      setStatusMessage({ type: "error", text: "A Discord Webhook URL is required to broadcast." });
      return;
    }

    if (!discordWebhook.startsWith("https://discord.com/api/webhooks/")) {
      setStatusMessage({ type: "error", text: "Invalid URL. Discord webhooks must start with 'https://discord.com/api/webhooks/'" });
      return;
    }

    if (!discordDraft) {
      setStatusMessage({ type: "error", text: "No announcement copy available to post. Click generate first!" });
      return;
    }

    setIsSendingDiscord(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/dispatch-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: discordWebhook,
          message: discordDraft,
          useEmbed: useDiscordEmbed,
          eventData: activeDiscordEvent ? {
            name: activeDiscordEvent.name,
            date: activeDiscordEvent.date,
            targetRegistration: activeDiscordEvent.targetRegistration,
            status: activeDiscordEvent.status
          } : undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: data.message || "Announcement broadcasted successfully to Discord!" });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to post message. Confirm webhook validation stats." });
      }
    } catch (err: any) {
      console.error("Discord send network error:", err);
      setStatusMessage({ type: "error", text: "Network connection error while calling Discord webhook." });
    } finally {
      setIsSendingDiscord(false);
    }
  };

  const copyToClipboard = (text: string, type: "bevy" | "discord") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "bevy") {
      setBevyCopied(true);
      setTimeout(() => setBevyCopied(false), 2000);
    } else {
      setDiscordCopied(true);
      setTimeout(() => setDiscordCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      
      {/* 1. Header description banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400">GDG Integrations & Broadcasters</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Seamlessly bridge student campaign details from local planners directly into official channels like Google Calendar, Bevy Chapter, and the community Discord server.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Bot size={14} className="text-pink-400 animate-pulse" />
          <span className="text-[10px] text-zinc-300 font-bold font-mono">Gemini-3.5-Engine Enabled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Google Calendar Sync + Bevy Platform Guidance */}
        <div className="space-y-6">
          
          {/* Integration 1: Google Calendar Connection Status Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-sidebar-divider">
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Google Calendar timelining sync API</h4>
                  <p className="text-[10px] text-slate-400">Add event planning milestones seamlessly to chapter calendars.</p>
                </div>
              </div>
              
              <div>
                {user && gcalToken ? (
                  <span className="p-1 px-2.5 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full font-bold flex items-center gap-0.5">
                    <CheckCircle size={9} /> Connected
                  </span>
                ) : (
                  <span className="p-1 px-2.5 text-[9px] text-slate-500 bg-slate-100 border border-slate-200 rounded-full font-bold">
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Upon login authorization, the hub creates calendar records and updates deadline tags instantly. This lets your entire board stay synchronized on critical preparation stages.
            </p>

            <div className="flex justify-between items-center pt-2">
              {user ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Google ID</span>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] sm:max-w-xs">{user.email}</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 p-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded border border-red-100 font-semibold transition active:scale-95"
                  >
                    <LogOut size={12} />
                    <span>Disconnect Google Account</span>
                  </button>
                </div>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={onLogin}
                    disabled={isLoggingIn}
                    className="flex items-center gap-2 p-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-bold transition shadow-sm active:scale-95"
                  >
                    <LogIn size={13} />
                    <span>{isLoggingIn ? "Syncing Google credentials..." : "Connect Google Account"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Integration 2: Bevy Platform Connection details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-sidebar-divider">
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Link2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Bevy Chapter Connection Module</h4>
                  <p className="text-[10px] text-slate-400">Configure event blueprints & automated email newsletters.</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2">
                Operational Support
              </span>
            </div>

            {/* Answer the Bevy Connection mechanism directly as requested */}
            <div className="p-3.5 bg-yellow-50/40 border border-yellow-100 rounded-lg space-y-2">
              <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <HelpCircle size={13} className="text-amber-600" />
                <span>Can we connect directly to Bevy (gdg.community.dev)?</span>
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Yes, absolutely!</strong> Bevy serves as the official platform for GDG chapters to submit events and send newsletters. However, Bevy relies on **Google-scoped administrator roles** rather than standard open user OAuth profiles. 
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                To bypass manual data reentry, this module converts planning benchmarks instantly into Bevy-compliant models. Generate the schema payload below to copy-paste directly into Bevy or prepare pre-formatted marketing campaigns.
              </p>
            </div>

            {/* Dynamic Exporter Workspace */}
            {events.length > 0 ? (
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Select Event Context</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedBevyEventId}
                    onChange={e => setSelectedBevyEventId(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded text-xs p-2 outline-none text-slate-700 focus:border-blue-500"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name} ({ev.status})</option>
                    ))}
                  </select>

                  <div className="flex border border-slate-200 rounded overflow-hidden">
                    <button
                      onClick={() => setBevyFormat("json")}
                      className={`text-xs px-3 py-1.5 flex items-center gap-1 font-bold ${
                        bevyFormat === "json" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <FileJson size={12} />
                      <span>Schema JSON</span>
                    </button>
                    <button
                      onClick={() => setBevyFormat("markdown")}
                      className={`text-xs px-3 py-1.5 flex items-center gap-1 font-bold ${
                        bevyFormat === "markdown" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Mail size={12} />
                      <span>Newsletter</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerateBevyDraft}
                  disabled={bevyLoading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold p-2.5 rounded border border-slate-200 transition"
                >
                  {bevyLoading ? "Generating Payload Blueprint..." : "Compose Bevy Compliant Payload"}
                </button>

                {bevyOutput && (
                  <div className="relative mt-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-sans">
                      <span>{bevyFormat === "json" ? "Bevy POST JSON Schema Payload" : "Newsletter Text Draft"}</span>
                      <button
                        onClick={() => copyToClipboard(bevyOutput, "bevy")}
                        className="text-blue-600 font-bold flex items-center gap-0.5 hover:underline"
                      >
                        {bevyCopied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                        <span>{bevyCopied ? "Copied Payload!" : "Copy Source"}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] select-text bg-white p-2.5 rounded border border-slate-150 max-h-[140px] overflow-y-auto leading-relaxed text-slate-700 font-mono whitespace-pre-wrap">
                      {bevyOutput}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4 italic">No events in console registry. Add planning items to activate exports.</p>
            )}

            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
              <ExternalLink size={10} className="text-slate-400" />
              <span>Reference the Bevy Organizer manual at </span>
              <a href="https://gdg.community.dev" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">gdg.community.dev</a>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: DISCORD AI ANNOUNCEMENT BROADCASTER */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between h-full">
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-sidebar-divider">
                <div className="flex gap-2.5 items-center">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
                    <Radio size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Discord Instant Broadcaster</h4>
                    <p className="text-[10px] text-slate-400">Draft, configure, and post news directly with a webhook.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono text-[9px] text-emerald-600 bg-emerald-50 px-2 rounded border border-emerald-100 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Direct Webhook Pipeline</span>
                </div>
              </div>

              {/* Discord Webhook configuration input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Discord Webhook URL
                  </label>
                  <button
                    onClick={() => setShowDiscordGuide(!showDiscordGuide)}
                    className="text-[10px] text-pink-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <HelpCircle size={11} />
                    <span>{showDiscordGuide ? "Hide Setup Guide" : "How to Get Webhook?"}</span>
                  </button>
                </div>

                {showDiscordGuide && (
                  <div className="p-3 bg-pink-50/60 border border-pink-100 rounded-lg text-[10px] text-slate-700 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-pink-900">⚡ 3-Step Discord API Webhook Connection Guide:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      <li>Open your Discord server channel → click <strong>Channel Settings (⚙️)</strong> → <strong>Integrations</strong>.</li>
                      <li>Select <strong>Webhooks</strong> → click <strong>New Webhook</strong>.</li>
                      <li>Copy the <strong>Webhook URL</strong> (format: <code className="bg-white px-1 py-0.5 rounded text-[9px] font-mono">https://discord.com/api/webhooks/...</code>) and paste it below.</li>
                    </ol>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={discordWebhook}
                    onChange={e => setDiscordWebhook(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/1234..."
                    className="flex-1 text-xs font-mono border border-slate-200 rounded p-2 focus:ring-1 focus:ring-pink-500 outline-none text-slate-700 bg-slate-50 placeholder:font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleTestDiscordWebhook}
                    disabled={isTestingDiscord || !discordWebhook}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shrink-0 transition flex items-center gap-1"
                  >
                    {isTestingDiscord ? <RefreshCw size={11} className="animate-spin" /> : <Radio size={11} />}
                    <span>Test Ping</span>
                  </button>
                </div>
              </div>

              {/* Event selection & Style control dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Event details</label>
                  <select
                    value={selectedDiscordEventId}
                    onChange={e => setSelectedDiscordEventId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none text-slate-700 focus:border-pink-500"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Copy Tone style choice</label>
                  <select
                    value={discordStyle}
                    onChange={e => setDiscordStyle(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none text-slate-700 focus:border-pink-500"
                  >
                    <option value="emoji">Emoji Energetic 🚀🔥</option>
                    <option value="formal">Academic / Formal 🎓📋</option>
                    <option value="casual">Friendly / Casual 💻✌️</option>
                  </select>
                </div>
              </div>

              {/* Format layout options */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useDiscordEmbed}
                    onChange={e => setUseDiscordEmbed(e.target.checked)}
                    className="w-3.5 h-3.5 accent-pink-600 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Discord Rich Embed Card</span>
                </label>
                <span className="text-[9px] text-slate-400">Includes colored borders, event details & badge</span>
              </div>

              {/* Generate Trigger Button */}
              <button
                onClick={handleGenerateDiscordAnnouncement}
                disabled={isGeneratingDiscord || events.length === 0}
                className="w-full py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition active:scale-95"
              >
                {isGeneratingDiscord ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Gemini Composing Layout...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-yellow-300" />
                    <span>1-Click: Synthesize AI Announcement Draft</span>
                  </>
                )}
              </button>

              {/* Status alerts */}
              {statusMessage && (
                <div className={`p-3 text-xs rounded border flex items-center gap-2 ${
                  statusMessage.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-150" 
                    : "bg-red-50 text-red-800 border-red-150"
                }`}>
                  <AlertCircle size={14} className={statusMessage.type === "success" ? "text-emerald-600" : "text-red-600"} />
                  <span className="font-medium select-text">{statusMessage.text}</span>
                </div>
              )}

              {/* Textarea for Discord Draft preview edit */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Real-time announcement Editor preview</label>
                  {discordDraft && (
                    <button
                      onClick={() => copyToClipboard(discordDraft, "discord")}
                      className="text-pink-600 hover:text-pink-700 text-[10px] font-bold flex items-center gap-0.5"
                    >
                      {discordCopied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                      <span>{discordCopied ? "Copied" : "Copy Alert"}</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={discordDraft}
                  onChange={e => setDiscordDraft(e.target.value)}
                  placeholder="The fully formatted AI announcement markdown copy will display here. You can manually adjust information before executing post broadcasting commands."
                  rows={8}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 bg-slate-950 text-emerald-400 focus:ring-1 focus:ring-pink-500 outline-none resize-none leading-relaxed"
                />
              </div>

            </div>

            {/* SEND PIPELINE BUTTON */}
            <div className="pt-4 border-t border-slate-150">
              <button
                onClick={handleSendToDiscord}
                disabled={isSendingDiscord || !discordDraft || !discordWebhook}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition active:scale-95"
              >
                {isSendingDiscord ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Broadcasting to Discord Channel...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} className={discordDraft ? "text-indigo-400 animate-pulse" : ""} />
                    <span>Deploy Announcement to Discord Server</span>
                  </>
                )}
              </button>
              <p className="text-[9px] text-center text-slate-400 mt-2 leading-relaxed">
                Posts via secure webhook gateway. Conforms fully to modern Discord API parameters.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
