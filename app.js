import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { fourMonthsOut, daysUntil, longDate } from "./dates.js";
import { h, svg } from "./dom.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const root = document.getElementById("app");

// ---------- state ----------
const state = {
  session: null,
  stars: [],
  vision: null,
  goals: [],
  starsLoaded: false,
  loadError: null,
  missingTables: [],
  view: "sky",
  affirmIndex: 0,
  addOpen: false,
  addTab: "write",
  selected: null,
  shooting: null,
  authEmail: "",
  authStatus: "",
  authError: false,
  authSending: false,
  bgStars: genBgStars(160),
  motes: genMotes(22),
};
let affirmTimer = null;
let audioCtx = null;

function setState(patch) {
  Object.assign(state, patch);
  render();
}

// ---------- helpers ported from the original design ----------
function genBgStars(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.round((1 + Math.random() * 2) * 10) / 10,
      dur: Math.round((2 + Math.random() * 4) * 10) / 10,
      delay: Math.round(Math.random() * 5 * 10) / 10,
      op: Math.round((0.3 + Math.random() * 0.6) * 100) / 100,
    });
  }
  return arr;
}
function genMotes(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      left: Math.round(Math.random() * 100 * 10) / 10,
      size: Math.round((1.5 + Math.random() * 2) * 10) / 10,
      op: Math.round((0.3 + Math.random() * 0.4) * 100) / 100,
      dur: Math.round((14 + Math.random() * 16) * 10) / 10,
      delay: Math.round(Math.random() * 20 * 10) / 10,
      drift: Math.round((Math.random() * 60 - 30) * 10) / 10,
    });
  }
  return arr;
}
function palette() {
  return ["#d8c6ff", "#ffb3d9", "#ffe08a", "#a6f0d9", "#c9a6ff", "#ffab91", "#a8d8ff"];
}
function colorForGroup(group) {
  if (!group) return "#ffe9b3";
  const pal = palette();
  let hash = 0;
  for (let i = 0; i < group.length; i++) hash = (hash * 31 + group.charCodeAt(i)) >>> 0;
  return pal[hash % pal.length];
}
function curvedPath(x1, y1, x2, y2, seed) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const dir = seed % 2 === 0 ? 1 : -1;
  const offset = Math.min(Math.max(len * 0.18, 2), 9) * dir;
  const cx = mx + nx * offset, cy = my + ny * offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
function pickPosition(unfulfilledStars) {
  const existing = unfulfilledStars.map((s) => ({ x: s.x, y: s.y }));
  let best = null, bestScore = -1;
  for (let i = 0; i < 25; i++) {
    const x = Math.round((8 + Math.random() * 82) * 10) / 10;
    const y = Math.round((14 + Math.random() * 66) * 10) / 10;
    if (x < 22 && y > 82) continue;
    const score = existing.length ? Math.min(...existing.map((e) => Math.hypot(e.x - x, e.y - y))) : 999;
    if (score > bestScore) { bestScore = score; best = { x, y }; }
    if (bestScore > 12) break;
  }
  return best || { x: 50, y: 50 };
}
function affirmationLibrary() {
  return {
    Career: [
      "I am capable of achieving everything I set my mind to.",
      "My work brings me purpose and I grow a little more every day.",
      "Opportunities that fit who I am are finding their way to me.",
      "I lead with confidence and clarity.",
      "I am building a career I am proud of, one step at a time.",
      "My skills and ideas are valuable and welcomed.",
    ],
    Love: [
      "I am worthy of a love that feels calm and easy.",
      "I attract relationships built on honesty and care.",
      "I give and receive love freely.",
      "My heart is open to the right connections.",
      "I am patient with love — it arrives at the right time.",
      "I choose people who choose me back.",
    ],
    Health: [
      "My body is strong and it is healing every day.",
      "I listen to what my body needs and honor it.",
      "I move, rest, and nourish myself with care.",
      "Every day I am becoming healthier and more at ease.",
      "I release tension and welcome steady energy.",
      "My mind and body are working together, not against each other.",
    ],
    Abundance: [
      "Money flows to me through expected and unexpected paths.",
      "I am open to receiving more than I imagined.",
      "Abundance is my natural state.",
      "I make decisions from a place of trust, not fear.",
      "I am building the financial life I want, deliberately.",
      "What I need is already on its way to me.",
    ],
    Confidence: [
      "I trust my own voice.",
      "I belong in every room I walk into.",
      "My past does not define what I am capable of now.",
      "I speak and act with quiet confidence.",
      "I am allowed to take up space.",
      "I trust the choices I am making for my life.",
    ],
    Peace: [
      "I release what I cannot control.",
      "Today, I choose calm over worry.",
      "I am exactly where I need to be right now.",
      "I give myself permission to slow down.",
      "My peace is not dependent on things going perfectly.",
      "I am safe, I am grounded, I am enough.",
    ],
  };
}
function playChime() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [880, 1320, 1760].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05 / (i + 1), now + 0.05 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + 2.3);
    });
  } catch (e) {}
}

