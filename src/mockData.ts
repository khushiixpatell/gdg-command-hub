export interface EventItem {
  id: string;
  name: string;
  date: string;
  description: string;
  registrationCount: number;
  targetRegistration: number;
  status: "planning" | "active" | "completed";
  createdAt: string;
}

export interface MilestoneItem {
  id: string;
  eventId: string;
  title: string;
  deadline: string;
  completed: boolean;
  assignedTo: string;
  syncedWithGCal: boolean;
  gcalEventId?: string;
  reminderDays: number;
}

export interface DraftItem {
  id: string;
  title: string;
  type: "newsletter" | "sponsor" | "speaker" | "event";
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedbackItem {
  id: string;
  eventId: string;
  eventName?: string;
  score: number;
  comments: string;
  attendeeName: string;
  sentiment: "positive" | "neutral" | "negative";
  timestamp: string;
}

export interface TaskItem {
  id: string;
  title: string;
  assignedTo: string;
  status: "todo" | "inprogress" | "done";
  importance: "low" | "medium" | "high";
  dueDate: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}

export const INITIAL_MEMBERS: TeamMember[] = [
  { id: "jane", name: "Jane Doe", role: "Logistics", avatarColor: "bg-blue-500" },
  { id: "alex", name: "Alex Mark", role: "Outreach", avatarColor: "bg-orange-500" },
  { id: "kris", name: "Kris Dev", role: "Tech Lead", avatarColor: "bg-emerald-500" },
  { id: "lia", name: "Lia Wood", role: "Design", avatarColor: "bg-purple-500" }
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: "flutter-mob",
    name: "Flutter Mobile Coding Hack",
    date: "2026-05-10",
    description: "Hands-on build challenge to inspect widgets and craft animations on multiple screens.",
    registrationCount: 280,
    targetRegistration: 250,
    status: "completed",
    createdAt: "2026-04-01T10:00:00Z"
  },
  {
    id: "gcp-study-jam",
    name: "Google Cloud Study Jam",
    date: "2026-05-30",
    description: "Learn essentials of compute engines, cloud run deployments and BigQuery.",
    registrationCount: 148,
    targetRegistration: 150,
    status: "active",
    createdAt: "2026-05-01T12:00:00Z"
  },
  {
    id: "devfest-2026",
    name: "GDG DevFest On Campus '26",
    date: "2026-06-15",
    description: "The largest campus developer festival focusing on Gemini integrations, custom web models, and networking.",
    registrationCount: 384,
    targetRegistration: 500,
    status: "planning",
    createdAt: "2026-05-15T09:00:00Z"
  },
  {
    id: "solution-challenge",
    name: "Solution Challenge Syncup",
    date: "2026-07-10",
    description: "Ideation and team forming for Google Solution Challenge 2026 to impact community problems.",
    registrationCount: 42,
    targetRegistration: 120,
    status: "planning",
    createdAt: "2026-05-20T14:30:00Z"
  }
];

export const INITIAL_MILESTONES: MilestoneItem[] = [
  {
    id: "m-flutter-1",
    eventId: "flutter-mob",
    title: "Reserve Main Tech Auditorium",
    deadline: "2026-05-01",
    completed: true,
    assignedTo: "Jane Doe",
    syncedWithGCal: false,
    reminderDays: 3
  },
  {
    id: "m-flutter-2",
    eventId: "flutter-mob",
    title: "Draft Mobile Speaker List",
    deadline: "2026-05-03",
    completed: true,
    assignedTo: "Alex Mark",
    syncedWithGCal: false,
    reminderDays: 1
  },
  {
    id: "m-study-1",
    eventId: "gcp-study-jam",
    title: "Apply for Cloud Credits",
    deadline: "2026-05-25",
    completed: true,
    assignedTo: "Kris Dev",
    syncedWithGCal: false,
    reminderDays: 5
  },
  {
    id: "m-study-2",
    eventId: "gcp-study-jam",
    title: "Send RSVP reminders",
    deadline: "2026-05-28",
    completed: false,
    assignedTo: "Alex Mark",
    syncedWithGCal: false,
    reminderDays: 2
  },
  {
    id: "m-devfest-1",
    eventId: "devfest-2026",
    title: "Design Sponsor Brochure pdf",
    deadline: "2026-05-27",
    completed: false,
    assignedTo: "Lia Wood",
    syncedWithGCal: false,
    reminderDays: 3
  },
  {
    id: "m-devfest-2",
    eventId: "devfest-2026",
    title: "Reach out to Google Speakers",
    deadline: "2026-06-02",
    completed: false,
    assignedTo: "Kris Dev",
    syncedWithGCal: false,
    reminderDays: 4
  },
  {
    id: "m-devfest-3",
    eventId: "devfest-2026",
    title: "Order Attendee T-shirts & Swag",
    deadline: "2026-06-08",
    completed: false,
    assignedTo: "Jane Doe",
    syncedWithGCal: false,
    reminderDays: 7
  }
];

