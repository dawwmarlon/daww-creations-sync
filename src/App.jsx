import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase, ref, push, onValue, set, update, remove, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// ─────────────────────────────────────────────────────────────────────────────
// DAWW CREATIONS — Full Platform v4
// Owner: Marlon George — dawwmarlon@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
const OWNER_EMAIL = "dawwmarlon@gmail.com";
const OWNER_NAME  = "Marlon George";

const firebaseConfig = {
  apiKey:            "AIzaSyAOC9-BF1Mox6Oks8AP7p8MY7bNNXO6yn8",
  authDomain:        "daww-creations.firebaseapp.com",
  databaseURL:       "https://daww-creations-default-rtdb.firebaseio.com",
  projectId:         "daww-creations",
  storageBucket:     "daww-creations.firebasestorage.app",
  messagingSenderId: "383758652383",
  appId:             "1:383758652383:web:52026fa0ffbf6e5d8aaa6a",
};

let app, auth, db;
try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getDatabase(app);
} catch(e) { console.warn("Firebase:", e); }

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY MEDIA UPLOAD (free — no credit card needed)
// 1. Go to cloudinary.com → sign up free
// 2. Go to Settings → Upload → Add upload preset → set to "Unsigned" → save
// 3. Replace the two values below with your Cloud Name and Upload Preset
// ─────────────────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD  = "dylmfc9fh";
const CLOUDINARY_PRESET = "xtvdzlph";
const CLOUDINARY_READY  = CLOUDINARY_CLOUD !== "REPLACE_WITH_YOUR_CLOUD_NAME";

async function uploadToCloudinary(file, onProgress) {
  if(!CLOUDINARY_READY) {
    alert("Media uploads not set up yet.\nPlease follow the Cloudinary setup steps in the app.");
    return null;
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`);
    xhr.upload.onprogress = e => {
      if(e.lengthComputable) onProgress(Math.round(e.loaded/e.total*100));
    };
    xhr.onload = () => {
      if(xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else { reject(new Error("Upload failed")); }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

// Extract Cloudinary public_id from a URL for deletion tracking
function getPublicId(url) {
  try {
    const parts = url.split("/upload/");
    if(parts.length < 2) return null;
    const afterUpload = parts[1];
    // Remove version prefix (v12345/) if present
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    // Remove file extension
    return withoutVersion.replace(/\.[^/.]+$/, "");
  } catch(e) { return null; }
}

// Format bytes into human-readable size
function fmtBytes(bytes) {
  if(!bytes) return "—";
  if(bytes < 1024)       return bytes + " B";
  if(bytes < 1048576)    return (bytes/1024).toFixed(1) + " KB";
  if(bytes < 1073741824) return (bytes/1048576).toFixed(1) + " MB";
  return (bytes/1073741824).toFixed(2) + " GB";
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0d0b0b", surface:"#131010", surfaceHigh:"#1c1717",
  border:"#2a2222", borderBright:"#3a2e2e",
  red:"#9b1c1c", redBright:"#c0392b", redGlow:"#c0392b44", redDim:"#9b1c1c22",
  taupe:"#a09080", taupeLight:"#c4b4a4",
  gold:"#d4a853", goldBright:"#f0c060", goldDim:"#d4a85322", goldGlow:"#d4a85344",
  green:"#4caf7d", greenDim:"#4caf7d1a",
  amber:"#e0a040", amberDim:"#e0a0401a",
  alert:"#e05050", alertDim:"#e050501a",
  purple:"#9b7fd4", purpleDim:"#9b7fd422",
  blue:"#4a90d9",
  text:"#ede8e4", textMuted:"#5c5050", textDim:"#8a7c78",
};

const WORKER_COLORS = ["#c0392b","#a09080","#d4a853","#7b8fa0","#8b6b9e","#4caf7d","#e07840","#6b9e8b","#e07090","#50b4d0"];
const ROLES = ["Owner","Site Lead","Foreman","Engineer","Operator","Safety Officer","Electrician","Crew Member","Supervisor","Driver","Designer","Coordinator"];
const PROJECTS = ["Operations","Safety","Admin","General","Electrical","Logistics","Design","Finance","Maintenance"];
const CHANNELS = ["general","safety","logistics","updates"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const toISO  = d => d ? new Date(d+"T00:00:00").toISOString().split("T")[0] : "";
const fmtDate = d => { try { return new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}); } catch{return d||"";} };
const daysLeft = d => { if(!d) return null; return Math.ceil((new Date(d+"T00:00:00")-new Date())/86400000); };
const todayISO = () => new Date().toISOString().split("T")[0];
const uid = () => Math.random().toString(36).slice(2,10);

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS — FCM + Service Worker + VAPID
// Works on Android (Chrome) and iPhone (Safari, added to Home Screen)
// ─────────────────────────────────────────────────────────────────────────────
const VAPID_KEY = "BM6ffPvncvHzgrIHaJcmArzKFHQWC92NQhUmWeavPKhAoyHYexYQo_eFW_b5Zz6RW65JdI5tcSjAhI2GPN9hAq0";

// Register service worker immediately
if("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/firebase-messaging-sw.js")
      .then(reg => console.log("✅ DAWW SW registered:", reg.scope))
      .catch(err => console.warn("SW failed:", err));
  });
}

// Request permission AND get FCM token so Firebase can push to this device
async function requestNotificationPermission() {
  if(!("Notification" in window)) return false;
  if(Notification.permission === "denied") return false;
  try {
    const permission = await Notification.requestPermission();
    if(permission !== "granted") return false;
    // Try to get FCM token for full cloud push (optional — works without it too)
    try {
      const { getMessaging, getToken } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js"
      );
      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if(token) console.log("FCM token:", token);
    } catch(e) {
      console.log("FCM token skipped (still works locally):", e.message);
    }
    return true;
  } catch(e) {
    console.warn("Permission error:", e);
    return false;
  }
}

// Show notification via Service Worker — works in background on Android & iPhone
async function sendNotification(title, body) {
  if(!("Notification" in window)) return;
  if(Notification.permission !== "granted") return;
  try {
    if("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon:    "/favicon.ico",
        badge:   "/favicon.ico",
        vibrate: [200, 100, 200],
        tag:     title,
        renotify: false,
        requireInteraction: false,
        silent: false,
      });
    } else {
      const n = new Notification(title, { body, icon: "/favicon.ico" });
      setTimeout(() => n.close(), 6000);
    }
  } catch(e) { console.warn("Notification error:", e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function DAWWLogo({size=32}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d="M10 22 L30 62 L50 32 L70 62 L90 22" stroke="#a09080" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polygon points="50,34 63,52 50,65 37,52" fill="#9b1c1c"/>
      <polygon points="50,37 61,52 50,62 39,52" fill="#c0392b"/>
    </svg>
  );
}

function Avatar({name="?", color=C.taupe, size=34, isOwner=false, isAdmin=false}) {
  const i = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const borderCol = isOwner ? C.goldBright : isAdmin ? C.purple : color;
  const bgCol     = isOwner ? C.gold       : isAdmin ? C.purple : color;
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <div style={{width:size,height:size,borderRadius:"50%",background:`${bgCol}22`,border:`2px solid ${borderCol}88`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.33,fontWeight:700,color:borderCol,fontFamily:"'DM Mono',monospace",boxShadow:isOwner?`0 0 10px ${C.goldGlow}`:isAdmin?`0 0 8px ${C.purple}44`:"none"}}>{i}</div>
      {isOwner && <div style={{position:"absolute",top:-4,right:-4,fontSize:9}}>👑</div>}
      {!isOwner && isAdmin && <div style={{position:"absolute",top:-4,right:-4,fontSize:9}}>🛡️</div>}
    </div>
  );
}

function PriBadge({p}) {
  const map={high:[C.alert,"HIGH"],med:[C.amber,"MED"],low:[C.textDim,"LOW"]};
  const [col,label]=map[p]||[C.textDim,"MED"];
  return <span style={{fontSize:9,fontWeight:800,letterSpacing:1.2,color:col,background:`${col}18`,border:`1px solid ${col}33`,borderRadius:4,padding:"2px 6px",fontFamily:"'DM Mono',monospace"}}>{label}</span>;
}

function DeadlinePill({deadline}) {
  if(!deadline) return null;
  const d=daysLeft(deadline);
  const col=d<0?C.alert:d<=2?C.amber:C.green;
  const lbl=d<0?`${Math.abs(d)}d overdue`:d===0?"Due today":`${d}d left`;
  return <span style={{fontSize:9,fontWeight:800,color:col,background:`${col}18`,border:`1px solid ${col}33`,borderRadius:4,padding:"2px 7px",fontFamily:"'DM Mono',monospace"}}>{lbl}</span>;
}

function ProgressBar({value,color=C.redBright}) {
  return (
    <div style={{background:C.border,borderRadius:99,height:5,flex:1,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,value)}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}99)`,borderRadius:99,transition:"width .6s ease",boxShadow:`0 0 8px ${color}88`}}/>
    </div>
  );
}

