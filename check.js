// Plain code, no model. Every customer payment is matched to its statement.
// A payment that is short is only settled by a credit note when the signed docket
// for that delivery notes the same short. Everything else waits for a person, with the reason.

export const cents = (n) => Math.round(Number(n) * 100);
export const money = (c) => {
  const neg = c < 0;
  const v = Math.abs(c);
  const s = `${Math.floor(v / 100).toLocaleString("en-AU")}.${String(v % 100).padStart(2, "0")}`;
  return neg ? `-${s}` : s;
};

const UNIT = { tray: "tray", trays: "tray", kg: "kg", bunch: "bunch", bunches: "bunch", box: "box", boxes: "box", punnet: "punnet", punnets: "punnet", bag: "bag", bags: "bag", each: "each" };
const QTY = /(\d+(?:\.\d+)?)\s?(trays?|kg|bunch(?:es)?|boxes?|punnets?|bags?)\b/gi;
const REASON = /\b(short|missing|not delivered|damaged)\b/i;
const MONTH_WORDS = { "09": ["SEP", "SEPT", "SEPTEMBER"], "10": ["OCT", "OCTOBER"] };

export function unitLabel(unit, qty) {
  if (qty === 1) return unit;
  if (unit === "kg" || unit === "each") return unit;
  if (unit === "bunch" || unit === "box") return `${unit}es`;
  return `${unit}s`;
}

/** The bank feed as exported: one payment per row, with the character spans we cite. */
export function parseBank(csv) {
  const rows = csv.trim().split(/\r?\n/);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const m = /^(\d\d\/\d\d\/\d{4}),(-?\d+(?:\.\d\d)?),(.*)$/.exec(raw);
    if (!m) { out.push({ line: i, raw, error: "Not a bank row: date, amount, description." }); continue; }
    const amountAt = m[1].length + 1;
    out.push({
      line: i, raw, date: m[1], amount: cents(m[2]), amountText: m[2],
      amountSpan: [amountAt, amountAt + m[2].length],
      desc: m[3], descAt: amountAt + m[2].length + 1,
    });
  }
  return out;
}

/** Find an item named at the start of a clause, by its aliases, longest first. */
function itemAt(text, at, items) {
  let rest = text.slice(at);
  let skip = 0;
  const lead = /^\s*(?:of\s+)?/i.exec(rest)[0];
  skip = lead.length;
  rest = rest.slice(skip).toLowerCase();
  let best = null;
  for (const [code, it] of Object.entries(items)) {
    for (const a of it.aliases) {
      if (rest.startsWith(a) && !/[a-z]/.test(rest[a.length] || "") && (!best || a.length > best.len)) best = { code, len: a.length };
    }
  }
  return best ? { code: best.code, start: at + skip, end: at + skip + best.len } : null;
}

/** Quantities with a unit and an item, in a message or on a docket. */
export function readQuantities(text, items) {
  const found = [];
  const ms = [...text.matchAll(QTY)];
  ms.forEach((m, k) => {
    const start = m.index;
    const end = start + m[0].length;
    // The clause runs to the next quantity, a new sentence or a line break.
    let stop = k + 1 < ms.length ? ms[k + 1].index : text.length;
    const brk = /[.!?\n]/.exec(text.slice(end));
    if (brk && end + brk.index < stop) stop = end + brk.index;
    const item = itemAt(text, end, items);
    const clause = text.slice(end, stop);
    let reason = REASON.exec(clause);
    let reasonSpan = reason ? [end + reason.index, end + reason.index + reason[0].length] : null;
    if (!reason) {
      const bs = Math.max(0, start - 8);
      const b = /\bshort\s*$/i.exec(text.slice(bs, start));
      if (b) { reason = b; reasonSpan = [bs + b.index, bs + b.index + 5]; }
    }
    let ref = null;
    const dn = /docket\s+(\d{5})/i.exec(clause);
    const dd = /(?:the\s+)?(\d{1,2})(st|nd|rd|th)\b/i.exec(clause);
    if (dn) ref = { kind: "number", value: dn[1], span: [end + dn.index, end + dn.index + dn[0].length] };
    else if (dd) ref = { kind: "day", value: Number(dd[1]), span: [end + dd.index, end + dd.index + dd[0].length] };
    found.push({
      qty: Number(m[1]), unit: UNIT[m[2].toLowerCase()], span: [start, item ? item.end : end],
      item: item ? item.code : null, reason: reason ? reason[0].trim().toLowerCase() : null, reasonSpan, ref,
    });
  });
  return found;
}