export const INITIAL_DRAFTS: DraftItem[] = [
  {
    id: "d-1",
    title: "GDG Weekly Developer Digest #14",
    type: "newsletter",
    content: `# GDG Weekly Digest - Build the Future Together!

Hey Community! 🚀

Another exciting week at GDG Campus. We've got amazing hands-on codelabs coming up this month!

## Upcoming Events
- **Google Cloud Study Jam** (May 30th) - Spin up VM instances, learn cloud run strategies, and earn your official skill badges.
- **DevFest Campus 2026** (June 15th) - Reserve your seats for keynotes, developer lounges, and physical swag.

## Trivia Corner
Did you know? Google's Cloud Run can scale down exactly to 0 instances when idle, helping students run apps at absolutely zero cost!

See you on campus,
GDG Organizing Team`,
    createdAt: "2026-05-21T11:00:00Z"
  },
  {
    id: "d-2",
    title: "Gold Tier Sponsor Proposal: Tech Corp",
    type: "sponsor",
    content: `Dear [Sponsor Partnership Manager],

On behalf of GDG On Campus, I would like to invite Tech Corp to partner with us for our upcoming "GDG DevFest On Campus '26" on June 15th, 2026.

As a Gold Tier sponsor ($1,500), Tech Corp will possess:
- Prime logo spot on banners, student landing pages, and volunteer jerseys.
- Dedicated booth in the main University Tech Lobby.
- Feature pitch in our email reach to over 500+ top engineering and CS students on campus.

Partnering with us offers a synchronized, direct recruitment portal to the brightest programming talents at our institution.

Let us know if we can schedule a quick 10-minute slot on [Due Date] to review details.

Best regards,
[Organizer Name]
Lead, GDG On Campus`,
    createdAt: "2026-05-23T15:20:00Z"
  }
];

export const INITIAL_FEEDBACKS: FeedbackItem[] = [
  {
    id: "fb-1",
    eventId: "flutter-mob",
    eventName: "Flutter Mobile Coding Hack",
    score: 5,
    comments: "Excellent hands-on teaching! The mentors went down each table helping us set up the environment and fixing dependency errors.",
    attendeeName: "Ananya Roy",
    sentiment: "positive",
    timestamp: "2026-05-11T09:00:00Z"
  },
  {
    id: "fb-2",
    eventId: "flutter-mob",
    eventName: "Flutter Mobile Coding Hack",
    score: 4,
    comments: "Really loved the customized layout challenges. The venue got a bit crammed, but otherwise perfectly structured, good snacks!",
    attendeeName: "Rohan Bhatia",
    sentiment: "positive",
    timestamp: "2026-05-11T11:15:00Z"
  },
  {
    id: "fb-3",
    eventId: "flutter-mob",
    eventName: "Flutter Mobile Coding Hack",
    score: 3,
    comments: "The code demonstrations went a bit fast for absolute beginners. Highly suggest providing github repositories before starting session.",
    attendeeName: "Sam Wright",
    sentiment: "neutral",
    timestamp: "2026-05-11T14:40:00Z"
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "t-1",
    title: "Secure food & catering contracts",
    assignedTo: "Jane Doe",
    status: "inprogress",
    importance: "high",
    dueDate: "2026-05-28"
  },
  {
    id: "t-2",
    title: "Design main DevFest keynote slide layouts",
    assignedTo: "Lia Wood",
    status: "done",
    importance: "medium",
    dueDate: "2026-05-25"
  },
  {
    id: "t-3",
    title: "Setup RSVP pages & check-in QR codes",
    assignedTo: "Kris Dev",
    status: "inprogress",
    importance: "high",
    dueDate: "2026-05-29"
  },
  {
    id: "t-4",
    title: "Prepare speaker guidelines email",
    assignedTo: "Alex Mark",
    status: "todo",
    importance: "low",
    dueDate: "2026-06-01"
  }
];
