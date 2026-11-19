import test from "node:test";
import assert from "node:assert/strict";
import { checkAll, readQuantities, readDocket, parseBank, exportCsv, money, cents, invoiceTotal, docketFields, followUpNote } from "./check.js";
import * as S from "./samples.js";

const clone = (x) => JSON.parse(JSON.stringify(x));
const data = () => ({ ...clone(S), bankCsv: S.bankCsv });
const run = (d = data()) => checkAll(d);
const byLine = (res, n) => res.payments.find((p) => p.bank.line === n);
const tail = (header, row) => `${header}\n${row}`;
const HEAD = "Date,Amount,Description";

test("sample: 8 payments read, 3 settle, 5 wait, 4 credits drafted", () => {
  const r = run();
  assert.equal(r.summary.payments, 8);
  assert.equal(r.summary.settled, 3);
  assert.equal(r.summary.waits, 5);
  assert.equal(r.summary.credits, 4);
});

test("sample: the payment matched before this run is not read again", () => {
  const r = run();
  assert.equal(byLine(r, 1), undefined);
});

test("exact payment: settles against every open invoice on the statement", () => {
  const p = byLine(run(), 2);
  assert.equal(p.status, "settles");
  assert.deepEqual(p.allocations.map((a) => a.invoice), ["41181", "41201", "41237", "41255"]);
  assert.equal(p.allocations.reduce((s, a) => s + a.amount, 0), p.bank.amount);
});

test("short with a docket note: 2 trays avocado credited at the invoice price, settles", () => {
  const r = run();
  const p = byLine(r, 5);
  assert.equal(p.status, "credit");
  const d = p.deductions[0];
  assert.equal(d.docket, "41207");
  assert.equal(d.ref.kind, "day");
  assert.equal(d.ref.value, 14);
  assert.equal(d.podQty, 2);
  assert.equal(d.line.price, 3900);
  assert.equal(d.credit, 7800);
  assert.equal(p.calc.find((c) => c.label === "Left to follow up").value, 0);
});

test("the message's own amount is checked against the bank", () => {
  const p = byLine(run(), 5);
  assert.ok(p.checks.find((c) => c.name === "Amount in the message matches the bank" && c.state === "pass"));
  const d = data();
  d.messages.find((m) => m.id === "M2").text = "Hi, paid the Oct statement this morning, 773.60, less the 2 trays avo short on the 14th. Thanks";
  const q = byLine(run(d), 5);
  assert.equal(q.status, "waits");
  assert.match(q.reasons.map((x) => x.text).join(" "), /message says 773\.60; the bank received 733\.60/);
});

test("two deductions by docket number, both on signed dockets: settles with two credits", () => {
  const r = run();
  const p = byLine(r, 7);
  assert.equal(p.status, "credit");
  assert.deepEqual(p.deductions.map((d) => [d.docket, d.item, d.qty, d.credit]), [["41231", "ROMA", 3, 1950], ["41245", "PARS", 6, 1320]]);
  assert.equal(p.allocations.find((a) => a.invoice === "41231").amount, 16940 - 1950);
});

test("damage the docket does not note: no credit, waits with the docket's words", () => {
  const p = byLine(run(), 8);
  assert.equal(p.status, "waits");
  assert.equal(p.deductions[0].docket, "41240");
  assert.equal(p.deductions[0].credit, 0);
  assert.equal(p.credits.length, 0);
  assert.match(p.reasons[0].text, /Received in full/);
  assert.match(p.reasons[0].text, /delivery photo \(41240-goods\.jpg, 07:04\) is the next thing to check; this page does not read photos/);
});

test("damage with no delivery photo on file: the docket's words, and a person decides", () => {
  const d = data();
  delete d.dockets.find((x) => x.no === "41240").photo;
  const p = byLine(run(d), 8);
  assert.equal(p.status, "waits");
  assert.match(p.reasons[0].text, /person decides/);
});

test("evidence fields under a docket say Invoiced, not Delivered, and show the short the docket notes", () => {
  const r = run();
  const f = docketFields(byLine(r, 5).deductions[0], S.items);
  assert.deepEqual(f.map((x) => x.label), ["Invoice", "Item", "Invoiced", "Short on docket", "Price"]);
  assert.equal(f.find((x) => x.label === "Invoiced").value, "4 trays");
  assert.equal(f.find((x) => x.label === "Short on docket").value, "2 trays");
  assert.equal(f.find((x) => x.label === "Price").value, "39.00");
  const g = docketFields(byLine(r, 3).deductions[0], S.items);
  assert.equal(g.find((x) => x.label === "Short on docket").value, "2 kg");
  assert.ok(!g.some((x) => x.label === "Delivered"));
  const h = docketFields(byLine(r, 8).deductions[0], S.items);
  assert.ok(!h.some((x) => x.label === "Short on docket"));
});