// ---------- data access (Supabase; RLS keeps rows private per user) ----------
// Never leaves the app stuck: on failure it still marks the load finished and
// records a message the UI shows, rather than failing silently to a blank sky.
async function loadStars() {
  let starsRes, visionRes, goalsRes;
  try {
    [starsRes, visionRes, goalsRes] = await Promise.all([
      supabase.from("stars").select("*").order("created_at", { ascending: true }),
      supabase.from("vision").select("*").maybeSingle(),
      supabase.from("goals").select("*").order("created_at", { ascending: true }),
    ]);
  } catch (e) {
    console.error(e);
    setState({ starsLoaded: true, loadError: e.message || String(e) });
    return;
  }
  for (const r of [starsRes, visionRes, goalsRes]) if (r.error) console.error(r.error);
  setState({
    stars: starsRes.data || [],
    vision: visionRes.data || null,
    goals: goalsRes.data || [],
    starsLoaded: true,
    loadError: starsRes.error ? starsRes.error.message : null,
    // The two newer tables are optional: if the schema hasn't been re-run yet the
    // sky still works, and those pages explain what's missing instead of breaking.
    missingTables: [
      visionRes.error && "vision",
      goalsRes.error && "goals",
    ].filter(Boolean),
  });
}

async function saveVision(text) {
  const target_date = (state.vision && state.vision.target_date) || fourMonthsOut();
  const { error } = await supabase.from("vision").upsert(
    { user_id: state.session.user.id, text, target_date, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) { console.error(error); return; }
  await loadStars();
}

async function addGoal(text) {
  const { error } = await supabase.from("goals").insert({ text });
  if (error) { console.error(error); return; }
  await loadStars();
}
async function toggleGoal(goal) {
  const { error } = await supabase.from("goals").update({ done: !goal.done }).eq("id", goal.id);
  if (error) console.error(error);
  await loadStars();
}
async function deleteGoal(goal) {
  const { error } = await supabase.from("goals").delete().eq("id", goal.id);
  if (error) console.error(error);
  await loadStars();
}
async function addStar(text, group) {
  const pos = pickPosition(state.stars.filter((s) => !s.fulfilled));
  const { error } = await supabase.from("stars").insert({
    text, group_name: group || null, x: pos.x, y: pos.y, clicks: 0, fulfilled: false,
  });
  if (error) { console.error(error); return; }
  await loadStars();
}
async function bumpClicks(star) {
  const { error } = await supabase.from("stars").update({ clicks: star.clicks + 1 }).eq("id", star.id);
  if (error) console.error(error);
  await loadStars();
  setState({ selected: state.stars.find((s) => s.id === star.id) || null });
}
async function markManifested(star) {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 30 + Math.random() * 40;
    return { bx: Math.round(Math.cos(angle) * dist) + "px", by: Math.round(Math.sin(angle) * dist) + "px", delay: Math.round(Math.random() * 15) / 100 };
  });
  setState({ shooting: { x: star.x, y: star.y, particles }, selected: null });
  playChime();
  setTimeout(async () => {
    const { error } = await supabase.from("stars").update({ fulfilled: true }).eq("id", star.id);
    if (error) console.error(error);
    setState({ shooting: null });
    await loadStars();
  }, 2600);
}

