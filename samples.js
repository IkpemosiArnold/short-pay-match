// Sample data. Every business, person and figure here is made up.
// A produce wholesaler's October statement run, the signed delivery dockets,
// the bank feed for 3 to 18 November and the remittance messages that came with it.
// Every item is fresh fruit or vegetables, which is GST-free in Australia, so no GST appears.

export const seller = "Marlowgate Produce";

export const items = {
  AVO: { name: "Hass avocado", short: "avocado", unit: "tray", aliases: ["hass avocado", "avocados", "avocado", "avo"] },
  SPIN: { name: "Baby spinach", short: "baby spinach", unit: "kg", aliases: ["baby spinach", "spinach"] },
  ROMA: { name: "Roma tomato", short: "Roma tomato", unit: "kg", aliases: ["roma tomatoes", "roma tomato", "roma", "tomatoes", "tomato"] },
  PARS: { name: "Flat-leaf parsley", short: "parsley", unit: "bunch", aliases: ["flat-leaf parsley", "parsley"] },
  LEMN: { name: "Lemons", unit: "kg", aliases: ["lemons", "lemon"] },
  CUCU: { name: "Lebanese cucumber", unit: "kg", aliases: ["lebanese cucumber", "cucumbers", "cucumber"] },
  MUSH: { name: "Cup mushrooms", unit: "kg", aliases: ["cup mushrooms", "mushrooms"] },
  ONIO: { name: "Brown onions 10 kg", unit: "bag", aliases: ["brown onions", "onions"] },
  STRW: { name: "Strawberries", unit: "punnet", aliases: ["strawberries"] },
  ICEB: { name: "Iceberg lettuce", unit: "each", aliases: ["iceberg lettuce", "iceberg", "lettuce"] },
  BANA: { name: "Cavendish bananas", unit: "kg", aliases: ["cavendish bananas", "bananas"] },
  ROCK: { name: "Rocket", unit: "kg", aliases: ["rocket"] },
};

export const customers = [
  { id: "LARK", name: "Larkmoor Espresso", payers: ["LARKMOOR ESPRESSO"], contacts: ["Nadia"] },
  { id: "HALV", name: "Halvory & Finch", payers: ["HALVORY & FINCH", "HALVORY AND FINCH"], contacts: ["Priya"] },
  { id: "QUIL", name: "Quillon Bakehouse", payers: ["QUILLON BAKEHOUSE"], contacts: ["Rosa"] },
  { id: "BRIN", name: "Brindlecote Kitchen", payers: ["BRINDLECOTE"], contacts: ["Tom"] },
  { id: "OTTO", name: "Ottomere Café", payers: ["OTTOMERE"], contacts: ["Ines"] },
  { id: "WEXC", name: "Wexcombe Deli", payers: ["WEXCOMBE DELI"], contacts: ["Gus"] },
  { id: "TANS", name: "Tansley Row Café", payers: ["TANSLEY ROW"], contacts: ["Hannah"] },
  { id: "SORR", name: "Sorrelby Canteen", payers: ["SORRELBY CANTEEN"], contacts: ["Kit"] },
];