test("follow-up line: nothing left to chase once credits explain it; 28.00 to follow up on the 4 kg claim", () => {
  const r = run();
  assert.equal(followUpNote(byLine(r, 5)), "Nothing left to chase.");
  assert.equal(followUpNote(byLine(r, 7)), "Nothing left to chase.");
  assert.equal(followUpNote(byLine(r, 3)), "28.00 to follow up.");
  assert.equal(followUpNote(byLine(r, 8)), "26.00 to follow up.");
  assert.equal(followUpNote(byLine(r, 2)), "");
});

test("deduction bigger than the docket note: credit for the noted 2 kg only, 28.00 left to follow up", () => {
  const r = run();
  const p = byLine(r, 3);
  assert.equal(p.status, "waits");
  const d = p.deductions[0];
  assert.equal(d.qty, 4);
  assert.equal(d.podQty, 2);
  assert.equal(d.backed, 2);
  assert.equal(d.credit, 2800);
  assert.equal(p.calc.find((c) => c.label === "Left to follow up").value, -2800);
});

test("two statements in one payment: proposed, but waits because the reference names October only", () => {
  const p = byLine(run(), 4);
  assert.equal(p.status, "waits");
  assert.deepEqual(p.proposal.invoices, ["41160", "41166", "41186", "41242"]);
  assert.equal(p.allocations.length, 0);
});

test("two statements in one payment, both named in the reference: settles", () => {
  const d = data();
  d.bankCsv = d.bankCsv.replace("WEXCOMBE DELI OCT", "WEXCOMBE DELI SEPT OCT");
  const p = byLine(run(d), 4);
  assert.equal(p.status, "settles");
  assert.equal(p.allocations.length, 4);
});

test("unknown payer: the matching statement is proposed and nothing is allocated", () => {
  const p = byLine(run(), 6);
  assert.equal(p.status, "waits");
  assert.equal(p.customer, null);
  assert.equal(p.proposal.customer, "TANS");
  assert.equal(p.allocations.length, 0);
});

test("unknown payer with no matching amount: not found, no proposal", () => {
  const d = data();
  d.bankCsv = d.bankCsv.replace("13/11/2026,262.35,", "13/11/2026,262.53,");
  const p = byLine(run(d), 6);
  assert.equal(p.proposal, null);
  assert.match(p.reasons[0].text, /Not found/);
});

test("overpayment: the extra is the invoice already paid on 3 Nov, so it waits as paid twice", () => {
  const p = byLine(run(), 9);
  assert.equal(p.status, "waits");
  assert.deepEqual(p.overpaid, ["41188"]);
  assert.equal(p.calc.find((c) => c.label === "Difference").value, 9340);
});

test("an overpayment nothing explains is not found", () => {
  const d = data();
  d.bankCsv = d.bankCsv.replace("18/11/2026,389.20,", "18/11/2026,390.00,");
  const p = byLine(run(d), 9);
  assert.match(p.headline, /Not found/);
});

test("a short with no message waits: not found, a reason", () => {
  const d = data();
  d.messages = d.messages.filter((m) => m.id !== "M2");
  const p = byLine(run(d), 5);
  assert.equal(p.status, "waits");
  assert.match(p.headline, /No message gives a reason/);
});

test("a message from outside the 3-day window is not used", () => {
  const d = data();
  d.messages.find((m) => m.id === "M2").at = "02/11/2026 08:41";
  const p = byLine(run(d), 5);
  assert.equal(p.message, null);
});

test("a delivery day with two dockets carrying the item is not guessed", () => {
  const d = data();
  d.invoices.push({ no: "41208", customer: "HALV", date: "14/10/2026", lines: [["AVO", 1, 39.0]] });
  d.dockets.push({ no: "41208", signed: "Priya", at: "14/10/2026 11:00", note: "Short 2 trays Hass avocado" });
  const p = byLine(run(d), 5);
  assert.equal(p.status, "waits");
  assert.match(p.reasons.map((x) => x.text).join(" "), /2 deliveries on the 14th/);
});