// ---------- auth screen ----------
function renderAuth() {
  const status = h("div", { className: "auth-status" + (state.authError ? " error" : ""), text: state.authStatus });
  const emailInput = h("input", {
    className: "auth-input",
    type: "email",
    placeholder: "you@example.com",
    value: state.authEmail,
    onInput: (e) => { state.authEmail = e.target.value; },
    onKeydown: (e) => { if (e.key === "Enter") sendLink(); },
  });
  async function sendLink() {
    const email = state.authEmail.trim();
    if (!email) { setState({ authStatus: "Enter your email first.", authError: true }); return; }
    setState({ authSending: true, authStatus: "Sending your link…", authError: false });
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    setState({
      authSending: false,
      authError: !!error,
      authStatus: error ? error.message : "Check your email for a sign-in link.",
    });
  }
  return h("div", { className: "auth-screen" }, [
    h("div", { className: "auth-card", onClick: (e) => e.stopPropagation() }, [
      h("div", { className: "auth-title" }, "✦ manifestation star map"),
      h("div", { className: "auth-sub" }, "Your sky, your affirmations — visible only to you."),
      emailInput,
      h("button", { className: "auth-btn", onClick: sendLink, disabled: state.authSending }, state.authSending ? "Sending…" : "Send me a sign-in link"),
      status,
    ]),
  ]);
}

// ---------- main app ----------
function visibleStars() {
  // Overlay views (affirm/vision/goals) keep the normal sky behind them.
  return state.stars.filter((s) => (state.view === "fulfilled" ? s.fulfilled : !s.fulfilled));
}
function unfulfilled() {
  return state.stars.filter((s) => !s.fulfilled);
}

function renderBackground() {
  const bgStars = h("div", { className: "bg-stars" },
    state.bgStars.map((b) => h("div", {
      className: "bg-star",
      style: { left: b.left + "%", top: b.top + "%", width: b.size + "px", height: b.size + "px", "--op": b.op, animationDuration: b.dur + "s", animationDelay: b.delay + "s" },
    }))
  );
  const motes = state.motes.map((m) => h("div", {
    className: "mote",
    style: { left: m.left + "%", width: m.size + "px", height: m.size + "px", "--fop": m.op, "--fx": m.drift + "px", animationDuration: m.dur + "s", animationDelay: m.delay + "s" },
  }));
  return [
    h("div", { className: "nebula nebula-1" }),
    h("div", { className: "nebula nebula-2" }),
    h("div", { className: "field-wrap" }, [bgStars, ...motes]),
  ];
}

function renderStarsLayer() {
  const stars = visibleStars();
  const displayStars = stars.map((s) => {
    const clicks = Math.min(s.clicks, 12);
    const size = Math.round(6 + clicks * 0.7);
    const glow = Math.round(6 + clicks * 2.2);
    const pulseDur = Math.max(1.6, 4 - clicks * 0.2).toFixed(2);
    const color = state.view === "fulfilled" ? "#ffd76a" : colorForGroup(s.group_name);
    return { ...s, sizePx: size, glowPx: glow, glowPx2: glow * 2, glowPx3: glow * 3.4, spikeLen: Math.round(size * 6), spikeThick: Math.max(1, Math.round((1 + clicks * 0.08) * 10) / 10), pulseDur, color };
  });

  const lines = [];
  let seed = 0;
  if (state.view !== "fulfilled") {
    const byGroup = {};
    displayStars.forEach((s) => { if (s.group_name) (byGroup[s.group_name] = byGroup[s.group_name] || []).push(s); });
    Object.values(byGroup).forEach((list) => {
      for (let i = 0; i < list.length - 1; i++) lines.push({ color: list[i].color, d: curvedPath(list[i].x, list[i].y, list[i + 1].x, list[i + 1].y, seed++) });
    });
  } else if (displayStars.length > 1) {
    for (let i = 0; i < displayStars.length - 1; i++) lines.push({ color: "#ffd76a", d: curvedPath(displayStars[i].x, displayStars[i].y, displayStars[i + 1].x, displayStars[i + 1].y, seed++) });
  }

  const linesSvg = svg("svg", { className: "lines-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none" },
    lines.map((ln) => svg("path", { d: ln.d, stroke: ln.color, style: { filter: `drop-shadow(0 0 0px ${ln.color})` } }))
  );

  const starEls = displayStars.map((s) => h("div", {
    className: "star",
    title: s.text,
    style: { left: s.x + "%", top: s.y + "%", width: s.sizePx + "px", height: s.sizePx + "px", animationDuration: s.pulseDur + "s" },
    onClick: () => openStar(s),
  }, [
    h("div", { className: "star-core", style: { background: `radial-gradient(circle, #ffffff 0%, ${s.color} 45%, transparent 75%)`, boxShadow: `0 0 ${s.glowPx}px ${s.color}, 0 0 ${s.glowPx2}px ${s.color}` } }),
  ]));

  return h("div", { className: "stars-layer" }, [linesSvg, ...starEls]);
}

