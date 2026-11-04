import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Play, Clipboard, FileText, Calendar, Users, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { EventItem, MilestoneItem, TaskItem, FeedbackItem } from "../mockData";

interface DashboardViewProps {
  events: EventItem[];
  milestones: MilestoneItem[];
  tasks: TaskItem[];
  feedbacks: FeedbackItem[];
  activeEvent: EventItem | null;
  setActiveEvent: (event: EventItem | null) => void;
  onNavigate: (view: string) => void;
}

export default function DashboardView({
  events,
  milestones,
  tasks,
  feedbacks,
  activeEvent,
  setActiveEvent,
  onNavigate
}: DashboardViewProps) {
  // Calculations
  const totalRegistrations = events.reduce((sum, e) => sum + e.registrationCount, 0);
  const totalTarget = events.reduce((sum, e) => sum + e.targetRegistration, 0);
  const pendingMilestones = milestones.filter(m => !m.completed).length;
  const completedTaskCount = tasks.filter(t => t.status === "done").length;
  const totalTaskCount = tasks.length;
  const draftSuccessRate = "88%"; // Conversions of invites to speaker alignments

  // Days to next active event
  const upcomingEvents = events
    .filter(e => e.status !== "completed")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const nextEvent = upcomingEvents[0] || null;
  
  const daysToNextEvent = () => {
    if (!nextEvent) return "N/A";
    const eventTime = new Date(nextEvent.date).getTime();
    const todayTime = new Date("2026-05-24").getTime(); // Use current local time provided
    const diff = Math.ceil((eventTime - todayTime) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Recharts registration trends data (Events list)
  const chartData = events.map(e => ({
    name: e.name.substring(0, 15) + "...",
    Registrations: e.registrationCount,
    Target: e.targetRegistration
  }));

  // Feedbacks average calculation
  const totalFeedbackAvg = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length).toFixed(1)
    : "4.5";

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-5rem)] pb-8 pr-1">
      {/* Top 4 Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Registrations</span>
              <span className="p-1 px-2 text-[9px] bg-blue-50 text-blue-600 rounded-full font-medium flex items-center gap-0.5">
                <TrendingUp size={10} /> +12%
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{totalRegistrations}</span>
              <span className="text-xs text-slate-500">/ {totalTarget} target</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (totalRegistrations / totalTarget) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Timeline Milestones</span>
              {pendingMilestones > 2 && (
                <span className="p-1 px-2 text-[9px] bg-red-50 text-red-600 rounded-full font-medium flex items-center gap-0.5">
                  <AlertTriangle size={10} /> urgent
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{pendingMilestones}</span>
              <span className="text-xs text-slate-500">pending tasks</span>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {milestones.slice(0, 4).map((m, idx) => (
              <div 
                key={m.id || idx} 
                className={`h-1.5 w-full rounded-full ${m.completed ? "bg-slate-300" : "bg-red-400"}`}
                title={m.title}
              ></div>
            ))}
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Draft Success Rate</span>
              <span className="p-1 px-2 text-[9px] bg-green-50 text-green-600 rounded-full font-medium">
                high sync
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{draftSuccessRate}</span>
              <span className="text-xs text-slate-500">outreach conversions</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full w-[88%]"></div>
            </div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Days to Next Event</span>
              <span className="p-1 px-2 text-[9px] font-mono font-bold text-blue-600 bg-blue-50 rounded">
                {nextEvent ? nextEvent.date : "None"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 italic font-mono">
                {daysToNextEvent()}
              </span>
              <span className="text-xs text-slate-500 truncate max-w-[130px]">
                {nextEvent ? nextEvent.name : "No active events"}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full w-[65%]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Analytical visualizer + Event Track list */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left 8 Columns: Charting and Selector */}
        <div className="col-span-12 lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Registration & Target Cap Trends</h3>
              <p className="text-xs text-slate-400">Total sign-ups of campus students compared against targets</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> Signups
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block"></span> Target
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="Registrations" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReg)" />
                <Area type="monotone" dataKey="Target" stroke="#cbd5e1" strokeDasharray="3 3" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button 
              onClick={() => onNavigate("outreach")}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium transition-all"
            >
              <FileText size={14} className="text-blue-500" />
              <span>Compose Drafts</span>
            </button>
            <button 
              onClick={() => onNavigate("timeline")}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium transition-all"
            >
              <Calendar size={14} className="text-orange-500" />
              <span>GCal Timeline</span>
            </button>
            <button 
              onClick={() => onNavigate("tasks")}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium transition-all"
            >
              <Users size={14} className="text-emerald-500" />
              <span>Team Workload</span>
            </button>
          </div>
        </div>

        {/* Right 4 Columns: GDG Events status list */}
        <div className="col-span-12 lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">GDG Events Console</h3>
              <p className="text-xs text-slate-400">Manage, select, and filter your active schedules</p>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {events.map(e => {
                const isActive = activeEvent?.id === e.id;
                return (
                  <div
                    key={e.id}
                    onClick={() => setActiveEvent(e)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{e.name}</p>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        e.status === "active" 
                          ? "bg-green-100 text-green-700" 
                          : e.status === "planning" 
                          ? "bg-yellow-100 text-yellow-700" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{e.description}</p>
                    <div className="flex justify-between items-center mt-2.5 text-[10px] text-slate-400">
                      <span>Date: {e.date}</span>
                      <span className="font-semibold text-slate-700">
                        {e.registrationCount} RSVPs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Avg Feedback Rating:</span>
            <span className="font-bold text-yellow-500 flex items-center gap-1">
              ★ {totalFeedbackAvg} <span className="text-[10px] text-slate-400 font-normal">({feedbacks.length} reviews)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