test("a docket number that is not on this customer's statement is not found", () => {
  const d = data();
  d.messages.find((m) => m.id === "M3").text = "We have paid 549.50 today. We deducted 3 kg Roma tomato short on docket 41207 and 6 bunches parsley not delivered on docket 41245.";
  const p = byLine(run(d), 7);
  assert.equal(p.status, "waits");
  assert.match(p.reasons.map((x) => x.text).join(" "), /Not found: docket 41207/);
});

test("a unit that differs from the invoice is held, not converted", () => {
  const d = data();
  d.messages.find((m) => m.id === "M2").text = "Paid 733.60, less 2 kg avo short on the 14th.";
  const p = byLine(run(d), 5);
  assert.equal(p.status, "waits");
  assert.match(p.reasons.map((x) => x.text).join(" "), /sells it by the tray/);
});

test("reading: quantity, unit, item, reason and day are found with their spans", () => {
  const t = "Hi, paid the Oct statement this morning, 733.60, less the 2 trays avo short on the 14th. Thanks";
  const [q] = readQuantities(t, S.items);
  assert.equal(t.slice(...q.span), "2 trays avo");
  assert.equal(t.slice(...q.reasonSpan), "short");
  assert.equal(t.slice(...q.ref.span), "the 14th");
  assert.equal(q.item, "AVO");
});

test("reading: 4kg with no space, and a reason written before the quantity on a docket", () => {
  const [a] = readQuantities("Less 4kg baby spinach short on Tues the 27th.", S.items);
  assert.equal(a.qty, 4);
  assert.equal(a.unit, "kg");
  assert.equal(a.item, "SPIN");
  const doc = readDocket({ note: "Short 2 trays Hass avocado" }, S.items);
  assert.equal(doc.full, false);
  assert.equal(doc.shorts[0].qty, 2);
  assert.equal(doc.shorts[0].item, "AVO");
  assert.equal(doc.shorts[0].reason, "short");
  assert.equal(readDocket({ note: "Received in full" }, S.items).full, true);
});

test("reading: an item we do not sell is not guessed", () => {
  const [q] = readQuantities("less 2 trays mangoes short on the 14th", S.items);
  assert.equal(q.item, null);
});

test("bank: amounts and spans read from the row as exported", () => {
  const [b] = parseBank(tail(HEAD, "12/11/2026,733.60,OSKO DEPOSIT HALVORY & FINCH PTY LTD OCT"));
  assert.equal(b.amount, 73360);
  assert.equal(b.raw.slice(...b.amountSpan), "733.60");
  assert.equal(b.raw.slice(b.descAt), "OSKO DEPOSIT HALVORY & FINCH PTY LTD OCT");
});

test("bank: a row that is not date, amount, description waits with the reason", () => {
  const d = data();
  d.bankCsv = tail(HEAD, "yesterday,lots,CASH");
  const r = run(d);
  assert.equal(r.payments[0].status, "waits");
});

test("export: only approved credits, and a payment's lines only when all its credits are approved", () => {
  const r = run();
  const none = exportCsv(r, new Set(), S);
  assert.equal(none.split("\n").filter((l) => l.startsWith("CREDIT")).length, 0);
  assert.equal(none.split("\n").filter((l) => l.startsWith("PAYMENT")).length, 4); // the exact payment only
  const some = exportCsv(r, new Set(["CN-D3"]), S);
  assert.equal(some.split("\n").filter((l) => l.startsWith("CREDIT")).length, 1);
  assert.ok(!some.includes("Bank line 7")); // Quillon still has CN-D4 to approve
  const all = exportCsv(r, new Set(r.credits.map((c) => c.id)), S);
  assert.ok(all.includes("CREDIT,12/11/2026,Halvory & Finch,CN-D2,41207,Hass avocado,2,39.00,-78.00,0.00"));
  assert.ok(all.includes("PAYMENT,16/11/2026,Quillon Bakehouse,Bank line 7,41231,,,,149.90,"));
  assert.ok(!all.includes("Bank line 3")); // waits, so not exported even with its partial credit approved
});

test("sums: every settled payment's allocations equal the bank amount", () => {
  const r = run();
  for (const p of r.payments.filter((x) => x.status !== "waits")) {
    assert.equal(p.allocations.reduce((s, a) => s + a.amount, 0), p.bank.amount, `line ${p.bank.line}`);
  }
});

test("money: cents in, Australian thousands out", () => {
  assert.equal(money(cents(1234.5)), "1,234.50");
  assert.equal(money(-2800), "-28.00");
  assert.equal(invoiceTotal({ lines: [["AVO", 4, 39], ["ROMA", 6, 6.5], ["PARS", 8, 2.2], ["LEMN", 2, 4.4]] }), 22140);
});
