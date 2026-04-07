import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, set, update, remove, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 DAWW CREATIONS — Owner Suite Edition
// Owner: Marlon George
// ─────────────────────────────────────────────────────────────────────────────
const OWNER_NAME = "Marlon George";

const firebaseConfig = {
  apiKey:            "AIzaSyAOC9-BF1Mox6Oks8AP7p8MY7bNNXO6yn8",
  authDomain:        "daww-creations.firebaseapp.com",
  databaseURL:       "https://daww-creations-default-rtdb.firebaseio.com",
  projectId:         "daww-creations",
  storageBucket:     "daww-creations.firebasestorage.app",
  messagingSenderId: "383758652383",
  appId:             "1:383758652383:web:52026fa0ffbf6e5d8aaa6a",
};

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) { console.warn("Firebase:", e); }

// ─────────────────────────────────────────────────────────────────────────────
// BRAND
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0b0b", surface: "#131010", surfaceHigh: "#1c1717",
  border: "#2a2222", borderBright: "#3a2e2e",
  red: "#9b1c1c", redBright: "#c0392b", redGlow: "#c0392b44", redDim: "#9b1c1c22",
  taupe: "#a09080", taupeLight: "#c4b4a4",
  gold: "#d4a853", goldBright: "#f0c060", goldDim: "#d4a85322", goldGlow: "#d4a85344",
  green: "#4caf7d", greenDim: "#4caf7d1a",
  amber: "#e0a040", alert: "#e05050",
  purple: "#9b7fd4",
  text: "#ede8e4", textMuted: "#5c5050", textDim: "#8a7c78",
};

const WORKER_COLORS = ["#c0392b","#a09080","#d4a853","#7b8fa0","#8b6b9e","#4caf7d","#e07840","#6b9e8b"];
const ROLES = ["Owner","Site Lead","Foreman","Engineer","Operator","Safety Officer","Electrician","Crew Member","Supervisor","Driver","Designer","Coordinator"];
const PRIORITIES = ["high","med","low"];
const PROJECTS = ["Operations","Safety","Admin","General","Electrical","Logistics","Design","Finance"];

const DEFAULT_TASKS = [
  { title: "Morning team briefing", priority: "high", project: "Operations", due: today(), deadline: "", done: false, assignee: "", pinned: false },
  { title: "Review daily work orders", priority: "high", project: "Operations", due: today(), deadline: "", done: false, assignee: "", pinned: false },
  { title: "Safety equipment check", priority: "med", project: "Safety", due: today(), deadline: "", done: false, assignee: "", pinned: false },
];

function today() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return d; }
}

function daysLeft(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + "T00:00:00") - new Date()) / 86400000);
  return diff;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────────────────────────────
function DAWWLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d="M10 22 L30 62 L50 32 L70 62 L90 22" stroke="#a09080" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polygon points="50,34 63,52 50,65 37,52" fill="#9b1c1c"/>
      <polygon points="50,37 61,52 50,62 39,52" fill="#c0392b"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 34, isOwner = false }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: isOwner ? `${C.gold}22` : `${color}22`,
        border: `2px solid ${isOwner ? C.goldBright : color}88`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33, fontWeight: 700,
        color: isOwner ? C.goldBright : color,
        fontFamily: "'DM Mono', monospace",
        boxShadow: isOwner ? `0 0 10px ${C.goldGlow}` : "none",
      }}>{initials}</div>
      {isOwner && (
        <div style={{ position: "absolute", top: -4, right: -4, fontSize: 10, lineHeight: 1 }}>👑</div>
      )}
    </div>
  );
}

function PriBadge({ p }) {
  const map = { high: [C.alert, "HIGH"], med: [C.amber, "MED"], low: [C.textDim, "LOW"] };
  const [col, label] = map[p] || [C.textDim, "MED"];
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: col, background: `${col}18`, border: `1px solid ${col}33`, borderRadius: 4, padding: "2px 6px", fontFamily: "'DM Mono', monospace" }}>{label}</span>
  );
}

function ProgressBar({ value, color = C.redBright }) {
  return (
    <div style={{ background: C.border, borderRadius: 99, height: 5, flex: 1, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 99, transition: "width 0.6s ease", boxShadow: `0 0 8px ${color}88` }} />
    </div>
  );
}

