import React, { useState, useEffect } from "react";
import { 
  Coins, DollarSign, Sparkles, Send, Copy, Check, FileText, Plus, Trash2, 
  ArrowUpRight, TrendingUp, HelpCircle, Users, Percent, Briefcase, RefreshCw, AlertCircle,
  FileSpreadsheet, Download, Upload, Link2, CheckCircle
} from "lucide-react";
import { User } from "firebase/auth";

// Pre-defined sponsorship benefits tiers suggestion helper
interface SponsorshipTierHelper {
  name: string;
  cost: number;
  benefits: string;
}

const SPONSOR_TIERS_GUIDANCE: SponsorshipTierHelper[] = [
  { name: "Platinum (Title Sponsor)", cost: 1500, benefits: "Opening keynotes, customized resume books, recruitment booths, large banner layouts, and 5 minutes opening address slot." },
  { name: "Gold Sponsor", cost: 800, benefits: "Resume book collection database, company logo integrated into standard promotional social cards, and table space for distribution." },
  { name: "Silver Sponsor", cost: 400, benefits: "Standard logo representation on community slides and opening remarks shoutout." }
];

interface BudgetItem {
  id: string;
  category: string;
  name: string;
  cost: number;
}

interface PitchHelperViewProps {
  googleAccessToken?: string | null;
  user?: User | null;
  eventNameContext?: string;
}

