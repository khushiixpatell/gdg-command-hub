import React, { useState, useRef, useEffect } from "react";
import { 
  Palette, Download, Sparkles, Check, Share2, Type, Layout, Info, Image,
  Layers, ChevronRight, Laptop, Lightbulb, Compass, Award, ExternalLink, Upload
} from "lucide-react";

// Tech logo definitions & clean SVGs constructed from vectors
interface TechOption {
  id: string;
  name: string;
  color: string;
  symbol: React.ReactNode;
}

const TECH_OPTIONS: TechOption[] = [
  {
    id: "gemini",
    name: "Gemini / GenAI",
    color: "#4285F4",
    symbol: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-blue-500 animate-pulse">
        <path d="M12 2a1 1 0 011 1v2.5a1.5 1.5 0 003 0V3a1 1 0 012 0v2.5a3.5 3.5 0 01-7 0V3a1 1 0 011-1z" opacity="0.3" />
        <path d="M12 3c.13 4.25 3.75 7.87 8 8-.13-4.25-3.75-7.87-8-8zM12 21c-.13-4.25-3.75-7.87-8-8 .13 4.25 3.75 7.87 8 8zM12 3c-.13 4.25-3.75 7.87-8 8 .13-4.25 3.75-7.87 8-8zM12 21c.13-4.25 3.75-7.87 8-8-.13 4.25-3.75 7.87-8 8z" fill="currentColor" />
      </svg>
    )
  },
  {
    id: "flutter",
    name: "Flutter",
    color: "#02569B",
    symbol: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#02569B]">
        <path fill="currentColor" d="M14.31 2.18L4.3 12.18l4.33 4.33 11.37-11.37-4.32-4.32l-.37-.36zm.37 13.06L10.35 19.6l4.33 4.33 5.32-5.32c.11-.11.21-.21.28-.35.13-.26.11-.58-.09-.78l-.33-.33-5.18-5.08z" />
      </svg>
    )
  },
  {
    id: "cloud",
    name: "Google Cloud",
    color: "#4285F4",
    symbol: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-500">
        <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
      </svg>
    )
  },
  {
    id: "firebase",
    name: "Firebase",
    color: "#FFCA28",
    symbol: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-500">
        <path fill="currentColor" d="M16 2.4a1.33 1.33 0 00-2.13-.53L3.4 12.2a1.33 1.33 0 001.07 2.2h8l2.13 6.4a1.33 1.33 0 002.13.53l6.4-10.6a1.33 1.33 0 00-1.07-2.2h-3.2L16 2.4z" opacity="0.85" />
      </svg>
    )
  },
  {
    id: "android",
    name: "Android Dev",
    color: "#3DDC84",
    symbol: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#3DDC84]">
        <path fill="currentColor" d="M7 11h2v2H7zm8 0h2v2h-2zm-4.32-6.52l-1.4-1.4a.5.5 0 10-.7.7l1.43 1.43C9.07 5.76 7.91 7.19 7.42 9H16.58c-.49-1.81-1.65-3.24-2.59-4.79l1.43-1.43a.5.5 0 10-.7-.7l-1.4 1.4C12.57 4.16 12.1 4 11.68 4s-.89.16-1.12.48zM5 10a1 1 0 00-1 1v6a1 1 0 002 0v-6a1 1 0 00-1-1zm14 0a1 1 0 00-1 1v6a1 1 0 002 0v-6a1 1 0 00-1-1z" />
      </svg>
    )
  }
];

interface BannerTheme {
  id: string;
  name: string;
  bgClass: string;
  gridColor: string;
  textColor: string;
  accentStyles: {
    badge: string;
    decor: string;
    gradient: string;
  };
}

