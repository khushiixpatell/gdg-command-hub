import React, { useState } from "react";
import { Sparkles, Save, Trash2, Mail, ExternalLink, Calendar, ChevronRight } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { EventItem, DraftItem } from "../mockData";

interface OutreachViewProps {
  events: EventItem[];
  drafts: DraftItem[];
  setDrafts: React.Dispatch<React.SetStateAction<DraftItem[]>>;
  userId: string | null;
  onRefreshDrafts: () => Promise<void>;
}

export default function OutreachView({
  events,
  drafts,
  setDrafts,
  userId,
  onRefreshDrafts
}: OutreachViewProps) {
  const [draftType, setDraftType] = useState<"newsletter" | "sponsor" | "speaker" | "event">("speaker");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [customEventName, setCustomEventName] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  
  // States of generated draft
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeDraft, setActiveDraft] = useState<DraftItem | null>(null);

  // Trigger server-side Gemini draft generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent("");
    
    // Choose actual event name
    let targetEventName = customEventName;
    if (selectedEventId) {
      const selectedObj = events.find(e => e.id === selectedEventId);
      if (selectedObj) targetEventName = selectedObj.name;
    }

    try {
      const response = await fetch("/api/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: draftType,
          eventName: targetEventName,
          details: details
        })
      });

      if (!response.ok) {
        throw new Error("Failed server-side Gemini prompt response.");
      }

      const resData = await response.json();
      if (resData.success) {
        setGeneratedTitle(resData.title);
        setGeneratedContent(resData.content);
        setActiveDraft(null); // Deselect any existing draft
      } else {
        throw new Error(resData.error || "Generation returned failure state.");
      }
    } catch (err: any) {
      console.error("Gemini proxy error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe client-side DB save hook
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
        // Authenticated Firestore save
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
          handleFirestoreError(dbErr, OperationType.WRITE, refPath);
        }
      } else {
        // Fallback local memory state for sandbox play
        setDrafts(prev => [nextDraftPayload, ...prev]);
      }
      alert("Draft saved to console!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Safe delete handler with user confirmation
  const handleDeleteDraft = async (draftId: string, firestoreDocId?: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this outreach draft?");
    if (!confirmDelete) return;

    try {
      if (userId && firestoreDocId) {
        const refPath = "drafts";
        try {
          await deleteDoc(doc(db, refPath, firestoreDocId));
          await onRefreshDrafts();
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.DELETE, `${refPath}/${firestoreDocId}`);
        }
      } else {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
      }
      
      if (activeDraft?.id === draftId) {
        setActiveDraft(null);
        setGeneratedContent("");
      }
    } catch (err) {
      console.error("Failure to delete draft: ", err);
    }
  };

  // Select item from outreach queue
  const handleSelectDraft = (d: DraftItem) => {
    setActiveDraft(d);
    setGeneratedTitle(d.title);
    setGeneratedContent(d.content);
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-6.5rem)] overflow-hidden">
      {/* Left 4 Columns: Configuration and Composer */}
      <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Composer Settings</h3>
            <p className="text-[11px] text-slate-400">Automate community touchpoints with custom AI templates</p>
          </div>

          {/* Draft Type Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Outreach Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { type: "speaker", label: "🎙️ Speaker Invite" },
                { type: "sponsor", label: "💼 Sponsor Request" },
                { type: "newsletter", label: "📧 Newsletter" },
                { type: "event", label: "📝 Event Landing" }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => setDraftType(item.type as any)}
                  className={`p-2 text-left rounded text-xs transition-all border font-medium ${
                    draftType === item.type 
                      ? "border-blue-500 bg-blue-50/50 text-blue-600" 
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/50 text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Context Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Related GDG Event</label>
            <select
              value={selectedEventId}
              onChange={e => {
                setSelectedEventId(e.target.value);
                if (e.target.value) setCustomEventName("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Or enter manual event name below --</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>
              ))}
            </select>
          </div>

          {/* Manual Event Name (Conditional) */}
          {!selectedEventId && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Custom Event Target</label>
              <input
                type="text"
                placeholder="e.g. Flutter Study Jam Week 2"
                value={customEventName}
                onChange={e => setCustomEventName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {/* Prompt inputs */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Context, Tiers or Tone Guidelines</label>
            <textarea
              rows={4}
              placeholder={
                draftType === "speaker" 
                  ? "Mention candidate's background, desired tech stack (Android/AI), and potential university location..." 
                  : draftType === "sponsor"
                  ? "Outline gold/silver tiers, estimated footfalls, student reach, booth settings..."
                  : "Include core tech highlights, RSVP links, community reminders, or food callouts..."
              }
              value={details}
              onChange={e => setDetails(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!selectedEventId && !customEventName && !details)}
          className={`w-full mt-4 flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
            isGenerating || (!selectedEventId && !customEventName && !details)
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
          <span>{isGenerating ? "Drafting with Gemini..." : "Generate Draft with AI"}</span>
        </button>
      </div>

      {/* Middle 5 Columns: Generated Preview Overlay */}
      <div className="col-span-12 lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 truncate max-w-[200px]">
                {generatedTitle || "Output Preview"}
              </h3>
              <p className="text-[11px] text-slate-400">Review, tweak, and save this communication copy</p>
            </div>
            {generatedContent && (
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs px-2.5 py-1.5 rounded border border-green-200 font-semibold transition"
              >
                <Save size={12} />
                <span>Save Draft</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-8">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                <p className="text-xs font-medium text-slate-600">Formulating compelling content structure...</p>
                <p className="text-[10px] text-slate-400 italic">"Gemini is analyzing context to optimize developer engagement metrics"</p>
              </div>
            ) : generatedContent ? (
              <div className="bg-slate-50/50 rounded-lg p-5 border border-slate-100 font-sans text-xs text-slate-700 leading-relaxed whitespace-pre-line select-text">
                {generatedContent}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-8 text-slate-400">
                <Mail size={32} strokeWidth={1.5} />
                <p className="text-xs font-semibold">Ready to draft</p>
                <p className="text-[10px] max-w-xs">Fill out details in the left settings panel, then click generate to craft your next newsletter, sponsor slide content or invite pitch.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right 3 Columns: outreach Queue (Saved Drafts Archive) */}
      <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Saved Outreach Queue</h3>
          <p className="text-[11px] text-slate-400">Quick-fetch or edit saved communications</p>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
          {drafts.length === 0 ? (
            <div className="p-4 text-center text-[10px] text-slate-400">
              No saved drafts yet. Generate and save a draft to keep it in your history archive!
            </div>
          ) : (
            drafts.map(d => {
              const isSelected = activeDraft?.id === d.id || (generatedTitle === d.title && generatedContent === d.content);
              return (
                <div
                  key={d.id}
                  onClick={() => handleSelectDraft(d)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer group flex flex-col gap-1.5 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/20"
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div className="flex justify-between items-center gap-1">
                    <span className={`text-[8px] font-mono uppercase px-1 rounded ${
                      d.type === "newsletter" 
                        ? "bg-blue-100 text-blue-700" 
                        : d.type === "sponsor"
                        ? "bg-purple-100 text-purple-700"
                        : d.type === "speaker"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {d.type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // @ts-ignore
                        handleDeleteDraft(d.id, d.firestoreId);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete draft"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{d.title}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-normal">{d.content}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
