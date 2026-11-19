import { checkAll, exportCsv, money, invoiceTotal, unitLabel, shortDate, docketFields, followUpNote } from "./check.js?v=2";
import * as S from "./samples.js?v=2";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const icon = (name) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
};
const wide = window.matchMedia("(min-width: 960px)");
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const res = checkAll(S);
const cust = new Map(S.customers.map((c) => [c.id, c]));
const inv = new Map(S.invoices.map((i) => [i.no, i]));
const dk = new Map(S.dockets.map((d) => [d.no, d]));
const msgs = new Map(S.messages.map((m) => [m.id, m]));
const creditById = new Map(res.credits.map((c) => [c.id, c]));
let approved = new Set();
let open = null;
let docTab = "bank";
let docHit = null;

const STATE = {
  settles: { word: "Settles", icon: "check", cls: "pass" },
  credit: { word: "Credit", icon: "none", cls: "accent" },
  waits: { word: "Waits", icon: "none", cls: "none" },
};

/** Text with spans underlined in place: [[start, end, kind], ...]. */
function marked(text, marks) {
  const frag = document.createDocumentFragment();
  const ms = marks.filter(Boolean).sort((a, b) => a[0] - b[0]);
  let at = 0;
  for (const [s, e, kind] of ms) {
    if (s < at) continue;
    frag.append(text.slice(at, s));
    frag.append(el("span", `u ${kind === "fail" ? "fail" : ""}`.trim(), text.slice(s, e)));
    at = e;
  }
  frag.append(text.slice(at));
  return frag;
}

function payer(p) {
  return p.customer ? cust.get(p.customer).name : p.bank.desc.replace(/^(TRANSFER FROM|OSKO DEPOSIT)\s+/, "").toLowerCase().replace(/\b[a-z]/g, (x) => x.toUpperCase());
}

function rowStatus(p) {
  if (p.status === "credit" && p.credits.every((id) => approved.has(id))) return { word: "Settled", icon: "check", cls: "pass" };
  return STATE[p.status];
}

function jumpTo(tab, hit) {
  docTab = tab;
  docHit = hit;
  renderDocs();
  $("docs-tool").scrollIntoView({ block: "start", behavior: calm() ? "auto" : "smooth" });
  const row = $("doc-grid").querySelector("tr.hl");
  if (row) $("doc-grid").scrollTop = Math.max(0, row.offsetTop - 80);
}

function jumpBtn(label, tab, hit) {
  const b = el("button", "btn text", label);
  b.type = "button";
  b.addEventListener("click", () => jumpTo(tab, hit));
  const p = el("p", "src");
  p.append(b);
  return p;
}

function calcRows(p) {
  const dl = el("dl", "calc");
  for (const c of p.calc) {
    const d = el("div", `cl-row${c.strong ? " strong" : ""}`);
    const dt = el("dt", "cl-l", c.label);
    const dd = el("dd", "cl-v", money(c.value));
    if (c.note) dd.append(el("span", "cl-note", c.note));
    d.append(dt, dd);
    dl.append(d);
  }
  return dl;
}

function draftReply(p) {
  const c = p.customer ? cust.get(p.customer) : null;
  const who = c ? c.contacts[0] : null;
  const d = p.deductions.find((x) => x.state !== "pass" && x.docket);
  if (d && d.pod?.full) {
    return `Hi ${who}, thanks for the payment. Our signed docket ${d.docket} for ${shortDate(inv.get(d.docket).date)} says received in full, so we can't credit the ${d.qty} kg ${S.items[d.item].short} yet. Could you send a photo of the damaged box? We'll check it against the delivery photo.`;
  }
  if (d && d.state === "part") {
    return `Hi ${who}, thanks for the payment. Docket ${d.docket} for ${shortDate(inv.get(d.docket).date)} notes ${d.podQty} kg ${S.items[d.item].short} short, and we've credited that, ${money(d.credit)}. Your payment took off ${d.qty} kg. Could you check the other ${d.qty - d.podQty} kg for us?`;
  }
  if (p.overpaid) {
    const amt = p.overpaid.reduce((s, n) => s + invoiceTotal(inv.get(n)), 0);
    return `Hi ${who}, thanks for paying October. Invoice ${p.overpaid.join(", ")} was already paid on 3 Nov, so it came through twice. Would you like the ${money(amt)} back, or kept as credit on your account?`;
  }
  return null;
}