// One invoice per delivery. The invoice number and the docket number are the same.
// Lines: [item code, quantity, unit price as printed].
export const invoices = [
  { no: "41160", customer: "WEXC", date: "17/09/2026", lines: [["ROCK", 2, 16.5], ["LEMN", 4, 4.4], ["CUCU", 3, 5.95]] },
  { no: "41166", customer: "WEXC", date: "24/09/2026", lines: [["ROCK", 2, 16.5], ["MUSH", 3, 11.5], ["ICEB", 6, 3.2]] },

  { no: "41181", customer: "LARK", date: "07/10/2026", lines: [["AVO", 2, 39.0], ["LEMN", 3, 4.4], ["STRW", 12, 3.8]] },
  { no: "41182", customer: "HALV", date: "07/10/2026", lines: [["AVO", 3, 39.0], ["SPIN", 3, 14.0], ["ROMA", 6, 6.5], ["PARS", 8, 2.2]] },
  { no: "41184", customer: "BRIN", date: "08/10/2026", lines: [["ROMA", 8, 6.5], ["ONIO", 2, 16.0], ["MUSH", 4, 11.5]] },
  { no: "41186", customer: "WEXC", date: "08/10/2026", lines: [["ROCK", 2, 16.5], ["LEMN", 4, 4.4], ["CUCU", 4, 5.95]] },
  { no: "41188", customer: "SORR", date: "09/10/2026", lines: [["BANA", 10, 3.9], ["ONIO", 1, 16.0], ["ICEB", 12, 3.2]] },
  { no: "41189", customer: "QUIL", date: "09/10/2026", lines: [["STRW", 24, 3.8], ["LEMN", 5, 4.4], ["BANA", 6, 3.9]] },
  { no: "41193", customer: "TANS", date: "12/10/2026", lines: [["AVO", 2, 39.0], ["SPIN", 2, 14.0], ["ROMA", 5, 6.5]] },
  { no: "41196", customer: "OTTO", date: "13/10/2026", lines: [["AVO", 2, 39.0], ["SPIN", 4, 14.0], ["CUCU", 2, 5.95]] },
  { no: "41201", customer: "LARK", date: "14/10/2026", lines: [["AVO", 2, 39.0], ["STRW", 12, 3.8], ["BANA", 5, 3.9]] },
  { no: "41207", customer: "HALV", date: "14/10/2026", lines: [["AVO", 4, 39.0], ["ROMA", 6, 6.5], ["PARS", 8, 2.2], ["LEMN", 2, 4.4]] },
  { no: "41210", customer: "BRIN", date: "15/10/2026", lines: [["ROMA", 6, 6.5], ["MUSH", 4, 11.5], ["ROCK", 1, 16.5]] },
  { no: "41212", customer: "SORR", date: "16/10/2026", lines: [["BANA", 10, 3.9], ["ICEB", 12, 3.2], ["CUCU", 4, 5.95]] },
  { no: "41231", customer: "QUIL", date: "16/10/2026", lines: [["ROMA", 10, 6.5], ["STRW", 24, 3.8], ["PARS", 6, 2.2]] },
  { no: "41235", customer: "OTTO", date: "20/10/2026", lines: [["AVO", 2, 39.0], ["SPIN", 4, 14.0], ["LEMN", 2, 4.4]] },
  { no: "41237", customer: "LARK", date: "21/10/2026", lines: [["AVO", 2, 39.0], ["LEMN", 3, 4.4], ["STRW", 12, 3.8]] },
  { no: "41238", customer: "HALV", date: "21/10/2026", lines: [["AVO", 3, 39.0], ["SPIN", 3, 14.0], ["ROMA", 6, 6.5]] },
  { no: "41240", customer: "BRIN", date: "21/10/2026", lines: [["ROMA", 8, 6.5], ["ONIO", 2, 16.0], ["ICEB", 6, 3.2]] },
  { no: "41242", customer: "WEXC", date: "22/10/2026", lines: [["ROCK", 2, 16.5], ["MUSH", 3, 11.5], ["ICEB", 6, 3.2]] },
  { no: "41244", customer: "SORR", date: "23/10/2026", lines: [["BANA", 10, 3.9], ["ONIO", 1, 16.0], ["ICEB", 12, 3.2]] },
  { no: "41245", customer: "QUIL", date: "23/10/2026", lines: [["PARS", 12, 2.2], ["STRW", 24, 3.8], ["LEMN", 5, 4.4]] },
  { no: "41249", customer: "TANS", date: "26/10/2026", lines: [["AVO", 2, 39.0], ["SPIN", 2, 14.0], ["CUCU", 3, 5.95]] },
  { no: "41251", customer: "OTTO", date: "27/10/2026", lines: [["AVO", 2, 39.0], ["SPIN", 5, 14.0], ["ROMA", 4, 6.5]] },
  { no: "41255", customer: "LARK", date: "28/10/2026", lines: [["AVO", 2, 39.0], ["STRW", 12, 3.8], ["BANA", 5, 3.9]] },
  { no: "41256", customer: "HALV", date: "28/10/2026", lines: [["AVO", 3, 39.0], ["SPIN", 3, 14.0], ["PARS", 8, 2.2]] },
  { no: "41258", customer: "BRIN", date: "29/10/2026", lines: [["ROMA", 6, 6.5], ["MUSH", 4, 11.5], ["ROCK", 1, 16.5]] },
  { no: "41260", customer: "SORR", date: "30/10/2026", lines: [["BANA", 10, 3.9], ["ICEB", 12, 3.2], ["CUCU", 4, 5.95]] },
  { no: "41261", customer: "QUIL", date: "30/10/2026", lines: [["STRW", 24, 3.8], ["LEMN", 5, 4.4], ["BANA", 6, 3.9]] },
];