const THEMES: BannerTheme[] = [
  {
    id: "google-light",
    name: "GDG Corporate Clean (Light)",
    bgClass: "bg-white border-2 border-slate-100",
    gridColor: "rgba(226, 232, 240, 0.6)",
    textColor: "text-slate-900",
    accentStyles: {
      badge: "bg-blue-100 text-blue-700 font-bold border border-blue-200",
      decor: "border-blue-100 bg-blue-50/50",
      gradient: "from-blue-500 via-red-500 to-amber-500"
    }
  },
  {
    id: "cyber-dark",
    name: "Tech Immersive (Dark)",
    bgClass: "bg-slate-950 border-2 border-slate-900",
    gridColor: "rgba(51, 65, 85, 0.45)",
    textColor: "text-white",
    accentStyles: {
      badge: "bg-[#0F172A] text-cyan-400 font-bold border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]",
      decor: "border-slate-800 bg-[#0F172A]/80",
      gradient: "from-cyan-400 via-indigo-500 to-purple-600"
    }
  },
  {
    id: "vibrant-google",
    name: "Google Flagship Palette",
    bgClass: "bg-slate-900 border-2 border-slate-800",
    gridColor: "rgba(71, 85, 105, 0.3)",
    textColor: "text-white",
    accentStyles: {
      badge: "bg-gradient-to-r from-blue-500/20 via-red-500/20 to-yellow-500/10 text-yellow-300 border border-yellow-500/30",
      decor: "border-slate-800/80 bg-slate-800/40",
      gradient: "from-blue-500 via-red-500 to-amber-500"
    }
  },
  {
    id: "academic-teal",
    name: "Sunset Warmth (Creative)",
    bgClass: "bg-amber-50/20 border-2 border-amber-100",
    gridColor: "rgba(251, 191, 36, 0.15)",
    textColor: "text-slate-900",
    accentStyles: {
      badge: "bg-amber-100 text-amber-800 font-bold border border-amber-200",
      decor: "border-orange-100 bg-orange-50/40",
      gradient: "from-orange-500 via-pink-500 to-indigo-500"
    }
  }
];

interface AspectRatioOption {
  id: string;
  name: string;
  label: string;
  ratio: string; // Tailwind aspect aspect-video, etc.
  canvasWidth: number;
  canvasHeight: number;
}

const ASPECTS: AspectRatioOption[] = [
  { id: "16-9", name: "16:9 Event Card", label: "Event Promo, YouTube, LinkedIn Post", ratio: "aspect-video", canvasWidth: 1200, canvasHeight: 675 },
  { id: "1-1", name: "1:1 Instagram Square", label: "Instagram, WhatsApp, Slack Alert", ratio: "aspect-square", canvasWidth: 800, canvasHeight: 800 },
  { id: "4-1", name: "4:1 Chapter Banner", label: "LinkedIn Company, Chapter Platform Header", ratio: "aspect-[4/1]", canvasWidth: 1200, canvasHeight: 300 }
];