function detail(p) {
  const box = el("div", "evidence");
  const st = rowStatus(p);
  box.append(el("p", "side-h", `Bank line ${p.bank.line}, ${shortDate(p.bank.date)}`));
  box.append(el("p", `side-title st-${st.cls}`, `${payer(p)}, ${money(p.bank.amount)}`));

  if (p.reasons.length) {
    box.append(el("p", "ev-h", "Why it waits for you"));
    const ul = el("ul", "reasons");
    for (const r of p.reasons) {
      const li = el("li");
      const ic = icon(r.state === "fail" ? "cross" : "none");
      ic.style.color = `var(--${r.state})`;
      li.append(ic, el("span", null, r.text));
      ul.append(li);
    }
    box.append(ul);
  }

  box.append(el("p", "ev-h", "The payment, as the bank shows it"));
  const bl = el("p", "bankline");
  bl.append(marked(p.bank.raw, [p.payerSpan && [...p.payerSpan, "pass"], [...p.bank.amountSpan, "pass"]]));
  box.append(bl, jumpBtn(`See bank line ${p.bank.line}`, "bank", { bank: p.bank.line }));

  if (p.message) {
    const m = msgs.get(p.message);
    box.append(el("p", "ev-h", `What ${m.from} wrote, ${m.channel}, ${shortDate(m.at.slice(0, 10))} ${m.at.slice(11)}`));
    const mail = el("div", "mail");
    if (m.subject) mail.append(el("p", "mail-subj", m.subject));
    const body = el("p", "mail-body");
    const marks = [];
    if (p.statedSpan) marks.push([...p.statedSpan, p.checks.find((c) => c.name.startsWith("Amount in"))?.state === "fail" ? "fail" : "pass"]);
    for (const d of p.deductions) {
      const k = d.state === "pass" ? "pass" : "fail";
      marks.push([...d.span, k]);
      if (d.reasonSpan) marks.push([...d.reasonSpan, k]);
      if (d.ref) marks.push([...d.ref.span, d.docket ? "pass" : "fail"]);
    }
    body.append(marked(m.text, marks));
    mail.append(body);
    box.append(mail, jumpBtn(`See the message`, "messages", { msg: m.id }));
  }

  for (const d of p.deductions) {
    if (!d.docket) continue;
    const doc = dk.get(d.docket);
    const invc = inv.get(d.docket);
    box.append(el("p", "ev-h", `Docket ${d.docket}, ${shortDate(invc.date)}, signed by ${doc.signed} at ${doc.at.slice(11)}`));
    const q = el("p", "mail-body");
    q.append(marked(doc.note, [d.podSpan ? [...d.podSpan, "pass"] : [0, doc.note.length, "fail"]]));
    box.append(q);
    if (d.line) {
      const dl = el("dl", "fields");
      const add = (label, v, kind) => { const r = el("div", "fl"); r.append(el("dt", null, label)); const dd = el("dd"); dd.append(kind ? el("span", `u ${kind}`, v) : v); r.append(dd); dl.append(r); };
      for (const f of docketFields(d, S.items)) add(f.label, f.value, f.kind);
      box.append(dl);
    }
    if (d.creditId) {
      const cr = creditById.get(d.creditId);
      const line = el("div", "credit-line");
      const calc = el("p", "credit-calc");
      calc.append(`${cr.qty} ${unitLabel(cr.unit, cr.qty)} x ${money(cr.price)} = `, el("b", null, money(cr.amount)));
      if (d.state === "part") calc.append(el("span", "cl-note", `of ${d.qty} taken off`));
      line.append(calc);
      const b = el("button", approved.has(cr.id) ? "btn done" : "btn primary");
      b.type = "button";
      if (approved.has(cr.id)) { b.append(icon("check"), `Approved, ${cr.id}`); b.disabled = true; }
      else b.textContent = `Approve credit ${money(cr.amount)}`;
      b.addEventListener("click", () => { approved.add(cr.id); render(p.bank.line); });
      line.append(b);
      box.append(line);
    }
    box.append(jumpBtn(`See docket ${d.docket}`, "dockets", { docket: d.docket }));
  }

  if (p.proposal) {
    const c = cust.get(p.proposal.customer);
    box.append(el("p", "ev-h", `Proposed for ${c.name}, not allocated`));
    const ul = el("ul", "prop");
    for (const n of p.proposal.invoices) {
      const li = el("li");
      li.append(el("span", null, `Invoice ${n}, ${shortDate(inv.get(n).date)}`), el("span", null, money(invoiceTotal(inv.get(n)))));
      ul.append(li);
    }
    box.append(ul);
  }
  if (p.overpaid) {
    const a = S.allocated.find((x) => p.overpaid.includes(x.invoice));
    const first = res.bank.find((b) => b.line === a.bankLine);
    box.append(el("p", "ev-h", `Already paid, bank line ${a.bankLine}`));
    const bl2 = el("p", "bankline");
    bl2.append(marked(first.raw, [[...first.amountSpan, "pass"]]));
    box.append(bl2);
  }

  if (p.calc.length) { box.append(el("p", "ev-h", "The sums"), calcRows(p)); }

  const reply = draftReply(p);
  if (reply) {
    box.append(el("p", "ev-h", "A reply you could send"));
    const m = el("div", "mail");
    m.append(el("p", "mail-body", reply));
    box.append(m, el("p", "reply-note", "Drafted from the documents above. Nothing is sent."));
  }

  if (p.checks.length) {
    box.append(el("p", "ev-h", "Checks"));
    const ul = el("ul", "checks");
    for (const c of p.checks) {
      const li = el("li", `st-${c.state}`);
      li.append(icon(c.state === "pass" ? "check" : c.state === "fail" ? "cross" : "none"), el("span", null, c.name));
      ul.append(li);
    }
    box.append(ul);
  }
  return box;
}