export default function PitchHelperView({ googleAccessToken, user, eventNameContext }: PitchHelperViewProps) {
  // Budget Data States (Hydrate default campus guidelines event)
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([
    { id: "1", category: "Food & Drinks", name: "Pizza & Refreshment for 120 Students", cost: 480 },
    { id: "2", category: "Swag & Marketing", name: "GDG Branded Holographic Stickers & Badges", cost: 120 },
    { id: "3", category: "Hardware/Prizes", name: "Raspberry Pis & Dev Kits for Hackathon Winners", cost: 350 },
    { id: "4", category: "Prints & Banners", name: "GDG Roll-up Pull Banner printed layout", cost: 110 },
    { id: "5", category: "Speaker", name: "Speaker travel allowance & guest card gift basket", cost: 140 }
  ]);

  // Sponsorship Incoming funds
  const [confirmedSponsorFunds, setConfirmedSponsorFunds] = useState<number>(600);
  const [estimatedAudience, setEstimatedAudience] = useState<number>(120);

  // BudgetItem form states
  const [newCat, setNewCat] = useState("Food & Drinks");
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");

  // Gemini Pitch form states
  const [eventName, setEventName] = useState("GDG Campus Flutter Bootcamp & Dev Ignite");
  const [chapterName, setChapterName] = useState("GDG On Campus • Stanford University");
  const [sponsorName, setSponsorName] = useState("Venture Tech Labs (or Local Sponsor)");
  const [selectedTier, setSelectedTier] = useState("Gold Sponsor ($800)");
  const [sponsorBenefits, setSponsorBenefits] = useState("Interactive opening keynote remarks, full attendee resume collection, tech branding placement on social banner graphics.");
  
  // Gemini response outputs
  const [pitchContent, setPitchContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Google Sheets state
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>("");
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string>("");
  const [sheetSyncing, setSheetSyncing] = useState<boolean>(false);
  const [sheetSyncError, setSheetSyncError] = useState<string>("");
  const [sheetSyncSuccess, setSheetSyncSuccess] = useState<string>("");

  // Sync event context from props
  useEffect(() => {
    if (eventNameContext) {
      setEventName(eventNameContext);
    }
  }, [eventNameContext]);

  // Auto Calculations
  const totalCost = budgetItems.reduce((acc, item) => acc + item.cost, 0);
  const remainingDeficit = Math.max(0, totalCost - confirmedSponsorFunds);
  const perAttendeeCost = estimatedAudience > 0 ? (totalCost / estimatedAudience) : 0;
  const fundedPercentage = totalCost > 0 ? Math.min(100, Math.round((confirmedSponsorFunds / totalCost) * 100)) : 0;

  // Add line item handler
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCost) return;
    const costVal = parseFloat(newCost);
    if (isNaN(costVal)) return;

    setBudgetItems([
      ...budgetItems,
      {
        id: Date.now().toString(),
        category: newCat,
        name: newName,
        cost: costVal
      }
    ]);

    setNewName("");
    setNewCost("");
  };

  // Delete line item
  const handleDeleteItem = (id: string) => {
    setBudgetItems(budgetItems.filter(i => i.id !== id));
  };

  // Push budget to a new Google Sheet
  const handlePushToGoogleSheets = async () => {
    if (!googleAccessToken) {
      setSheetSyncError("Google Account is not connected. Connect via Integrations tab first.");
      return;
    }
    setSheetSyncing(true);
    setSheetSyncError("");
    setSheetSyncSuccess("");
    setCreatedSheetUrl("");

    try {
      // 1. Create Spreadsheet
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            title: `GDG Budget: ${eventName || "Campus Campaign"}`
          }
        })
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create Google Sheet: ${createRes.statusText}`);
      }

      const sheetData = await createRes.json();
      const spreadsheetId = sheetData.spreadsheetId;
      const spreadsheetUrl = sheetData.spreadsheetUrl;

      // 2. Format values
      const bodyRows = budgetItems.map(item => [item.category, item.name, item.cost]);
      const values = [
        ["Category", "Expense Description", "Cost ($)"],
        ...bodyRows,
        [],
        ["SUMMARY METRICS"],
        ["Total Cost", "", totalCost],
        ["Confirmed Sponsor Funding", "", confirmedSponsorFunds],
        ["Remaining Deficit", "", remainingDeficit],
        ["Estimated Headcount (Student RSVPs)", "", estimatedAudience],
        ["Per Student overhead", "", perAttendeeCost]
      ];

      // 3. Write Values
      const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:C100?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          range: "A1:C100",
          majorDimension: "ROWS",
          values: values
        })
      });

      if (!writeRes.ok) {
        throw new Error(`Failed to write values to Google Sheet: ${writeRes.statusText}`);
      }

      setCreatedSheetUrl(spreadsheetUrl);
      setSheetSyncSuccess(`Created and synchronized! Spreadsheet title: "GDG Budget: ${eventName || "Campus Campaign"}".`);
    } catch (err: any) {
      console.error(err);
      setSheetSyncError(err.message || "Failed to push budget to Google Sheets.");
    } finally {
      setSheetSyncing(false);
    }
  };

  // Load budget from an existing Google Sheet
  const handlePullFromGoogleSheets = async () => {
    if (!googleAccessToken) {
      setSheetSyncError("Google Account is not connected. Connect via Integrations tab first.");
      return;
    }
    if (!spreadsheetUrl) {
      setSheetSyncError("Please enter a valid Google Spreadsheet URL or ID.");
      return;
    }
    setSheetSyncing(true);
    setSheetSyncError("");
    setSheetSyncSuccess("");

    try {
      const matchKey = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = matchKey ? matchKey[1] : spreadsheetUrl.trim();

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:C100`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`
        }
      });

      if (!res.ok) {
        throw new Error(`Sheet not found. Please verify the URL or ensure ownership/permissions: ${res.statusText}`);
      }

      const data = await res.json();
      const rows = data.values;
      if (!rows || rows.length <= 1) {
        throw new Error("No data found or sheet is empty. Header row is required.");
      }

      // Parse spreadsheet rows
      const newItems: BudgetItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        // Stop parsing if we reach summary metrics sections or empty sections
        if (row[0] === "SUMMARY METRICS" || row[0] === "" || row[0] === "Total Cost" || row[0] === "Confirmed Sponsor Funding") {
          break;
        }

        const category = row[0] || "Food & Drinks";
        const description = row[1] || "Imported Item";
        const cost = parseFloat((row[2] || "").replace(/[^0-9.]/g, "")) || 0;

        newItems.push({
          id: `sheet-import-${Date.now()}-${i}`,
          category,
          name: description,
          cost
        });
      }

      if (newItems.length === 0) {
        throw new Error("Could not parse any budget items from the sheet columns.");
      }

      setBudgetItems(newItems);
      setSheetSyncSuccess(`Successfully imported ${newItems.length} budget lines from your active Google Spreadsheet!`);
    } catch (err: any) {
      console.error(err);
      setSheetSyncError(err.message || "Failed to load Google Sheet data. Confirm authorization.");
    } finally {
      setSheetSyncing(false);
    }
  };

  // Autofill budget numbers directly into Pitch prompt details
  const handleSyncBudgetToPitch = () => {
    const formattedSummary = `$${totalCost} overall budget ($${perAttendeeCost.toFixed(1)} per student overhead for estimated ${estimatedAudience} attendees) with a capital shortfall of $${remainingDeficit} remaining.`;
    
    // Auto populate
    setSponsorBenefits(`Full brand integration, physical table booth space at venue hallway, standard logo printings on overall graphic promo slides, and resume exports of our top ${estimatedAudience} students.`);
  };

  // call server-side Gemini API endpoint
  const handleGeneratePitchLetter = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setPitchContent("");
    
    try {
      const budgetDetailsText = `Our overall target budget is $${totalCost} with a student headcount of ${estimatedAudience}. We are experiencing a sponsorship funding deficit of $${remainingDeficit} for this dynamic tech gathering.`;
      
      const payload = {
        eventName,
        budgetDetails: budgetDetailsText,
        sponsorObjective: sponsorName,
        sponsorshipTier: selectedTier,
        chapterName,
        benefits: sponsorBenefits
      };

      const response = await fetch("/api/generate-sponsor-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success && data.content) {
        setPitchContent(data.content);
      } else {
        setErrorMessage(data.error || "The server failed to respond with generated text.");
      }
    } catch (err: any) {
      console.error("API error while generating pitch:", err);
      setErrorMessage("Could not reach the server API. Confirm application build states are active.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pitchContent) return;
    navigator.clipboard.writeText(pitchContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-y-auto pb-10">
      
      {/* 1. Left Section: Interactive Budget Planner Sheet */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6 shrink-0">
        
        {/* Dynamic Calculator Overview card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Coins size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-sans">GDG Campus Budget Spreadsheet</h3>
                <p className="text-[11px] text-slate-500">Calculate event operating overheads and confirmed funding balance.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
              Financial Engine
            </span>
          </div>

          {/* Quick Metrics display grids */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Target Budget</p>
              <h2 className="text-lg font-black text-slate-900 mt-1">${totalCost}</h2>
            </div>
            
            <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-100">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Confirmed Funds</p>
              <h2 className="text-lg font-black text-emerald-700 mt-1">${confirmedSponsorFunds}</h2>
            </div>

            <div className="p-3 bg-red-50/40 rounded-lg border border-red-100">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Shortfall Gap</p>
              <h2 className="text-lg font-black text-red-700 mt-1">${remainingDeficit}</h2>
            </div>

            <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-100">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Per Student</p>
              <h1 className="text-lg font-black text-blue-700 mt-1">${perAttendeeCost.toFixed(1)}</h1>
            </div>
          </div>

          {/* Funding Status Slider & progress metrics bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Sponsorship funding levels progress</span>
              <span className="font-bold text-slate-700">{fundedPercentage}% funded</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${fundedPercentage}%` }}
              />
            </div>
          </div>

          {/* Attendee slider toggle */}
          <div className="p-3 bg-slate-50 rounded-lg space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700">Estimated Student Attendance</span>
              <span className="font-extrabold text-blue-600">{estimatedAudience} RSVPs</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="500" 
              value={estimatedAudience} 
              onChange={e => setEstimatedAudience(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[10px] text-slate-400">
              Scaling RSVPs adjusts the cost-per-head dynamically to formulate professional business justification parameters.
            </p>
          </div>
        </div>

        {/* Google Sheets Live Sync Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Google Sheets Live Bi-directional Sync</h4>
                <p className="text-[10px] text-slate-400">Import/Export event worksheets straight into your real Google Drive.</p>
              </div>
            </div>
            {googleAccessToken ? (
              <span className="text-[9px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-200">Real Sheet Connected</span>
            ) : (
              <span className="text-[9px] text-amber-700 bg-amber-50 font-bold px-2 py-0.5 rounded-full border border-amber-200">Local Mod Only</span>
            )}
          </div>

          {!googleAccessToken ? (
            <div className="text-[11px] text-slate-500 bg-slate-50/70 p-3 rounded-lg border border-slate-150 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Google Workspace Sheets Scope Not Authorized</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Please navigate to the <strong className="text-blue-600">Integrations</strong> tab to connect your Google Account with Sheets permissions to enable live sheet data syncing.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-sans">
              {/* Push Action and Pull Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex flex-col justify-between h-full">
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Download size={12} className="text-blue-500" />
                      <span>Export Cash Ledger</span>
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1">Saves all Category Expense rows and calculations into a real Spreadsheet inside your Google Drive.</p>
                  </div>
                  <button
                    onClick={handlePushToGoogleSheets}
                    disabled={sheetSyncing || budgetItems.length === 0}
                    className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    {sheetSyncing ? <RefreshCw size={11} className="animate-spin" /> : <FileSpreadsheet size={11} />}
                    <span>1-Click: Sync to New Sheets</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex flex-col justify-between h-full">
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Upload size={12} className="text-blue-500" />
                      <span>Import Spreadsheet</span>
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1">Loads previous budgets from your Drive Sheet. (Columns: Category, Description, and Price formats required.)</p>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Paste Google Sheet URL..."
                      value={spreadsheetUrl}
                      onChange={e => setSpreadsheetUrl(e.target.value)}
                      className="flex-1 bg-white border border-slate-250 text-[10px] p-1.5 rounded outline-none placeholder:text-slate-400"
                    />
                    <button
                      onClick={handlePullFromGoogleSheets}
                      disabled={sheetSyncing || !spreadsheetUrl}
                      className="px-2 py-1.5 bg-slate-900 hover:bg-slate-950 text-white text-[10px] font-semibold rounded shrink-0 transition"
                    >
                      {sheetSyncing ? "Pulling..." : "Pull"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status messages specifically for sheet syncing */}
              {sheetSyncError && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded text-[11px] text-red-700 flex items-start gap-1.5">
                  <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{sheetSyncError}</span>
                </div>
              )}

              {sheetSyncSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded text-[11px] text-emerald-800 flex flex-col gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="font-semibold">{sheetSyncSuccess}</span>
                  </div>
                  {createdSheetUrl && (
                    <a
                      href={createdSheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 bg-white p-1.5 rounded border border-slate-150 self-start"
                    >
                      <Link2 size={12} />
                      <span>Open Real Spreadsheet on Google Sheets ↗</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expenses Line Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Spreadsheet breakdown details</h4>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 font-bold">Confirmed Sponsorship Cash: </label>
              <input
                type="number"
                value={confirmedSponsorFunds}
                onChange={e => setConfirmedSponsorFunds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-xs font-bold text-emerald-700 text-right outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-bold text-left">
                  <th className="py-2 pl-1">Category</th>
                  <th className="py-2">Line Particular Description</th>
                  <th className="py-2 text-right pr-4">Cost</th>
                  <th className="py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {budgetItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 group text-slate-700">
                    <td className="py-2.5 font-semibold text-slate-500 pl-1">{item.category}</td>
                    <td className="py-2.5 font-medium">{item.name}</td>
                    <td className="py-2.5 text-right pr-4 font-bold text-slate-900">${item.cost}</td>
                    <td className="py-2.5 text-center">
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-300 hover:text-red-500 transition p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {budgetItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs italic">
                      No expense rows added. Formulate line items below!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Inline Add Form */}
          <form onSubmit={handleAddItem} className="bg-slate-50 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Category</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700 outline-none"
              >
                <option value="Food & Drinks">Food & Drinks</option>
                <option value="Swag & Marketing">Swag & Marketing</option>
                <option value="Hardware/Prizes">Hardware/Prizes</option>
                <option value="Prints & Banners">Prints & Banners</option>
                <option value="Speaker">Speaker</option>
                <option value="Tech Services">Tech Services</option>
              </select>
            </div>
            
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Winner awards plaque prints"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none"
              />
            </div>

            <div className="flex gap-1.5 items-center">
              <div className="flex-1">
                <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Cost ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-900 outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded transition self-end"
              >
                <Plus size={14} />
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* 2. Right Section: LLM Sponsor Pitch Generator Interface */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 flex flex-col justify-between">
        
        {/* Pitch Setup inputs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-sans">Gemini Sponsor Pitch Synthesizer</h3>
                <p className="text-[11px] text-slate-500">Formulates professional invitation emails using active financial metrics.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100"></div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Campus Chapter Name</label>
                <input
                  type="text"
                  value={chapterName}
                  onChange={e => setChapterName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Event Target Title</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 text-slate-800 outline-none font-semibold focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Sponsor Corporate Partner</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={e => setSponsorName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sponsorship Tiers Accent</label>
                  <button 
                    type="button"
                    onClick={handleSyncBudgetToPitch}
                    className="text-[9px] text-blue-600 font-bold hover:underline"
                  >
                    Sync Live Metrics (Cost/Shortfall)
                  </button>
                </div>
                <select
                  value={selectedTier}
                  onChange={e => {
                    setSelectedTier(e.target.value);
                    // Autofill associated tier details to assist user
                    const match = SPONSOR_TIERS_GUIDANCE.find(t => e.target.value.includes(t.name.split(" ")[0]));
                    if (match) {
                      setSponsorBenefits(match.benefits);
                    }
                  }}
                  className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 text-slate-700 bg-white outline-none focus:border-blue-500"
                >
                  <option value="Platinum Title Sponsor ($1500)">Platinum Title Sponsor ($1500)</option>
                  <option value="Gold Sponsor ($800)">Gold Sponsor ($800)</option>
                  <option value="Silver Associate Sponsor ($400)">Silver Associate Sponsor ($400)</option>
                  <option value="Special Custom In-Kind Sponsor">Special Custom In-Kind Sponsor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Involved Host Perks / Benefits value proposal</label>
              <textarea
                value={sponsorBenefits}
                onChange={e => setSponsorBenefits(e.target.value)}
                rows={3}
                placeholder="Describe recruitment booths, logo branding placements, opening remarks..."
                className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 text-slate-600 outline-none resize-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleGeneratePitchLetter}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Generating Proposal with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-yellow-400" />
                <span>Draft Corporate Proposal Pitch</span>
              </>
            )}
          </button>
        </div>

        {/* Generated pitch letter result area */}
        <div className="flex-1 border border-slate-200 rounded-lg p-4 bg-slate-50 min-h-[180px] flex flex-col justify-between relative mt-4">
          
          {isLoading && (
            <div className="absolute inset-0 bg-slate-100/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-lg z-10">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce delay-100"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-bounce delay-200"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-bounce delay-300"></span>
              </div>
              <p className="text-[11px] font-bold text-slate-500">Gemini model modeling proposal template...</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-100 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto max-h-[300px] text-xs leading-relaxed text-slate-700 font-serif space-y-2 select-text">
            {pitchContent ? (
              <div className="whitespace-pre-wrap font-sans prose prose-slate prose-xs">
                {pitchContent}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center font-sans space-y-2 py-6">
                <FileText size={24} className="opacity-40" />
                <div>
                  <p className="font-semibold text-xs text-slate-500">Proposal Queue Empty</p>
                  <p className="text-[10px] max-w-xs mt-0.5">
                    Click "Draft Corporate Proposal" above to let Gemini draft a formal college sponsorship presentation letter.
                  </p>
                </div>
              </div>
            )}
          </div>

          {pitchContent && (
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                <Check size={10} className="text-green-500" />
                <span>Generated via gemini-3.5-flash server SDK</span>
              </span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-sans text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Letter</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