// The statements went out on Mon 2 Nov: September (overdue) and October, due Fri 20 Nov.
export const statements = [
  { period: "09/2026", label: "September", issued: "01/10/2026", due: "20/10/2026" },
  { period: "10/2026", label: "October", issued: "02/11/2026", due: "20/11/2026" },
];

// The signed docket for each delivery: who signed, when, what they wrote, and the driver's photo of the goods at the drop.
export const dockets = [
  { no: "41160", signed: "Gus", at: "17/09/2026 07:40", note: "Received in full", photo: "41160-goods.jpg" },
  { no: "41166", signed: "Gus", at: "24/09/2026 07:35", note: "Received in full", photo: "41166-goods.jpg" },
  { no: "41181", signed: "Nadia", at: "07/10/2026 06:12", note: "Received in full", photo: "41181-goods.jpg" },
  { no: "41182", signed: "Priya", at: "07/10/2026 06:48", note: "Received in full", photo: "41182-goods.jpg" },
  { no: "41184", signed: "Tom", at: "08/10/2026 07:05", note: "Received in full", photo: "41184-goods.jpg" },
  { no: "41186", signed: "Gus", at: "08/10/2026 07:41", note: "Received in full", photo: "41186-goods.jpg" },
  { no: "41188", signed: "Kit", at: "09/10/2026 06:30", note: "Received in full", photo: "41188-goods.jpg" },
  { no: "41189", signed: "Rosa", at: "09/10/2026 05:55", note: "Received in full", photo: "41189-goods.jpg" },
  { no: "41193", signed: "Hannah", at: "12/10/2026 06:20", note: "Received in full", photo: "41193-goods.jpg" },
  { no: "41196", signed: "Ines", at: "13/10/2026 07:15", note: "Received in full", photo: "41196-goods.jpg" },
  { no: "41201", signed: "Nadia", at: "14/10/2026 06:10", note: "Received in full", photo: "41201-goods.jpg" },
  { no: "41207", signed: "Priya", at: "14/10/2026 06:52", note: "Short 2 trays Hass avocado", photo: "41207-goods.jpg" },
  { no: "41210", signed: "Tom", at: "15/10/2026 07:02", note: "Received in full", photo: "41210-goods.jpg" },
  { no: "41212", signed: "Kit", at: "16/10/2026 06:33", note: "Received in full", photo: "41212-goods.jpg" },
  { no: "41231", signed: "Rosa", at: "16/10/2026 05:58", note: "Short 3 kg Roma tomato", photo: "41231-goods.jpg" },
  { no: "41235", signed: "Ines", at: "20/10/2026 07:11", note: "Received in full", photo: "41235-goods.jpg" },
  { no: "41237", signed: "Nadia", at: "21/10/2026 06:14", note: "Received in full", photo: "41237-goods.jpg" },
  { no: "41238", signed: "Priya", at: "21/10/2026 06:50", note: "Received in full", photo: "41238-goods.jpg" },
  { no: "41240", signed: "Tom", at: "21/10/2026 07:04", note: "Received in full", photo: "41240-goods.jpg" },
  { no: "41242", signed: "Gus", at: "22/10/2026 07:38", note: "Received in full", photo: "41242-goods.jpg" },
  { no: "41244", signed: "Kit", at: "23/10/2026 06:29", note: "Received in full", photo: "41244-goods.jpg" },
  { no: "41245", signed: "Rosa", at: "23/10/2026 06:01", note: "6 bunches parsley missing", photo: "41245-goods.jpg" },
  { no: "41249", signed: "Hannah", at: "26/10/2026 06:22", note: "Received in full", photo: "41249-goods.jpg" },
  { no: "41251", signed: "Ines", at: "27/10/2026 07:13", note: "Short 2 kg baby spinach", photo: "41251-goods.jpg" },
  { no: "41255", signed: "Nadia", at: "28/10/2026 06:09", note: "Received in full", photo: "41255-goods.jpg" },
  { no: "41256", signed: "Priya", at: "28/10/2026 06:47", note: "Received in full", photo: "41256-goods.jpg" },
  { no: "41258", signed: "Tom", at: "29/10/2026 07:00", note: "Received in full", photo: "41258-goods.jpg" },
  { no: "41260", signed: "Kit", at: "30/10/2026 06:31", note: "Received in full", photo: "41260-goods.jpg" },
  { no: "41261", signed: "Rosa", at: "30/10/2026 05:57", note: "Received in full", photo: "41261-goods.jpg" },
];