function DeadlinePill({ deadline }) {
  if (!deadline) return null;
  const days = daysLeft(deadline);
  const color = days < 0 ? C.alert : days <= 2 ? C.amber : C.green;
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`;
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 4, padding: "2px 7px", fontFamily: "'DM Mono', monospace" }}>{label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SetupScreen({ onJoin }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[7]);
  const [color, setColor] = useState(WORKER_COLORS[0]);

  const join = () => {
    if (!name.trim()) return;
    const isOwner = name.trim() === OWNER_NAME;
    onJoin({ name: name.trim(), role: isOwner ? "Owner" : role, color: isOwner ? C.goldBright : color, id: Date.now().toString(), isOwner });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Sora', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { font-family: 'Sora', sans-serif; }
        input::placeholder { color: #3a2e2e; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes goldglow { 0%,100%{filter:drop-shadow(0 0 12px #d4a85344)} 50%{filter:drop-shadow(0 0 28px #d4a85388)} }
        @keyframes redglow { 0%,100%{filter:drop-shadow(0 0 12px #c0392b44)} 50%{filter:drop-shadow(0 0 28px #c0392b77)} }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.5s ease" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, animation: "redglow 3s infinite" }}>
          <DAWWLogo size={76} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: 3, textTransform: "uppercase" }}>
          DAWW <span style={{ color: C.redBright }}>CREATIONS</span>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 5, letterSpacing: 3, fontFamily: "'DM Mono', monospace" }}>TEAM SYNC PLATFORM</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center" }}>
          <div style={{ height: 1, width: 40, background: `linear-gradient(90deg, transparent, ${C.taupe}66)` }} />
          <div style={{ width: 5, height: 5, background: C.redBright, transform: "rotate(45deg)" }} />
          <div style={{ height: 1, width: 40, background: `linear-gradient(90deg, ${C.taupe}66, transparent)` }} />
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 26, width: "100%", maxWidth: 380, boxShadow: `0 0 50px ${C.redGlow}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.taupeLight, marginBottom: 20 }}>Who are you? Enter your details to join.</div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>YOUR NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()}
            placeholder="e.g. Marcus Williams"
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${name === OWNER_NAME ? C.goldBright : C.borderBright}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text, outline: "none", transition: "border 0.2s" }}
          />
          {name === OWNER_NAME && (
            <div style={{ fontSize: 11, color: C.goldBright, marginTop: 6, fontWeight: 700 }}>👑 Owner access detected — welcome back, Marlon!</div>
          )}
        </div>

        {name !== OWNER_NAME && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>YOUR ROLE</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text, outline: "none", appearance: "none" }}>
              {ROLES.filter(r => r !== "Owner").map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {name !== OWNER_NAME && (
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>YOUR COLOR</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {WORKER_COLORS.map(col => (
                <div key={col} onClick={() => setColor(col)} style={{ width: 28, height: 28, borderRadius: "50%", background: col, cursor: "pointer", border: color === col ? `3px solid ${C.taupeLight}` : `3px solid transparent`, boxShadow: color === col ? `0 0 10px ${col}` : "none", transition: "all 0.15s" }} />
              ))}
            </div>
          </div>
        )}

        {name.trim() && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.surfaceHigh, borderRadius: 10, padding: "10px 14px", marginBottom: 18, border: `1px solid ${name === OWNER_NAME ? C.goldBright + "44" : C.borderBright}` }}>
            <Avatar name={name} color={name === OWNER_NAME ? C.goldBright : color} size={38} isOwner={name === OWNER_NAME} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{name === OWNER_NAME ? "Owner" : role} · DAWW CREATIONS</div>
            </div>
          </div>
        )}

        <button onClick={join} disabled={!name.trim()} style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: !name.trim() ? C.border : name === OWNER_NAME ? `linear-gradient(135deg, ${C.goldBright}, #a07020)` : `linear-gradient(135deg, ${C.redBright}, #7a1010)`,
          color: name.trim() ? (name === OWNER_NAME ? C.bg : "#fff") : C.textMuted,
          fontSize: 13, fontWeight: 800, cursor: name.trim() ? "pointer" : "default",
          letterSpacing: 2, textTransform: "uppercase",
          boxShadow: name.trim() ? `0 0 28px ${name === OWNER_NAME ? C.goldGlow : C.redGlow}` : "none",
          transition: "all 0.2s",
        }}>
          {name === OWNER_NAME ? "👑 Enter Owner Dashboard →" : "Join The Team →"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function OwnerDashboard({ me, tasks, setTasks, workers, setWorkers, messages, setMessages, setView }) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPri, setNewPri] = useState("high");
  const [newProject, setNewProject] = useState("Operations");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDelivery, setNewDelivery] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const openTasks = tasks.filter(t => !t.done).length;
  const doneTasks = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => t.deadline && daysLeft(t.deadline) < 0 && !t.done).length;
  const onlineWorkers = workers.filter(w => w.online);

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task = {
      title: newTitle.trim(), priority: newPri, project: newProject,
      due: today(), deadline: newDeadline, delivery: newDelivery,
      done: false, assignee: newAssignee, createdBy: me.name,
      pinned: false, ts: Date.now(),
    };
    if (db) push(ref(db, "tasks"), task);
    else setTasks(ts => [...ts, { ...task, id: Date.now().toString() }]);
    setNewTitle(""); setNewAssignee(""); setNewDeadline(""); setNewDelivery(""); setShowAddTask(false);
  };

  const deleteTask = (task, e) => {
    e.stopPropagation();
    if (db) remove(ref(db, `tasks/${task.id}`));
    else setTasks(ts => ts.filter(t => t.id !== task.id));
  };

  const removeWorker = (worker) => {
    if (!window.confirm(`Remove ${worker.name} from the team?`)) return;
    if (db) remove(ref(db, `workers/${worker.id}`));
    else setWorkers(ws => ws.filter(w => w.id !== worker.id));
  };

  const pinAnnouncement = () => {
    if (!announcement.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msg = { name: me.name, color: me.color, text: `📌 ANNOUNCEMENT: ${announcement.trim()}`, time, channel: "general", pinned: true, ts: Date.now() };
    if (db) push(ref(db, "messages"), msg);
    else setMessages(m => [...m, { ...msg, id: Date.now().toString() }]);
    setAnnouncement("");
  };

  const addToCalendar = (task) => {
    if (!task.deadline) return;
    const title = encodeURIComponent(`DAWW CREATIONS: ${task.title}`);
    const date = task.deadline.replace(/-/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${encodeURIComponent(`Project: ${task.project}\nAssigned to: ${task.assignee || "Unassigned"}`)}`;
    window.open(url, "_blank");
  };

  const upcomingDeadlines = tasks
    .filter(t => t.deadline && !t.done)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 6);

  return (
    <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>

      {/* Owner welcome */}
      <div style={{ padding: "14px 0 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            👑 <span style={{ color: C.goldBright }}>Owner Dashboard</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* Gold divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.goldBright}88, transparent)` }} />
        <div style={{ width: 5, height: 5, background: C.goldBright, transform: "rotate(45deg)" }} />
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.taupe}22)` }} />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Open Tasks",   val: openTasks,              color: C.redBright },
          { label: "Completed",    val: doneTasks,              color: C.green },
          { label: "Team Online",  val: onlineWorkers.length || 1, color: C.taupe },
          { label: "Overdue",      val: overdue,                color: overdue > 0 ? C.alert : C.textMuted },
        ].map(s => (
          <div key={s.label} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pin Announcement */}
      <div style={{ background: C.surfaceHigh, border: `1px solid ${C.goldBright}33`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.goldBright, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>📌 PIN ANNOUNCEMENT TO TEAM</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={announcement} onChange={e => setAnnouncement(e.target.value)}
            onKeyDown={e => e.key === "Enter" && pinAnnouncement()}
            placeholder="Type important message for the whole team…"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: C.text, outline: "none" }}
          />
          <button onClick={pinAnnouncement} style={{ background: `linear-gradient(135deg, ${C.goldBright}, #a07020)`, border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 13, color: C.bg, fontWeight: 800 }}>Pin</button>
        </div>
      </div>

      {/* Add Task */}
      <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showAddTask ? 14 : 0 }}>
          <div style={{ fontSize: 11, color: C.redBright, fontWeight: 700, letterSpacing: 1.5, fontFamily: "'DM Mono', monospace" }}>➕ ADD TASK</div>
          <button onClick={() => setShowAddTask(s => !s)} style={{ background: showAddTask ? C.redDim : `linear-gradient(135deg, ${C.redBright}, #7a1010)`, border: `1px solid ${C.redBright}44`, borderRadius: 8, padding: "5px 14px", cursor: "pointer", fontSize: 11, color: showAddTask ? C.redBright : "white", fontWeight: 700 }}>
            {showAddTask ? "Cancel" : "+ New Task"}
          </button>
        </div>

        {showAddTask && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title…"
              style={{ background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.text, outline: "none" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>PRIORITY</div>
                <select value={newPri} onChange={e => setNewPri(e.target.value)}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.text, outline: "none" }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>PROJECT</div>
                <select value={newProject} onChange={e => setNewProject(e.target.value)}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.text, outline: "none" }}>
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>ASSIGN TO</div>
              <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.text, outline: "none" }}>
                <option value="">— Unassigned —</option>
                {workers.map(w => <option key={w.id} value={w.name}>{w.name} ({w.role})</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>DEADLINE</div>
                <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.text, outline: "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>DELIVERY DATE</div>
                <input type="date" value={newDelivery} onChange={e => setNewDelivery(e.target.value)}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.text, outline: "none" }} />
              </div>
            </div>

            <button onClick={addTask} style={{ background: `linear-gradient(135deg, ${C.redBright}, #7a1010)`, border: "none", borderRadius: 10, padding: "11px", cursor: "pointer", fontSize: 13, color: "white", fontWeight: 800, boxShadow: `0 0 12px ${C.redGlow}` }}>
              Create Task →
            </button>
          </div>
        )}
      </div>

      {/* Deadlines & Deliveries Overview */}
      {upcomingDeadlines.length > 0 && (
        <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.purple, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>📅 DEADLINES & DELIVERIES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingDeadlines.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                    {t.deadline && <DeadlinePill deadline={t.deadline} />}
                    {t.delivery && <span style={{ fontSize: 9, color: C.taupe, fontFamily: "'DM Mono', monospace" }}>📦 {fmtDate(t.delivery)}</span>}
                    {t.assignee && <span style={{ fontSize: 10, color: C.textMuted }}>→ {t.assignee}</span>}
                  </div>
                </div>
                {t.deadline && (
                  <button onClick={() => addToCalendar(t)} title="Add to Google Calendar" style={{ background: C.accentDim, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: C.textDim, fontWeight: 700 }}>📆</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tasks overview with delete */}
      <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.redBright, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>🗂 ALL TASKS OVERVIEW</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>No tasks yet. Add one above.</div>}
          {tasks.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.bg, borderRadius: 8, border: `1px solid ${t.done ? C.border : C.borderBright}`, opacity: t.done ? 0.5 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, textDecoration: t.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                  <PriBadge p={t.priority} />
                  {t.assignee && <span style={{ fontSize: 10, color: C.taupe }}>→ {t.assignee}</span>}
                  {t.deadline && <DeadlinePill deadline={t.deadline} />}
                  {t.done && <span style={{ fontSize: 10, color: C.green }}>✓ Done</span>}
                </div>
              </div>
              <button onClick={(e) => deleteTask(t, e)} style={{ background: `${C.alert}18`, border: `1px solid ${C.alert}33`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: C.alert, fontWeight: 700, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Team Management */}
      <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.taupe, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>👥 TEAM MANAGEMENT</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(workers.length === 0 ? [me] : workers).map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: C.bg, borderRadius: 8, border: `1px solid ${w.name === OWNER_NAME ? C.goldBright + "33" : C.border}` }}>
              <Avatar name={w.name} color={w.color || C.taupe} size={30} isOwner={w.name === OWNER_NAME} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{w.name}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{w.role}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: w.online ? C.green : C.textMuted }} />
                {w.name !== OWNER_NAME && (
                  <button onClick={() => removeWorker(w)} style={{ background: `${C.alert}18`, border: `1px solid ${C.alert}33`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 10, color: C.alert, fontWeight: 700 }}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function DAWWApp() {
  const [me, setMe]             = useState(null);
  const [view, setView]         = useState("dashboard");
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks]       = useState(DEFAULT_TASKS.map((t, i) => ({ ...t, id: `t${i}` })));
  const [workers, setWorkers]   = useState([]);
  const [channel, setChannel]   = useState("general");
  const [chatInput, setChatInput] = useState("");
  const [newTask, setNewTask]   = useState("");
  const [newTaskPri, setNewTaskPri] = useState("med");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);

  const isOwner = me?.name === OWNER_NAME;

  useEffect(() => {
    if (!db || !me) return;
    const workerRef = ref(db, `workers/${me.id}`);
    set(workerRef, { ...me, online: true, lastSeen: serverTimestamp() });

    const u1 = onValue(ref(db, "workers"), snap => {
      const data = snap.val();
      if (data) { setWorkers(Object.values(data)); setConnected(true); }
    });
    const u2 = onValue(ref(db, "messages"), snap => {
      const data = snap.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        setMessages(msgs); setConnected(true);
      }
    });
    const u3 = onValue(ref(db, "tasks"), snap => {
      const data = snap.val();
      if (data) {
        setTasks(Object.entries(data).map(([id, v]) => ({ id, ...v })));
        setConnected(true);
      } else if (isOwner) {
        DEFAULT_TASKS.forEach(t => push(ref(db, "tasks"), { ...t, createdBy: me.name }));
      }
    });
    return () => { u1(); u2(); u3(); };
  }, [me]);

  useEffect(() => {
    if (view === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msg = { name: me.name, color: me.color, text: chatInput.trim(), time, channel, ts: Date.now(), isOwner };
    if (db) push(ref(db, "messages"), msg);
    else setMessages(m => [...m, { ...msg, id: Date.now().toString() }]);
    setChatInput("");
  };

  const toggleTask = (task) => {
    const updated = { ...task, done: !task.done, doneBy: !task.done ? me.name : "" };
    if (db) update(ref(db, `tasks/${task.id}`), { done: updated.done, doneBy: updated.doneBy });
    else setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task = { title: newTask.trim(), priority: newTaskPri, project: "General", due: today(), deadline: "", done: false, assignee: me.name, createdBy: me.name, ts: Date.now() };
    if (db) push(ref(db, "tasks"), task);
    else setTasks(ts => [...ts, { ...task, id: Date.now().toString() }]);
    setNewTask("");
  };

  if (!me) return <SetupScreen onJoin={w => { setMe(w); setView(w.isOwner ? "owner" : "dashboard"); }} />;

  const openTasks = tasks.filter(t => !t.done).length;
  const doneTasks = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const visibleMsgs = messages.filter(m => m.channel === channel);

  const nav = isOwner
    ? [
        { id: "owner",     label: "Owner",  icon: "👑" },
        { id: "tasks",     label: "Tasks",  icon: "✓", badge: openTasks || null },
        { id: "chat",      label: "Chat",   icon: "◉" },
        { id: "dashboard", label: "Team",   icon: "◈" },
      ]
    : [
        { id: "dashboard", label: "Home",  icon: "⌂" },
        { id: "tasks",     label: "Tasks", icon: "✓", badge: openTasks || null },
        { id: "chat",      label: "Chat",  icon: "◉" },
        { id: "team",      label: "Team",  icon: "◈" },
      ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", fontFamily: "'Sora', sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2a2222; border-radius: 99px; }
        input, select { font-family: 'Sora', sans-serif; }
        input::placeholder { color: #3a2e2e; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes goldglow { 0%,100%{filter:drop-shadow(0 0 8px #d4a85344)} 50%{filter:drop-shadow(0 0 18px #d4a85388)} }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${isOwner ? C.goldBright + "33" : C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: isOwner ? `0 2px 20px ${C.goldGlow}` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ animation: "goldglow 3s infinite" }}><DAWWLogo size={30} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
              DAWW <span style={{ color: isOwner ? C.goldBright : C.redBright }}>CREATIONS</span>
            </div>
            <div style={{ fontSize: 9, color: isOwner ? C.goldBright : C.textMuted, letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>
              {isOwner ? "👑 OWNER MODE" : "TEAM SYNC"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? C.green : C.amber, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 9, color: connected ? C.green : C.amber, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{connected ? "LIVE" : "DEMO"}</span>
          </div>
          <Avatar name={me.name} color={me.color} size={28} isOwner={isOwner} />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: view === "chat" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>

        {/* OWNER DASHBOARD */}
        {view === "owner" && isOwner && (
          <OwnerDashboard me={me} tasks={tasks} setTasks={setTasks} workers={workers} setWorkers={setWorkers} messages={messages} setMessages={setMessages} setView={setView} />
        )}

        {/* TEAM DASHBOARD */}
        {view === "dashboard" && (
          <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ padding: "16px 0 6px" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Welcome, <span style={{ color: C.redBright }}>{me.name.split(" ")[0]}</span> 👷</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{me.role} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.redBright}66, transparent)` }} />
                <div style={{ width: 5, height: 5, background: C.redBright, transform: "rotate(45deg)" }} />
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.taupe}33)` }} />
              </div>
            </div>

            {/* Pinned announcements */}
            {messages.filter(m => m.pinned).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {messages.filter(m => m.pinned).slice(-2).map(m => (
                  <div key={m.id} style={{ background: `${C.goldBright}12`, border: `1px solid ${C.goldBright}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: C.goldBright, fontWeight: 700, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>📌 PINNED BY OWNER</div>
                    <div style={{ fontSize: 13, color: C.text }}>{m.text.replace("📌 ANNOUNCEMENT: ", "")}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Open Tasks", val: openTasks, color: C.redBright },
                { label: "Completed",  val: doneTasks, color: C.green },
                { label: "Team",       val: workers.length || 1, color: C.taupe },
                { label: "Messages",   val: messages.length, color: C.gold },
              ].map(s => (
                <div key={s.label} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.taupeLight }}>Today's Progress</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.redBright, fontFamily: "'DM Mono', monospace" }}>{pct}%</div>
              </div>
              <ProgressBar value={pct} />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{doneTasks} of {tasks.length} tasks complete</div>
            </div>

            {/* My tasks */}
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>My Tasks</div>
            {tasks.filter(t => t.assignee === me.name && !t.done).slice(0, 4).map(t => (
              <div key={t.id} onClick={() => toggleTask(t)} style={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, border: `2px solid ${C.borderBright}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <PriBadge p={t.priority} />
                    {t.deadline && <DeadlinePill deadline={t.deadline} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TASKS */}
        {view === "tasks" && (
          <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ padding: "16px 0 14px", fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: C.redBright }}>Tasks</span> · <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15 }}>{openTasks} open</span>
            </div>

            {!isOwner && (
              <div style={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
                    placeholder="Add a quick task…"
                    style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.text, outline: "none" }} />
                  <button onClick={addTask} style={{ background: `linear-gradient(135deg, ${C.redBright}, #7a1010)`, border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer", color: "white", fontSize: 13, fontWeight: 800 }}>+</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map(t => (
                <div key={t.id} onClick={() => toggleTask(t)} style={{ background: t.done ? C.surface : C.surfaceHigh, border: `1px solid ${t.done ? C.border : C.borderBright}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", opacity: t.done ? 0.45 : 1, transition: "opacity 0.2s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1, border: `2px solid ${t.done ? C.green : C.borderBright}`, background: t.done ? C.greenDim : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.green, fontWeight: 900 }}>{t.done ? "✓" : ""}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <PriBadge p={t.priority} />
                      {t.assignee && <span style={{ fontSize: 11, color: C.taupe }}>→ {t.assignee}</span>}
                      {t.deadline && <DeadlinePill deadline={t.deadline} />}
                      {t.delivery && <span style={{ fontSize: 9, color: C.purple, fontFamily: "'DM Mono', monospace" }}>📦 {fmtDate(t.delivery)}</span>}
                      {t.done && t.doneBy && <span style={{ fontSize: 11, color: C.green }}>✓ {t.doneBy}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT */}
        {view === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "calc(100vh - 145px)", animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", gap: 6, padding: "8px 16px", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
              {["general","safety","logistics","updates"].map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${channel === ch ? C.redBright : C.border}`, background: channel === ch ? C.redDim : "transparent", color: channel === ch ? C.redBright : C.textMuted, cursor: "pointer", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "'DM Mono', monospace" }}>#{ch}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              {visibleMsgs.length === 0 && <div style={{ textAlign: "center", color: C.textMuted, marginTop: 60, fontSize: 13 }}>No messages in #{channel} yet.<br/>Be the first to say something 👇</div>}
              {visibleMsgs.map((msg, i) => {
                const isMine = msg.name === me.name;
                const prevSame = i > 0 && visibleMsgs[i-1].name === msg.name;
                const msgIsOwner = msg.name === OWNER_NAME;
                return (
                  <div key={msg.id} style={{ display: "flex", gap: 10, flexDirection: isMine ? "row-reverse" : "row", animation: "fadeUp 0.2s ease" }}>
                    {!isMine && !prevSame && <Avatar name={msg.name} color={msg.color || C.taupe} size={28} isOwner={msgIsOwner} />}
                    {!isMine && prevSame && <div style={{ width: 28 }} />}
                    <div style={{ maxWidth: "78%" }}>
                      {!prevSame && !isMine && (
                        <div style={{ fontSize: 11, color: msgIsOwner ? C.goldBright : msg.color || C.taupe, fontWeight: 700, marginBottom: 3 }}>
                          {msg.name}{msgIsOwner ? " 👑" : ""} · <span style={{ color: C.textMuted, fontWeight: 400 }}>{msg.time}</span>
                        </div>
                      )}
                      <div style={{
                        background: isMine ? C.redDim : msgIsOwner ? `${C.goldBright}12` : C.surfaceHigh,
                        border: `1px solid ${isMine ? C.redBright + "44" : msgIsOwner ? C.goldBright + "44" : C.border}`,
                        borderRadius: isMine ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                        padding: "9px 13px", fontSize: 13, color: C.text, lineHeight: 1.55,
                      }}>{msg.text}</div>
                      {isMine && <div style={{ fontSize: 10, color: C.textMuted, textAlign: "right", marginTop: 3 }}>{msg.time}</div>}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "10px 16px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={`Message #${channel}…`}
                style={{ flex: 1, background: C.surfaceHigh, border: `1px solid ${isOwner ? C.goldBright + "44" : C.borderBright}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none" }} />
              <button onClick={sendMessage} style={{ background: isOwner ? `linear-gradient(135deg, ${C.goldBright}, #a07020)` : `linear-gradient(135deg, ${C.redBright}, #7a1010)`, border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 15, color: isOwner ? C.bg : "white", fontWeight: 900 }}>↑</button>
            </div>
          </div>
        )}

        {/* TEAM VIEW */}
        {view === "team" && (
          <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ padding: "16px 0 16px", fontSize: 20, fontWeight: 800 }}><span style={{ color: C.redBright }}>DAWW</span> Team</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(workers.length > 0 ? workers : [me]).map((w, i) => (
                <div key={i} style={{ background: C.surfaceHigh, border: `1px solid ${w.name === OWNER_NAME ? C.goldBright + "44" : C.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={w.name} color={w.color || C.taupe} size={34} isOwner={w.name === OWNER_NAME} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{w.name}{w.name === me.name ? <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 400 }}> (you)</span> : ""}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{w.role}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.online ? C.green : C.textMuted }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ background: C.surface, borderTop: `1px solid ${isOwner ? C.goldBright + "33" : C.border}`, display: "flex", padding: "8px 0 max(8px, env(safe-area-inset-bottom))", position: "sticky", bottom: 0, zIndex: 100 }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", color: view === item.id ? (isOwner ? C.goldBright : C.redBright) : C.textMuted, position: "relative" }}>
            {item.badge && (
              <div style={{ position: "absolute", top: 0, right: "calc(50% - 18px)", background: C.redBright, borderRadius: 99, minWidth: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: "white", border: `2px solid ${C.surface}`, fontFamily: "'DM Mono', monospace" }}>{item.badge}</div>
            )}
            <div style={{ fontSize: 16 }}>{item.icon}</div>
            <div style={{ fontSize: 10, fontWeight: view === item.id ? 700 : 500, fontFamily: "'DM Mono', monospace", letterSpacing: 0.3 }}>{item.label}</div>
            {view === item.id && <div style={{ position: "absolute", bottom: -2, width: 24, height: 2, background: isOwner ? C.goldBright : C.redBright, borderRadius: 99, boxShadow: `0 0 8px ${isOwner ? C.goldGlow : C.redGlow}` }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