export function readDocket(d, items) {
  const full = /^received in full$/i.test(d.note.trim());
  return { full, shorts: full ? [] : readQuantities(d.note, items) };
}

function amountsIn(text) {
  return [...text.matchAll(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g)].map((m) => ({ value: cents(m[0].replace(/,/g, "")), span: [m.index, m.index + m[0].length] }));
}

const day = (dmy) => Number(dmy.slice(0, 2));
const period = (dmy) => dmy.slice(3);
const toDate = (dmy) => new Date(Number(dmy.slice(6, 10)), Number(dmy.slice(3, 5)) - 1, Number(dmy.slice(0, 2)));
const daysApart = (a, b) => Math.abs(toDate(a) - toDate(b)) / 86400000;

export function invoiceTotal(inv) {
  return inv.lines.reduce((s, [, q, p]) => s + cents(q * p), 0);
}

/** Run every check. Returns one result per payment, the drafted credits and the counts. */
export function checkAll(data) {
  const { items, customers, invoices, statements, dockets, bankCsv, allocated, messages } = data;
  const bank = parseBank(bankCsv);
  const inv = new Map(invoices.map((i) => [i.no, i]));
  const dk = new Map(dockets.map((d) => [d.no, d]));
  const paidBefore = new Map(allocated.map((a) => [a.invoice, a]));
  const latest = statements[statements.length - 1];
  const custById = new Map(customers.map((c) => [c.id, c]));

  const openBy = (cid, per) => invoices.filter((i) => i.customer === cid && period(i.date) === per && !paidBefore.has(i.no));
  const sum = (list) => list.reduce((s, i) => s + invoiceTotal(i), 0);

  const credits = [];
  const payments = [];

  for (const b of bank) {
    if (b.error) { payments.push({ bank: b, status: "waits", headline: b.error, reasons: [{ state: "none", text: b.error }], deductions: [], credits: [], allocations: [], checks: [], calc: [] }); continue; }
    const pre = allocated.find((a) => a.bankLine === b.line);
    if (pre) continue; // matched before this run

    const r = { bank: b, customer: null, payerSpan: null, message: null, status: "waits", headline: "", reasons: [], deductions: [], credits: [], allocations: [], proposal: null, checks: [], calc: [] };
    const D = b.desc.toUpperCase();
    const hits = [];
    for (const c of customers) for (const p of c.payers) {
      const at = D.indexOf(p);
      if (at >= 0) { hits.push({ c, span: [b.descAt + at, b.descAt + at + p.length] }); break; }
    }

    if (hits.length !== 1) {
      r.checks.push({ name: "Payer is a customer on file", state: "none" });
      const match = customers.filter((c) => { const o = openBy(c.id, latest.period); return o.length && sum(o) === b.amount; });
      if (hits.length > 1) {
        r.headline = "The description names more than one customer.";
        r.reasons.push({ state: "none", text: `The description matches ${hits.map((h) => h.c.name).join(" and ")}. Nothing is allocated.` });
      } else if (match.length === 1) {
        const c = match[0];
        r.proposal = { customer: c.id, invoices: openBy(c.id, latest.period).map((i) => i.no) };
        r.calc.push({ label: `${c.name}, ${latest.label} open`, value: b.amount, note: `${r.proposal.invoices.length} invoices` }, { label: "Paid", value: b.amount }, { label: "Difference", value: 0, strong: true });
        r.headline = `Payer not on file. The amount matches ${c.name}'s ${latest.label} statement.`;
        r.reasons.push({ state: "none", text: `No customer on file pays from this name. ${money(b.amount)} is exactly ${c.name}'s open ${latest.label} statement, and no other open statement. Nothing is allocated until someone confirms who the payer is.` });
      } else {
        r.headline = "Payer not on file. Not found: a statement for this amount.";
        r.reasons.push({ state: "none", text: "No customer on file pays from this name, and no open statement is this amount. Not found." });
      }
      payments.push(r);
      continue;
    }

    const c = hits[0].c;
    r.customer = c.id;
    r.payerSpan = hits[0].span;
    r.checks.push({ name: "Payer is a customer on file", state: "pass" });

    const open = openBy(c.id, latest.period);
    const older = statements.slice(0, -1).flatMap((s) => openBy(c.id, s.period).map((i) => ({ i, s })));
    const printed = invoices.filter((i) => i.customer === c.id && period(i.date) === latest.period);
    const openTotal = sum(open);
    const diff = b.amount - openTotal;

    const msg = messages.find((m) => m.customer === c.id && daysApart(m.at.slice(0, 10), b.date) <= 3) || null;
    r.message = msg ? msg.id : null;
    let statedOk = true;
    if (msg) {
      const stated = amountsIn(msg.text);
      if (stated.length) {
        const same = stated.find((s) => s.value === b.amount);
        r.statedSpan = same ? same.span : stated[0].span;
        statedOk = !!same;
        r.checks.push({ name: "Amount in the message matches the bank", state: same ? "pass" : "fail" });
        if (!same) r.reasons.push({ state: "fail", text: `The message says ${money(stated[0].value)}; the bank received ${money(b.amount)}.` });
      }
    }

    r.calc.push({ label: `${latest.label} statement, open`, value: openTotal, note: `${open.length} invoices` });
    if (printed.length !== open.length) r.calc.push({ label: "As printed", value: sum(printed), note: `${printed.length} invoices` });

    if (diff === 0 && statedOk) {
      r.status = "settles";
      r.headline = `Pays the ${latest.label} statement, ${open.length} invoices, to the cent.`;
      r.allocations = open.map((i) => ({ invoice: i.no, amount: invoiceTotal(i) }));
      r.checks.push({ name: "Difference explained", state: "pass" });
    } else if (diff > 0) {
      const olderTotal = older.reduce((s, x) => s + invoiceTotal(x.i), 0);
      const twice = printed.filter((i) => paidBefore.has(i.no));
      if (older.length && diff === olderTotal) {
        const sts = [...new Set(older.map((x) => x.s))];
        const named = sts.every((s) => MONTH_WORDS[s.period.slice(0, 2)].some((w) => new RegExp(`\\b${w}\\b`).test(D)));
        r.proposal = { customer: c.id, invoices: [...older.map((x) => x.i.no), ...open.map((i) => i.no)] };
        r.calc.push({ label: `${sts.map((s) => s.label).join(", ")} statement, overdue`, value: olderTotal, note: `${older.length} invoices` });
        if (named) {
          r.status = "settles";
          r.headline = "Pays two statements together, both named.";
          r.allocations = r.proposal.invoices.map((n) => ({ invoice: n, amount: invoiceTotal(inv.get(n)) }));
          r.checks.push({ name: "Difference explained", state: "pass" });
        } else {
          r.headline = `${sts.map((s) => s.label).join(", ")} and ${latest.label} together. The reference names ${latest.label} only.`;
          r.reasons.push({ state: "none", text: `${money(b.amount)} is the overdue ${sts.map((s) => s.label).join(", ")} statement plus ${latest.label}, to the cent. The reference names ${latest.label} only, so a person confirms before the older statement is closed.` });
          r.checks.push({ name: "Difference explained", state: "none" });
        }
      } else if (twice.length && diff === sum(twice)) {
        const t = twice.map((i) => paidBefore.get(i.no));
        r.headline = `Over by ${money(diff)}: invoice ${twice.map((i) => i.no).join(", ")}, already paid on ${t.map((x) => shortDate(x.date)).join(", ")}.`;
        r.reasons.push({ state: "none", text: `They paid the statement as printed, ${money(sum(printed))}. Invoice ${twice.map((i) => i.no).join(", ")} for ${money(diff)} was already paid on ${t.map((x) => shortDate(x.date)).join(", ")} (bank line ${t.map((x) => x.bankLine).join(", ")}), so it has now been paid twice. Refund it or hold it as credit: a person decides.` });
        r.overpaid = twice.map((i) => i.no);
        r.checks.push({ name: "Difference explained", state: "none" });
      } else {
        r.headline = `Over by ${money(diff)}. Not found: an invoice for that amount.`;
        r.reasons.push({ state: "none", text: `Paid ${money(diff)} more than the open statement. No open or paid invoice explains it. Not found.` });
        r.checks.push({ name: "Difference explained", state: "none" });
      }
      r.calc.push({ label: "Paid", value: b.amount }, { label: "Difference", value: diff, strong: true });
    } else {
      const short = -diff;
      const asked = msg ? readQuantities(msg.text, items) : [];
      let creditSum = 0;
      let allBacked = asked.length > 0;
      for (const q of asked) {
        const d = { ...q, docket: null, line: null, podQty: 0, backed: 0, credit: 0, state: "none", why: "" };
        r.deductions.push(d);
        if (!q.item) { d.why = "Not found: an item we sell in these words."; allBacked = false; continue; }
        const own = invoices.filter((i) => i.customer === c.id && period(i.date) === latest.period);
        let target = null;
        if (q.ref?.kind === "number") {
          target = own.find((i) => i.no === q.ref.value) || null;
          if (!target) { d.why = `Not found: docket ${q.ref.value} on ${c.name}'s ${latest.label} statement.`; allBacked = false; continue; }
        } else if (q.ref?.kind === "day") {
          const on = own.filter((i) => day(i.date) === q.ref.value && i.lines.some(([code]) => code === q.item));
          const any = own.filter((i) => day(i.date) === q.ref.value);
          if (on.length === 1) target = on[0];
          else if (on.length > 1) { d.why = `${on.length} deliveries on the ${q.ref.value}th carry this item. Which one is for a person.`; allBacked = false; continue; }
          else { d.why = any.length ? `The delivery on ${q.ref.value} ${latest.label.slice(0, 3)} has no ${items[q.item].name.toLowerCase()}.` : `Not found: a delivery on the ${q.ref.value}th.`; allBacked = false; continue; }
        } else { d.why = "The message names no docket or delivery day."; allBacked = false; continue; }
        d.docket = target.no;
        const ln = target.lines.findIndex(([code]) => code === q.item);
        if (ln < 0) { d.why = `Docket ${target.no} has no ${items[q.item].name.toLowerCase()}.`; allBacked = false; continue; }
        const [, invQty, price] = target.lines[ln];
        d.line = { invoice: target.no, ln: ln + 1, qty: invQty, price: cents(price) };
        if (q.unit !== items[q.item].unit) { d.why = `The message says ${q.unit}; the invoice sells it by the ${items[q.item].unit}.`; allBacked = false; continue; }
        const docket = dk.get(target.no);
        const read = docket ? readDocket(docket, items) : null;
        d.pod = read;
        if (!docket) { d.why = `Not found: a signed docket for ${target.no}.`; allBacked = false; continue; }
        const noted = read.shorts.find((s) => s.item === q.item);
        if (read.full || !noted) {
          d.why = q.reason === "damaged" && read.full && docket.photo
            ? `The signed docket says "${docket.note}". The driver's delivery photo (${docket.photo}, ${docket.at.slice(11)}) is the next thing to check; this page does not read photos.`
            : `The signed docket says "${docket.note}". ${q.reason === "damaged" ? "Damage found after delivery is not on the docket, so a person decides." : "No short is noted for this item."}`;
          allBacked = false;
          continue;
        }
        d.podQty = noted.qty;
        d.podSpan = noted.span;
        d.backed = Math.min(q.qty, noted.qty);
        d.credit = cents((d.backed * price));
        if (q.qty > noted.qty) {
          d.state = "part";
          d.why = `The docket notes ${noted.qty} ${unitLabel(q.unit, noted.qty)}; the message deducts ${q.qty}. Credit drafted for ${noted.qty}; the other ${q.qty - noted.qty} ${unitLabel(q.unit, q.qty - noted.qty)} wait for a person.`;
          allBacked = false;
        } else {
          d.state = "pass";
          d.why = `The signed docket notes the same short.`;
        }
        const id = `CN-D${credits.length + 1}`;
        credits.push({ id, payment: b.line, customer: c.id, invoice: target.no, ln: ln + 1, item: q.item, qty: d.backed, unit: q.unit, price: cents(price), amount: d.credit, date: b.date });
        d.creditId = id;
        r.credits.push(id);
        creditSum += d.credit;
      }

      r.calc.push({ label: "Credits drafted", value: -creditSum }, { label: "Expected", value: openTotal - creditSum }, { label: "Paid", value: b.amount });
      const left = short - creditSum;
      r.calc.push({ label: "Left to follow up", value: left === 0 ? 0 : -left, strong: true });
      r.followUp = left;

      if (!msg) {
        r.headline = `Short by ${money(short)}. No message gives a reason.`;
        r.reasons.push({ state: "none", text: `Paid ${money(short)} less than the open statement, and no remittance arrived within 3 days. Not found: a reason.` });
      } else if (!asked.length) {
        r.headline = `Short by ${money(short)}. The message names no item.`;
        r.reasons.push({ state: "none", text: "The message does not say what was deducted." });
      } else {
        for (const d of r.deductions) if (d.state !== "pass") r.reasons.push({ state: "none", text: d.why });
        if (left !== 0 && r.reasons.length === 0) r.reasons.push({ state: "none", text: `After the credits, ${money(left)} is still short. Not found: a reason for it.` });
      }

      const name = (d) => `${d.qty} ${d.unit === "kg" ? "kg" : unitLabel(d.unit, d.qty)} ${d.item ? (items[d.item].short || items[d.item].name.toLowerCase()) : "unknown item"}`;
      if (msg && asked.length) {
        if (allBacked && left === 0 && statedOk) {
          r.status = "credit";
          r.headline = r.deductions.length === 1 ? `Less ${name(r.deductions[0])}. The signed docket notes it.` : `Less ${r.deductions.length} items. Every signed docket notes them.`;
          for (const i of open) {
            const cr = r.credits.map((id) => credits.find((x) => x.id === id)).filter((x) => x.invoice === i.no).reduce((s, x) => s + x.amount, 0);
            r.allocations.push({ invoice: i.no, amount: invoiceTotal(i) - cr });
          }
        } else {
          const d0 = r.deductions.find((d) => d.state !== "pass") || r.deductions[0];
          r.headline = d0.state === "part"
            ? `Less ${name(d0)}. The docket notes ${d0.podQty} ${d0.unit}.`
            : d0.pod?.full ? `Less ${name(d0)}. The docket says received in full.` : `Less ${name(d0)}. ${d0.why}`;
        }
      }
      r.checks.push({ name: "Message found", state: msg ? "pass" : "none" });
      r.checks.push({ name: "Every deduction is on a signed docket", state: allBacked ? "pass" : "none" });
      r.checks.push({ name: "Difference explained", state: r.status === "credit" ? "pass" : "none" });
    }
    payments.push(r);
  }

  const settled = payments.filter((p) => p.status !== "waits").length;
  const toApprove = credits.length;
  return { bank, payments, credits, summary: { payments: payments.length, settled, waits: payments.length - settled, credits: toApprove } };
}