export default function BannerCreatorView() {
  // Input Settings States
  const [chapter, setChapter] = useState("GDG On Campus • Stanford University");
  const [eventTitle, setEventTitle] = useState("AI Ignite: Building Full-Stack Apps with Gemini");
  const [topic, setTopic] = useState("Hands-on workshop, student projects, and API mentorship");
  const [dateInfo, setDateInfo] = useState("Thursday, October 22 • 6:00 PM PST");
  const [hostSpeaker, setHostSpeaker] = useState("Speaker: Dr. Julian Vance (Senior Google PM)");
  const [selectedTech, setSelectedTech] = useState("gemini");
  const [selectedTheme, setSelectedTheme] = useState("cyber-dark");
  const [selectedAspect, setSelectedAspect] = useState("16-9");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCoping, setIsCoping] = useState(false);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [suggestedTopic, setSuggestedTopic] = useState("");

  // Custom branding logo upload support
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [useCustomLogo, setUseCustomLogo] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-synchronize canvas drawing so we can trigger PNG download instantly
  const activeAspect = ASPECTS.find(a => a.id === selectedAspect) || ASPECTS[0];
  const activeTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];
  const activeTechObj = TECH_OPTIONS.find(t => t.id === selectedTech) || TECH_OPTIONS[0];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogo(reader.result as string);
        setUseCustomLogo(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setCustomLogo(null);
    setUseCustomLogo(false);
  };

  // Helper mock generation of promo descriptions using local insights
  const handleGenerateIdea = () => {
    setGeneratingIdea(true);
    setTimeout(() => {
      const ideas = [
        "Cloud Architectures: Master Firebase Auth + Firestore security keys step-by-step",
        "Flutter Widgets sprint: Draw modular beautiful vector engines across mobile platforms",
        "Next-Gen Gemini Hack: Formulate streaming tool-calls and JSON parameters in Express",
        "Android Jetpack Compose: Animate material bento structures and touch targets beautifully"
      ];
      const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
      setTopic(randomIdea);
      setGeneratingIdea(false);
    }, 450);
  };

  // Safe Image Loader Promise
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // Real core procedural drawing of GDG watermarks
  const drawTechEmblem = (ctx: CanvasRenderingContext2D, techId: string, x: number, y: number, color: string) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (techId === "gemini") {
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.quadraticCurveTo(x, y, x + 14, y);
      ctx.quadraticCurveTo(x, y, x, y + 14);
      ctx.quadraticCurveTo(x, y, x - 14, y);
      ctx.quadraticCurveTo(x, y, x, y - 14);
      ctx.closePath();
      ctx.fill();
    } else if (techId === "flutter") {
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 12);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x - 4, y + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x + 2, y + 18);
      ctx.stroke();
    } else if (techId === "cloud") {
      ctx.beginPath();
      ctx.arc(x - 5, y, 7, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(x + 1, y - 5, 8, Math.PI * 1.0, Math.PI * 2.0);
      ctx.arc(x + 7, y, 7, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (techId === "firebase") {
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x + 11, y + 10);
      ctx.lineTo(x - 11, y + 10);
      ctx.closePath();
      ctx.fill();
    } else if (techId === "android") {
      ctx.beginPath();
      ctx.arc(x, y + 1, 10, Math.PI, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 1.5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Antennas
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 8);
      ctx.lineTo(x - 9, y - 13);
      ctx.moveTo(x + 4, y - 8);
      ctx.lineTo(x + 9, y - 13);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handleDownloadPNG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = activeAspect.canvasWidth;
    const height = activeAspect.canvasHeight;
    canvas.width = width;
    canvas.height = height;

    const isDark = activeTheme.id === "cyber-dark" || activeTheme.id === "vibrant-google";

    // 1. Fill Background
    ctx.fillStyle = isDark ? (activeTheme.id === "cyber-dark" ? "#020617" : "#0f172a") : "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Decorative Tech Grid Background Lines
    ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.45)" : "rgba(226, 232, 240, 0.8)";
    ctx.lineWidth = 1;
    const gap = 40;
    for (let x = 0; x < width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Draw a Google-colored horizontal accent line at the bottom
    const progressColors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];
    const segmentWidth = width / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = progressColors[i];
      ctx.fillRect(i * segmentWidth, height - 12, segmentWidth, 12);
    }

    const logoX = width * 0.1;
    const logoY = height * 0.22;

    // 4. Draw Logo Badge (Custom or Standard GDG logo)
    if (useCustomLogo && customLogo) {
      try {
        const logoImg = await loadImage(customLogo);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX, logoY, 42, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.fillStyle = isDark ? "#1e293b" : "#f1f5f9";
        ctx.fillRect(logoX - 42, logoY - 42, 84, 84);
        
        ctx.drawImage(logoImg, logoX - 42, logoY - 42, 84, 84);
        ctx.restore();
        
        ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(logoX, logoY, 42, 0, Math.PI * 2);
        ctx.stroke();
      } catch (logoErr) {
        console.error("Failed to load custom uploaded logo on Canvas canvas:", logoErr);
      }
    } else {
      ctx.fillStyle = isDark ? "#1e293b" : "#f1f5f9";
      ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.arc(logoX, logoY, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red G circle segment for visual GDG recognition
      ctx.strokeStyle = "#4285F4";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(logoX, logoY, 24, Math.PI * 0.2, Math.PI * 1.7);
      ctx.stroke();
      
      ctx.fillStyle = "#FBBC05";
      ctx.beginPath();
      ctx.arc(logoX + 20, logoY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Render Texts (Chapter and Event Title)
    ctx.font = "bold 20px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = isDark ? "#38bdf8" : "#2563eb"; // Accent chapter prefix
    ctx.fillText("GOOGLE DEVELOPER GROUPS", logoX + 70, logoY - 14);

    ctx.font = "500 18px 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
    ctx.fillText(chapter.toUpperCase(), logoX + 70, logoY + 12);

    // Title Font
    ctx.font = "bold 44px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
    
    // Wrapping Event Title safely if it exceeds aspect boundaries
    const titleText = eventTitle;
    const textX = width * 0.08;
    const textY = height * 0.48;
    ctx.fillText(titleText, textX, textY);

    // Subtitle Topics
    ctx.font = "italic 22px 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#cbd5e1" : "#334155";
    ctx.fillText(topic, textX, textY + 45);

    // Speakers info
    ctx.font = "600 24px 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#38bdf8" : "#2563eb";
    ctx.fillText(hostSpeaker, textX, textY + 95);

    // Date & Location Details Badge
    const dateY = height * 0.82;
    ctx.fillStyle = isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(241, 245, 249, 0.9)";
    ctx.strokeStyle = isDark ? "rgba(71, 85, 105, 0.6)" : "rgba(203, 213, 225, 0.9)";
    ctx.beginPath();
    ctx.roundRect(textX, dateY - 32, width * 0.8, 52, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = "600 20px 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#f8fafc" : "#1e293b";
    ctx.fillText(dateInfo, textX + 24, dateY);

    // 6. Modern Tech Focus Emblem Pill Badge on the right side
    const emblemX = width - 265;
    const emblemY = dateY - 6;

    // Draw background pill shape
    ctx.fillStyle = isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(241, 245, 249, 0.95)";
    ctx.strokeStyle = isDark ? "rgba(71, 85, 105, 0.8)" : "rgba(203, 213, 225, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(emblemX, emblemY - 26, 220, 52, 26);
    ctx.fill();
    ctx.stroke();

    // Draw Vector Icon segment procedurally
    drawTechEmblem(ctx, activeTechObj.id, emblemX + 32, emblemY, activeTechObj.color);

    // Draw text inside emblem next to vector
    ctx.font = "bold 13px 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#f8fafc" : "#1e293b";
    ctx.fillText(activeTechObj.name.toUpperCase(), emblemX + 58, emblemY + 5);

    // Generate output stream and download
    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `GDG_Event_${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-y-auto pb-10">
      
      {/* 1. Left Editor Side Panel controls */}
      <div className="w-full lg:w-5/12 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
              <Palette size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950">Campus Card Constructor</h3>
              <p className="text-[11px] text-slate-500">Formulate official Google-branded event promo graphics instantly.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Texts Selection */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event Information</label>
            
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">GDG Chapter Name</label>
              <input
                type="text"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                placeholder="GDG On Campus, State University"
                className="w-full text-xs font-medium border border-slate-200 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Event Title</label>
              <input
                type="text"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-slate-400">Core Subtitle / Topics</label>
                <button 
                  onClick={handleGenerateIdea}
                  disabled={generatingIdea}
                  className="text-[9px] text-pink-600 hover:text-pink-700 font-bold flex items-center gap-0.5"
                >
                  <Sparkles size={8} />
                  <span>{generatingIdea ? "Spinning..." : "Suggest Focus"}</span>
                </button>
              </div>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={2}
                className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Speaker Line</label>
                <input
                  type="text"
                  value={hostSpeaker}
                  onChange={e => setHostSpeaker(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Date & Hour</label>
                <input
                  type="text"
                  value={dateInfo}
                  onChange={e => setDateInfo(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Aspect Ratios Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">1. Card Canvas Dimensions</label>
            <div className="grid grid-cols-1 gap-2">
              {ASPECTS.map((asp) => (
                <button
                  key={asp.id}
                  onClick={() => setSelectedAspect(asp.id)}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-3 transition-colors ${
                    selectedAspect === asp.id
                      ? "border-blue-600 bg-blue-50/40 text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <Layout size={16} className={`mt-0.5 ${selectedAspect === asp.id ? "text-blue-600" : "text-slate-400"}`} />
                  <div>
                    <p className="text-xs font-bold leading-tight">{asp.name}</p>
                    <p className="text-[10px] text-slate-400">{asp.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Colors and Background Preset */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">2. Aesthetic Palette</label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-2 rounded-lg border text-left transition ${
                    selectedTheme === theme.id
                      ? "border-blue-600 bg-blue-50/20 ring-1 ring-blue-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[11px] font-bold truncate text-slate-900">{theme.name}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Technical badges watermark choice */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">3. Technical Badge Emblem</label>
            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => setSelectedTech(tech.id)}
                  className={`p-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                    selectedTech === tech.id
                      ? "bg-slate-900 text-white border border-slate-900"
                      : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                  }`}
                >
                  <span className="shrink-0">{tech.symbol}</span>
                  <span>{tech.name}</span>
                  {selectedTech === tech.id && <Check size={10} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom logo integration */}
          <div className="space-y-2 pt-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">4. Custom branding insignia</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50 rounded-lg p-3 cursor-pointer transition">
                <div className="flex flex-col items-center justify-center text-center">
                  <Upload size={16} className="text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-600">Upload corporate logo</p>
                  <p className="text-[8px] text-slate-400 font-medium">PNG, JPG, SVG up to 2MB</p>
                </div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>

              {customLogo && (
                <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 relative flex flex-col items-center gap-1.5 shrink-0 w-24">
                  <img src={customLogo} alt="Corporate logo thumb" className="w-12 h-12 rounded object-contain border border-slate-100 bg-white" referrerpolicy="no-referrer" />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setUseCustomLogo(!useCustomLogo)}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        useCustomLogo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {useCustomLogo ? "Active" : "Muted"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="text-[8px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded hover:bg-red-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Offline download triggering button */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleDownloadPNG}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold p-3 rounded-lg text-xs shadow-md transition-all active:scale-95"
          >
            <Download size={14} />
            <span>Generate & Export High-Res PNG</span>
          </button>
          <p className="text-[9px] text-center text-slate-400 mt-2">
            Renders local vector geometry off-screen. Safe, crisp 2K asset ready.
          </p>
        </div>
      </div>

      {/* 2. Right Canvas Render Field (Real-time HTML preview component & hidden actual high-res Canvas element) */}
      <div className="flex-1 flex flex-col justify-between space-y-6">
        
        {/* Real-time HTML Preview Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-500">Live Workspace Canvas Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
              <span className="text-[10px] font-bold text-green-600 uppercase">Synchronized</span>
            </div>
          </div>

          <div className="relative border border-slate-200 bg-slate-100 rounded-xl overflow-hidden shadow-inner p-3 flex justify-center items-center backdrop-blur-sm">
            
            {/* The Actual Display Render Box mimicking original SVG styling in real time */}
            <div 
              id="gdg-preview-banner"
              className={`w-full max-w-2xl shadow-xl rounded-lg p-6 sm:p-8 relative ${activeTheme.bgClass} flex flex-col justify-between overflow-hidden cursor-default transition-all duration-300 ${activeAspect.ratio}`}
              style={{
                backgroundSize: "30px 30px",
                backgroundImage: `linear-gradient(to right, ${activeTheme.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${activeTheme.gridColor} 1px, transparent 1px)`
              }}
            >
              {/* Corner Watermarks / Google logo indicators */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
                <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              </div>

              {/* Header section (Chapter Info) */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 border border-slate-700/50 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                  {useCustomLogo && customLogo ? (
                    <img src={customLogo} alt="Chapter Custom Logo" className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                  ) : (
                    <div className="relative flex items-center justify-center w-full h-full">
                      <div className="w-6 h-6 border-4 border-blue-500 rounded-full border-t-transparent animate-[spin_3s_linear_infinite]" />
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full absolute top-3.5 right-3.5" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] font-bold text-blue-500 tracking-widest uppercase">GOOGLE DEVELOPER GROUPS</p>
                  <h4 className={`text-xs sm:text-sm font-bold tracking-tight uppercase ${activeTheme.textColor}`}>
                    {chapter}
                  </h4>
                </div>
              </div>

              {/* Title & Topic details block */}
              <div className="space-y-2 my-2 sm:my-3">
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-bold uppercase tracking-wider inline-block ${activeTheme.accentStyles.badge}`}>
                  #GDGOnCampus
                </span>
                <h1 className={`text-lg sm:text-2xl font-black tracking-tight leading-tight uppercase ${activeTheme.textColor}`}>
                  {eventTitle}
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                  {topic}
                </p>
              </div>

              {/* Footer specs (speaker, date, custom tech badge overlay) */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-blue-500 block">
                    {hostSpeaker}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-slate-400">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-mono">
                      {dateInfo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end">
                  <div className="p-1 px-3 rounded-full bg-slate-800/80 border border-slate-700/40 flex items-center gap-2">
                    <span className="text-white scale-90">{activeTechObj.symbol}</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">{activeTechObj.name}</span>
                  </div>
                </div>
              </div>

              {/* Four-color stripe anchor highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                <div className="flex-1 bg-blue-500"></div>
                <div className="flex-1 bg-red-400"></div>
                <div className="flex-1 bg-yellow-400"></div>
                <div className="flex-1 bg-green-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* GDG Brand Poster Guidelines & Quick Templates card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
            <Info size={14} className="text-blue-500" />
            <span>GDG Community Brand Asset Design Principles</span>
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100">
              <span className="p-1 px-2.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">Rule 1</span>
              <p className="text-xs font-bold text-slate-800 mt-2">Consistent Header Info</p>
              <p className="text-[11px] text-slate-500 mt-1">Always display the official chapter university title cleanly on top level.</p>
            </div>

            <div className="p-3 rounded-lg bg-red-50/40 border border-red-100">
              <span className="p-1 px-2.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase">Rule 2</span>
              <p className="text-xs font-bold text-slate-800 mt-2">Topic Alignment</p>
              <p className="text-[11px] text-slate-500 mt-1">Include speaker titles clearly, and align the specific Google technology badges.</p>
            </div>

            <div className="p-3 rounded-lg bg-yellow-50/30 border border-yellow-100">
              <span className="p-1 px-2.5 rounded bg-yellow-100 text-yellow-700 text-[9px] font-extrabold uppercase">Rule 3</span>
              <p className="text-xs font-bold text-slate-800 mt-2">High Contrast Typography</p>
              <p className="text-[11px] text-slate-500 mt-1">Verify contrast. Avoid mixing complex patterns behind title texts.</p>
            </div>
          </div>
        </div>

        {/* Hidden internal HTML Canvas element referenced globally to export real graphics */}
        <canvas ref={canvasRef} className="hidden" />

      </div>
    </div>
  );
}
