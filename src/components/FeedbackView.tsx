import React, { useState } from "react";
import { Star, MessageSquare, Plus, Check, Filter, Download, Upload, Copy, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle, Link2 } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { EventItem, FeedbackItem } from "../mockData";

interface FeedbackViewProps {
  events: EventItem[];
  feedbacks: FeedbackItem[];
  setFeedbacks: React.Dispatch<React.SetStateAction<FeedbackItem[]>>;
  userId: string | null;
  onRefreshFeedbacks: () => Promise<void>;
  googleAccessToken?: string | null;
}

export default function FeedbackView({
  events,
  feedbacks,
  setFeedbacks,
  userId,
  onRefreshFeedbacks,
  googleAccessToken
}: FeedbackViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");
  const [attendeeName, setAttendeeName] = useState<string>("");
  const [score, setScore] = useState<number>(5);
  const [comments, setComments] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAddingResponse, setIsAddingResponse] = useState<boolean>(false);

  // Forms and Bevy configurations
  const [googleFormLink, setGoogleFormLink] = useState<string>(() => {
    return localStorage.getItem("gdg_google_form_link") || "https://docs.google.com/forms/d/e/1FAIpQLSfD_L_g_A1c6H7-ZGoM1BexC-uJg7S_F4/viewform?usp=sf_link";
  });
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleSaveFormLink = (link: string) => {
    setGoogleFormLink(link);
    localStorage.setItem("gdg_google_form_link", link);
  };

  // Google Sheets integration state
  const [sheetsUrl, setSheetsUrl] = useState<string>("");
  const [sheetsSyncing, setSheetsSyncing] = useState<boolean>(false);
  const [sheetsSuccess, setSheetsSuccess] = useState<string>("");
  const [sheetsError, setSheetsError] = useState<string>("");

  const handlePullFeedbacksFromSheets = async () => {
    if (!googleAccessToken) {
      setSheetsError("Google Account is not connected. Connect via Integrations first.");
      return;
    }
    if (!sheetsUrl) {
      setSheetsError("Please paste a valid Google Spreadsheet URL or ID.");
      return;
    }

    setSheetsSyncing(true);
    setSheetsError("");
    setSheetsSuccess("");

    try {
      const matchKey = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = matchKey ? matchKey[1] : sheetsUrl.trim();

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:D100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });

      if (!res.ok) {
        throw new Error(`Google Sheets API responded with: ${res.statusText}. Ensure file view permissions are active.`);
      }

      const data = await res.json();
      const rows = data.values;
      if (!rows || rows.length <= 1) {
        throw new Error("No feedback responses found in sheet, or the sheet is empty.");
      }

      const importedList: FeedbackItem[] = [];
      const selectedEv = events.find(e => e.id === selectedEventId) || events[0];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        // Form Response Columns Format:
        // row[0] = Timestamp, row[1] = Attendee name, row[2] = Score, row[3] = Comment
        const timestampVal = row[0] || new Date().toISOString();
        const attendeeNameVal = row[1] || "Anonymous Developer";
        const scoreVal = parseInt((row[2] || "").trim(), 10) || 5;
        const commentVal = row[3] || "Thanks GDG On Campus!";

        let guessedSentiment: "positive" | "neutral" | "negative" = "positive";
        if (scoreVal === 3) guessedSentiment = "neutral";
        if (scoreVal < 3) guessedSentiment = "negative";

        const nextId = `fb-gsheet-${Date.now()}-${i}`;
        const nextItem: FeedbackItem = {
          id: nextId,
          eventId: selectedEventId || (selectedEv ? selectedEv.id : "gcp-study-jam"),
          eventName: selectedEv ? selectedEv.name : "GDG Event",
          score: scoreVal,
          comments: commentVal,
          attendeeName: attendeeNameVal,
          sentiment: guessedSentiment,
          timestamp: timestampVal
        };

        if (userId) {
          try {
            await addDoc(collection(db, "feedbacks"), {
              id: nextId,
              eventId: selectedEventId || (selectedEv ? selectedEv.id : "gcp-study-jam"),
              eventName: selectedEv ? selectedEv.name : "GDG Event",
              score: scoreVal,
              comments: commentVal,
              attendeeName: attendeeNameVal,
              sentiment: guessedSentiment,
              timestamp: timestampVal
            });
          } catch (dbErr) {
            console.error("Firestore sync write error:", dbErr);
          }
        } else {
          importedList.push(nextItem);
        }
      }

      if (userId) {
        await onRefreshFeedbacks();
      } else {
        setFeedbacks(prev => [...importedList, ...prev]);
      }

      setSheetsSuccess(`Successfully synchronized ${rows.length - 1} attendee reviews from Google Spreadsheet into the Hub datastore!`);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || "Failed to load Google Sheets row values.");
    } finally {
      setSheetsSyncing(false);
    }
  };

  // Bevy CSV Export
  const handleExportBevyCSV = () => {
    if (filteredFeedbacks.length === 0) {
      alert("No feedback responses available to export.");
      return;
    }

    const headers = ["Testimonial ID", "Attendee Name", "Event", "Rating (Score)", "Comments (Testimonial)", "Sentiment", "Timestamp"];
    const rows = filteredFeedbacks.map(fb => [
      fb.id,
      fb.attendeeName,
      fb.eventName,
      fb.score.toString(),
      `"${fb.comments.replace(/"/g, '""')}"`,
      fb.sentiment,
      fb.timestamp
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bevy_Feedback_Export_${selectedEventFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Forms/Sheets CSV automatic bulk import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const addedList: FeedbackItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        if (cols.length < 2) continue;

        let name = cols[0]?.replace(/"/g, "").trim() || "Anonymous Developer";
        let ratingStr = cols[1]?.replace(/"/g, "").trim() || "5";
        let commentText = cols[2]?.replace(/"/g, "").trim() || "Thank you so much GDG!";
        let scoreVal = parseInt(ratingStr, 10) || 5;

        let guessedSentiment: "positive" | "neutral" | "negative" = "positive";
        if (scoreVal === 3) guessedSentiment = "neutral";
        if (scoreVal < 3) guessedSentiment = "negative";

        const nextId = "fb-csv-" + Date.now() + "-" + i;
        const selectedEv = events[0];

        const nextItem: FeedbackItem = {
          id: nextId,
          eventId: selectedEventId || (selectedEv ? selectedEv.id : "ev-0"),
          eventName: selectedEv ? selectedEv.name : "GDG Event",
          score: scoreVal,
          comments: commentText,
          attendeeName: name,
          sentiment: guessedSentiment,
          timestamp: new Date().toISOString()
        };

        if (userId) {
          try {
            await addDoc(collection(db, "feedbacks"), {
              id: nextId,
              eventId: selectedEventId || (selectedEv ? selectedEv.id : "ev-0"),
              eventName: selectedEv ? selectedEv.name : "GDG Event",
              score: scoreVal,
              comments: commentText,
              attendeeName: name,
              sentiment: guessedSentiment,
              timestamp: serverTimestamp()
            });
          } catch (err) {
            console.error("Firestore bundle write error: ", err);
          }
        } else {
          addedList.push(nextItem);
        }
      }

      if (userId) {
        await onRefreshFeedbacks();
      } else {
        setFeedbacks(prev => [...addedList, ...prev]);
      }
      alert("Success! Bulk feedback responses integrated from Sheet CSV.");
    };
    reader.readAsText(file);
  };

  // Filter Logic
  const filteredFeedbacks = selectedEventFilter === "all"
    ? feedbacks
    : feedbacks.filter(f => f.eventId === selectedEventFilter);

  // Averages
  const totalReviewsCount = filteredFeedbacks.length;
  const averageRating = totalReviewsCount > 0
    ? (filteredFeedbacks.reduce((sum, f) => sum + f.score, 0) / totalReviewsCount).toFixed(1)
    : "0.0";

  // Sentiments counter
  const positiveCount = filteredFeedbacks.filter(f => f.score >= 4).length;
  const neutralCount = filteredFeedbacks.filter(f => f.score === 3).length;
  const negativeCount = filteredFeedbacks.filter(f => f.score <= 2).length;

  // Star calculation
  const getRefArray = (length: number) => Array.from({ length }, (_, i) => i);

  // Submit Feedback entry
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !comments) return;

    setIsSubmitting(true);
    const selectedEv = events.find(ev => ev.id === selectedEventId);
    
    let guessedSentiment: "positive" | "neutral" | "negative" = "positive";
    if (score === 3) guessedSentiment = "neutral";
    if (score < 3) guessedSentiment = "negative";

    const nextId = "fb-custom-" + Date.now();
    const nextItem: FeedbackItem = {
      id: nextId,
      eventId: selectedEventId,
      eventName: selectedEv ? selectedEv.name : "GDG Event",
      score,
      comments,
      attendeeName: attendeeName || "Anonymous Developer",
      sentiment: guessedSentiment,
      timestamp: new Date().toISOString()
    };

    try {
      if (userId) {
        const refPath = "feedbacks";
        try {
          await addDoc(collection(db, refPath), {
            id: nextId,
            eventId: selectedEventId,
            eventName: selectedEv ? selectedEv.name : "GDG Event",
            score,
            comments,
            attendeeName: attendeeName || "Anonymous Developer",
            sentiment: guessedSentiment,
            timestamp: serverTimestamp()
          });
          await onRefreshFeedbacks();
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, refPath);
        }
      } else {
        setFeedbacks(prev => [nextItem, ...prev]);
      }

      setAttendeeName("");
      setComments("");
      setIsAddingResponse(false);
      alert("Feedback logged! Sentiments computed and registered.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-6.5rem)] overflow-hidden">
      {/* Left 4 Columns: Statistics & New entry */}
      <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-y-auto space-y-4">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center bg-white">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Feedback Metrics</h3>
              <p className="text-[11px] text-slate-400">Aggregate metrics from post-event Google forms</p>
            </div>
            <button
              onClick={() => setIsAddingResponse(!isAddingResponse)}
              className="p-1 px-2.5 bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold rounded hover:bg-blue-100 transition"
            >
              + Input
            </button>
          </div>

          {/* Aggregates Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold font-mono text-slate-800">{averageRating}</span>
              <span className="text-[9px] text-yellow-500 flex gap-0.5 mt-1 font-bold">
                ★ Average Rating
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold font-mono text-slate-800">{totalReviewsCount}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                Total Surveys
              </span>
            </div>
          </div>

          {/* Sentiment breakdowns */}
          <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
            <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Estimated sentiment load</p>
            
            <div className="space-y-1.5 text-[11px]">
              <div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Positive (4-5 ★)</span>
                  <span>{positiveCount} reviews ({totalReviewsCount > 0 ? Math.round((positiveCount/totalReviewsCount)*100) : 0}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${totalReviewsCount > 0 ? (positiveCount/totalReviewsCount)*100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Neutral (3 ★)</span>
                  <span>{neutralCount} reviews ({totalReviewsCount > 0 ? Math.round((neutralCount/totalReviewsCount)*100) : 0}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${totalReviewsCount > 0 ? (neutralCount/totalReviewsCount)*100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Critical (1-2 ★)</span>
                  <span>{negativeCount} reviews ({totalReviewsCount > 0 ? Math.round((negativeCount/totalReviewsCount)*100) : 0}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400" style={{ width: `${totalReviewsCount > 0 ? (negativeCount/totalReviewsCount)*100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bevy Feed & Google Forms toolkit */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet size={12} className="text-blue-500" />
              <span>Forms & Bevy Gateway</span>
            </h4>

            {/* Google Forms configuration */}
            <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-100 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600">Active Google Form</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(googleFormLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="text-[9px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 whitespace-nowrap"
                >
                  <Copy size={9} />
                  <span>{copiedLink ? "Copied!" : "Copy Survey"}</span>
                </button>
              </div>

              <input
                type="text"
                value={googleFormLink}
                onChange={e => handleSaveFormLink(e.target.value)}
                placeholder="Paste survey invitation link..."
                className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 outline-none text-slate-700 bg-white"
              />
              <p className="text-[9px] text-slate-400">
                Configure your own event feedback form here. Send this link to attendees post-event.
              </p>
            </div>

            {/* CSV Export & Import automation */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBevyCSV}
                className="flex items-center justify-center gap-1 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-bold py-1.5 rounded text-[10px] transition"
              >
                <Download size={11} className="shrink-0" />
                <span className="truncate">Export Bevy CSV</span>
              </button>

              <label className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-1.5 rounded text-[10px] transition cursor-pointer">
                <Upload size={11} className="text-slate-500 shrink-0" />
                <span className="truncate">Bulk Import Sheet</span>
                <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
              </label>
            </div>

            {/* Real-time Google Sheets feedback integration */}
            <div className="bg-emerald-50/20 rounded-lg p-3 border border-emerald-100 flex flex-col gap-2 font-sans">
              <div className="flex justify-between items-center bg-transparent">
                <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <FileSpreadsheet size={12} className="text-emerald-600" />
                  <span>Sync Google Forms Response Sheet</span>
                </span>
                {googleAccessToken ? (
                  <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase">Connected</span>
                ) : (
                  <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded uppercase">Offline</span>
                )}
              </div>

              {!googleAccessToken ? (
                <p className="text-[9px] text-slate-400">
                  Connect sheets permissions in the <strong className="text-blue-600">Integrations</strong> tab to fetch attendee responses live from your linked Google Sheet.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[9px] text-slate-400 leading-tight block">
                    Each row generates a feedback entry. Expects columns: <strong>Timestamp | Attendee Name | Star Rating (1-5) | Comment</strong>.
                  </p>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Paste response Spreadsheet URL..."
                      value={sheetsUrl}
                      onChange={e => setSheetsUrl(e.target.value)}
                      className="flex-1 bg-white border border-slate-250 text-[10px] p-1.5 rounded outline-none placeholder:text-slate-400 text-slate-800 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handlePullFeedbacksFromSheets}
                      disabled={sheetsSyncing || !sheetsUrl}
                      className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shrink-0 transition"
                    >
                      {sheetsSyncing ? "Pulling..." : "Sync Responses"}
                    </button>
                  </div>

                  {sheetsError && (
                    <div className="p-2.5 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 flex items-start gap-1">
                      <AlertCircle size={11} className="text-red-500 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-tight">{sheetsError}</span>
                    </div>
                  )}

                  {sheetsSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded text-[10px] text-emerald-800 flex items-start gap-1">
                      <CheckCircle size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-tight">{sheetsSuccess}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input response forms dialog */}
        {isAddingResponse && (
          <form onSubmit={handleSubmitFeedback} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-[11px] font-bold text-slate-600">Record Attendee Survey</p>
            
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Related Event</label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
                required
              >
                <option value="">-- Choose ---</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Rating Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScore(val)}
                    className={`flex-1 p-1 py-1 px-1.5 border rounded text-xs transition ${
                      score === val 
                        ? "bg-blue-600 text-white border-blue-600 font-bold" 
                        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {val} ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Attendee Name</label>
              <input
                type="text"
                placeholder="e.g. Sam Roy (Optional)"
                value={attendeeName}
                onChange={e => setAttendeeName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Comments / Critical Review</label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Attendee statement or recommendations..."
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none resize-none"
                rows={3}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold p-2 text-xs rounded hover:bg-blue-700 transition"
            >
              {isSubmitting ? "Saving entry..." : "Save survey response"}
            </button>
          </form>
        )}
      </div>

      {/* Right 8 Columns: Dynamic Filter list feedback queue */}
      <div className="col-span-12 lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 h-12">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Surveys & Testimonials</h3>
            <p className="text-[11px] text-slate-400">Verbatim comments from check-ins</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={11} className="text-slate-400" />
            <select
              value={selectedEventFilter}
              onChange={e => setSelectedEventFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded p-1 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
            >
              <option value="all">All Events Combined</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
          {filteredFeedbacks.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400"> No survey entries recorded for this filter setting.</p>
          ) : (
            filteredFeedbacks.map(f => (
              <div key={f.id} className="p-4 rounded-xl border border-slate-150/80 bg-slate-50/50 hover:bg-slate-50 flex flex-col gap-2.5 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center select-none">
                      {f.attendeeName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{f.attendeeName}</p>
                      <p className="text-[9px] text-slate-400">Attendee at: <span className="font-semibold text-slate-500">{f.eventName || "GDG Event"}</span></p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5 text-yellow-400">
                      {getRefArray(f.score).map(starIdx => (
                        <Star key={starIdx} size={11} fill="currentColor" />
                      ))}
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      f.sentiment === "positive" 
                        ? "bg-green-100 text-green-700" 
                        : f.sentiment === "neutral"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {f.sentiment}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-700 leading-normal pl-0.5 select-text">
                  "{f.comments}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