function Input({label,type="text",value,onChange,placeholder,error}) {
  return (
    <div style={{marginBottom:14}}>
      {label && <label style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1.5,display:"block",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${error?C.alert:C.borderBright}`,borderRadius:10,padding:"11px 14px",fontSize:14,color:C.text,outline:"none",fontFamily:"'Sora',sans-serif"}}/>
      {error && <div style={{fontSize:11,color:C.alert,marginTop:4}}>{error}</div>}
    </div>
  );
}

function Btn({children,onClick,color=C.redBright,disabled=false,small=false,outline=false}) {
  const bg = outline ? "transparent" : disabled ? C.border : `linear-gradient(135deg,${color},${color}99)`;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:small?"auto":"100%", padding:small?"7px 16px":"13px",
      borderRadius:10, border:`1px solid ${outline?color+"66":color+"00"}`,
      background:bg, color:disabled?C.textMuted:outline?color:"white",
      fontSize:small?12:13, fontWeight:800, cursor:disabled?"default":"pointer",
      letterSpacing:small?0:1.5, textTransform:small?"none":"uppercase",
      boxShadow:(!disabled&&!outline)?`0 0 20px ${color}44`:"none",
      transition:"all .2s", fontFamily:"'Sora',sans-serif",
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}) {
  const [mode,setMode]       = useState("login");
  const [name,setName]       = useState("");
  const [email,setEmail]     = useState("");
  const [password,setPass]   = useState("");
  const [role,setRole]       = useState("Crew Member");
  const [color,setColor]     = useState(WORKER_COLORS[0]);
  const [err,setErr]         = useState("");
  const [loading,setLoading] = useState(false);

  const isOwnerEmail = email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();

  // ── Google Sign-In (redirect — works on all phones) ──────────────────────
  const signInWithGoogle = async () => {
    setErr(""); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithRedirect(auth, provider);
      // Page will redirect to Google and come back automatically
    } catch(e) {
      setErr("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  // ── Email/Password ───────────────────────────────────────────────────────
  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if(mode==="signup") {
        if(!name.trim()) { setErr("Please enter your name."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, {displayName: name.trim()});
        const isOwner = isOwnerEmail;
        const profile = {
          id: cred.user.uid, name: name.trim(),
          role: isOwner ? "Owner" : role,
          color: isOwner ? C.goldBright : color,
          email: email.trim(), isOwner,
          online: true, joinedAt: Date.now(),
        };
        await set(ref(db,`workers/${cred.user.uid}`), profile);
        onAuth(profile);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        // profile loaded via onAuthStateChanged in main app
      }
    } catch(e) {
      const msgs = {
        "auth/email-already-in-use":"This email is already registered. Try logging in.",
        "auth/invalid-email":"Please enter a valid email address.",
        "auth/weak-password":"Password must be at least 6 characters.",
        "auth/user-not-found":"No account found with this email.",
        "auth/wrong-password":"Incorrect password. Please try again.",
        "auth/invalid-credential":"Incorrect email or password.",
      };
      setErr(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Sora',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select{font-family:'Sora',sans-serif;}
        input::placeholder{color:#3a2e2e;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes redglow{0%,100%{filter:drop-shadow(0 0 12px #c0392b44)}50%{filter:drop-shadow(0 0 28px #c0392b77)}}
      `}</style>

      {/* Brand */}
      <div style={{textAlign:"center",marginBottom:28,animation:"fadeUp .5s ease"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12,animation:"redglow 3s infinite"}}>
          <DAWWLogo size={68}/>
        </div>
        <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:3,textTransform:"uppercase"}}>
          DAWW <span style={{color:C.redBright}}>CREATIONS</span>
        </div>
        <div style={{fontSize:10,color:C.textMuted,marginTop:5,letterSpacing:3,fontFamily:"'DM Mono',monospace"}}>TEAM SYNC PLATFORM</div>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:26,width:"100%",maxWidth:380,boxShadow:`0 0 50px ${C.redGlow}`,animation:"fadeUp .6s ease"}}>

        {/* Google Sign-In Button */}
        <button onClick={signInWithGoogle} disabled={loading} style={{
          width:"100%", padding:"12px", borderRadius:12, marginBottom:16,
          border:`1px solid ${C.borderBright}`, background:C.surfaceHigh,
          color:C.text, fontSize:13, fontWeight:700, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          transition:"all .2s", fontFamily:"'Sora',sans-serif",
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.6 37.5 46.5 31.4 46.5 24.5z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.4 13.3A23.8 23.8 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-3.7-13.5-9l-8 6.1C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          {loading ? "Please wait…" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{flex:1,height:1,background:C.border}}/>
          <span style={{fontSize:11,color:C.textMuted,fontFamily:"'DM Mono',monospace"}}>OR</span>
          <div style={{flex:1,height:1,background:C.border}}/>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:18,background:C.surfaceHigh,borderRadius:10,padding:3}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:mode===m?C.redBright:"transparent",color:mode===m?"white":C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:1,fontFamily:"'DM Mono',monospace",transition:"all .2s"}}>
              {m==="login"?"Email Login":"Email Sign Up"}
            </button>
          ))}
        </div>

        {mode==="signup" && (
          <Input label="YOUR FULL NAME" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Marcus Williams"/>
        )}

        <Input label="EMAIL ADDRESS" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/>
        <Input label="PASSWORD" type="password" value={password} onChange={e=>setPass(e.target.value)} placeholder="Min. 6 characters" error={err}/>

        {mode==="signup" && !isOwnerEmail && (
          <>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1.5,display:"block",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>YOUR ROLE</label>
              <select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.borderBright}`,borderRadius:10,padding:"11px 14px",fontSize:14,color:C.text,outline:"none",appearance:"none"}}>
                {ROLES.filter(r=>r!=="Owner").map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1.5,display:"block",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>YOUR COLOR</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {WORKER_COLORS.map(col=>(
                  <div key={col} onClick={()=>setColor(col)} style={{width:26,height:26,borderRadius:"50%",background:col,cursor:"pointer",border:color===col?`3px solid white`:`3px solid transparent`,boxShadow:color===col?`0 0 10px ${col}`:"none",transition:"all .15s"}}/>
                ))}
              </div>
            </div>
          </>
        )}

        {mode==="signup" && isOwnerEmail && (
          <div style={{background:`${C.goldBright}12`,border:`1px solid ${C.goldBright}44`,borderRadius:8,padding:"10px 12px",marginBottom:16,fontSize:11,color:C.goldBright,fontWeight:700}}>
            👑 Owner account detected — you'll have full admin access.
          </div>
        )}

        <Btn onClick={submit} disabled={loading} color={isOwnerEmail?C.goldBright:C.redBright}>
          {loading?"Please wait…":mode==="login"?"Log In →":"Create Account →"}
        </Btn>

        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:C.textMuted}}>
          {mode==="login"?"Don't have an account? ":"Already have an account? "}
          <span onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{color:C.redBright,fontWeight:700,cursor:"pointer"}}>
            {mode==="login"?"Sign Up":"Log In"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CalendarView({tasks, isOwner}) {
  const now = new Date();
  const [year,setYear]   = useState(now.getFullYear());
  const [month,setMonth] = useState(now.getMonth());
  const [selected,setSel] = useState(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = todayISO();

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSel(null); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSel(null); };

  const getDateStr = (day) => {
    const m = String(month+1).padStart(2,"0");
    const d = String(day).padStart(2,"0");
    return `${year}-${m}-${d}`;
  };

  const getTasksForDate = (dateStr) => tasks.filter(t =>
    t.deadline === dateStr || t.delivery === dateStr
  );

  const selectedTasks = selected ? getTasksForDate(selected) : [];

  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div style={{padding:"0 16px 32px",animation:"fadeUp .3s ease"}}>
      <div style={{padding:"16px 0 14px",fontSize:20,fontWeight:800}}>
        <span style={{color:C.purple}}>Calendar</span>
      </div>

      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 16px"}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18,padding:"0 8px"}}>‹</button>
        <div style={{fontSize:14,fontWeight:800,color:C.text}}>{MONTHS[month]} {year}</div>
        <button onClick={nextMonth} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18,padding:"0 8px"}}>›</button>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:14,marginBottom:12,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.alert}}/><span style={{color:C.textDim}}>DEADLINE</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.blue}}/><span style={{color:C.textDim}}>DELIVERY</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:C.amber}}/><span style={{color:C.textDim}}>BOTH</span></div>
      </div>

      {/* Day headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {DAYS.map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.textMuted,fontFamily:"'DM Mono',monospace",padding:"4px 0"}}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const dateStr = getDateStr(day);
          const dayTasks = getTasksForDate(dateStr);
          const hasDeadline = dayTasks.some(t=>t.deadline===dateStr);
          const hasDelivery = dayTasks.some(t=>t.delivery===dateStr);
          const isToday = dateStr===todayStr;
          const isSel = dateStr===selected;
          const dotColor = hasDeadline&&hasDelivery?C.amber:hasDeadline?C.alert:hasDelivery?C.blue:null;

          return (
            <div key={day} onClick={()=>setSel(isSel?null:dateStr)} style={{
              aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              borderRadius:8,cursor:dayTasks.length?"pointer":"default",
              background:isSel?C.redDim:isToday?`${C.redBright}22`:"transparent",
              border:`1px solid ${isSel?C.redBright:isToday?C.redBright+"66":C.border}`,
              transition:"all .15s",position:"relative",
            }}>
              <span style={{fontSize:12,fontWeight:isToday?800:500,color:isToday?C.redBright:C.text}}>{day}</span>
              {dotColor && <div style={{width:5,height:5,borderRadius:"50%",background:dotColor,marginTop:2,boxShadow:`0 0 4px ${dotColor}`}}/>}
            </div>
          );
        })}
      </div>

      {/* Selected day tasks */}
      {selected && (
        <div style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
          <div style={{fontSize:11,color:C.purple,fontWeight:700,letterSpacing:1.5,marginBottom:12,fontFamily:"'DM Mono',monospace"}}>
            {fmtDate(selected).toUpperCase()} — {selectedTasks.length} ITEM{selectedTasks.length!==1?"S":""}
          </div>
          {selectedTasks.length===0 && <div style={{fontSize:12,color:C.textMuted}}>No tasks, deadlines or deliveries on this date.</div>}
          {selectedTasks.map(t=>(
            <div key={t.id} style={{background:C.bg,border:`1px solid ${C.borderBright}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>{t.title}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <PriBadge p={t.priority}/>
                {t.deadline===selected && <span style={{fontSize:9,fontWeight:800,color:C.alert,background:C.alertDim,border:`1px solid ${C.alert}33`,borderRadius:4,padding:"2px 7px",fontFamily:"'DM Mono',monospace"}}>📌 DEADLINE</span>}
                {t.delivery===selected && <span style={{fontSize:9,fontWeight:800,color:C.blue,background:`${C.blue}18`,border:`1px solid ${C.blue}33`,borderRadius:4,padding:"2px 7px",fontFamily:"'DM Mono',monospace"}}>📦 DELIVERY</span>}
                {t.assignee && <span style={{fontSize:10,color:C.taupe}}>→ {t.assignee}</span>}
                {t.done && <span style={{fontSize:10,color:C.green}}>✓ Done</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All upcoming */}
      <div style={{marginTop:16}}>
        <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:1.5,marginBottom:10,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>Upcoming Deadlines & Deliveries</div>
        {tasks
          .filter(t=>(t.deadline||t.delivery)&&!t.done)
          .sort((a,b)=>new Date(a.deadline||a.delivery)-new Date(b.deadline||b.delivery))
          .slice(0,10)
          .map(t=>(
            <div key={t.id} style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                  {t.deadline && <DeadlinePill deadline={t.deadline}/>}
                  {t.delivery && <span style={{fontSize:9,fontWeight:700,color:C.blue,background:`${C.blue}18`,border:`1px solid ${C.blue}33`,borderRadius:4,padding:"2px 6px",fontFamily:"'DM Mono',monospace"}}>📦 {fmtDate(t.delivery)}</span>}
                  {t.assignee && <span style={{fontSize:10,color:C.textMuted}}>→ {t.assignee}</span>}
                </div>
              </div>
              <button onClick={()=>{
                const d = t.deadline||t.delivery;
                const title = encodeURIComponent(`DAWW: ${t.title}`);
                const date = d.replace(/-/g,"");
                window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}`, "_blank");
              }} style={{background:`${C.blue}18`,border:`1px solid ${C.blue}33`,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12,color:C.blue,fontWeight:700,flexShrink:0}} title="Add to Google Calendar">📆</button>
            </div>
          ))}
        {tasks.filter(t=>(t.deadline||t.delivery)&&!t.done).length===0 && (
          <div style={{fontSize:12,color:C.textMuted,textAlign:"center",padding:"20px 0"}}>No upcoming deadlines or deliveries yet.{isOwner?" Add them from the Owner dashboard.":""}</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT VIEW — with fully visible Edit & Delete buttons for all users
// ─────────────────────────────────────────────────────────────────────────────
function ChatView({me, messages, setMessages, isOwner}) {
  const [channel,setChannel]     = useState("general");
  const [input,setInput]         = useState("");
  const [editing,setEditing]     = useState(null);
  const [uploading,setUploading] = useState(false);
  const [uploadPct,setUploadPct] = useState(0);
  const [recording,setRecording] = useState(false);
  const [mediaRec,setMediaRec]   = useState(null);
  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);
  const videoRef   = useRef(null);
  const accentCol  = isOwner ? C.goldBright : C.redBright;

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,channel]);

  // ── Send text ─────────────────────────────────────────────────────────────
  const send = () => {
    if(!input.trim()) return;
    const time = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const msg = {uid:me.id,name:me.name,color:me.color,isOwner:me.isOwner||false,text:input.trim(),time,channel,ts:Date.now(),edited:false,type:"text"};
    if(db) push(ref(db,"messages"),msg);
    else setMessages(m=>[...m,{...msg,id:uid()}]);
    setInput("");
  };

  // ── Upload via Cloudinary (free) then save message to Firebase ───────────
  const uploadFile = async (file, type) => {
    if(!file) return;
    if(!CLOUDINARY_READY) {
      alert("⚠️ Media uploads need Cloudinary setup.\n\nSteps:\n1. Go to cloudinary.com → sign up free\n2. Settings → Upload → Add upload preset → Unsigned\n3. Copy your Cloud Name + Preset into the app code");
      return;
    }
    setUploading(true); setUploadPct(0);
    try {
      const url = await uploadToCloudinary(file, pct => setUploadPct(pct));
      if(!url) { setUploading(false); return; }
      const time = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
      const msg = {
        uid:me.id, name:me.name, color:me.color,
        isOwner:me.isOwner||false,
        text: type==="image"?"📷 Image":type==="video"?"🎥 Video":"🎤 Voice message",
        mediaUrl:url, mediaType:type,
        time, channel, ts:Date.now(), edited:false, type,
      };
      if(db) push(ref(db,"messages"),msg);
      else setMessages(m=>[...m,{...msg,id:uid()}]);
    } catch(e) {
      console.error("Upload error:", e);
      alert("Upload failed. Please check your internet connection and try again.");
    }
    setUploading(false); setUploadPct(0);
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const rec    = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, {type:"audio/webm"});
        const file = new File([blob], "voice.webm", {type:"audio/webm"});
        uploadFile(file, "voice");
        stream.getTracks().forEach(t=>t.stop());
      };
      rec.start();
      setMediaRec(rec);
      setRecording(true);
    } catch(e) { alert("Microphone access denied. Please allow microphone in your browser settings."); }
  };

  const stopRecording = () => {
    if(mediaRec) { mediaRec.stop(); setMediaRec(null); }
    setRecording(false);
  };

  // ── Edit / Delete ─────────────────────────────────────────────────────────
  const saveEdit = (id) => {
    if(!editing?.text.trim()) return;
    if(db) update(ref(db,`messages/${id}`),{text:editing.text.trim(),edited:true});
    else setMessages(ms=>ms.map(m=>m.id===id?{...m,text:editing.text.trim(),edited:true}:m));
    setEditing(null);
  };

  const deleteMsg = (id) => {
    if(!window.confirm("Delete this message?")) return;
    if(db) remove(ref(db,`messages/${id}`));
    else setMessages(ms=>ms.filter(m=>m.id!==id));
  };

  const visible = messages.filter(m=>m.channel===channel);

  // ── Message bubble content ────────────────────────────────────────────────
  const renderContent = (msg) => {
    if(msg.mediaType==="image" && msg.mediaUrl) return (
      <div style={{borderRadius:10,overflow:"hidden",maxWidth:240}}>
        <img src={msg.mediaUrl} alt="Image" style={{width:"100%",display:"block",borderRadius:10,cursor:"pointer"}}
          onClick={()=>window.open(msg.mediaUrl,"_blank")}/>
      </div>
    );
    if(msg.mediaType==="video" && msg.mediaUrl) return (
      <div style={{borderRadius:10,overflow:"hidden",maxWidth:240}}>
        <video src={msg.mediaUrl} controls playsInline style={{width:"100%",display:"block",borderRadius:10,maxHeight:200}}/>
      </div>
    );
    if(msg.mediaType==="voice" && msg.mediaUrl) return (
      <div style={{background:`${C.purple}22`,border:`1px solid ${C.purple}44`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,minWidth:180}}>
        <div style={{fontSize:20}}>🎤</div>
        <audio src={msg.mediaUrl} controls style={{flex:1,height:32,outline:"none"}}/>
      </div>
    );
    return <span style={{fontSize:13,lineHeight:1.6,wordBreak:"break-word"}}>{msg.text}</span>;
  };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:"calc(100vh - 145px)",animation:"fadeUp .3s ease"}}>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
        onChange={e=>{ if(e.target.files[0]) uploadFile(e.target.files[0],"image"); e.target.value=""; }}/>
      <input ref={videoRef} type="file" accept="video/*" style={{display:"none"}}
        onChange={e=>{ if(e.target.files[0]) uploadFile(e.target.files[0],"video"); e.target.value=""; }}/>

      {/* Channels */}
      <div style={{display:"flex",gap:6,padding:"8px 16px",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {CHANNELS.map(ch=>(
          <button key={ch} onClick={()=>setChannel(ch)} style={{padding:"5px 12px",borderRadius:8,fontSize:10,fontWeight:700,border:`1px solid ${channel===ch?C.redBright:C.border}`,background:channel===ch?C.redDim:"transparent",color:channel===ch?C.redBright:C.textMuted,cursor:"pointer",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:.8,fontFamily:"'DM Mono',monospace"}}>#{ch}</button>
        ))}
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div style={{padding:"6px 16px",background:C.surfaceHigh,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:C.textMuted}}>Uploading…</span>
            <span style={{fontSize:11,color:accentCol,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{uploadPct}%</span>
          </div>
          <div style={{background:C.border,borderRadius:99,height:3,overflow:"hidden"}}>
            <div style={{width:`${uploadPct}%`,height:"100%",background:`linear-gradient(90deg,${accentCol},${accentCol}99)`,borderRadius:99,transition:"width .3s ease"}}/>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div style={{padding:"8px 16px",background:`${C.alert}18`,borderBottom:`1px solid ${C.alert}33`,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:C.alert,animation:"pulse 1s infinite"}}/>
          <span style={{fontSize:12,color:C.alert,fontWeight:700}}>Recording… tap Stop when done</span>
          <button onClick={stopRecording} style={{marginLeft:"auto",background:C.alert,border:"none",borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:12,color:"white",fontWeight:800}}>⏹ Stop</button>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
        {visible.length===0 && (
          <div style={{textAlign:"center",color:C.textMuted,marginTop:60,fontSize:13}}>
            No messages in #{channel} yet.<br/>Be the first to say something 👇
          </div>
        )}

        {visible.map((msg,i)=>{
          const isMine    = msg.uid===me.id || msg.name===me.name;
          const canDelete = isMine || isOwner;
          const canEdit   = isMine && (!msg.mediaType || msg.mediaType==="text");
          const prevSame  = i>0 && visible[i-1].name===msg.name;
          const msgOwner  = msg.isOwner||msg.name===OWNER_NAME;
          const isEditing = editing?.id===msg.id;

          return (
            <div key={msg.id} style={{display:"flex",gap:10,flexDirection:isMine?"row-reverse":"row",animation:"fadeUp .2s ease"}}>
              {!isMine&&!prevSame && <Avatar name={msg.name} color={msg.color||C.taupe} size={30} isOwner={msgOwner}/>}
              {!isMine&&prevSame  && <div style={{width:30}}/>}

              <div style={{maxWidth:"78%",display:"flex",flexDirection:"column",alignItems:isMine?"flex-end":"flex-start"}}>

                {/* Sender name */}
                {!prevSame&&!isMine && (
                  <div style={{fontSize:11,color:msgOwner?C.goldBright:msg.color||C.taupe,fontWeight:700,marginBottom:4}}>
                    {msg.name}{msgOwner?" 👑":""} · <span style={{color:C.textMuted,fontWeight:400}}>{msg.time}</span>
                  </div>
                )}

                {isEditing ? (
                  <div style={{display:"flex",gap:6,flexDirection:"column",width:"100%"}}>
                    <textarea value={editing.text} onChange={e=>setEditing(ed=>({...ed,text:e.target.value}))}
                      rows={3} style={{background:C.surfaceHigh,border:`1px solid ${C.redBright}66`,borderRadius:10,padding:"10px 13px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"'Sora',sans-serif",minWidth:200}}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>saveEdit(msg.id)} style={{flex:1,background:`linear-gradient(135deg,${C.green},#2e7d52)`,border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:12,color:"white",fontWeight:800}}>✓ Save</button>
                      <button onClick={()=>setEditing(null)} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px",cursor:"pointer",fontSize:12,color:C.textMuted,fontWeight:700}}>✕ Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bubble */}
                    <div style={{
                      background:isMine?C.redDim:msgOwner?`${C.goldBright}12`:C.surfaceHigh,
                      border:`1px solid ${isMine?C.redBright+"55":msgOwner?C.goldBright+"44":C.border}`,
                      borderRadius:isMine?"16px 4px 16px 16px":"4px 16px 16px 16px",
                      padding:msg.mediaType&&msg.mediaType!=="text"?"6px":"10px 14px",
                      overflow:"hidden",
                    }}>
                      {renderContent(msg)}
                    </div>

                    {/* Action row */}
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap",justifyContent:isMine?"flex-end":"flex-start"}}>
                      <span style={{fontSize:10,color:C.textMuted}}>{msg.time}{msg.edited?" · edited":""}</span>
                      {canEdit && (
                        <button onClick={e=>{e.stopPropagation();setEditing({id:msg.id,text:msg.text});}}
                          style={{display:"flex",alignItems:"center",gap:4,background:C.surfaceHigh,border:`1px solid ${C.borderBright}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,color:C.textDim,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
                          ✏ Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={e=>{e.stopPropagation();deleteMsg(msg.id);}}
                          style={{display:"flex",alignItems:"center",gap:4,background:C.alertDim,border:`1px solid ${C.alert}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,color:C.alert,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input bar with media buttons */}
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`}}>
        {/* Media buttons row */}
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          {[
            {icon:"📷", label:"Photo",  action:()=>fileRef.current?.click(),   color:C.blue},
            {icon:"🎥", label:"Video",  action:()=>videoRef.current?.click(),  color:C.purple},
            {icon:"🎤", label:recording?"Stop":"Voice", action:recording?stopRecording:startRecording, color:recording?C.alert:C.green},
          ].map(btn=>(
            <button key={btn.label} onClick={btn.action} disabled={uploading} style={{
              display:"flex",alignItems:"center",gap:5,
              padding:"6px 12px",borderRadius:8,
              background:`${btn.color}18`,border:`1px solid ${btn.color}44`,
              color:btn.color,fontSize:12,fontWeight:700,cursor:uploading?"not-allowed":"pointer",
              opacity:uploading?0.5:1,fontFamily:"'DM Mono',monospace",
              animation:recording&&btn.label==="Stop"?"pulse 1s infinite":"none",
            }}>
              <span>{btn.icon}</span>{btn.label}
            </button>
          ))}
        </div>

        {/* Text input + send */}
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder={`Message #${channel}…`}
            style={{flex:1,background:C.surfaceHigh,border:`1px solid ${isOwner?C.goldBright+"44":C.borderBright}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.text,outline:"none"}}/>
          <button onClick={send} disabled={uploading} style={{
            background:isOwner?`linear-gradient(135deg,${C.goldBright},#a07020)`:`linear-gradient(135deg,${C.redBright},#7a1010)`,
            border:"none",borderRadius:10,padding:"10px 18px",
            cursor:uploading?"not-allowed":"pointer",fontSize:15,
            color:isOwner?C.bg:"white",fontWeight:900,opacity:uploading?0.5:1,
          }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function OwnerDashboard({me, tasks, setTasks, workers, setWorkers, messages, setMessages, isOwner=false}) {
  const [showAdd,setShowAdd]       = useState(false);
  const [f,setF]                   = useState({title:"",pri:"high",project:"Operations",assignee:"",deadline:"",delivery:"",note:""});
  const [announce,setAnnounce]     = useState("");
  const [activeTab,setActiveTab]   = useState("overview"); // overview | media | team
  const [mediaFilter,setMediaFilter] = useState("all"); // all | image | video | voice

  const openTasks = tasks.filter(t=>!t.done).length;
  const doneTasks = tasks.filter(t=>t.done).length;
  const overdue   = tasks.filter(t=>t.deadline&&daysLeft(t.deadline)<0&&!t.done).length;

  const addTask = () => {
    if(!f.title.trim()) return;
    const task = {...f, title:f.title.trim(), due:todayISO(), done:false, createdBy:me.name, ts:Date.now()};
    if(db) push(ref(db,"tasks"),task);
    else setTasks(ts=>[...ts,{...task,id:uid()}]);
    setF({title:"",pri:"high",project:"Operations",assignee:"",deadline:"",delivery:"",note:""});
    setShowAdd(false);
  };

  const deleteTask = (task,e) => { e.stopPropagation(); if(db) remove(ref(db,`tasks/${task.id}`)); else setTasks(ts=>ts.filter(t=>t.id!==task.id)); };

  const removeWorker = (w) => {
    if(!window.confirm(`Remove ${w.name} from the team?`)) return;
    if(db) remove(ref(db,`workers/${w.id}`));
    else setWorkers(ws=>ws.filter(x=>x.id!==w.id));
  };

  const cleanupDuplicates = () => {
    // Keep only the most recent profile per email/name combination
    const seen = {};
    const toDelete = [];
    // Sort by joinedAt so we keep the latest
    const sorted = [...workers].sort((a,b)=>(b.joinedAt||0)-(a.joinedAt||0));
    sorted.forEach(w => {
      const key = (w.email||w.name||"").toLowerCase();
      if(seen[key]) {
        toDelete.push(w); // duplicate — delete older one
      } else {
        seen[key] = true;
      }
    });
    if(toDelete.length===0) {
      alert("No duplicates found! Your team list is clean ✓");
      return;
    }
    if(!window.confirm(`Found ${toDelete.length} duplicate profile${toDelete.length>1?"s":""}. Remove them now?`)) return;
    toDelete.forEach(w => {
      if(db) remove(ref(db,`workers/${w.id}`));
      else setWorkers(ws=>ws.filter(x=>x.id!==w.id));
    });
    alert(`Removed ${toDelete.length} duplicate${toDelete.length>1?"s":""}! ✓`);
  };

  const pinAnnounce = () => {
    if(!announce.trim()) return;
    const time = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const msg = {uid:me.id, name:me.name, color:me.color, isOwner:true, text:`📌 ANNOUNCEMENT: ${announce.trim()}`, time, channel:"general", pinned:true, ts:Date.now()};
    if(db) push(ref(db,"messages"),msg);
    else setMessages(m=>[...m,{...msg,id:uid()}]);
    setAnnounce("");
  };

  const field = (label,key,type="text",placeholder="") => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1,marginBottom:4,fontFamily:"'DM Mono',monospace"}}>{label}</div>
      <input type={type} value={f[key]} onChange={e=>setF(x=>({...x,[key]:e.target.value}))} placeholder={placeholder}
        style={{width:"100%",background:C.bg,border:`1px solid ${C.borderBright}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.text,outline:"none"}}/>
    </div>
  );

  return (
    <div style={{padding:"0 16px 32px",animation:"fadeUp .3s ease"}}>
      <div style={{padding:"14px 0 6px"}}>
        <div style={{fontSize:18,fontWeight:800}}>👑 <span style={{color:C.goldBright}}>Owner Dashboard</span></div>
        <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.goldBright}88,transparent)`}}/>
        <div style={{width:5,height:5,background:C.goldBright,transform:"rotate(45deg)"}}/>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.taupe}22)`}}/>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
        {[{l:"Open Tasks",v:openTasks,c:C.redBright},{l:"Completed",v:doneTasks,c:C.green},{l:"Team Members",v:workers.length,c:C.taupe},{l:"Overdue",v:overdue,c:overdue>0?C.alert:C.textMuted}].map(s=>(
          <div key={s.l} style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderTop:`2px solid ${s.c}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
            <div style={{fontSize:10,color:C.textMuted,marginTop:3,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>



      {/* Tab navigation */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:C.surfaceHigh,borderRadius:10,padding:3}}>
        {[["overview","📋 Overview"],["media","🗂 Media"],["team","👥 Team"]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:activeTab===tab?C.redBright:"transparent",color:activeTab===tab?"white":C.textMuted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Mono',monospace",transition:"all .2s"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab==="overview" && <>


      </> }

      {/* ── MEDIA MANAGER TAB ── */}
      {activeTab==="media" && <MediaManager messages={messages} setMessages={setMessages} isOwner={isOwner}/>}

      {/* ── TEAM TAB ── */}
      {activeTab==="team" && <>
      {/* Team management */}
      <div style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:11,color:C.taupe,fontWeight:700,letterSpacing:1.5,fontFamily:"'DM Mono',monospace"}}>👥 TEAM MANAGEMENT</div>
          <button onClick={cleanupDuplicates} style={{background:`${C.purple}22`,border:`1px solid ${C.purple}44`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,color:C.purple,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
            🧹 Duplicates
          </button>
        </div>

        {/* Role legend */}
        <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
          {[["👑","Owner","full control",C.goldBright],["🛡️","Admin","can manage tasks & team",C.purple],["👷","Worker","standard access",C.taupe]].map(([icon,label,desc,col])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:11}}>{icon}</span>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:col}}>{label}</div>
                <div style={{fontSize:9,color:C.textMuted}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{fontSize:11,color:C.textMuted,marginBottom:10}}>
          {workers.length} member{workers.length!==1?"s":""} · tap a worker to manage
        </div>

        {workers.map((w,i)=>{
          const wIsOwner = w.isOwner||w.name===OWNER_NAME||w.email===OWNER_EMAIL;
          const wIsAdmin = w.isAdmin && !wIsOwner;
          const borderCol = wIsOwner?C.goldBright+"44":wIsAdmin?C.purple+"44":C.border;
          return (
            <div key={i} style={{background:C.bg,borderRadius:10,border:`1px solid ${borderCol}`,marginBottom:8,overflow:"hidden"}}>
              {/* Worker header */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"}}>
                <Avatar name={w.name} color={w.color||C.taupe} size={32} isOwner={wIsOwner} isAdmin={wIsAdmin}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>{w.name}</span>
                    {wIsOwner && <span style={{fontSize:9,fontWeight:800,color:C.goldBright,background:`${C.goldBright}18`,border:`1px solid ${C.goldBright}33`,borderRadius:4,padding:"1px 6px",fontFamily:"'DM Mono',monospace"}}>OWNER</span>}
                    {wIsAdmin && <span style={{fontSize:9,fontWeight:800,color:C.purple,background:`${C.purple}18`,border:`1px solid ${C.purple}33`,borderRadius:4,padding:"1px 6px",fontFamily:"'DM Mono',monospace"}}>ADMIN</span>}
                  </div>
                  <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{w.role}</div>
                  {w.title && <div style={{fontSize:11,color:C.taupe,marginTop:1,fontStyle:"italic"}}>"{w.title}"</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:w.online?C.green:C.textMuted}}/>
                </div>
              </div>

              {/* Owner controls — not shown for owner themselves */}
              {!wIsOwner && (
                <div style={{borderTop:`1px solid ${C.border}`,padding:"8px 12px",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>

                  {/* Admin toggle */}
                  <button onClick={()=>{
                    const updated = {...w, isAdmin: !w.isAdmin};
                    if(db) update(ref(db,`workers/${w.id}`),{isAdmin:!w.isAdmin});
                    else setWorkers(ws=>ws.map(x=>x.id===w.id?updated:x));
                  }} style={{
                    padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",
                    background:wIsAdmin?`${C.purple}22`:`${C.purple}11`,
                    border:`1px solid ${wIsAdmin?C.purple:C.purple+"44"}`,
                    color:wIsAdmin?C.purple:C.textMuted,
                    fontFamily:"'DM Mono',monospace",
                  }}>
                    {wIsAdmin?"🛡️ Remove Admin":"🛡️ Make Admin"}
                  </button>

                  {/* Title editor */}
                  <TitleEditor worker={w} onSave={(title)=>{
                    if(db) update(ref(db,`workers/${w.id}`),{title});
                    else setWorkers(ws=>ws.map(x=>x.id===w.id?{...x,title}:x));
                  }}/>

                  {/* Remove worker */}
                  {w.email!==OWNER_EMAIL && (
                    <button onClick={()=>removeWorker(w)} style={{marginLeft:"auto",background:C.alertDim,border:`1px solid ${C.alert}33`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.alert,fontWeight:700}}>
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA MANAGER — Owner only, shows all uploaded files with delete option
// ─────────────────────────────────────────────────────────────────────────────
function MediaManager({messages, setMessages}) {
  const [filter, setFilter]       = useState("all");
  const [deleting, setDeleting]   = useState(null);
  const [preview, setPreview]     = useState(null);

  // Get all media messages
  const mediaMessages = messages.filter(m => m.mediaUrl && m.mediaType);

  const filtered = filter==="all" ? mediaMessages
    : mediaMessages.filter(m => m.mediaType===filter);

  // Count by type
  const counts = {
    all:   mediaMessages.length,
    image: mediaMessages.filter(m=>m.mediaType==="image").length,
    video: mediaMessages.filter(m=>m.mediaType==="video").length,
    voice: mediaMessages.filter(m=>m.mediaType==="voice").length,
  };

  const deleteMedia = async (msg) => {
    if(!window.confirm(`Delete this ${msg.mediaType} from the chat?\n\nThis removes it from the chat. To also free storage on Cloudinary, delete it from your Cloudinary dashboard.`)) return;
    setDeleting(msg.id);
    // Remove from Firebase messages
    try {
      if(db) await remove(ref(db, `messages/${msg.id}`));
      else setMessages(ms => ms.filter(m => m.id !== msg.id));
    } catch(e) { console.error(e); }
    setDeleting(null);
  };

  const deleteAllOfType = async (type) => {
    const toDelete = mediaMessages.filter(m => type==="all" ? true : m.mediaType===type);
    if(toDelete.length===0) { alert("Nothing to delete."); return; }
    if(!window.confirm(`Delete ALL ${toDelete.length} ${type==="all"?"media files":type+" files"} from chat?\n\nThis cannot be undone.`)) return;
    for(const msg of toDelete) {
      if(db) await remove(ref(db, `messages/${msg.id}`));
    }
    if(!db) setMessages(ms => ms.filter(m => !toDelete.find(d=>d.id===m.id)));
    alert(`Deleted ${toDelete.length} file${toDelete.length!==1?"s":""}. ✓`);
  };

  const typeIcon  = t => t==="image"?"📷":t==="video"?"🎥":"🎤";
  const typeColor = t => t==="image"?C.blue:t==="video"?C.purple:C.green;

  return (
    <div style={{animation:"fadeUp .3s ease"}}>

      {/* Storage tip */}
      <div style={{background:`${C.amber}12`,border:`1px solid ${C.amber}33`,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>💡 Free up Cloudinary space</div>
        <div style={{fontSize:11,color:C.textDim,lineHeight:1.7}}>
          Deleting here removes files from the chat. To fully free Cloudinary storage, also delete them at <span style={{color:C.amber,fontWeight:700}}>cloudinary.com → Media Library</span>. You have 25GB free — use the filters below to find and clear old files.
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        {[["all","All",C.taupe],["image","Photos",C.blue],["video","Videos",C.purple],["voice","Audio",C.green]].map(([type,label,col])=>(
          <div key={type} onClick={()=>setFilter(type)} style={{
            background:filter===type?`${col}22`:C.surfaceHigh,
            border:`1px solid ${filter===type?col:C.border}`,
            borderRadius:10,padding:"10px 6px",textAlign:"center",cursor:"pointer",
            transition:"all .2s",
          }}>
            <div style={{fontSize:18,marginBottom:2}}>{type==="all"?"🗂":typeIcon(type)}</div>
            <div style={{fontSize:16,fontWeight:800,color:col,fontFamily:"'DM Mono',monospace"}}>{counts[type]}</div>
            <div style={{fontSize:9,color:C.textMuted,fontWeight:600,letterSpacing:.5}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bulk delete */}
      {filtered.length>0 && (
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <button onClick={()=>deleteAllOfType(filter)} style={{
            background:C.alertDim,border:`1px solid ${C.alert}44`,borderRadius:8,
            padding:"6px 14px",cursor:"pointer",fontSize:11,color:C.alert,fontWeight:700,
            fontFamily:"'DM Mono',monospace",
          }}>
            🗑 Delete All {filter==="all"?"Media":filter.charAt(0).toUpperCase()+filter.slice(1)+"s"} ({filtered.length})
          </button>
        </div>
      )}

      {/* Media grid */}
      {filtered.length===0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:C.textMuted,fontSize:13}}>
          No {filter==="all"?"media files":filter+" files"} found in chat.
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(msg=>(
          <div key={msg.id} style={{
            background:C.surfaceHigh,border:`1px solid ${C.border}`,
            borderRadius:12,overflow:"hidden",
          }}>
            <div style={{display:"flex",gap:10,padding:"10px 12px",alignItems:"center"}}>

              {/* Thumbnail / preview */}
              <div style={{width:52,height:52,borderRadius:8,overflow:"hidden",flexShrink:0,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}
                onClick={()=>setPreview(msg)}>
                {msg.mediaType==="image" && (
                  <img src={msg.mediaUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                )}
                {msg.mediaType==="video" && (
                  <div style={{fontSize:24}}>🎥</div>
                )}
                {msg.mediaType==="voice" && (
                  <div style={{fontSize:24}}>🎤</div>
                )}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:10,fontWeight:800,color:typeColor(msg.mediaType),background:`${typeColor(msg.mediaType)}18`,border:`1px solid ${typeColor(msg.mediaType)}33`,borderRadius:4,padding:"1px 6px",fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>
                    {typeIcon(msg.mediaType)} {msg.mediaType}
                  </span>
                  <span style={{fontSize:10,color:C.textMuted}}>#{msg.channel}</span>
                </div>
                <div style={{fontSize:12,fontWeight:600,color:C.text}}>Sent by {msg.name}</div>
                <div style={{fontSize:10,color:C.textMuted,marginTop:1}}>{msg.time} · {new Date(msg.ts||0).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
              </div>

              {/* Actions */}
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                <button onClick={()=>window.open(msg.mediaUrl,"_blank")} style={{background:`${C.blue}18`,border:`1px solid ${C.blue}33`,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.blue,fontWeight:700}}>
                  View
                </button>
                <button onClick={()=>deleteMedia(msg)} disabled={deleting===msg.id} style={{background:C.alertDim,border:`1px solid ${C.alert}33`,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.alert,fontWeight:700,opacity:deleting===msg.id?.5:1}}>
                  {deleting===msg.id?"…":"Delete"}
                </button>
              </div>
            </div>

            {/* Inline preview for voice */}
            {msg.mediaType==="voice" && (
              <div style={{padding:"0 12px 12px"}}>
                <audio src={msg.mediaUrl} controls style={{width:"100%",height:32}}/>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full image/video preview modal */}
      {preview && (
        <div onClick={()=>setPreview(null)} style={{
          position:"fixed",top:0,left:0,right:0,bottom:0,
          background:"rgba(0,0,0,0.92)",zIndex:999,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,
        }}>
          <button onClick={()=>setPreview(null)} style={{position:"absolute",top:16,right:16,background:`${C.alert}22`,border:`1px solid ${C.alert}44`,borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:16,color:C.alert,fontWeight:800}}>✕</button>
          {preview.mediaType==="image" && <img src={preview.mediaUrl} alt="" style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:12,objectFit:"contain"}}/>}
          {preview.mediaType==="video" && <video src={preview.mediaUrl} controls autoPlay style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:12}}/>}
          <div style={{marginTop:12,fontSize:12,color:C.textMuted}}>Sent by {preview.name} · {preview.time}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE EDITOR — inline editable title for workers
// ─────────────────────────────────────────────────────────────────────────────
function TitleEditor({worker, onSave}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(worker.title||"");

  const save = () => {
    onSave(val.trim());
    setEditing(false);
  };

  if(editing) return (
    <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
      <input value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") save(); if(e.key==="Escape") setEditing(false); }}
        placeholder="e.g. Lead Electrician"
        autoFocus
        style={{flex:1,background:C.surfaceHigh,border:`1px solid ${C.purple}66`,borderRadius:7,padding:"5px 10px",fontSize:12,color:C.text,outline:"none",minWidth:0}}/>
      <button onClick={save} style={{background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.green,fontWeight:700}}>✓</button>
      <button onClick={()=>setEditing(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,color:C.textMuted}}>✕</button>
    </div>
  );

  return (
    <button onClick={()=>{setVal(worker.title||"");setEditing(true);}} style={{
      padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
      background:"transparent",border:`1px solid ${C.border}`,
      color:worker.title?C.taupeLight:C.textMuted,
      fontStyle:worker.title?"italic":"normal",
    }}>
      {worker.title?`"${worker.title}"` : "📛 Set Title"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS VIEW — proper component (fixes white screen bug)
// ─────────────────────────────────────────────────────────────────────────────
function TasksView({tasks, toggleTask, addQuickTask, openTasks, isOwner}) {
  const [newTask, setNewTask] = useState("");
  const [pri, setPri]         = useState("med");
  const [filter, setFilter]   = useState("all");

  const doAdd = () => {
    if(!newTask.trim()) return;
    addQuickTask(newTask, pri);
    setNewTask("");
  };

  const filtered = tasks.filter(t => {
    if(filter==="open")   return !t.done;
    if(filter==="done")   return t.done;
    if(filter==="high")   return t.priority==="high" && !t.done;
    return true;
  });

  return (
    <div style={{padding:"0 16px 32px",animation:"fadeUp .3s ease"}}>
      <div style={{padding:"16px 0 12px",fontSize:20,fontWeight:800}}>
        <span style={{color:C.redBright}}>Tasks</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:15,color:C.textMuted}}> · {openTasks} open</span>
      </div>

      {/* Add task bar */}
      <div style={{background:C.surfaceHigh,border:`1px solid ${C.borderBright}`,borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&doAdd()}
            placeholder="Add a task…"
            style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"'Sora',sans-serif"}}/>
          <button onClick={doAdd} style={{background:`linear-gradient(135deg,${C.redBright},#7a1010)`,border:"none",borderRadius:8,padding:"9px 16px",cursor:"pointer",color:"white",fontSize:15,fontWeight:900}}>+</button>
        </div>
        {/* Priority selector */}
        <div style={{display:"flex",gap:6}}>
          {["high","med","low"].map(p=>{
            const col = p==="high"?C.alert:p==="med"?C.amber:C.textDim;
            return (
              <button key={p} onClick={()=>setPri(p)} style={{padding:"5px 14px",borderRadius:6,fontSize:10,fontWeight:800,border:`1px solid ${pri===p?col:C.border}`,background:pri===p?`${col}18`:"transparent",color:pri===p?col:C.textMuted,cursor:"pointer",textTransform:"uppercase",letterSpacing:1,fontFamily:"'DM Mono',monospace"}}>{p}</button>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {[["all","All"],["open","Open"],["done","Done"],["high","🔴 High"]].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{padding:"5px 14px",borderRadius:99,fontSize:11,fontWeight:700,border:`1px solid ${filter===val?C.redBright:C.border}`,background:filter===val?C.redDim:"transparent",color:filter===val?C.redBright:C.textMuted,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{label}</button>
        ))}
      </div>

      {/* Task list */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0 && (
          <div style={{textAlign:"center",color:C.textMuted,padding:"30px 0",fontSize:13}}>
            No tasks here yet.
          </div>
        )}
        {filtered.map(t=>(
          <div key={t.id} onClick={()=>toggleTask(t)} style={{
            background:t.done?C.surface:C.surfaceHigh,
            border:`1px solid ${t.done?C.border:t.priority==="high"&&!t.done?C.alert+"33":C.borderBright}`,
            borderRadius:12,padding:"12px 14px",
            display:"flex",gap:12,alignItems:"flex-start",
            cursor:"pointer",opacity:t.done?0.45:1,transition:"opacity .2s",
          }}>
            {/* Checkbox */}
            <div style={{
              width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
              border:`2px solid ${t.done?C.green:C.borderBright}`,
              background:t.done?C.greenDim:"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,color:C.green,fontWeight:900,
            }}>{t.done?"✓":""}</div>

            {/* Content */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,textDecoration:t.done?"line-through":"none",lineHeight:1.4}}>{t.title}</div>
              <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                <PriBadge p={t.priority}/>
                {t.assignee&&<span style={{fontSize:11,color:C.taupe}}>→ {t.assignee}</span>}
                {t.deadline&&<DeadlinePill deadline={t.deadline}/>}
                {t.delivery&&<span style={{fontSize:9,color:C.blue,fontFamily:"'DM Mono',monospace",fontWeight:700}}>📦 {fmtDate(t.delivery)}</span>}
                {t.done&&t.doneBy&&<span style={{fontSize:11,color:C.green}}>✓ {t.doneBy}</span>}
                {t.note&&<span style={{fontSize:10,color:C.textMuted,fontStyle:"italic"}}>{t.note}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function DAWWApp() {
  const [me,setMe]             = useState(null);
  const [authReady,setAuthReady] = useState(false);
  const [view,setView]         = useState("dashboard");
  const [messages,setMessages] = useState([]);
  const [tasks,setTasks]       = useState([]);
  const [workers,setWorkers]   = useState([]);
  const [connected,setConnected] = useState(false);

  // Auth listener + handle Google redirect result on return
  useEffect(()=>{
    if(!auth) { setAuthReady(true); return; }

    // Handle Google redirect sign-in return
    getRedirectResult(auth).then(async result => {
      if(result?.user) {
        const user = result.user;
        const isOwner = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
        const snap = await new Promise(res => onValue(ref(db,`workers/${user.uid}`), res, {onlyOnce:true}));
        if(!snap.val()) {
          const profile = {
            id: user.uid,
            name: user.displayName || user.email.split("@")[0],
            role: isOwner ? "Owner" : "Crew Member",
            color: isOwner ? C.goldBright : WORKER_COLORS[Math.floor(Math.random()*WORKER_COLORS.length)],
            email: user.email, isOwner,
            online: true, joinedAt: Date.now(),
          };
          await set(ref(db,`workers/${user.uid}`), profile);
        }
      }
    }).catch(e => console.warn("Redirect result:", e));

    return onAuthStateChanged(auth, async user=>{
      if(user) {
        onValue(ref(db,`workers/${user.uid}`), snap=>{
          const profile = snap.val();
          if(profile) {
            setMe(profile);
            setView(profile.isOwner?"owner":"dashboard");
          }
        },{onlyOnce:true});
      } else {
        setMe(null);
      }
      setAuthReady(true);
    });
  },[]);

  // Notification permission
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(()=>{
    if(!me) return;
    requestNotificationPermission().then(granted => setNotifGranted(granted));
  },[me]);

  // Firebase subscriptions + smart notifications
  const lastMsgTs  = useRef(0);
  const lastTaskTs = useRef(0);

  useEffect(()=>{
    if(!db||!me) return;
    update(ref(db,`workers/${me.id}`),{online:true,lastSeen:serverTimestamp()});

    // Workers
    const u1=onValue(ref(db,"workers"),snap=>{ const d=snap.val(); if(d){setWorkers(Object.values(d));setConnected(true);} });

    // Messages — notify on new messages from others
    const u2=onValue(ref(db,"messages"),snap=>{
      const d=snap.val();
      if(d){
        const msgs=Object.entries(d).map(([id,v])=>({id,...v}));
        msgs.sort((a,b)=>(a.ts||0)-(b.ts||0));
        setMessages(msgs);
        setConnected(true);
        // Find newest message
        const newest = msgs[msgs.length-1];
        if(newest && newest.ts > lastMsgTs.current && newest.name !== me.name) {
          // Only notify if app is in background or on different tab
          if(document.hidden) {
            sendNotification(
              newest.pinned ? "📌 Owner Announcement" : `💬 ${newest.name}`,
              newest.pinned ? newest.text.replace("📌 ANNOUNCEMENT: ","") : newest.text
            );
          }
          lastMsgTs.current = newest.ts;
        } else if(newest) {
          lastMsgTs.current = newest.ts;
        }
      }
    });

    // Tasks — notify when assigned to me
    const u3=onValue(ref(db,"tasks"),snap=>{
      const d=snap.val();
      if(d){
        const newTasks=Object.entries(d).map(([id,v])=>({id,...v}));
        setTasks(newTasks);
        setConnected(true);
        // Check for newly assigned tasks
        newTasks.forEach(t=>{
          if(t.assignee===me.name && t.ts > lastTaskTs.current && t.createdBy !== me.name) {
            sendNotification(
              "✅ New Task Assigned to You",
              `"${t.title}" — Priority: ${(t.priority||"med").toUpperCase()}`
            );
          }
        });
        const maxTs = Math.max(...newTasks.map(t=>t.ts||0), 0);
        if(maxTs > 0) lastTaskTs.current = maxTs;
      }
    });

    // Deadline reminder — check every 30 minutes
    const deadlineCheck = setInterval(()=>{
      tasks.forEach(t=>{
        if(!t.done && t.deadline && t.assignee===me.name) {
          const d = daysLeft(t.deadline);
          if(d===1) sendNotification("⚠️ Deadline Tomorrow!", `"${t.title}" is due tomorrow`);
          if(d===0) sendNotification("🚨 Due Today!", `"${t.title}" is due today`);
          if(d<0)   sendNotification("❗ Overdue Task", `"${t.title}" is ${Math.abs(d)} day${Math.abs(d)!==1?"s":""} overdue`);
        }
      });
    }, 1800000); // 30 minutes

    return ()=>{u1();u2();u3();clearInterval(deadlineCheck);};
  },[me]);

  const logout = async () => {
    if(db&&me) update(ref(db,`workers/${me.id}`),{online:false});
    if(auth) await signOut(auth);
    setMe(null); setView("dashboard");
  };

  const toggleTask = (task) => {
    const updated={...task,done:!task.done,doneBy:!task.done?me.name:""};
    if(db) update(ref(db,`tasks/${task.id}`),{done:updated.done,doneBy:updated.doneBy});
    else setTasks(ts=>ts.map(t=>t.id===task.id?updated:t));
  };

  const addQuickTask = (title,pri) => {
    if(!title.trim()) return;
    const task={title:title.trim(),priority:pri,project:"General",due:todayISO(),deadline:"",delivery:"",done:false,assignee:me.name,createdBy:me.name,ts:Date.now()};
    if(db) push(ref(db,"tasks"),task);
    else setTasks(ts=>[...ts,{...task,id:uid()}]);
  };

  if(!authReady) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <DAWWLogo size={56}/>
      <div style={{color:C.textMuted,fontSize:12,fontFamily:"'DM Mono',sans-serif",letterSpacing:2}}>LOADING…</div>
    </div>
  );

  if(!me) return <AuthScreen onAuth={p=>{setMe(p);setView(p.isOwner?"owner":"dashboard");}}/>;

  const isOwner = me.isOwner||me.name===OWNER_NAME||me.email===OWNER_EMAIL;
  const isAdmin  = me.isAdmin && !isOwner;
  const hasAdminAccess = isOwner || isAdmin; // both can access owner/admin dashboard
  const openTasks = tasks.filter(t=>!t.done).length;
  const doneTasks = tasks.filter(t=>t.done).length;
  const pct = tasks.length?Math.round((doneTasks/tasks.length)*100):0;
  const pinned = messages.filter(m=>m.pinned);

  const nav = hasAdminAccess
    ? [
        {id:"owner",   label: isOwner?"Owner":"Admin", icon: isOwner?"👑":"🛡️"},
        {id:"tasks",   label:"Tasks",    icon:"✓",  badge:openTasks||null},
        {id:"chat",    label:"Chat",     icon:"◉"},
        {id:"calendar",label:"Calendar", icon:"📅"},
      ]
    : [
        {id:"dashboard",label:"Home",     icon:"⌂"},
        {id:"tasks",    label:"Tasks",    icon:"✓",  badge:openTasks||null},
        {id:"chat",     label:"Chat",     icon:"◉"},
        {id:"calendar", label:"Calendar", icon:"📅"},
      ];

  const accentColor = isOwner?C.goldBright:isAdmin?C.purple:C.redBright;
  const accentGlow  = isOwner?C.goldGlow:isAdmin?`${C.purple}44`:C.redGlow;

  return (
    <div style={{background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",fontFamily:"'Sora',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#2a2222;border-radius:99px;}
        input,select,textarea{font-family:'Sora',sans-serif;}
        input::placeholder,textarea::placeholder{color:#3a2e2e;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes goldglow{0%,100%{filter:drop-shadow(0 0 8px #d4a85344)}50%{filter:drop-shadow(0 0 18px #d4a85388)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:C.surface,borderBottom:`1px solid ${isOwner?C.goldBright+"33":C.border}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:isOwner?`0 2px 20px ${C.goldGlow}`:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{animation:"goldglow 3s infinite"}}><DAWWLogo size={30}/></div>
          <div>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase"}}>DAWW <span style={{color:accentColor}}>CREATIONS</span></div>
            <div style={{fontSize:9,color:isOwner?C.goldBright:isAdmin?C.purple:C.textMuted,letterSpacing:2,fontFamily:"'DM Mono',monospace"}}>{isOwner?"👑 OWNER MODE":isAdmin?"🛡️ ADMIN MODE":"TEAM SYNC"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:connected?C.green:C.amber,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:9,color:connected?C.green:C.amber,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{connected?"LIVE":"DEMO"}</span>
          </div>
          <div onClick={logout} style={{cursor:"pointer"}} title="Log out">
            <Avatar name={me.name} color={me.color||C.taupe} size={28} isOwner={isOwner}/>
          </div>
        </div>
      </div>

      {/* Notification permission banner */}
      {me && !notifGranted && (typeof Notification !== "undefined") && Notification?.permission !== "denied" && (
        <div style={{background:`${C.amber}15`,border:`1px solid ${C.amber}33`,margin:"6px 16px 0",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber}}>🔔 Enable Notifications</div>
            <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>Get alerts for new messages, tasks & deadlines</div>
          </div>
          <button onClick={()=>requestNotificationPermission().then(g=>setNotifGranted(g))}
            style={{background:`linear-gradient(135deg,${C.amber},#a06010)`,border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,color:"white",fontWeight:800,flexShrink:0}}>
            Enable
          </button>
        </div>
      )}
      {me && (typeof Notification !== "undefined") && Notification?.permission === "denied" && (
        <div style={{background:`${C.alert}10`,border:`1px solid ${C.alert}22`,margin:"6px 16px 0",borderRadius:10,padding:"8px 14px"}}>
          <div style={{fontSize:11,color:C.textMuted}}>🔕 Notifications blocked — go to browser settings to allow them.</div>
        </div>
      )}
      {me && notifGranted && (
        <div style={{background:`${C.green}10`,border:`1px solid ${C.green}22`,margin:"6px 16px 0",borderRadius:10,padding:"8px 14px",display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.green,flexShrink:0}}/>
          <div style={{fontSize:11,color:C.green,fontWeight:600}}>🔔 Notifications active — alerts on for messages, tasks & deadlines</div>
        </div>
      )}

      {/* CONTENT */}
      <div style={{flex:1,overflowY:view==="chat"?"hidden":"auto",display:"flex",flexDirection:"column"}}>

        {/* OWNER */}
        {view==="owner"&&hasAdminAccess&&<OwnerDashboard me={me} tasks={tasks} setTasks={setTasks} workers={workers} setWorkers={setWorkers} messages={messages} setMessages={setMessages} isOwner={isOwner}/>}

        {/* DASHBOARD */}
        {view==="dashboard"&&(
          <div style={{padding:"0 16px 32px",animation:"fadeUp .3s ease"}}>

            {/* Welcome header */}
            <div style={{padding:"16px 0 6px"}}>
              <div style={{fontSize:20,fontWeight:800}}>Welcome, <span style={{color:C.redBright}}>{me.name.split(" ")[0]}</span> 👷</div>
              <div style={{fontSize:12,color:C.textMuted,marginTop:3}}>{me.role}{me.title?` · "${me.title}"`:""} · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,marginBottom:16}}>
                <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.redBright}66,transparent)`}}/>
                <div style={{width:5,height:5,background:C.redBright,transform:"rotate(45deg)"}}/>
                <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.taupe}33)`}}/>
              </div>
            </div>

            {/* Pinned announcements */}
            {pinned.slice(-2).map(m=>(
              <div key={m.id} style={{background:`${C.goldBright}12`,border:`1px solid ${C.goldBright}44`,borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                <div style={{fontSize:10,color:C.goldBright,fontWeight:700,letterSpacing:1,marginBottom:4,fontFamily:"'DM Mono',monospace"}}>📌 OWNER ANNOUNCEMENT</div>
                <div style={{fontSize:13,color:C.text}}>{m.text.replace("📌 ANNOUNCEMENT: ","")}</div>
              </div>
            ))}

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[{l:"Open Tasks",v:openTasks,c:C.redBright},{l:"Completed",v:doneTasks,c:C.green},{l:"Team Online",v:workers.filter(w=>w.online).length||1,c:C.taupe},{l:"Messages",v:messages.length,c:C.gold}].map(s=>(
                <div key={s.l} style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderTop:`2px solid ${s.c}`,borderRadius:12,padding:14}}>
                  <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.textMuted,marginTop:3,fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:C.taupeLight}}>Today's Progress</div>
                <div style={{fontSize:14,fontWeight:800,color:C.redBright,fontFamily:"'DM Mono',monospace"}}>{pct}%</div>
              </div>
              <ProgressBar value={pct}/>
              <div style={{fontSize:11,color:C.textMuted,marginTop:8}}>{doneTasks} of {tasks.length} tasks complete</div>
            </div>

            {/* My upcoming deadlines */}
            {tasks.filter(t=>t.assignee===me.name&&t.deadline&&!t.done).length>0&&(
              <>
                <div style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1.5,marginBottom:8,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>My Upcoming Deadlines</div>
                {tasks.filter(t=>t.assignee===me.name&&t.deadline&&!t.done).slice(0,3).map(t=>(
                  <div key={t.id} style={{background:C.surfaceHigh,border:`1px solid ${C.borderBright}`,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{t.title}</div>
                      <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}><DeadlinePill deadline={t.deadline}/>{t.delivery&&<span style={{fontSize:9,color:C.blue,fontFamily:"'DM Mono',monospace",fontWeight:700}}>📦 {fmtDate(t.delivery)}</span>}</div>
                    </div>
                    <PriBadge p={t.priority}/>
                  </div>
                ))}
              </>
            )}

            {/* ── TEAM ROSTER — visible to ALL workers on home screen ── */}
            {workers.length>0&&(
              <div style={{background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:16}}>
                <div style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1.5,marginBottom:12,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>
                  👥 DAWW CREATIONS Team · {workers.filter(w=>w.online).length} online
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {workers
                    .sort((a,b)=>{
                      // Sort: owner first, then admins, then workers
                      const rank = w => (w.isOwner||w.name===OWNER_NAME||w.email===OWNER_EMAIL)?0:w.isAdmin?1:2;
                      return rank(a)-rank(b);
                    })
                    .map((w,i)=>{
                      const wOwner = w.isOwner||w.name===OWNER_NAME||w.email===OWNER_EMAIL;
                      const wAdmin = w.isAdmin&&!wOwner;
                      const isMe   = w.id===me.id||w.name===me.name;
                      return (
                        <div key={i} style={{
                          display:"flex",alignItems:"center",gap:12,
                          padding:"10px 12px",
                          background:isMe?`${C.redBright}0a`:C.bg,
                          borderRadius:10,
                          border:`1px solid ${wOwner?C.goldBright+"33":wAdmin?C.purple+"33":isMe?C.redBright+"33":C.border}`,
                        }}>
                          <Avatar name={w.name} color={w.color||C.taupe} size={36} isOwner={wOwner} isAdmin={wAdmin}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:13,fontWeight:700,color:C.text}}>{w.name}</span>
                              {isMe&&<span style={{fontSize:9,color:C.textMuted}}>(you)</span>}
                              {wOwner&&<span style={{fontSize:9,fontWeight:800,color:C.goldBright,background:`${C.goldBright}18`,borderRadius:4,padding:"1px 5px",fontFamily:"'DM Mono',monospace"}}>OWNER</span>}
                              {wAdmin&&<span style={{fontSize:9,fontWeight:800,color:C.purple,background:`${C.purple}18`,borderRadius:4,padding:"1px 5px",fontFamily:"'DM Mono',monospace"}}>ADMIN</span>}
                            </div>
                            <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{w.role}</div>
                            {w.title&&<div style={{fontSize:11,color:C.taupe,marginTop:1,fontStyle:"italic"}}>"{w.title}"</div>}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:w.online?C.green:C.textMuted,boxShadow:w.online?`0 0 6px ${C.green}`:""}}/>
                            <span style={{fontSize:9,color:w.online?C.green:C.textMuted,fontFamily:"'DM Mono',monospace"}}>{w.online?"ON":"OFF"}</span>
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>
            )}

            <button onClick={logout} style={{width:"100%",marginTop:4,padding:"10px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:12,fontWeight:600,cursor:"pointer"}}>Sign Out</button>
          </div>
        )}

        {/* TASKS */}
        {view==="tasks"&&<TasksView tasks={tasks} toggleTask={toggleTask} addQuickTask={addQuickTask} openTasks={openTasks} isOwner={isOwner}/>}

        {/* CHAT */}
        {view==="chat"&&<ChatView me={me} messages={messages} setMessages={setMessages} isOwner={isOwner}/>}

        {/* CALENDAR */}
        {view==="calendar"&&<CalendarView tasks={tasks} isOwner={isOwner}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{background:C.surface,borderTop:`1px solid ${isOwner?C.goldBright+"33":C.border}`,display:"flex",padding:"8px 0 max(8px,env(safe-area-inset-bottom))",position:"sticky",bottom:0,zIndex:100}}>
        {nav.map(item=>(
          <button key={item.id} onClick={()=>setView(item.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0",color:view===item.id?accentColor:C.textMuted,position:"relative"}}>
            {item.badge&&<div style={{position:"absolute",top:0,right:"calc(50% - 18px)",background:C.redBright,borderRadius:99,minWidth:16,height:16,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",color:"white",border:`2px solid ${C.surface}`,fontFamily:"'DM Mono',monospace"}}>{item.badge}</div>}
            <div style={{fontSize:16}}>{item.icon}</div>
            <div style={{fontSize:10,fontWeight:view===item.id?700:500,fontFamily:"'DM Mono',monospace",letterSpacing:.3}}>{item.label}</div>
            {view===item.id&&<div style={{position:"absolute",bottom:-2,width:24,height:2,background:accentColor,borderRadius:99,boxShadow:`0 0 8px ${accentGlow}`}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