// The bank feed, as exported: date, amount, description.
export const bankCsv = `Date,Amount,Description
03/11/2026,93.40,TRANSFER FROM SORRELBY CANTEEN INV 41188
05/11/2026,559.80,TRANSFER FROM LARKMOOR ESPRESSO OCT STMT
10/11/2026,406.70,OSKO DEPOSIT OTTOMERE CAFE PTY LTD
11/11/2026,316.25,TRANSFER FROM WEXCOMBE DELI OCT
12/11/2026,733.60,OSKO DEPOSIT HALVORY & FINCH PTY LTD OCT
13/11/2026,262.35,TRANSFER FROM FERNWHISTLE HOLDINGS PTY LTD
16/11/2026,549.50,TRANSFER FROM QUILLON BAKEHOUSE REMIT OCT
17/11/2026,410.20,TRANSFER FROM BRINDLECOTE KITCHEN
18/11/2026,389.20,TRANSFER FROM SORRELBY CANTEEN OCT STATEMENT`;

// What was already matched before this run.
export const allocated = [{ bankLine: 1, invoice: "41188", amount: 93.4, date: "03/11/2026" }];

// Remittance messages, by email or WhatsApp, as they arrived.
export const messages = [
  { id: "M1", channel: "WhatsApp", from: "Ines", customer: "OTTO", at: "10/11/2026 14:02", text: "Transferred October just now. Less 4kg baby spinach short on Tues the 27th." },
  { id: "M2", channel: "WhatsApp", from: "Priya", customer: "HALV", at: "12/11/2026 08:41", text: "Hi, paid the Oct statement this morning, 733.60, less the 2 trays avo short on the 14th. Thanks" },
  { id: "M3", channel: "Email", from: "Rosa", customer: "QUIL", at: "16/11/2026 10:15", subject: "Remittance, October statement", text: "Hi team,\nWe have paid 549.50 today. We deducted 3 kg Roma tomato short on docket 41231 and 6 bunches parsley not delivered on docket 41245.\nRosa" },
  { id: "M4", channel: "Email", from: "Tom", customer: "BRIN", at: "17/11/2026 09:30", subject: "Payment", text: "Paid today, less 4 kg Roma tomato that came in damaged on the 21st. Most of the box went in the bin.\nTom" },
];
