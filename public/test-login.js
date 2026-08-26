const SUPABASE_URL = "https://uuksqyclfdgqrpvxtqwy.supabase.co";
// Public anon key — safe to use in the browser. NEVER put the
// service_role key here.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a3NxeWNsZmRncXJwdnh0cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODk0MzUsImV4cCI6MjEwMzI2NTQzNX0.JFXATlV6DcxLanKrE2ZUIpbtDJBqoBkfBeKykNT-8-0";
const API_BASE = ""; // empty string = same origin as this page

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const out = (data) => {
  document.getElementById("output").textContent =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
};

document.getElementById("signupBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { data, error } = await sb.auth.signUp({ email, password });
  out(error ? { error: error.message } : { signedUp: data.user?.email, note: "Check if email confirmation is required in your Supabase Auth settings." });
};

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  out(error ? { error: error.message } : { loggedIn: data.user?.email });
};

document.getElementById("logoutBtn").onclick = async () => {
  await sb.auth.signOut();
  out("Logged out.");
};

async function callBackend(path, options = {}) {
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    out("Not logged in — no access token available. Log in first.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json();
    out({ status: res.status, body: json });
    return json;
  } catch (err) {
    out({ fetchError: String(err) });
  }
}

document.getElementById("whoamiBtn").onclick = () => callBackend("/auth/whoami");
document.getElementById("meBtn").onclick = () => callBackend("/auth/me");

document.getElementById("createServerBtn").onclick = () => {
  const name = document.getElementById("serverName").value;
  callBackend("/servers", { method: "POST", body: { name } });
};

document.getElementById("listServersBtn").onclick = () => callBackend("/servers");

document.getElementById("joinServerBtn").onclick = () => {
  const serverId = document.getElementById("serverId").value;
  callBackend(`/servers/${serverId}/join`, { method: "POST" });
};

document.getElementById("listChannelsBtn").onclick = () => {
  const serverId = document.getElementById("serverId").value;
  callBackend(`/servers/${serverId}/channels`);
};

document.getElementById("createChannelTextBtn").onclick = () => {
  const serverId = document.getElementById("serverId").value;
  const name = document.getElementById("channelName").value;
  callBackend(`/servers/${serverId}/channels`, { method: "POST", body: { name, type: "TEXT" } });
};

document.getElementById("createChannelVoiceBtn").onclick = () => {
  const serverId = document.getElementById("serverId").value;
  const name = document.getElementById("channelName").value;
  callBackend(`/servers/${serverId}/channels`, { method: "POST", body: { name, type: "VOICE" } });
};

// ---------------- Chat ----------------

let sock = null;
let currentChannelId = null;

function appendChatLine(msg) {
  const box = document.getElementById("chatBox");
  const line = document.createElement("div");
  const time = new Date(msg.createdAt || Date.now()).toLocaleTimeString();
  const username = msg.user?.username || "unknown";
  line.textContent = `[${time}] ${username}: ${msg.content}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

document.getElementById("connectSocketBtn").onclick = async () => {
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    out("Not logged in — log in first.");
    return;
  }
  if (sock) {
    sock.disconnect();
  }
  sock = io(API_BASE || undefined, { auth: { token } });

  sock.on("connect", () => out("Socket connected: " + sock.id));
  sock.on("connect_error", (err) => out({ socketError: err.message }));
  sock.on("channel:message", (msg) => {
    if (msg.channelId === currentChannelId) appendChatLine(msg);
  });
};

document.getElementById("joinChannelBtn").onclick = () => {
  if (!sock) {
    out("Connect the socket first.");
    return;
  }
  const channelId = document.getElementById("chatChannelId").value;
  currentChannelId = channelId;
  sock.emit("channel:join", channelId, (res) => out(res));
};

document.getElementById("loadHistoryBtn").onclick = async () => {
  const channelId = document.getElementById("chatChannelId").value;
  const json = await callBackend(`/channels/${channelId}/messages`);
  if (json?.messages) {
    document.getElementById("chatBox").innerHTML = "";
    json.messages.forEach(appendChatLine);
  }
};

document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (!sock || !currentChannelId) {
    out("Connect and join a channel first.");
    return;
  }
  const content = e.target.value;
  if (!content.trim()) return;
  sock.emit("message:send", { channelId: currentChannelId, content }, (res) => {
    if (res?.error) out(res);
  });
  e.target.value = "";
});
