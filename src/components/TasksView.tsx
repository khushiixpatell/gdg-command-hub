import React, { useState } from "react";
import { Plus, User, FileText, CheckCircle, Clock, Trash2 } from "lucide-react";
import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { TaskItem, TeamMember, INITIAL_MEMBERS } from "../mockData";

interface TasksViewProps {
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  userId: string | null;
  onRefreshTasks: () => Promise<void>;
}

export default function TasksView({
  tasks,
  setTasks,
  userId,
  onRefreshTasks
}: TasksViewProps) {
  // Members list
  const members = INITIAL_MEMBERS;

  // Form entries
  const [newTitle, setNewTitle] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("Jane Doe");
  const [importance, setImportance] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<string>("2026-06-01");
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);

  // Workloads math
  const getWorkload = (memberName: string) => {
    const totalAssigned = tasks.filter(t => t.assignedTo === memberName).length;
    const completed = tasks.filter(t => t.assignedTo === memberName && t.status === "done").length;
    return {
      total: totalAssigned,
      completed,
      pending: totalAssigned - completed,
      pct: totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0
    };
  };

  // Safe task creation hook to Firestore
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const nextId = "t-custom-" + Date.now();
    const nextTask: TaskItem = {
      id: nextId,
      title: newTitle,
      assignedTo,
      status: "todo",
      importance,
      dueDate
    };

    try {
      if (userId) {
        const refPath = "tasks";
        try {
          await addDoc(collection(db, refPath), {
            id: nextId,
            title: newTitle,
            assignedTo,
            status: "todo",
            importance,
            dueDate,
            createdAt: serverTimestamp()
          });
          await onRefreshTasks();
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, refPath);
        }
      } else {
        setTasks(prev => [...prev, nextTask]);
      }

      setNewTitle("");
      setIsAddingTask(false);
      alert("New operational task assigned to team member!");
    } catch (err) {
      console.error(err);
    }
  };

  // Safe status mutator
  const handleUpdateStatus = async (item: TaskItem, newStatus: "todo" | "inprogress" | "done", firestoreDocId?: string) => {
    // Optimistic state
    setTasks(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));

    try {
      if (userId && firestoreDocId) {
        const refPath = "tasks";
        try {
          await updateDoc(doc(db, refPath, firestoreDocId), {
            status: newStatus
          });
          await onRefreshTasks();
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.UPDATE, `${refPath}/${firestoreDocId}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Action
  const handleDeleteTask = async (taskId: string, firestoreDocId?: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this team assignment?");
    if (!confirmDelete) return;

    try {
      if (userId && firestoreDocId) {
        const refPath = "tasks";
        try {
          await deleteDoc(doc(db, refPath, firestoreDocId));
          await onRefreshTasks();
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.DELETE, `${refPath}/${firestoreDocId}`);
        }
      } else {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-6.5rem)] overflow-hidden">
      {/* Left 4 Columns: Team member capacities & New assignment Form */}
      <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-y-auto space-y-4">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center bg-white">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Team Workloads</h3>
              <p className="text-[11px] text-slate-400">Track and assign deliverables to GDG organizers</p>
            </div>
            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="p-1 px-2.5 bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold rounded hover:bg-blue-100 transition"
            >
              + Dispatch
            </button>
          </div>

          {/* Members list */}
          <div className="space-y-3.5 mt-2">
            {members.map(mb => {
              const { total, completed, pending, pct } = getWorkload(mb.name);
              return (
                <div key={mb.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${mb.avatarColor} text-white flex items-center justify-center font-extrabold text-[11px]`}>
                        {mb.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{mb.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">Role: {mb.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {completed}/{total} 완료됨
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase">
                      <span>Task loads</span>
                      <span>{pct ? Math.round(pct) : 0}% Complete</span>
                    </div>

                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dispatch Task Form */}
        {isAddingTask && (
          <form onSubmit={handleCreateTask} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-[11px] font-bold text-slate-600">Dispatch Task Assignment</p>
            
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Operation details</label>
              <input
                type="text"
                placeholder="e.g. Coordinate custom stickers order"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Assign To Lead</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
              >
                {members.map(m => (
                  <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-500">Importance</label>
                <select
                  value={importance}
                  onChange={e => setImportance(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-500">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 text-xs rounded transition"
            >
              Confirm Dispatch
            </button>
          </form>
        )}
      </div>

      {/* Right 8 Columns: Dynamic Task Board */}
      <div className="col-span-12 lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="border-b border-slate-100 pb-3 h-12">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Operational Task Manager</h3>
          <p className="text-[11px] text-slate-400">Review status and mutate tasks across development streams</p>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
          {tasks.length === 0 ? (
            <p className="text-center p-8 text-xs text-slate-400">No active tasks dispatched. Great work!</p>
          ) : (
            tasks.map(t => (
              <div key={t.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/20 hover:bg-slate-50/50 flex flex-col gap-2 relative group transition">
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{t.title}</h4>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                      <User size={10} /> Lead: {t.assignedTo}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold uppercase px-1.5 rounded ${
                      t.importance === "high" 
                        ? "bg-red-100 text-red-700" 
                        : t.importance === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {t.importance}
                    </span>
                    
                    <button
                      onClick={() => {
                        // @ts-ignore
                        handleDeleteTask(t.id, t.firestoreId);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <span className="flex items-center gap-0.5"><Clock size={10} /> Sync deadline: {t.dueDate}</span>
                  
                  {/* Status switches selectors */}
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] text-slate-400">Set status:</span>
                    {["todo", "inprogress", "done"].map(st => (
                      <button
                        key={st}
                        onClick={() => {
                          // @ts-ignore
                          handleUpdateStatus(t, st as any, t.firestoreId);
                        }}
                        className={`p-0.5 px-2 rounded-full text-[8.5px] font-bold border transition ${
                          t.status === st 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