function openStar(star) {
  bumpClicks(star);
  setState({ selected: star });
}

function renderTopBar() {
  const fulfilledCount = state.stars.filter((s) => s.fulfilled).length;
  const title = h("div", { className: "title-bar" }, "✦ manifestation star map");
  const sub = state.view === "fulfilled" ? h("div", { className: "fulfilled-sub" }, `${fulfilledCount} dreams fulfilled`) : null;
  const nav = h("div", { className: "nav-bar" }, [
    h("button", { className: "nav-item" + (state.view === "sky" ? " active" : ""), onClick: () => setView("sky") }, "Sky"),
    h("button", { className: "nav-item" + (state.view === "fulfilled" ? " active" : ""), onClick: () => setView("fulfilled") }, "Fulfilled"),
    h("button", { className: "nav-item" + (state.view === "affirm" ? " active" : ""), onClick: () => setView("affirm") }, "Affirmations"),
    h("button", { className: "nav-item" + (state.view === "vision" ? " active" : ""), onClick: () => setView("vision") }, "Everything Worked Out"),
    h("button", { className: "nav-item" + (state.view === "goals" ? " active" : ""), onClick: () => setView("goals") }, "Goals"),
    state.view === "sky" ? h("button", { className: "add-btn", onClick: () => setState({ addOpen: true, addTab: "write" }) }, "+ Add a star") : null,
    h("button", { className: "signout-btn", onClick: () => supabase.auth.signOut() }, "Sign out"),
  ]);
  return [title, sub, nav].filter(Boolean);
}

function setView(v) {
  clearInterval(affirmTimer);
  if (v === "affirm") startAffirmTimer();
  setState({ view: v, affirmIndex: 0 });
}
function startAffirmTimer() {
  clearInterval(affirmTimer);
  affirmTimer = setInterval(() => nextAffirm(), 6500);
}
function nextAffirm() {
  const n = unfulfilled().length;
  if (!n) return;
  state.affirmIndex = (state.affirmIndex + 1) % n;
  startAffirmTimer();
  render();
}
function prevAffirm() {
  const n = unfulfilled().length;
  if (!n) return;
  state.affirmIndex = (state.affirmIndex - 1 + n) % n;
  startAffirmTimer();
  render();
}
function goToAffirm(i) {
  state.affirmIndex = i;
  startAffirmTimer();
  render();
}

// Shown when the schema hasn't been re-run yet, so these pages explain the fix
// instead of silently saving nothing.
function renderSchemaNotice(table) {
  if (!state.missingTables.includes(table)) return null;
  return h("div", { className: "schema-notice" }, [
    h("strong", {}, "This page isn't connected yet. "),
    `Run supabase/schema.sql in your Supabase SQL editor to create the "${table}" table — until then nothing here will save.`,
  ]);
}

// ---------- "Everything Worked Out" ----------
function renderVisionView() {
  if (state.view !== "vision") return null;
  const targetDate = (state.vision && state.vision.target_date) || fourMonthsOut();
  let draft = (state.vision && state.vision.text) || "";
  let saveLabel = null;

  const textarea = h("textarea", {
    className: "vision-textarea",
    placeholder: "It's already happened. Write it in past tense — what changed, how it feels, who you became…",
    onInput: (e) => { draft = e.target.value; if (saveLabel) saveLabel.textContent = ""; },
  });
  textarea.value = draft;

  saveLabel = h("span", { className: "vision-saved" });
  const save = async () => {
    saveLabel.textContent = "Saving…";
    await saveVision(draft);
  };

  return h("div", { className: "page-view" }, [
    h("button", { className: "affirm-close", onClick: () => setView("sky") }, "Close ✕"),
    h("div", { className: "page-body" }, [
      h("div", { className: "page-eyebrow" }, longDate(targetDate)),
      h("div", { className: "page-title" }, "Everything worked out."),
      h("div", { className: "page-sub" }, `${daysUntil(targetDate)} days from now — write it as though you're already there.`),
      renderSchemaNotice("vision"),
      textarea,
      h("div", { className: "vision-actions" }, [
        saveLabel,
        h("button", { className: "btn-gold", onClick: save }, "Save"),
      ]),
    ].filter(Boolean)),
  ]);
}

