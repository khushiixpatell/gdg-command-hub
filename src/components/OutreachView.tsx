import React, { useState } from "react";
import {
  Sparkles,
  Save,
  Trash2,
  Mail,
  MessageSquare,
  Instagram,
  Users,
  Calendar,
  Zap
} from "lucide-react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

import {
  db,
  handleFirestoreError,
  OperationType
} from "../firebase";

import { EventItem, DraftItem } from "../mockData";

interface OutreachViewProps {
  events: EventItem[];
  drafts: DraftItem[];
  setDrafts: React.Dispatch<React.SetStateAction<DraftItem[]>>;
  userId: string | null;
  onRefreshDrafts: () => Promise<void>;
}

type AIDraftType = "speaker" | "sponsor" | "newsletter";
type QuickDraftType =
  | "event"
  | "discord"
  | "social"
  | "internal";

type DraftType = AIDraftType | QuickDraftType;

export default function OutreachView({
  events,
  drafts,
  setDrafts,
  userId,
  onRefreshDrafts
}: OutreachViewProps) {

  const [draftMode, setDraftMode] = useState<"ai" | "quick">("ai");

  const [draftType, setDraftType] = useState<DraftType>("speaker");

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [customEventName, setCustomEventName] = useState<string>("");

  const [details, setDetails] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeDraft, setActiveDraft] = useState<DraftItem | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>("");

  const getEventName = () => {
    if (selectedEventId) {
      const selectedEvent = events.find(
        event => event.id === selectedEventId
      );

      if (selectedEvent) {
        return selectedEvent.name;
      }
    }

    return customEventName.trim();
  };

  const clearOutput = () => {
    setGeneratedTitle("");
    setGeneratedContent("");
    setActiveDraft(null);
    setErrorMessage("");
  };

  const handleModeChange = (mode: "ai" | "quick") => {
    setDraftMode(mode);
    clearOutput();

    if (mode === "ai") {
      setDraftType("speaker");
    } else {
      setDraftType("event");
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGeneratedContent("");
    setGeneratedTitle("");
    setActiveDraft(null);
    setErrorMessage("");

    const targetEventName = getEventName();

    try {
      const response = await fetch("/api/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: draftType,
          eventName: targetEventName,
          details
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
          "The AI service could not generate this draft."
        );
      }

      if (!responseData.success) {
        throw new Error(
          responseData.error ||
          "Generation returned an unsuccessful response."
        );
      }

      setGeneratedTitle(responseData.title || "Generated Draft");
      setGeneratedContent(responseData.content || "");

    } catch (err: any) {
      console.error("Gemini proxy error:", err);

      setErrorMessage(
        err?.message ||
        "Something went wrong while generating the draft."
      );

    } finally {
      setIsGenerating(false);
    }
  };

  const buildQuickDraft = () => {
    const eventName = getEventName();

    if (!eventName && !details.trim()) {
      setErrorMessage(
        "Add an event name or some details before generating."
      );
      return;
    }

    setErrorMessage("");

    let title = "";
    let content = "";

    switch (draftType) {

      case "event":
        title = `${eventName || "Event"} — Announcement`;

        content = `📣 ${eventName || "Upcoming GDG Event"}

${details.trim()}

More details and registration:
[Registration Link]

See you there!
GDG On Campus`;
        break;

      case "discord":
        title = `${eventName || "GDG Event"} — Discord Announcement`;

        content = `📣 ${eventName || "GDG Event"}

${details.trim()}

📅 Date: [Date]
🕐 Time: [Time]
📍 Location: [Location]

Sign up here: [Registration Link]`;
        break;

      case "social":
        title = `${eventName || "GDG Event"} — Social Post`;

        content = `${eventName || "Something is happening at GDG On Campus"} 👀

${details.trim()}

📅 [Date]
📍 [Location]

🔗 [Registration Link]

#GDGOnCampus #Developers`;
        break;

      case "internal":
        title = `${eventName || "GDG"} — Internal Team Message`;

        content = `Hey team,

${details.trim()}

Action needed:
[Add action item]

Owner:
[Add owner]

Deadline:
[Add deadline]`;
        break;

      default:
        title = "Quick Draft";
        content = details.trim();
    }

    setGeneratedTitle(title);
    setGeneratedContent(content);
    setActiveDraft(null);
  };

  const handleGenerate = async () => {
    if (draftMode === "ai") {
      await handleGenerateAI();
    } else {
      buildQuickDraft();
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedContent) return;

    setIsSaving(true);

    const nextDraftPayload = {
      id: "dr-" + Date.now(),
      title: generatedTitle || `${draftType.toUpperCase()} Draft`,
      type: draftType,
      content: generatedContent,
      createdAt: new Date().toISOString()
    };

    try {
      if (userId) {
        const refPath = "drafts";

        try {
          await addDoc(collection(db, refPath), {
            id: nextDraftPayload.id,
            title: nextDraftPayload.title,
            type: nextDraftPayload.type,
            content: nextDraftPayload.content,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            creatorId: userId
          });

          await onRefreshDrafts();

        } catch (dbErr) {
          handleFirestoreError(
            dbErr,
            OperationType.WRITE,
            refPath
          );
        }

      } else {
        setDrafts(prev => [
          nextDraftPayload as DraftItem,
          ...prev
        ]);
      }

      alert("Draft saved to console!");

    } catch (err) {
      console.error("Failed to save draft:", err);

    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDraft = async (
    draftId: string,
    firestoreDocId?: string
  ) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this draft?"
    );

    if (!confirmDelete) return;

    try {

      if (userId && firestoreDocId) {
        const refPath = "drafts";

        try {
          await deleteDoc(
            doc(db, refPath, firestoreDocId)
          );

          await onRefreshDrafts();

        } catch (dbErr) {
          handleFirestoreError(
            dbErr,
            OperationType.DELETE,
            `${refPath}/${firestoreDocId}`
          );
        }

      } else {
        setDrafts(prev =>
          prev.filter(d => d.id !== draftId)
        );
      }

      if (activeDraft?.id === draftId) {
        setActiveDraft(null);
        setGeneratedContent("");
        setGeneratedTitle("");
      }

    } catch (err) {
      console.error(
        "Failure to delete draft:",
        err
      );
    }
  };

  const handleSelectDraft = (draft: DraftItem) => {
    setActiveDraft(draft);
    setGeneratedTitle(draft.title);
    setGeneratedContent(draft.content);
    setDraftType(draft.type as DraftType);

    const aiTypes: AIDraftType[] = [
      "speaker",
      "sponsor",
      "newsletter"
    ];

    setDraftMode(
      aiTypes.includes(draft.type as AIDraftType)
        ? "ai"
        : "quick"
    );
  };

  const aiTypes = [
    {
      type: "speaker",
      label: "🎙️ Speaker Outreach",
      description: "Personalized speaker invitation"
    },
    {
      type: "sponsor",
      label: "💼 Sponsor Outreach",
      description: "Company-specific sponsorship pitch"
    },
    {
      type: "newsletter",
      label: "📧 Newsletter",
      description: "Turn multiple updates into readable copy"
    }
  ];

  const quickTypes = [
    {
      type: "event",
      label: "📣 Event Announcement",
      description: "Fast event copy"
    },
    {
      type: "discord",
      label: "💬 Discord",
      description: "Community announcement"
    },
    {
      type: "social",
      label: "📱 Social Post",
      description: "Instagram / LinkedIn copy"
    },
    {
      type: "internal",
      label: "👥 Internal Team",
      description: "Exec team communication"
    }
  ];

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-6.5rem)] overflow-hidden">

      {/* LEFT: COMPOSER */}
      <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-y-auto">

        <div className="space-y-4">

          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Communication Composer
            </h3>

            <p className="text-[11px] text-slate-400">
              Use AI only where it adds value. Everything else is instant.
            </p>
          </div>

          {/* MODE */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">

            <button
              onClick={() => handleModeChange("ai")}
              className={`flex items-center justify-center gap-2 p-2 rounded-md text-xs font-bold transition ${
                draftMode === "ai"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <Sparkles size={13} />
              AI Drafting
            </button>

            <button
              onClick={() => handleModeChange("quick")}
              className={`flex items-center justify-center gap-2 p-2 rounded-md text-xs font-bold transition ${
                draftMode === "quick"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <Zap size={13} />
              Quick Compose
            </button>

          </div>

          {/* AI TYPES */}
          {draftMode === "ai" && (
            <div className="space-y-1">

              <label className="text-[10px] uppercase font-bold text-slate-500">
                AI Draft Type
              </label>

              <div className="space-y-1.5">

                {aiTypes.map(item => (
                  <button
                    key={item.type}
                    onClick={() => {
                      setDraftType(
                        item.type as AIDraftType
                      );
                      clearOutput();
                    }}
                    className={`w-full p-2.5 text-left rounded-lg transition-all border ${
                      draftType === item.type
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      {item.label}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.description}
                    </div>
                  </button>
                ))}

              </div>
            </div>
          )}

          {/* QUICK TYPES */}
          {draftMode === "quick" && (
            <div className="space-y-1">

              <label className="text-[10px] uppercase font-bold text-slate-500">
                Quick Compose Type
              </label>

              <div className="grid grid-cols-2 gap-1.5">

                {quickTypes.map(item => (
                  <button
                    key={item.type}
                    onClick={() => {
                      setDraftType(
                        item.type as QuickDraftType
                      );
                      clearOutput();
                    }}
                    className={`p-2 text-left rounded-lg border transition-all ${
                      draftType === item.type
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      {item.label}
                    </div>

                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {item.description}
                    </div>
                  </button>
                ))}

              </div>
            </div>
          )}

          {/* EVENT */}
          <div className="space-y-1">

            <label className="text-[10px] uppercase font-bold text-slate-500">
              Related GDG Event
            </label>

            <select
              value={selectedEventId}
              onChange={e => {
                setSelectedEventId(e.target.value);

                if (e.target.value) {
                  setCustomEventName("");
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">
                -- Or enter event name below --
              </option>

              {events.map(event => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.name} ({event.date})
                </option>
              ))}
            </select>

          </div>

          {/* CUSTOM EVENT */}
          {!selectedEventId && (
            <div className="space-y-1">

              <label className="text-[10px] uppercase font-bold text-slate-500">
                Event Name
              </label>

              <input
                type="text"
                placeholder="e.g. Flutter Study Jam"
                value={customEventName}
                onChange={e =>
                  setCustomEventName(e.target.value)
                }
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />

            </div>
          )}

          {/* DETAILS */}
          <div className="space-y-1">

            <label className="text-[10px] uppercase font-bold text-slate-500">
              {draftMode === "ai"
                ? "Context for the AI"
                : "Message Details"}
            </label>

            <textarea
              rows={7}
              placeholder={
                draftType === "speaker"
                  ? "Speaker name, role/company, relevant background, why you're reaching out, topic, expected audience, date/time, format..."
                  : draftType === "sponsor"
                  ? "Company, contact name, sponsorship ask, expected attendance, why they're a good fit, benefits you're offering, response deadline..."
                  : draftType === "newsletter"
                  ? "Upcoming events, important announcements, member highlights, resources, deadlines, links, and anything else to include..."
                  : draftType === "event"
                  ? "What should attendees know? Include date, time, location, key activities, registration information, etc."
                  : draftType === "discord"
                  ? "What do members need to know? Include the action, deadline, link, channel, or any other relevant details."
                  : draftType === "social"
                  ? "Key points, hook, date, location, CTA, registration link, speaker information, or anything else to highlight."
                  : "What does the team need to know or do? Include the owner, action, deadline, links, or context."
              }
              value={details}
              onChange={e =>
                setDetails(e.target.value)
              }
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />

          </div>

          {/* AI NOTICE */}
          {draftMode === "ai" && (
            <div className="flex gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">

              <Sparkles
                size={13}
                className="text-blue-600 mt-0.5 shrink-0"
              />

              <p className="text-[10px] text-blue-700 leading-relaxed">
                AI is used here because this type of communication
                benefits from personalization and context. It won't
                invent information you haven't provided.
              </p>

            </div>
          )}

          {/* QUICK NOTICE */}
          {draftMode === "quick" && (
            <div className="flex gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">

              <Zap
                size={13}
                className="text-slate-500 mt-0.5 shrink-0"
              />

              <p className="text-[10px] text-slate-500 leading-relaxed">
                This message is generated locally from your inputs.
                No AI request is made.
              </p>

            </div>
          )}

        </div>

        {/* GENERATE */}
        <button
          onClick={handleGenerate}
          disabled={
            isGenerating ||
            (!selectedEventId &&
              !customEventName &&
              !details.trim())
          }
          className={`w-full mt-4 flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
            isGenerating ||
            (!selectedEventId &&
              !customEventName &&
              !details.trim())
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >

          {draftMode === "ai" ? (
            <Sparkles
              size={14}
              className={
                isGenerating
                  ? "animate-spin"
                  : ""
              }
            />
          ) : (
            <Zap size={14} />
          )}

          <span>
            {isGenerating
              ? "Drafting..."
              : draftMode === "ai"
              ? "Generate with AI"
              : "Create Message"}
          </span>

        </button>

      </div>

      {/* MIDDLE: PREVIEW */}
      <div className="col-span-12 lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

        <div className="flex flex-col h-full">

          <div className="flex justify-between items-center border-b border-slate-100 pb-3">

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 truncate max-w-[250px]">
                {generatedTitle || "Output Preview"}
              </h3>

              <p className="text-[11px] text-slate-400">
                Review, edit, and save before sending
              </p>
            </div>

            {generatedContent && (
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs px-2.5 py-1.5 rounded border border-green-200 font-semibold transition"
              >
                <Save size={12} />
                <span>
                  {isSaving
                    ? "Saving..."
                    : "Save Draft"}
                </span>
              </button>
            )}

          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">

            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-8">

                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />

                <p className="text-xs font-medium text-slate-600">
                  Building your draft...
                </p>

                <p className="text-[10px] text-slate-400">
                  Gemini is being used only for this communication type.
                </p>

              </div>

            ) : errorMessage ? (

              <div className="h-full flex flex-col items-center justify-center text-center p-8">

                <div className="p-4 rounded-lg bg-red-50 border border-red-100 max-w-sm">

                  <p className="text-xs font-semibold text-red-700">
                    Drafting failed
                  </p>

                  <p className="text-[10px] text-red-600 mt-1 leading-relaxed">
                    {errorMessage}
                  </p>

                </div>

              </div>

            ) : generatedContent ? (

              <textarea
                value={generatedContent}
                onChange={e =>
                  setGeneratedContent(e.target.value)
                }
                className="w-full h-full min-h-[400px] bg-slate-50/50 rounded-lg p-5 border border-slate-100 font-sans text-xs text-slate-700 leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-500"
              />

            ) : (

              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-8 text-slate-400">

                <Mail
                  size={32}
                  strokeWidth={1.5}
                />

                <p className="text-xs font-semibold">
                  Ready to draft
                </p>

                <p className="text-[10px] max-w-xs">
                  Choose a communication type, add the relevant
                  information, and generate your draft.
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

      {/* RIGHT: SAVED DRAFTS */}
      <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

        <div className="border-b border-slate-100 pb-3">

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Saved Communications
          </h3>

          <p className="text-[11px] text-slate-400">
            Previously saved drafts
          </p>

        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">

          {drafts.length === 0 ? (

            <div className="p-4 text-center text-[10px] text-slate-400">
              No saved drafts yet.
            </div>

          ) : (

            drafts.map(draft => {

              const isSelected =
                activeDraft?.id === draft.id ||
                (
                  generatedTitle === draft.title &&
                  generatedContent === draft.content
                );

              return (
                <div
                  key={draft.id}
                  onClick={() =>
                    handleSelectDraft(draft)
                  }
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer group flex flex-col gap-1.5 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/20"
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/40"
                  }`}
                >

                  <div className="flex justify-between items-center gap-1">

                    <span className="text-[8px] font-mono uppercase px-1 rounded bg-slate-100 text-slate-600">
                      {draft.type}
                    </span>

                    <button
                      onClick={e => {
                        e.stopPropagation();

                        handleDeleteDraft(
                          draft.id,
                          // @ts-ignore
                          draft.firestoreId
                        );
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete draft"
                    >
                      <Trash2 size={12} />
                    </button>

                  </div>

                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate">
                    {draft.title}
                  </p>

                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-normal">
                    {draft.content}
                  </p>

                </div>
              );
            })

          )}

        </div>

      </div>

    </div>
  );
}