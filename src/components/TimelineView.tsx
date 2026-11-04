import React, { useState } from "react";
import { Calendar, RefreshCw, Plus, CheckCircle, ExternalLink, CalendarDays, Clock, User, AlertCircle } from "lucide-react";
import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { EventItem, MilestoneItem } from "../mockData";
import { addGCalEvent, listGCalEvents, GCalEvent } from "../gcal";

interface TimelineViewProps {
  events: EventItem[];
  milestones: MilestoneItem[];
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneItem[]>>;
  gcalEvents: GCalEvent[];
  setGcalEvents: React.Dispatch<React.SetStateAction<GCalEvent[]>>;
  gcalToken: string | null;
  onRefreshGcal: () => Promise<void>;
  userId: string | null;
  onRefreshMilestones: () => Promise<void>;
}

export default function TimelineView({
  events,
  milestones,
  setMilestones,
  gcalEvents,
  setGcalEvents,
  gcalToken,
  onRefreshGcal,
  userId,
  onRefreshMilestones
}: TimelineViewProps) {
  // Calendar Navigation
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth];

  // Forms
  const [newTitle, setNewTitle] = useState<string>("");
  const [newEventId, setNewEventId] = useState<string>("");
  const [newDeadline, setNewDeadline] = useState<string>("2026-06-12");
  const [assignedTo, setAssignedTo] = useState<string>("Jane Doe");
  const [isAddingMilestone, setIsAddingMilestone] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Toggle milestone status
  const handleToggleMilestone = async (m: MilestoneItem, firestoreDocId?: string) => {
    const nextCompleted = !m.completed;
    
    // Optimistic update
    setMilestones(prev => prev.map(item => item.id === m.id ? { ...item, completed: nextCompleted } : item));

    if (userId && firestoreDocId) {
      const selectedEventId = m.eventId;
      const refPath = `events/${selectedEventId}/milestones`;
      try {
        await updateDoc(doc(db, refPath, firestoreDocId), {
          completed: nextCompleted
        });
        await onRefreshMilestones();
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `${refPath}/${firestoreDocId}`);
      }
    }
  };

  // Create Milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newEventId) return;

    const nextId = "m-custom-" + Date.now();
    const nextMilestone: MilestoneItem = {
      id: nextId,
      eventId: newEventId,
      title: newTitle,
      deadline: newDeadline,
      completed: false,
      assignedTo: assignedTo,
      syncedWithGCal: false,
      reminderDays: 3
    };

    try {
      if (userId) {
        const refPath = `events/${newEventId}/milestones`;
        try {
          await addDoc(collection(db, refPath), {
            id: nextId,
            eventId: newEventId,
            title: newTitle,
            deadline: newDeadline,
            completed: false,
            assignedTo: assignedTo,
            syncedWithGCal: false,
            reminderDays: 3,
            createdAt: serverTimestamp()
          });
          await onRefreshMilestones();
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, refPath);
        }
      } else {
        setMilestones(prev => [...prev, nextMilestone]);
      }

      setNewTitle("");
      setIsAddingMilestone(false);
      alert("Milestone tracking registered successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // Sync individual milestone to GCal (Uses Google Calendars API on user confirmation)
  const handleSyncToGCal = async (m: MilestoneItem, firestoreDocId?: string) => {
    if (!gcalToken) {
      alert("Google Calendar is not synced. Please connect via Integrations in the settings first.");
      return;
    }

    try {
      const matchEvent = events.find(e => e.id === m.eventId);
      const desc = `Milestone for ${matchEvent ? matchEvent.name : "GDG Event"}. Assigned Organizer: ${m.assignedTo}. Managed via GDG Hub console.`;
      
      const response = await addGCalEvent(gcalToken, {
        title: `GDG: ${m.title}`,
        description: desc,
        deadline: m.deadline
      });

      if (response && response.id) {
        // Mark as synced
        setMilestones(prev => prev.map(item => item.id === m.id ? { ...item, syncedWithGCal: true, gcalEventId: response.id } : item));
        
        if (userId && firestoreDocId) {
          const refPath = `events/${m.eventId}/milestones`;
          try {
            await updateDoc(doc(db, refPath, firestoreDocId), {
              syncedWithGCal: true,
              gcalEventId: response.id
            });
            await onRefreshMilestones();
          } catch(dbErr) {
            handleFirestoreError(dbErr, OperationType.UPDATE, `${refPath}/${firestoreDocId}`);
          }
        }
        alert("Event synchronized successfully to primary Google Calendar!");
      }
    } catch (error: any) {
      alert("Failed sync transaction: " + error.message);
    }
  };

  // Calendar render math (Month Grid)
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  const getFirstDayOfMonth = (year: number, month: number) => {
    const d = new Date(year, month, 1).getDay();
    // Translate standard Sunday (0) to match our Monday-first structure if wanted, 
    // but standard Grid is fine: Sun(0), Mon(1)
    return d;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Generate calendar cells (e.g. 35 cells)
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  // Find milestones matching cell day
  const getTimelineItemsForDay = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const matchedMilestones = milestones.filter(m => m.deadline === formattedDate);
    
    // Matched Google Calendar events
    const matchedGCal = gcalEvents.filter(ge => {
      const gDate = ge.start.date || ge.start.dateTime?.substring(0, 10);
      return gDate === formattedDate;
    });

    return {
      milestones: matchedMilestones,
      gcal: matchedGCal
    };
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-6.5rem)] overflow-hidden">
      {/* Left 8 Columns: Dynamic Visual Grid Calendar */}
      <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Month Navigation Indicator header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Master Event Timeline</h3>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full select-none">
              {monthName} {currentYear}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(prev => prev - 1);
                } else {
                  setCurrentMonth(prev => prev - 1);
                }
              }}
              className="p-1.5 hover:bg-slate-100 text-slate-500 rounded transition"
            >
              ◀
            </button>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(prev => prev + 1);
                } else {
                  setCurrentMonth(prev => prev + 1);
                }
              }}
              className="p-1.5 hover:bg-slate-100 text-slate-500 rounded transition"
            >
              ▶
            </button>
            <button
              onClick={onRefreshGcal}
              disabled={!gcalToken}
              className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded text-xs border border-slate-200 transition ${
                gcalToken 
                  ? "bg-white hover:bg-slate-50 text-slate-600 font-medium" 
                  : "bg-slate-50 text-slate-300 cursor-not-allowed"
              }`}
              title={gcalToken ? "Sync actual Google Calendar events" : "Unlock via Integration tab first"}
            >
              <RefreshCw size={12} className={isSyncingAll ? "animate-spin" : ""} />
              <span>GCal Pull</span>
            </button>
          </div>
        </div>

        {/* Master Month grid */}
        <div className="flex-1 flex flex-col overflow-hidden font-sans">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 text-center uppercase shrink-0 select-none">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(dayName => (
              <div key={dayName} className="p-2 border-r border-slate-100">{dayName}</div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto">
            {cells.map((dayNum, cellIdx) => {
              const { milestones: dayMiles, gcal: dayGcals } = dayNum ? getTimelineItemsForDay(dayNum) : { milestones: [], gcal: [] };
              const today = new Date();
              const isToday = dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

              return (
                <div 
                  key={cellIdx} 
                  className={`p-1.5 border-r border-b border-slate-100 min-h-[75px] max-h-[140px] overflow-y-auto flex flex-col justify-between transition-colors ${
                    !dayNum 
                      ? "bg-slate-50/30 text-slate-300" 
                      : isToday 
                      ? "bg-blue-50/50 hover:bg-blue-50" 
                      : "hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex justify-between items-center bg-transparent shrink-0">
                    <span className={`text-[11px] font-semibold font-mono ${
                      !dayNum ? "text-slate-300" : isToday ? "text-blue-600 font-bold" : "text-slate-700"
                    }`}>
                      {dayNum || ""}
                    </span>
                    {isToday && (
                      <span className="text-[8px] bg-blue-600 text-white font-bold p-0.5 px-1 rounded uppercase">Today</span>
                    )}
                  </div>

                  {/* Cell Deadlines Items */}
                  <div className="mt-1 space-y-1 overflow-y-auto flex-1">
                    {dayMiles.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => handleToggleMilestone(m, (m as any).firestoreId)}
                        className={`p-1 rounded text-[9px] leading-tight cursor-pointer font-medium border text-left ${
                          m.completed
                            ? "bg-slate-100 text-slate-400 border-slate-200 line-through"
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}
                        title={`${m.title} (Organizer: ${m.assignedTo})`}
                      >
                        ⏱️ {m.title}
                      </div>
                    ))}

                    {/* Google Calendar Imported Elements */}
                    {dayGcals.map(gEvent => (
                      <div 
                        key={gEvent.id}
                        className="p-1 bg-sky-50 text-sky-800 rounded border border-sky-100 text-[9px] leading-tight text-left font-bold"
                        title={`Imported from GCal: ${gEvent.summary}`}
                      >
                        🗓️ {gEvent.summary}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right 4 Columns: Timeline Control & Milestones Form */}
      <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-y-auto space-y-4">
        {/* Creator Trigger */}
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Timeline & Milestones</h3>
            <p className="text-[11px] text-slate-400">Map out your deliverables, assign and push to calendar</p>
          </div>
          <button
            onClick={() => setIsAddingMilestone(!isAddingMilestone)}
            className="p-1 px-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded text-[11px] font-bold transition flex items-center gap-1"
          >
            <Plus size={12} />
            <span>Add</span>
          </button>
        </div>

        {/* Conditional Add Form */}
        {isAddingMilestone && (
          <form onSubmit={handleCreateMilestone} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-[11px] font-bold text-slate-600">Register Next Deadline</p>
            
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Related Event</label>
              <select
                value={newEventId}
                onChange={e => setNewEventId(e.target.value)}
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
              <label className="text-[9px] uppercase font-bold text-slate-500">Milestone Action Heading</label>
              <input
                type="text"
                placeholder="e.g. Setup registration badges"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Deadline Date</label>
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Lead Assignment</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
              >
                <option value="Jane Doe">Jane Doe (Logistics)</option>
                <option value="Alex Mark">Alex Mark (Outreach)</option>
                <option value="Kris Dev">Kris Dev (Tech Lead)</option>
                <option value="Lia Wood">Lia Wood (Design)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 text-white rounded p-2 text-xs font-semibold hover:bg-blue-700 transition"
            >
              Insert Milestone
            </button>
          </form>
        )}

        {/* Milestone Queue with GCal Sync Action */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Milestones Queue & Actions</p>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {milestones.length === 0 ? (
              <p className="text-center text-[10px] text-slate-400">Empty timelines queue</p>
            ) : (
              milestones.map(m => {
                const matchEv = events.find(et => et.id === m.eventId);
                return (
                  <div key={m.id} className="p-3 border border-slate-100 rounded bg-slate-50/50 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{m.title}</p>
                        <p className="text-[9px] text-slate-400 truncate max-w-[180px]">Ref: {matchEv ? matchEv.name : "Unlinked"}</p>
                      </div>
                      <span className={`text-[8px] font-bold p-0.5 px-1.5 rounded uppercase ${
                        m.completed ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-600"
                      }`}>
                        {m.completed ? "done" : "open"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-100/60">
                      <span className="flex items-center gap-0.5"><Clock size={10} /> {m.deadline}</span>
                      <span className="flex items-center gap-0.5"><User size={10} /> {m.assignedTo}</span>
                    </div>

                    {/* Sync Action */}
                    {!m.syncedWithGCal ? (
                      <button
                        onClick={() => handleSyncToGCal(m, (m as any).firestoreId)}
                        className="mt-1.5 w-full flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 text-[10px] rounded hover:bg-blue-100 border border-blue-100 font-bold transition-all"
                      >
                        <CalendarDays size={12} />
                        <span>Push to Google Calendar</span>
                      </button>
                    ) : (
                      <div className="mt-1.5 p-1 text-center bg-green-50 rounded border border-green-100 text-[9px] text-green-700 font-bold flex items-center justify-center gap-1">
                        <CheckCircle size={10} /> Synced to Google Calendar
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