// ---------- Goals ----------
function renderGoalsView() {
  if (state.view !== "goals") return null;
  const targetDate = (state.vision && state.vision.target_date) || fourMonthsOut();
  const done = state.goals.filter((g) => g.done).length;
  let draft = "";

  const input = h("input", {
    className: "goal-input",
    placeholder: "One step that moves you closer…",
    onInput: (e) => { draft = e.target.value; },
    onKeydown: (e) => { if (e.key === "Enter") submit(); },
  });
  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    input.value = "";
    draft = "";
    await addGoal(t);
  };

  const list = state.goals.length
    ? h("div", { className: "goal-list" }, state.goals.map((g) => h("div", { className: "goal-row" + (g.done ? " done" : "") }, [
        h("button", { className: "goal-check", onClick: () => toggleGoal(g), title: g.done ? "Mark as not done" : "Mark as done" }, g.done ? "✦" : ""),
        h("div", { className: "goal-text" }, g.text),
        h("button", { className: "goal-delete", onClick: () => deleteGoal(g), title: "Remove" }, "✕"),
      ])))
    : h("div", { className: "goal-empty" }, "No steps yet. What's the smallest one you could take this week?");

  return h("div", { className: "page-view" }, [
    h("button", { className: "affirm-close", onClick: () => setView("sky") }, "Close ✕"),
    h("div", { className: "page-body" }, [
      h("div", { className: "page-eyebrow" }, `${done} of ${state.goals.length} taken · ${daysUntil(targetDate)} days left`),
      h("div", { className: "page-title" }, "Goals"),
      h("div", { className: "page-sub" }, "The steps between here and everything working out."),
      renderSchemaNotice("goals"),
      h("div", { className: "goal-add" }, [input, h("button", { className: "btn-gold", onClick: submit }, "Add")]),
      list,
    ].filter(Boolean)),
  ]);
}

function renderEmptyState() {
  if (state.view !== "sky" && state.view !== "fulfilled") return null;
  if (visibleStars().length > 0) return null;
  const isFirstVisit = state.view === "sky" && state.stars.length === 0;
  const inner = isFirstVisit
    ? h("div", { className: "inner" }, [
        h("div", { className: "empty-title" }, "What do you want to manifest?"),
        h("button", { className: "place-first-btn", onClick: () => setState({ addOpen: true, addTab: "write" }) }, "✦ place your first star"),
      ])
    : h("div", { className: "empty-text" }, state.view === "sky" ? "Your sky is empty. Add your first star." : "No manifestations fulfilled yet.");
  return h("div", { className: "empty-state" }, [inner]);
}

function renderLegend() {
  const groups = [...new Set(state.stars.filter((s) => !s.fulfilled && s.group_name).map((s) => s.group_name))];
  if (state.view !== "sky" || groups.length === 0) return null;
  return h("div", { className: "legend" }, groups.map((g) => h("div", { className: "legend-row" }, [
    h("div", { className: "legend-dot", style: { background: colorForGroup(g), boxShadow: `0 0 6px ${colorForGroup(g)}` } }),
    g,
  ])));
}