function closeOpen() {
  if (!open) return;
  open.btn.setAttribute("aria-expanded", "false");
  open.li.querySelector(".evidence")?.remove();
  open = null;
  $("side").replaceChildren();
}

function show(entry, animate = true) {
  const box = detail(entry.p);
  if (animate) box.classList.add("enter");
  entry.btn.setAttribute("aria-expanded", "true");
  if (wide.matches) $("side").replaceChildren(box);
  else entry.li.append(box);
  open = entry;
  if (animate) requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("drawn")));
  else box.classList.add("drawn");
}

wide.addEventListener("change", () => {
  if (!open) return;
  const e = open;
  closeOpen();
  show(e, false);
});

function rowItem(p) {
  const li = el("div", "row-item");
  const btn = el("button", "row");
  btn.type = "button";
  btn.setAttribute("aria-expanded", "false");
  const st = rowStatus(p);
  const s = el("span", `status st-${st.cls}`);
  s.append(icon(st.icon), st.word);
  const v = el("span", "val");
  v.append(el("b", null, payer(p)));
  v.append(el("span", "amt", money(p.bank.amount)), ` · ${shortDate(p.bank.date)}`);
  let meta = p.headline;
  if (p.status === "credit") {
    const left = p.credits.filter((id) => !approved.has(id));
    meta += left.length ? ` Credit ${money(left.reduce((x, id) => x + creditById.get(id).amount, 0))} to approve.` : " Credit approved.";
  }
  const fu = followUpNote(p);
  if (fu) meta += ` ${fu}`;
  v.append(el("span", "meta", meta));
  const chev = icon("chev");
  chev.classList.add("chev");
  btn.append(s, v, chev);
  const entry = { p, li, btn };
  btn.addEventListener("click", () => {
    const same = open && open.p === p;
    closeOpen();
    if (!same) show(entry);
  });
  li.append(btn);
  li._entry = entry;
  return li;
}

function renderSummary() {
  const s = res.summary;
  const left = res.credits.filter((c) => !approved.has(c.id)).length;
  const sum = $("summary");
  sum.replaceChildren(
    el("span", "sum-main", left ? `${s.settled} of ${s.payments} can settle` : `${s.settled} of ${s.payments} payments settle`),
    el("span", "sum-side", left ? `${left} ${left === 1 ? "credit" : "credits"} to approve` : "Credits approved"),
    el("span", "sum-side muted", `${s.waits} wait for you`),
  );
}

function render(keepOpen, fresh = false) {
  renderSummary();
  const groups = $("groups");
  groups.replaceChildren();
  const order = [
    ["Credit to approve, then it settles", (p) => p.status === "credit"],
    ["Waits for you", (p) => p.status === "waits"],
    ["Settles", (p) => p.status === "settles"],
  ];
  let reopen = null;
  for (const [h, f] of order) {
    const list = res.payments.filter(f);
    if (!list.length) continue;
    const g = el("div", "group");
    g.append(el("p", "group-h", `${h} · ${list.length}`));
    const rows = el("div", `rows${fresh ? " fresh" : ""}`);
    for (const p of list) {
      const li = rowItem(p);
      rows.append(li);
      if (keepOpen === p.bank.line) reopen = li._entry;
    }
    g.append(rows);
    groups.append(g);
  }
  open = null;
  $("side").replaceChildren();
  if (reopen) show(reopen, false);
  renderExport();
}

