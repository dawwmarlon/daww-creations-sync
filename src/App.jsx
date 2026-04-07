import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, set, update, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 DAWW CREATIONS — Firebase Connected
// ─────────────────────────────────────────────────────────────────────────────
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
let firebaseReady = false;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  firebaseReady = true;
} catch (e) {
  console.warn("Firebase init failed, running in demo mode:", e);
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND COLORS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#0d0b0b",
  surface:      "#131010",
  surfaceHigh:  "#1c1717",
  border:       "#2a2222",
  borderBright: "#3a2e2e",
  red:          "#9b1c1c",
  redBright:    "#c0392b",
  redGlow:      "#c0392b44",
  redDim:       "#9b1c1c22",
  taupe:        "#a09080",
  taupeLight:   "#c4b4a4",
  gold:         "#d4a853",
  goldDim:      "#d4a85322",
  green:        "#4caf7d",
  greenDim:     "#4caf7d1a",
  amber:        "#e0a040",
  alert:        "#e05050",
  text:         "#ede8e4",
  textMuted:    "#5c5050",
  textDim:      "#8a7c78",
};

const WORKER_COLORS = ["#c0392b","#a09080","#d4a853","#7b8fa0","#8b6b9e","#4caf7d","#e07840","#6b9e8b"];
const ROLES = ["Owner","Site Lead","Foreman","Engineer","Operator","Safety Officer","Electrician","Crew Member","Supervisor","Driver","Designer","Coordinator"];

const DEFAULT_TASKS = [
  { title: "Morning team briefing",    priority: "high", project: "Operations", due: "Today",     done: false, assignee: "" },
  { title: "Review daily work orders", priority: "high", project: "Operations", due: "Today",     done: false, assignee: "" },
  { title: "Safety equipment check",   priority: "med",  project: "Safety",     due: "Today",     done: false, assignee: "" },
  { title: "Submit end-of-day report", priority: "med",  project: "Admin",      due: "Today",     done: false, assignee: "" },
  { title: "Update project progress",  priority: "low",  project: "Admin",      due: "This week", done: false, assignee: "" },
];

const DEMO_MSGS = [
  { id: "d1", name: "Team Lead",   color: "#c0392b", text: "Good morning DAWW CREATIONS team — let's have a great day! 🏆", time: "7:55 AM", channel: "general" },
  { id: "d2", name: "Crew Member", color: "#a09080", text: "Ready and on site. All equipment checked.", time: "8:10 AM", channel: "general" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DAWW LOGO (SVG — recreated from brand)
// ─────────────────────────────────────────────────────────────────────────────
function DAWWLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d="M10 22 L30 62 L50 32 L70 62 L90 22"
        stroke="#a09080" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polygon points="50,34 63,52 50,65 37,52" fill="#9b1c1c"/>
      <polygon points="50,37 61,52 50,62 39,52" fill="#c0392b"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 34 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${color}22`, border: `2px solid ${color}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color,
      flexShrink: 0, fontFamily: "'DM Mono', monospace",
    }}>{initials}</div>
  );
}