function renderAddModal() {
  if (!state.addOpen) return null;
  let text = "", group = "";
  const closeAdd = () => setState({ addOpen: false });
  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    await addStar(t, group.trim());
    setState({ addOpen: false });
  };
  const textarea = h("textarea", { className: "field-textarea", rows: 3, placeholder: "What are you manifesting?", onInput: (e) => { text = e.target.value; } });
  const groupInput = h("input", { className: "field-input", placeholder: "Constellation (optional) — e.g. Career, Love", onInput: (e) => { group = e.target.value; } });

  const writeTab = h("div", {}, [
    textarea,
    groupInput,
    h("div", { className: "modal-actions" }, [
      h("button", { className: "btn-ghost", onClick: closeAdd }, "Cancel"),
      h("button", { className: "btn-gold", onClick: submit }, "Place star"),
    ]),
  ]);

  const lib = affirmationLibrary();
  const libraryTab = h("div", { className: "library-scroll" }, Object.keys(lib).map((name) =>
    h("div", { className: "library-group" }, [
      h("div", { className: "library-group-name", style: { color: colorForGroup(name) } }, [
        h("div", { className: "legend-dot", style: { background: colorForGroup(name), boxShadow: `0 0 6px ${colorForGroup(name)}` } }),
        name,
      ]),
      ...lib[name].map((itemText) => h("div", {
        className: "library-item",
        onClick: () => {
          state.addTab = "write";
          render();
          const ta = document.querySelector(".field-textarea");
          const gi = document.querySelector(".field-input");
          if (ta) { ta.value = itemText; text = itemText; }
          if (gi) { gi.value = name; group = name; }
        },
      }, itemText)),
    ])
  ));

  const card = h("div", { className: "modal-card", onClick: (e) => e.stopPropagation() }, [
    h("div", { className: "modal-title" }, "Set a new intention"),
    h("div", { className: "tabs" }, [
      h("button", { className: "tab" + (state.addTab !== "library" ? " active" : ""), onClick: () => setState({ addTab: "write" }) }, "Write my own"),
      h("button", { className: "tab" + (state.addTab === "library" ? " active" : ""), onClick: () => setState({ addTab: "library" }) }, "Choose an affirmation"),
    ]),
    state.addTab === "library" ? libraryTab : writeTab,
  ]);
  return h("div", { className: "overlay", onClick: closeAdd }, [card]);
}