function renderExport() {
  const csv = exportCsv(res, approved, S);
  $("csv").textContent = csv;
  const n = res.credits.filter((c) => approved.has(c.id)).length;
  $("export-sub").textContent = `${n ? `${n} approved ${n === 1 ? "credit" : "credits"} and` : "No credits approved yet, so only"} the payments that settle, as a plain CSV. It is a generic layout, not any accounting system's own import format.`;
}

$("download").addEventListener("click", () => {
  const blob = new Blob([exportCsv(res, approved, S) + "\n"], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "credits-and-payments.csv";
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
});
$("reset").addEventListener("click", () => { approved = new Set(); render(null); });
$("why-btn").addEventListener("click", () => {
  const b = $("why-btn");
  const on = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", String(on));
  $("chain").hidden = !on;
});

/* The documents */
const TABS = [["bank", "Bank feed"], ["messages", "Messages"], ["statement", "Statements"], ["dockets", "Dockets"]];
function table(head, rows, isHit) {
  const t = el("table", "grid");
  const tr = el("tr");
  for (const h of head) tr.append(el("th", null, h));
  t.append(tr);
  for (const r of rows) {
    const row = el("tr");
    if (isHit(r)) row.classList.add("hl");
    for (const cell of r.cells) {
      const td = el("td", cell.cls || null);
      td.textContent = cell.v;
      row.append(td);
    }
    t.append(row);
  }
  return t;
}

function renderDocs() {
  const tabs = $("doc-tabs");
  tabs.replaceChildren();
  for (const [id, label] of TABS) {
    const b = el("button", "tab", label);
    b.type = "button";
    b.setAttribute("aria-pressed", String(docTab === id));
    b.addEventListener("click", () => { docTab = id; docHit = null; renderDocs(); });
    tabs.append(b);
  }
  const g = $("doc-grid");
  let t;
  let cap = "";
  if (docTab === "bank") {
    t = table(["#", "Date", "Amount", "Description"], res.bank.map((b) => ({ line: b.line, cells: [{ v: b.line }, { v: b.date }, { v: b.amountText, cls: "num" }, { v: b.desc }] })), (r) => docHit?.bank === r.line);
    cap = "Exported from the bank, 3 to 18 November. Line 1 was matched before this run.";
  } else if (docTab === "messages") {
    t = table(["When", "From", "Channel", "Message"], S.messages.map((m) => ({ id: m.id, cells: [{ v: m.at }, { v: `${m.from}, ${cust.get(m.customer).name}` }, { v: m.channel }, { v: (m.subject ? `${m.subject}: ` : "") + m.text.replace(/\n/g, " "), cls: "wrap" }] })), (r) => docHit?.msg === r.id);
    cap = "Remittances as they arrived by email and WhatsApp.";
  } else if (docTab === "statement") {
    const rows = [];
    for (const c of S.customers) for (const i of S.invoices.filter((x) => x.customer === c.id)) {
      const paid = S.allocated.find((a) => a.invoice === i.no);
      rows.push({ no: i.no, cells: [{ v: c.name }, { v: i.date.slice(3) === "09/2026" ? "September" : "October" }, { v: i.no }, { v: i.date }, { v: money(invoiceTotal(i)), cls: "num" }, { v: paid ? `Paid ${shortDate(paid.date)}` : "Open" }] });
    }
    t = table(["Customer", "Statement", "Invoice", "Delivery date", "Amount", "Status"], rows, (r) => docHit?.docket === r.no);
    cap = "Every line is fresh fruit or vegetables, which is GST-free, so no GST is charged. October was due 20 Nov; September was due 20 Oct.";
  } else {
    t = table(["Docket", "Customer", "Signed", "At", "Note"], S.dockets.map((d) => ({ no: d.no, cells: [{ v: d.no }, { v: cust.get(inv.get(d.no).customer).name }, { v: d.signed }, { v: d.at }, { v: d.note, cls: "wrap" }] })), (r) => docHit?.docket === r.no);
    cap = "Proof of delivery: who signed each docket, when, and what they noted.";
  }
  g.replaceChildren(t);
  $("doc-cap").textContent = cap;
}

render(null, !calm());
renderDocs();
