// ====== storage helpers ======
const KEY_REPORTS = "daily_reports_v1";
const KEY_KNOWLEDGE = "daily_knowledge_v1";

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
};
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

let reports = load(KEY_REPORTS);
let knowledges = load(KEY_KNOWLEDGE);

// ====== tabs ======
const tabs = document.querySelectorAll(".tab");
const views = {
  report: document.getElementById("view-report"),
  knowledge: document.getElementById("view-knowledge"),
  staff: document.getElementById("view-staff"),
  export: document.getElementById("view-export"),
};

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    Object.values(views).forEach(v => v.classList.remove("is-show"));
    views[btn.dataset.view].classList.add("is-show");

    if (btn.dataset.view === "staff") renderStaff();
    if (btn.dataset.view === "export") renderCSV();
  });
});

// ====== stepper ======
let currentStep = 1;
const panels = document.querySelectorAll(".panel");
const steps = document.querySelectorAll(".step");

function showStep(n) {
  currentStep = n;
  panels.forEach(p => p.classList.toggle("is-show", Number(p.dataset.panel) === n));
  steps.forEach(s => s.classList.toggle("is-active", Number(s.dataset.step) === n));
}
document.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", () => showStep(Math.min(4, currentStep + 1))));
document.querySelectorAll("[data-prev]").forEach(b => b.addEventListener("click", () => showStep(Math.max(1, currentStep - 1))));
showStep(1);

// ====== reports ======
const reportForm = document.getElementById("reportForm");
const reportList = document.getElementById("reportList");

function renderReports() {
  reportList.innerHTML = "";
  if (reports.length === 0) {
    reportList.innerHTML = `<div class="item">まだ日報がありません。</div>`;
    return;
  }
  [...reports].reverse().forEach((r) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="meta">
        <span>日付：${escapeHtml(r.date)}</span>
        <span>スタッフ：${escapeHtml(r.staff)}</span>
        <span>成約：${Number(r.contracts) || 0}</span>
      </div>
      <p class="body"><b>場所</b>：${escapeHtml(r.place || "-")}</p>
      <p class="body"><b>獲得</b>：${escapeHtml(r.details || "-")}</p>
      <p class="body"><b>良かった</b>：${escapeHtml(r.good || "-")}</p>
      <p class="body"><b>課題</b>：${escapeHtml(r.issue || "-")}</p>
      <p class="body"><b>明日の改善</b>：${escapeHtml(r.next || "-")}</p>
      <div class="actions">
        <button class="btn small ghost" data-del="${r.id}">削除</button>
      </div>
    `;
    reportList.appendChild(div);
  });

  reportList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      reports = reports.filter(r => r.id !== id);
      save(KEY_REPORTS, reports);
      renderReports();
    });
  });
}

reportForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(reportForm);
  const item = {
    id: crypto.randomUUID(),
    date: fd.get("date") || "",
    staff: fd.get("staff") || "",
    place: fd.get("place") || "",
    contracts: Number(fd.get("contracts") || 0),
    details: fd.get("details") || "",
    good: fd.get("good") || "",
    issue: fd.get("issue") || "",
    next: fd.get("next") || "",
    createdAt: new Date().toISOString(),
  };
  reports.push(item);
  save(KEY_REPORTS, reports);
  reportForm.reset();
  showStep(1);
  renderReports();
});

document.getElementById("clearReports").addEventListener("click", () => {
  if (!confirm("日報を全削除しますか？")) return;
  reports = [];
  save(KEY_REPORTS, reports);
  renderReports();
});

renderReports();

// ====== knowledge ======
const knowledgeForm = document.getElementById("knowledgeForm");
const knowledgeList = document.getElementById("knowledgeList");

function renderKnowledge() {
  knowledgeList.innerHTML = "";
  if (knowledges.length === 0) {
    knowledgeList.innerHTML = `<div class="item">まだナレッジがありません。</div>`;
    return;
  }
  [...knowledges].reverse().forEach(k => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <p class="title">${escapeHtml(k.title)}</p>
      <div class="meta"><span>${new Date(k.createdAt).toLocaleString()}</span></div>
      <p class="body">${escapeHtml(k.body)}</p>
      <div class="actions">
        <button class="btn small ghost" data-kdel="${k.id}">削除</button>
      </div>
    `;
    knowledgeList.appendChild(div);
  });

  knowledgeList.querySelectorAll("[data-kdel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-kdel");
      knowledges = knowledges.filter(k => k.id !== id);
      save(KEY_KNOWLEDGE, knowledges);
      renderKnowledge();
    });
  });
}

knowledgeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(knowledgeForm);
  const item = {
    id: crypto.randomUUID(),
    title: String(fd.get("title") || "").trim(),
    body: String(fd.get("body") || "").trim(),
    createdAt: new Date().toISOString(),
  };
  if (!item.title || !item.body) return;
  knowledges.push(item);
  save(KEY_KNOWLEDGE, knowledges);
  knowledgeForm.reset();
  save(KEY_KNOWLEDGE, knowledges);
  renderKnowledge();
});

document.getElementById("clearKnowledge").addEventListener("click", () => {
  if (!confirm("ナレッジを全削除しますか？")) return;
  knowledges = [];
  save(KEY_KNOWLEDGE, knowledges);
  renderKnowledge();
});

renderKnowledge();

// ====== staff summary ======
const staffFilter = document.getElementById("staffFilter");
const staffSummary = document.getElementById("staffSummary");

function renderStaff() {
  const q = (staffFilter.value || "").trim().toLowerCase();
  const map = new Map();

  reports.forEach(r => {
    const name = (r.staff || "").trim();
    if (!name) return;
    if (q && !name.toLowerCase().includes(q)) return;

    const current = map.get(name) || { staff: name, count: 0, contracts: 0 };
    current.count += 1;
    current.contracts += Number(r.contracts || 0);
    map.set(name, current);
  });

  const rows = [...map.values()].sort((a,b) => b.contracts - a.contracts);
  staffSummary.innerHTML = "";

  if (rows.length === 0) {
    staffSummary.innerHTML = `<div class="item">該当スタッフのデータがありません。</div>`;
    return;
  }

  rows.forEach(s => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <p class="title">${escapeHtml(s.staff)}</p>
      <div class="meta">
        <span>日報件数：${s.count}</span>
        <span>成約合計：${s.contracts}</span>
      </div>
    `;
    staffSummary.appendChild(div);
  });
}

staffFilter.addEventListener("input", renderStaff);

// ====== export CSV ======
const csvBox = document.getElementById("csvBox");

function toCSV(reportsArr) {
  const header = ["date","staff","place","contracts","details","good","issue","next","createdAt"];
  const lines = [header.join(",")];
  reportsArr.forEach(r => {
    const row = header.map(k => csvEscape(String(r[k] ?? "")));
    lines.push(row.join(","));
  });
  return lines.join("\n");
}

function renderCSV() {
  const csv = toCSV(reports);
  csvBox.textContent = csv || "";
}

document.getElementById("copyCSV").addEventListener("click", async () => {
  const csv = toCSV(reports);
  renderCSV();
  try {
    await navigator.clipboard.writeText(csv);
    alert("CSVをコピーしました！");
  } catch {
    alert("コピーに失敗しました。ブラウザの権限設定を確認してください。");
  }
});

// ====== utils ======
function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function csvEscape(s) {
  const needs = /[",\n]/.test(s);
  const v = s.replaceAll('"','""');
  return needs ? `"${v}"` : v;
}
