import React, { useState, useEffect } from "react";
import {
  BarChart,
  Calendar,
  FileText,
  Users,
  MessageSquare,
  Settings,
  Menu,
  Bell,
  Search,
  Plus,
  UserCheck,
  ShieldAlert,
  Palette,
  Coins
} from "lucide-react";
import { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  collectionGroup
} from "firebase/firestore";

import {
  db,
  initAuth,
  googleSignIn,
  logout
} from "./firebase";

import {
  EventItem,
  MilestoneItem,
  DraftItem,
  FeedbackItem,
  TaskItem
} from "./mockData";

import { listGCalEvents, GCalEvent } from "./gcal";

// Import Views
import DashboardView from "./components/DashboardView";
import OutreachView from "./components/OutreachView";
import TimelineView from "./components/TimelineView";
import TasksView from "./components/TasksView";
import FeedbackView from "./components/FeedbackView";
import IntegrationsView from "./components/IntegrationsView";
import BannerCreatorView from "./components/BannerCreatorView";
import PitchHelperView from "./components/PitchHelperView";

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [gcalToken, setGcalToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Datastore States - populated only from Firestore
  const [events, setEvents] = useState<EventItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Selected Event Context for statistical filtering
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);

  // Google Calendar API pulls state
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);

  // 1. Listen for auth changes on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setGcalToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setGcalToken(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Fetch GCal events if access token is available
  const fetchGCal = async () => {
    if (gcalToken) {
      try {
        const eventsList = await listGCalEvents(gcalToken);
        setGcalEvents(eventsList);
      } catch (err) {
        console.error("Failing to grab GCal contents:", err);
      }
    }
  };

  useEffect(() => {
    if (gcalToken) {
      fetchGCal();
    }
  }, [gcalToken]);

  // 3. Sync database real-time on successful login
  useEffect(() => {
    if (!user) return;

    // Events
    const unsubEvents = onSnapshot(
      collection(db, "events"),
      (snapshot) => {
        const list: EventItem[] = [];

        snapshot.forEach((d) => {
          list.push({
            ...d.data() as EventItem,
            firestoreId: d.id
          } as any);
        });

        setEvents(list);

        const match =
          list.find((e) => e.status === "planning") ||
          list[0] ||
          null;

        setActiveEvent(match);
      }
    );

    // Drafts
    const unsubDrafts = onSnapshot(
      collection(db, "drafts"),
      (snapshot) => {
        const list: DraftItem[] = [];

        snapshot.forEach((d) => {
          list.push({
            ...d.data() as DraftItem,
            firestoreId: d.id
          } as any);
        });

        setDrafts(list);
      }
    );

    // Feedback
    const unsubFeedbacks = onSnapshot(
      collection(db, "feedbacks"),
      (snapshot) => {
        const list: FeedbackItem[] = [];

        snapshot.forEach((d) => {
          list.push({
            ...d.data() as FeedbackItem,
            firestoreId: d.id
          } as any);
        });

        setFeedbacks(list);
      }
    );

    // Tasks
    const unsubTasks = onSnapshot(
      collection(db, "tasks"),
      (snapshot) => {
        const list: TaskItem[] = [];

        snapshot.forEach((d) => {
          list.push({
            ...d.data() as TaskItem,
            firestoreId: d.id
          } as any);
        });

        setTasks(list);
      }
    );

    // Milestones
    const unsubMilestones = onSnapshot(
      collectionGroup(db, "milestones"),
      (snapshot) => {
        const list: MilestoneItem[] = [];

        snapshot.forEach((d) => {
          list.push({
            ...d.data() as MilestoneItem,
            firestoreId: d.id
          } as any);
        });

        setMilestones(list);
      }
    );

    return () => {
      unsubEvents();
      unsubDrafts();
      unsubFeedbacks();
      unsubTasks();
      unsubMilestones();
    };
  }, [user]);

  // Auth logins
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);

    try {
      const res = await googleSignIn();

      if (res) {
        setUser(res.user);
        setGcalToken(res.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error("Popup integration failed: ", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setGcalToken(null);
    setNeedsAuth(true);
  };

  // Search filtering logic across operational tabs
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Dynamic Navigation Sidebar */}
      <aside
        className={`w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-transform md:translate-x-0 ${
          mobileMenuOpen
            ? "translate-x-0 absolute z-50 h-full"
            : "-translate-x-full md:relative md:flex"
        }`}
      >
        {/* Hub Header title */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-extrabold text-white">
              G
            </div>

            <div>
              <h1 className="text-sm font-bold tracking-tight">
                GDG Organizer
              </h1>

              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Campus Engine
              </p>
            </div>
          </div>

          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary Views Buttons Queue */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

          <div className="text-[9px] text-slate-500 font-bold uppercase px-3 py-1.5 tracking-wider">
            Primary Console
          </div>

          <button
            onClick={() => {
              setActiveTab("dashboard");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "dashboard"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <BarChart size={14} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("outreach");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "outreach"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <FileText size={14} />
            <span>Outreach & AI Drafts</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("timeline");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "timeline"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Calendar size={14} />
            <span>Calendar Timeline</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("tasks");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "tasks"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Users size={14} />
            <span>Team & Workloads</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("feedback");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "feedback"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <MessageSquare size={14} />
            <span>Feedback Operations</span>
          </button>

          <div className="text-[9px] text-slate-500 font-bold uppercase px-3 py-1.5 tracking-wider mt-4">
            Visuals & Sponsors
          </div>

          <button
            onClick={() => {
              setActiveTab("banners");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "banners"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Palette size={14} />
            <span>Banner Art & Socials</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("pitch");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "pitch"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Coins size={14} />
            <span>Budget & Sponsor Pitch</span>
          </button>

          <div className="text-[9px] text-slate-500 font-bold uppercase px-3 py-1.5 tracking-wider mt-4">
            API Configurations
          </div>

          <button
            onClick={() => {
              setActiveTab("integrations");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-colors ${
              activeTab === "integrations"
                ? "bg-blue-600 font-bold text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Settings size={14} />
            <span>GCal Integration</span>
          </button>
        </nav>

        {/* User Account bottom badge profile info */}
        <div className="p-4 border-t border-slate-800">
          {user ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-800/40 border border-slate-800/30">
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate text-slate-100">
                  {user.displayName || "GDG Leader"}
                </p>

                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  {user.email?.split("@")[0]}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="text-[9px] bg-slate-900 border border-slate-700 hover:bg-slate-950 p-1 rounded font-bold text-slate-400"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow"
            >
              <UserCheck size={12} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Container Content */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* High Density header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1 bg-slate-100 text-slate-600 rounded"
            >
              <Menu size={16} />
            </button>

            <h2 className="text-base font-bold text-slate-800">
              GDG Organizer Hub
            </h2>

            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-wider">
              {activeEvent
                ? `Event Active: ${activeEvent.name}`
                : "Console Ready"}
            </span>
          </div>

          <div className="flex items-center gap-4">

            {/* Real Search bar filter */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search commands, drafts, tasks..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                className="bg-slate-100 border-none rounded-md px-3.5 py-1.5 pl-8 text-xs w-64 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 pr-8"
              />

              <span className="absolute left-2.5 top-2 text-slate-400">
                <Search size={12} />
              </span>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setActiveTab("outreach");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Plus size={12} />
              <span>New Draft</span>
            </button>
          </div>
        </header>

        {/* Context search box overlay notification */}
        {searchQuery && (
          <div className="p-3 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between text-xs text-yellow-800">
            <span>
              Filtering views based on search keywords:{" "}
              <strong>{searchQuery}</strong>
            </span>

            <button
              onClick={() => setSearchQuery("")}
              className="font-bold"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Direct page component wrapper */}
        <div className="flex-1 p-6 overflow-hidden">

          {activeTab === "dashboard" && (
            <DashboardView
              events={events.filter(e =>
                e.name.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              milestones={milestones.filter(m =>
                m.title.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              tasks={tasks.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              feedbacks={feedbacks.filter(f =>
                f.comments.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              activeEvent={activeEvent}
              setActiveEvent={setActiveEvent}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "outreach" && (
            <OutreachView
              events={events}
              drafts={drafts}
              setDrafts={setDrafts}
              userId={user ? user.uid : null}
              onRefreshDrafts={async () => {}}
            />
          )}

          {activeTab === "timeline" && (
            <TimelineView
              events={events}
              milestones={milestones}
              setMilestones={setMilestones}
              gcalEvents={gcalEvents}
              setGcalEvents={setGcalEvents}
              gcalToken={gcalToken}
              onRefreshGcal={fetchGCal}
              userId={user ? user.uid : null}
              onRefreshMilestones={async () => {}}
            />
          )}

          {activeTab === "tasks" && (
            <TasksView
              tasks={tasks}
              setTasks={setTasks}
              userId={user ? user.uid : null}
              onRefreshTasks={async () => {}}
            />
          )}

          {activeTab === "feedback" && (
            <FeedbackView
              events={events}
              feedbacks={feedbacks}
              setFeedbacks={setFeedbacks}
              userId={user ? user.uid : null}
              onRefreshFeedbacks={async () => {}}
              googleAccessToken={gcalToken}
            />
          )}

          {activeTab === "integrations" && (
            <IntegrationsView
              user={user}
              gcalToken={gcalToken}
              onLogin={handleGoogleLogin}
              onLogout={handleLogout}
              isLoggingIn={isLoggingIn}
              events={events}
            />
          )}

          {activeTab === "banners" && (
            <BannerCreatorView />
          )}

          {activeTab === "pitch" && (
            <PitchHelperView
              googleAccessToken={gcalToken}
              user={user}
              eventNameContext={activeEvent ? activeEvent.name : ""}
            />
          )}

        </div>
      </main>
    </div>
  );
}