function renderStarModal() {
  const s = state.selected;
  if (!s) return null;
  const color = colorForGroup(s.group_name);
  const dateLabel = s.fulfilled ? "manifested on" : "set on";
  const dateStr = new Date(s.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const card = h("div", { className: "modal-card star-modal", onClick: (e) => e.stopPropagation() }, [
    h("div", { className: "star-modal-dot", style: { background: color, boxShadow: `0 0 14px ${color}` } }),
    s.group_name ? h("div", { className: "star-modal-group" }, s.group_name) : null,
    h("div", { className: "star-modal-text" }, s.text),
    h("div", { className: "star-modal-date" }, `${dateLabel} ${dateStr} · returned ${s.clicks} times`),
    s.clicks >= 5 ? h("div", { className: "star-modal-wellworn" }, "a well-worn intention ✦") : null,
    h("div", { className: "modal-actions", style: { justifyContent: "center" } }, [
      h("button", { className: "btn-ghost", onClick: () => setState({ selected: null }) }, "Close"),
      !s.fulfilled ? h("button", { className: "btn-gold", onClick: () => markManifested(s) }, "✦ Mark as manifested") : null,
    ]),
  ].filter(Boolean));
  return h("div", { className: "overlay", onClick: () => setState({ selected: null }) }, [card]);
}

function renderAffirmView() {
  if (state.view !== "affirm") return null;
  const stars = unfulfilled();
  const idx = stars.length ? state.affirmIndex % stars.length : 0;
  const current = stars[idx];
  const body = current
    ? h("div", {}, [
        h("button", { className: "affirm-arrow left", onClick: prevAffirm }, "‹"),
        h("button", { className: "affirm-arrow right", onClick: nextAffirm }, "›"),
        h("div", { className: "affirm-body" }, [
          h("div", { className: "affirm-dot", style: { background: colorForGroup(current.group_name), boxShadow: `0 0 20px 4px ${colorForGroup(current.group_name)}` } }),
          current.group_name ? h("div", { className: "affirm-group" }, current.group_name) : null,
          h("div", { className: "affirm-text" }, current.text),
        ].filter(Boolean)),
        h("div", { className: "affirm-dots" }, stars.map((s, i) => h("button", {
          style: { width: (i === idx ? 22 : 6) + "px", background: i === idx ? "rgba(255,233,179,0.85)" : "rgba(255,255,255,0.25)" },
          onClick: () => goToAffirm(i),
        }))),
      ])
    : h("div", { className: "affirm-empty" }, "Add a star to your sky to begin reading affirmations.");
  return h("div", { className: "affirm-view" }, [
    h("button", { className: "affirm-close", onClick: () => setView("sky") }, "Close ✕"),
    body,
  ]);
}

function renderShooting() {
  const sh = state.shooting;
  if (!sh) return null;
  const particles = sh.particles.map((p) => h("div", { className: "burst-particle", style: { "--bx": p.bx, "--by": p.by, animationDelay: p.delay + "s" } }));
  const lines = [
    h("div", { className: "shoot-line", style: { width: "150px", height: "2px", background: "linear-gradient(90deg, #ffffff, rgba(255,255,255,0))", boxShadow: "0 0 8px 1px rgba(255,255,255,0.8)" } }),
    h("div", { className: "shoot-line", style: { width: "110px", height: "1.5px", background: "linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0))", animationDelay: "-0.12s", opacity: "0.5" } }),
    h("div", { className: "shoot-line", style: { width: "80px", height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0))", animationDelay: "-0.24s", opacity: "0.3" } }),
  ];
  return h("div", { className: "shoot-wrap", style: { left: sh.x + "%", top: sh.y + "%" } }, [...particles, ...lines]);
}

function renderMainNodes() {
  return [
    renderStarsLayer(),
    renderShooting(),
    ...renderTopBar(),
    renderEmptyState(),
    renderLegend(),
    renderAddModal(),
    renderStarModal(),
    renderAffirmView(),
    renderVisionView(),
    renderGoalsView(),
  ].filter(Boolean);
}

// ---------- top-level render ----------
// The animated starfield (bgLayer) is mounted once and never torn down, so its
// per-star random animation timings keep running smoothly across re-renders
// instead of restarting on every click/keystroke. Only the foreground
// (fgLayer) is rebuilt when state changes.
const shell = h("div", { style: { position: "relative", width: "100%", height: "100vh", overflow: "hidden", transition: "background 1.2s ease" } });
const bgLayer = h("div", { style: { position: "absolute", inset: "0" } }, renderBackground());
const fgLayer = h("div", { style: { position: "absolute", inset: "0" } });
shell.appendChild(bgLayer);
shell.appendChild(fgLayer);
root.innerHTML = "";
root.appendChild(shell);

function render() {
  shell.style.background = state.session && state.view === "fulfilled"
    ? "radial-gradient(ellipse at 50% 0%, #1c1508 0%, #0e0904 45%, #050301 100%)"
    : "radial-gradient(ellipse at 50% 0%, #0e0e13 0%, #06060a 45%, #010102 100%)";
  fgLayer.innerHTML = "";
  // A crash while building the foreground must not leave a blank sky with no
  // way out -- show what broke and keep the sign-out escape hatch.
  try {
    if (!state.session) {
      fgLayer.appendChild(renderAuth());
      return;
    }
    if (!state.starsLoaded) {
      fgLayer.appendChild(h("div", { id: "boot-message" }, "Loading your sky…"));
      return;
    }
    if (state.loadError) {
      fgLayer.appendChild(renderFatal("Couldn't load your sky", state.loadError));
      return;
    }
    renderMainNodes().forEach((n) => fgLayer.appendChild(n));
  } catch (e) {
    console.error(e);
    fgLayer.innerHTML = "";
    fgLayer.appendChild(renderFatal("Something broke while drawing the page", e.message || String(e)));
  }
}

function renderFatal(title, detail) {
  return h("div", { className: "fatal" }, [
    h("div", { className: "fatal-title" }, title),
    h("div", { className: "fatal-detail" }, detail),
    h("div", { className: "fatal-actions" }, [
      h("button", { className: "btn-ghost", onClick: () => location.reload() }, "Reload"),
      h("button", { className: "btn-gold", onClick: () => supabase.auth.signOut().then(() => location.reload()) }, "Sign out"),
    ]),
  ]);
}

supabase.auth.getSession().then(({ data }) => {
  state.session = data.session;
  render();
  if (data.session) loadStars();
}).catch((e) => {
  console.error("Supabase not reachable — check config.js", e);
  setState({ loadError: "Couldn't reach Supabase: " + (e.message || String(e)) });
});
supabase.auth.onAuthStateChange((_event, session) => {
  const hadSession = !!state.session;
  state.session = session;
  if (!session) {
    Object.assign(state, { stars: [], vision: null, goals: [], starsLoaded: false, loadError: null });
    render();
    return;
  }
  if (!hadSession) {
    Object.assign(state, { starsLoaded: false, loadError: null });
    render();
    loadStars();
  }
});