function ProgressBar({ value, color = C.redBright }) {
  return (
    <div style={{ background: C.border, borderRadius: 99, height: 5, flex: 1, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, value)}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}, ${color}99)`,
        borderRadius: 99, transition: "width 0.6s ease",
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  );
}

function PriBadge({ p }) {
  const map = { high: [C.alert, "HIGH"], med: [C.amber, "MED"], low: [C.textDim, "LOW"] };
  const [col, label] = map[p] || [C.textDim, String(p).toUpperCase()];
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: col,
      background: `${col}18`, border: `1px solid ${col}33`,
      borderRadius: 4, padding: "2px 6px", fontFamily: "'DM Mono', monospace",
    }}>{label}</span>
  );
}

function StatusBanner({ connected }) {
  return (
    <div style={{
      background: connected ? `${C.green}18` : `${C.amber}15`,
      border: `1px solid ${connected ? C.green : C.amber}33`,
      borderRadius: 8, padding: "6px 12px", margin: "8px 16px 0",
      fontSize: 11, color: connected ? C.green : C.amber,
      display: "flex", alignItems: "center", gap: 6,
      fontFamily: "'DM Mono', monospace", fontWeight: 700,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? C.green : C.amber, animation: "pulse 2s infinite", flexShrink: 0 }} />
      {connected ? "🔥 LIVE — syncing across all devices" : "⚠ DEMO MODE — connect Firebase to sync across phones"}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP / JOIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SetupScreen({ onJoin }) {
  const [name, setName]   = useState("");
  const [role, setRole]   = useState(ROLES[7]);
  const [color, setColor] = useState(WORKER_COLORS[0]);

  const join = () => {
    if (!name.trim()) return;
    onJoin({ name: name.trim(), role, color, id: Date.now().toString() });
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Sora', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { font-family: 'Sora', sans-serif; }
        input::placeholder { color: #3a2e2e; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{filter:drop-shadow(0 0 12px #c0392b44)} 50%{filter:drop-shadow(0 0 28px #c0392b88)} }
      `}</style>

      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeUp 0.5s ease" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, animation: "glow 3s infinite" }}>
          <DAWWLogo size={80} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: 3, textTransform: "uppercase" }}>
          DAWW <span style={{ color: C.redBright }}>CREATIONS</span>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, letterSpacing: 3, fontFamily: "'DM Mono', monospace" }}>
          TEAM SYNC PLATFORM
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, justifyContent: "center" }}>
          <div style={{ height: 1, width: 50, background: `linear-gradient(90deg, transparent, ${C.taupe}66)` }} />
          <div style={{ width: 6, height: 6, background: C.redBright, transform: "rotate(45deg)", boxShadow: `0 0 8px ${C.redBright}` }} />
          <div style={{ height: 1, width: 50, background: `linear-gradient(90deg, ${C.taupe}66, transparent)` }} />
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
        boxShadow: `0 0 50px ${C.redGlow}`,
        animation: "fadeUp 0.6s ease",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.taupeLight, marginBottom: 20 }}>
          Who are you? Enter your details to join.
        </div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>YOUR NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()}
            placeholder="e.g. Marcus Williams"
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text, outline: "none" }}
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>YOUR ROLE</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text, outline: "none", appearance: "none" }}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Color */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>YOUR COLOR</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {WORKER_COLORS.map(col => (
              <div key={col} onClick={() => setColor(col)} style={{
                width: 28, height: 28, borderRadius: "50%", background: col, cursor: "pointer",
                border: color === col ? `3px solid ${C.taupeLight}` : `3px solid transparent`,
                boxShadow: color === col ? `0 0 12px ${col}` : "none",
                transition: "all 0.15s",
              }} />
            ))}
          </div>
        </div>

        {/* Preview */}
        {name.trim() && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.surfaceHigh, borderRadius: 10, padding: "10px 14px", marginBottom: 18, border: `1px solid ${C.borderBright}` }}>
            <Avatar name={name} color={color} size={38} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{role} · DAWW CREATIONS</div>
            </div>
          </div>
        )}

        <button onClick={join} disabled={!name.trim()} style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: name.trim() ? `linear-gradient(135deg, ${C.redBright}, #7a1010)` : C.border,
          color: name.trim() ? "#fff" : C.textMuted,
          fontSize: 13, fontWeight: 800, cursor: name.trim() ? "pointer" : "default",
          letterSpacing: 2, textTransform: "uppercase",
          boxShadow: name.trim() ? `0 0 28px ${C.redGlow}` : "none",
          transition: "all 0.2s",
        }}>
          Join The Team →
        </button>

        {firebaseReady && (
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: C.green, fontFamily: "'DM Mono', monospace" }}>
            🔥 Firebase connected — you're going live!
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function DAWWApp() {
  const [me, setMe]           = useState(null);
  const [view, setView]       = useState("dashboard");
  const [messages, setMessages] = useState(DEMO_MSGS);
  const [tasks, setTasks]     = useState(DEFAULT_TASKS.map((t, i) => ({ ...t, id: `t${i}` })));
  const [workers, setWorkers] = useState([]);
  const [channel, setChannel] = useState("general");
  const [chatInput, setChatInput] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTaskPri, setNewTaskPri] = useState("med");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);

  // ── Firebase subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!db || !me) return;

    // Register self as online
    const workerRef = ref(db, `workers/${me.id}`);
    set(workerRef, { ...me, online: true, lastSeen: serverTimestamp() });

    // Workers
    const u1 = onValue(ref(db, "workers"), snap => {
      const data = snap.val();
      if (data) { setWorkers(Object.values(data)); setConnected(true); }
    });

    // Messages
    const u2 = onValue(ref(db, "messages"), snap => {
      const data = snap.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        setMessages(msgs);
        setConnected(true);
      }
    });

    // Tasks
    const u3 = onValue(ref(db, "tasks"), snap => {
      const data = snap.val();
      if (data) {
        setTasks(Object.entries(data).map(([id, v]) => ({ id, ...v })));
        setConnected(true);
      } else {
        // Seed default tasks on first ever run
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
    const msg = { name: me.name, color: me.color, text: chatInput.trim(), time, channel, ts: Date.now() };
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
    const task = { title: newTask.trim(), priority: newTaskPri, project: "General", due: "Today", done: false, assignee: me.name, createdBy: me.name, ts: Date.now() };
    if (db) push(ref(db, "tasks"), task);
    else setTasks(ts => [...ts, { ...task, id: Date.now().toString() }]);
    setNewTask("");
  };

  if (!me) return <SetupScreen onJoin={setMe} />;

  const openTasks  = tasks.filter(t => !t.done).length;
  const doneTasks  = tasks.filter(t => t.done).length;
  const pct        = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const visibleMsgs = messages.filter(m => m.channel === channel);
  const allWorkers = db ? workers : [{ ...me, online: true }];

  const nav = [
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
        @keyframes glow { 0%,100%{filter:drop-shadow(0 0 10px #c0392b44)} 50%{filter:drop-shadow(0 0 22px #c0392b77)} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ animation: "glow 3s infinite" }}><DAWWLogo size={32} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
              DAWW <span style={{ color: C.redBright }}>CREATIONS</span>
            </div>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>TEAM SYNC</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? C.green : C.amber, animation: "pulse 2s infinite", boxShadow: `0 0 6px ${connected ? C.green : C.amber}` }} />
            <span style={{ fontSize: 9, color: connected ? C.green : C.amber, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{connected ? "LIVE" : "DEMO"}</span>
          </div>
          <Avatar name={me.name} color={me.color} size={28} />
        </div>
      </div>

      {/* Status banner */}
      <StatusBanner connected={connected} />

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: view === "chat" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>

        {/* ── DASHBOARD ── */}
        {view === "dashboard" && (
          <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ padding: "16px 0 6px" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Welcome, <span style={{ color: C.redBright }}>{me.name.split(" ")[0]}</span> 👷
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                {me.role} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.redBright}66, transparent)` }} />
                <div style={{ width: 5, height: 5, background: C.redBright, transform: "rotate(45deg)" }} />
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.taupe}33)` }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Open Tasks",   val: openTasks,                   color: C.redBright },
                { label: "Completed",    val: doneTasks,                   color: C.green },
                { label: "Team Online",  val: allWorkers.filter(w=>w.online).length, color: C.taupe },
                { label: "Messages",     val: messages.length,             color: C.gold },
              ].map(s => (
                <div key={s.label} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3, fontWeight: 600, letterSpacing: 0.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.taupeLight }}>Today's Progress</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.redBright, fontFamily: "'DM Mono', monospace" }}>{pct}%</div>
              </div>
              <ProgressBar value={pct} />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{doneTasks} of {tasks.length} tasks complete</div>
            </div>

            {/* Recent messages */}
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Recent Messages</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.slice(-3).reverse().map(msg => (
                <div key={msg.id} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Avatar name={msg.name} color={msg.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: msg.color, marginBottom: 2 }}>{msg.name} <span style={{ color: C.textMuted, fontWeight: 400 }}>· {msg.time}</span></div>
                    <div style={{ fontSize: 12, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TASKS ── */}
        {view === "tasks" && (
          <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ padding: "16px 0 14px", fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: C.redBright }}>Tasks</span> · <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15 }}>{openTasks} open</span>
            </div>

            {/* Add task */}
            <div style={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>ADD NEW TASK</div>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
                placeholder="What needs to be done?"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.text, outline: "none", marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {["high","med","low"].map(p => (
                  <button key={p} onClick={() => setNewTaskPri(p)} style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                    border: `1px solid ${newTaskPri===p ? (p==="high"?C.alert:p==="med"?C.amber:C.textDim) : C.border}`,
                    background: newTaskPri===p ? `${(p==="high"?C.alert:p==="med"?C.amber:C.textDim)}18` : "transparent",
                    color: newTaskPri===p ? (p==="high"?C.alert:p==="med"?C.amber:C.textDim) : C.textMuted,
                    cursor: "pointer", textTransform: "uppercase", letterSpacing: 1,
                    fontFamily: "'DM Mono', monospace",
                  }}>{p}</button>
                ))}
                <button onClick={addTask} style={{
                  marginLeft: "auto", padding: "6px 18px", borderRadius: 8,
                  background: `linear-gradient(135deg, ${C.redBright}, #7a1010)`,
                  border: "none", color: "white", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", boxShadow: `0 0 12px ${C.redGlow}`,
                }}>Add +</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map(t => (
                <div key={t.id} onClick={() => toggleTask(t)} style={{
                  background: t.done ? C.surface : C.surfaceHigh,
                  border: `1px solid ${t.done ? C.border : C.borderBright}`,
                  borderRadius: 12, padding: "12px 14px",
                  display: "flex", gap: 12, alignItems: "flex-start",
                  cursor: "pointer", opacity: t.done ? 0.45 : 1, transition: "opacity 0.2s",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${t.done ? C.green : C.borderBright}`,
                    background: t.done ? C.greenDim : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: C.green, fontWeight: 900,
                  }}>{t.done ? "✓" : ""}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <PriBadge p={t.priority} />
                      {t.due && <span style={{ fontSize: 11, color: C.textMuted }}>{t.due}</span>}
                      {t.assignee && <span style={{ fontSize: 11, color: C.taupe }}>→ {t.assignee}</span>}
                      {t.done && t.doneBy && <span style={{ fontSize: 11, color: C.green }}>✓ {t.doneBy}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {view === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "calc(100vh - 145px)", animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", gap: 6, padding: "8px 16px", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
              {["general","safety","logistics","updates"].map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  border: `1px solid ${channel===ch ? C.redBright : C.border}`,
                  background: channel===ch ? C.redDim : "transparent",
                  color: channel===ch ? C.redBright : C.textMuted,
                  cursor: "pointer", whiteSpace: "nowrap",
                  textTransform: "uppercase", letterSpacing: 0.8,
                  fontFamily: "'DM Mono', monospace",
                }}>#{ch}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              {visibleMsgs.length === 0 && (
                <div style={{ textAlign: "center", color: C.textMuted, marginTop: 60 }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>◈</div>
                  <div style={{ fontSize: 13 }}>No messages in #{channel} yet.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Be the first to say something 👇</div>
                </div>
              )}
              {visibleMsgs.map((msg, i) => {
                const isMe = msg.name === me.name;
                const prevSame = i > 0 && visibleMsgs[i-1].name === msg.name;
                return (
                  <div key={msg.id} style={{ display: "flex", gap: 10, flexDirection: isMe ? "row-reverse" : "row", animation: "fadeUp 0.2s ease" }}>
                    {!isMe && !prevSame && <Avatar name={msg.name} color={msg.color || C.taupe} size={28} />}
                    {!isMe && prevSame && <div style={{ width: 28 }} />}
                    <div style={{ maxWidth: "78%" }}>
                      {!prevSame && !isMe && (
                        <div style={{ fontSize: 11, color: msg.color || C.taupe, fontWeight: 700, marginBottom: 3 }}>
                          {msg.name} · <span style={{ color: C.textMuted, fontWeight: 400 }}>{msg.time}</span>
                        </div>
                      )}
                      <div style={{
                        background: isMe ? C.redDim : C.surfaceHigh,
                        border: `1px solid ${isMe ? `${C.redBright}44` : C.border}`,
                        borderRadius: isMe ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                        padding: "9px 13px", fontSize: 13, color: C.text, lineHeight: 1.55,
                      }}>{msg.text}</div>
                      {isMe && <div style={{ fontSize: 10, color: C.textMuted, textAlign: "right", marginTop: 3 }}>{msg.time}</div>}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "10px 16px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={`Message #${channel}…`}
                style={{ flex: 1, background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none" }}
              />
              <button onClick={sendMessage} style={{
                background: `linear-gradient(135deg, ${C.redBright}, #7a1010)`,
                border: "none", borderRadius: 10, padding: "10px 18px",
                cursor: "pointer", fontSize: 15, color: "white", fontWeight: 900,
                boxShadow: `0 0 14px ${C.redGlow}`,
              }}>↑</button>
            </div>
          </div>
        )}

        {/* ── TEAM ── */}
        {view === "team" && (
          <div style={{ padding: "0 16px 32px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ padding: "16px 0 16px", fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: C.redBright }}>DAWW</span> Team
            </div>

            {/* My card */}
            <div style={{ background: C.surfaceHigh, border: `1px solid ${C.redBright}44`, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: `0 0 20px ${C.redGlow}` }}>
              <div style={{ fontSize: 10, color: C.redBright, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>YOU</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={me.name} color={me.color} size={48} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{me.name}</div>
                  <div style={{ fontSize: 12, color: C.taupe, marginTop: 2 }}>{me.role}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>DAWW CREATIONS</div>
                </div>
              </div>
            </div>

            {/* Other workers (when Firebase live) */}
            {allWorkers.filter(w => w.id !== me.id).length > 0 && (
              <>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Team Members</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {allWorkers.filter(w => w.id !== me.id).map((w, i) => (
                    <div key={i} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={w.name} color={w.color} size={34} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{w.role}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: w.online ? C.green : C.textMuted }} />
                        <span style={{ fontSize: 10, color: C.textMuted }}>{w.online ? "online" : "offline"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Share instructions */}
            <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.taupeLight, marginBottom: 8 }}>📱 How To Add Your Team</div>
              <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.8 }}>
                Once you deploy to Vercel, you'll get a link. Share that link with every worker. They open it on their phone → enter their name → they're instantly on the team and synced in real time.
              </div>
            </div>

            {/* Next step */}
            <div style={{ background: `${C.gold}0f`, border: `1px solid ${C.gold}33`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>⚡ ONE LAST STEP TO GO LIVE</div>
              <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.8, marginBottom: 10 }}>
                Your Firebase is connected ✅<br/>
                Now deploy to <strong style={{ color: C.taupeLight }}>vercel.com</strong> to get your live team link.
              </div>
              {[
                "Go to vercel.com → sign up free (use your Google account)",
                "Click 'New Project' → upload this app file",
                "Click Deploy → you get your live link in 60 seconds",
                "Send that link to every worker on your team — done! 🏆",
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${C.gold}22`, border: `1px solid ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.gold, flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>{i+1}</div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, paddingTop: 2 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 max(8px, env(safe-area-inset-bottom))", position: "sticky", bottom: 0, zIndex: 100 }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "4px 0", color: view === item.id ? C.redBright : C.textMuted,
            position: "relative",
          }}>
            {item.badge && (
              <div style={{
                position: "absolute", top: 0, right: "calc(50% - 18px)",
                background: C.redBright, borderRadius: 99, minWidth: 16, height: 16,
                fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", border: `2px solid ${C.surface}`, fontFamily: "'DM Mono', monospace",
              }}>{item.badge}</div>
            )}
            <div style={{ fontSize: 18 }}>{item.icon}</div>
            <div style={{ fontSize: 10, fontWeight: view === item.id ? 700 : 500, fontFamily: "'DM Mono', monospace", letterSpacing: 0.3 }}>{item.label}</div>
            {view === item.id && <div style={{ position: "absolute", bottom: -2, width: 24, height: 2, background: C.redBright, borderRadius: 99, boxShadow: `0 0 8px ${C.redGlow}` }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
