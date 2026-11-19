# Short-Pay Match

A café pays its produce statement, but not all of it. "Less the 2 trays avo short on the 14th." Someone at the wholesaler has to find the delivery, check what the driver's docket says, work out the credit and match the rest of the money to the right invoices. When the docket says "Received in full", someone has to decide what to believe.

This page does that for one month, in plain code. Eight payments from a made-up produce wholesaler's bank feed are matched to the October statement, the signed delivery dockets and the remittance messages the cafés sent by email and WhatsApp. A short-payment becomes a credit note only when the signed docket for that delivery notes the same item short. Everything else waits for a person, with the reason. Nothing is guessed. Every credit waits for a person to approve it.

**Result on the sample: 3 of 8 payments can settle (two of them once their credits are approved), 5 wait, 4 credits drafted for approval. Each row says what is left to follow up.**

## What it shows

- **Settles to the cent.** One café pays its October statement exactly. Four invoices, allocated.
- **A short the docket backs.** A café pays 78.00 less and says 2 trays of avocado were short on the 14th. The docket for that delivery is signed "Short 2 trays Hass avocado". A credit of 2 x 39.00, the invoice price, is drafted. After approval the payment settles.
- **Two shorts, by docket number.** Another café deducts 3 kg of Roma tomato and 6 bunches of parsley, naming each docket. Both dockets note them. Two credits, 32.70 in all.
- **Waits: damage the docket does not note.** A café deducts 4 kg of Roma tomato that "came in damaged". The docket for that day is signed "Received in full". Damage found after delivery may be real, but it is not on the docket, so no credit is drafted. The driver photographs every drop, so the delivery photo is the next thing to check (this page does not read photos). A reply asking the café for a photo, to check against the delivery photo, is drafted for the team. Nothing is sent.
- **Waits: more taken off than the docket notes.** A café deducts 4 kg of baby spinach; the docket notes 2 kg. A credit is drafted for the 2 kg only. The other 28.00 waits.
- **Waits: two statements in one payment.** A payment is the overdue September statement plus October, to the cent, but the reference names October only. The allocation is proposed, and a person confirms it.
- **Waits: a payer not on file.** A payment arrives from a company name no customer uses. Its amount matches one café's open statement exactly, and no other. That is proposed, not allocated.
- **Waits: paid twice.** A café pays its October statement as printed, but one of its invoices was already paid on 3 Nov. The page shows both bank lines and leaves refund or credit to a person.

## The checks

For each bank line not matched before this run:

1. **Payer.** The description must contain a payer name on the customer's file. If not, an open statement with exactly that amount is proposed, but nothing is allocated.
2. **Message.** A remittance from that customer within 3 days of the payment is read. If it states an amount, the amount must match the bank.
3. **Difference.** The payment is compared with the customer's open October invoices.
4. **Each deduction** in the message is read as quantity, unit, item and the delivery it refers to (a docket number, or a day of the month). Then:
   - the delivery must be on this customer's statement, and only one delivery that day may carry the item;
   - the unit must be the unit the invoice sells it in (kg is never turned into trays);
   - the signed docket must note that item short. The credit is the smaller of the two quantities, times the invoice price.
5. **Settles** only when the credits explain the difference to the cent and every deduction is fully backed. Otherwise the payment waits.
6. **Overpayments** are checked against an older open statement and against invoices already paid. Anything else is "not found".

Every figure on the page is underlined where it was read: the bank row, the message, the docket note and the invoice line.

## Export

Approved credit notes and the allocations of payments that settle, as a CSV. The layout is generic, not any accounting system's own import format. A payment's allocations are only included once every credit on it is approved.

## Facts used

- Every item in the sample is fresh fruit or vegetables. The Australian Taxation Office lists fresh fruit and vegetables as GST-free (ato.gov.au, "GST-free food"), so the credit notes carry GST of 0.00. Mixed baskets with taxable items would need GST on each line.
- Dates are Australian, day first. The October statement is due 20 Nov 2026.

## What it does not do

- It does not read PDFs, photos of dockets, delivery photos or bank statements. The documents are already text; a delivery photo is named, not looked at.
- It does not connect to a bank or an accounting system.
- It does not judge whether a café's damage claim is fair. That stays with a person.
- Prices are taken from the invoice line; it does not check them against a price list.

## Run it

Open `index.html` through any static server. Tests: `node --test` (27 tests).

All businesses, people, prices and payments are made up.

Built on 19 Nov 2026 with AI coding agents, directed by Arnold Ikpemosi Adeyemi.