export function shortDate(dmy) {
  return `${Number(dmy.slice(0, 2))} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(dmy.slice(3, 5)) - 1]}`;
}

/**
 * A generic import file, not any accounting system's own format.
 * Only approved credits go in, and a payment's allocations go in only when
 * it settles and every credit on it is approved.
 */
export function exportCsv(res, approved, data) {
  const cname = (id) => data.customers.find((c) => c.id === id).name;
  const q = (s) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const out = ["Type,Date,Customer,Reference,Invoice,Item,Quantity,Unit price,Amount,GST"];
  for (const cr of res.credits) {
    if (!approved.has(cr.id)) continue;
    out.push(["CREDIT", cr.date, q(cname(cr.customer)), cr.id, cr.invoice, q(data.items[cr.item].name), cr.qty, money(cr.price), money(-cr.amount), "0.00"].join(","));
  }
  for (const p of res.payments) {
    if (p.status === "waits") continue;
    if (!p.credits.every((id) => approved.has(id))) continue;
    for (const a of p.allocations) out.push(["PAYMENT", p.bank.date, q(cname(p.customer)), `Bank line ${p.bank.line}`, a.invoice, "", "", "", money(a.amount), ""].join(","));
  }
  return out.join("\n");
}


/** The fields shown under a docket in the evidence: what was invoiced, and what the signed docket notes short. */
export function docketFields(d, items) {
  if (!d.line) return [];
  const it = items[d.item];
  const out = [
    { label: "Invoice", value: `${d.docket}, line ${d.line.ln}` },
    { label: "Item", value: it.name },
    { label: "Invoiced", value: `${d.line.qty} ${unitLabel(it.unit, d.line.qty)}` },
  ];
  if (d.podQty) out.push({ label: "Short on docket", value: `${d.podQty} ${unitLabel(it.unit, d.podQty)}`, kind: "pass" });
  out.push({ label: "Price", value: money(d.line.price), kind: d.credit ? "pass" : null });
  return out;
}

/** The follow-up line for a payment row: what is left to chase once the drafted credits are taken off. */
export function followUpNote(p) {
  if (p.followUp == null) return "";
  if (p.followUp === 0) return p.credits.length ? "Nothing left to chase." : "";
  return `${money(p.followUp)} to follow up.`;
}
