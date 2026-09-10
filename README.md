# The $30,000 Decision — audit and rebuild

Audit of the two documents on `main` (`one_property_rental_mortgage_tax_verdict.pdf`, 10 pages, and
`One Property Mortgage & Tax Planner.html`, 11 inputs), plus a rebuilt model that closes the gaps.

Open `index.html` in a browser. No build, no dependencies, no network. **Print → A4 portrait** for a PDF.

```
node test/verify.mjs      # 64 assertions, no dependencies
```

## The prior work is arithmetically sound

Every published figure was recomputed from first principles. All fourteen match, several to the cent:

| | Report | Recomputed |
|---|---|---|
| Contractual P&I | $1,369.04 | $1,369.04 |
| First-month interest / principal | $1,190.00 / $179.04 | $1,190.00 / $179.04 |
| Interest, months 1–12 | $14,212 | $14,211.76 |
| Lifetime interest — keep / +$30k / recast | $282,855 / $151,117 / $242,448 | matches all three |
| Nominal saving — same P&I / recast | $131,738 / $40,408 | matches both |
| Recast P&I | $1,173.47 | $1,173.47 |
| Known annual opex | $7,428 | $2,800 + $3,800 + $828 |
| Depreciation — full year / Aug 2026 | $8,727 / $3,274 | matches both |
| Taxable rental profit | $3,233 | $3,233 |
| Federal tax, salary only / with rental / delta | $12,070 / $12,781 / $711 | matches all three |

The bracket reconstruction is internally exact — `$12,070` implies a 10% ceiling of `$12,400`, consistent
throughout. The report also handles Schedule E versus Schedule A, §1250 recapture, §465 at-risk, the
Substantial Presence Test, Regulation Z prepayment disclosure and Fannie Mae recast mechanics correctly.

## Three criticisms withdrawn

Raised before the documents were available, working from a chat summary only. The report handles all three
correctly and they are recorded as withdrawn rather than quietly dropped:

- **"12 months of rent on an August in-service date."** Page 4 explicitly labels the full-year tables a
  stabilized planning view, "not a claim that 12 months of rent or expenses occurred in 2026."
- **"Full-year depreciation on a mid-month asset."** Page 4 gives both $8,727 and $3,274, cites the 1.364%
  first-year percentage, and warns it changes with the month.
- **"Confuses the standard deduction with rental interest."** Page 3 states the opposite, correctly.

## What survives

1. **The $2,000 draft contradicts the $2,800 property tax.** $2,000 − $1,369.04 P&I leaves **$7,571/year**
   of escrow. Against a stated $2,800 tax that implies **$4,771** of insurance — implausible for a $300k
   rental. Read the other way, an ordinary $1,800 premium implies property tax near **$5,771**, or 1.92% of
   price: normal for Texas once a homestead cap and exemption are lost on conversion to a rental. The report
   flags the draft as needing reconciliation and stops one step short.
2. **Resolving it reverses the headline.** The executive verdict claims "a small taxable profit, not a tax
   loss." With the escrow-implied tax and normal insurance the same model gives a **$1,539 loss**, and the
   "+$711 of federal tax" becomes about **$339 of tax reduction** — a ~$1,050 swing, on the report's own
   evidence.
3. **The recast column understates by $91,331.** Page 7 shows recast at $242,448 lifetime interest versus
   $151,117 for keeping the payment, making recast look like it saves $40,408 rather than $131,738. But
   recasting does not oblige you to pay the lower amount. **Recast, then voluntarily keep paying $1,369.04**
   and lifetime interest is $151,117 — identical — while the *required* payment stays $1,173.47. The report
   compared curtail-and-keep-paying against recast-and-pay-less, never against recast-and-overpay. That
   omission produced the recommendation against recasting.
4. **No pre-tax retirement comparison.** Page 5's own footnote says the illustration "excludes 401(k), HSA",
   then never tests it. ~$6,600 immediate at 22% against a 5.30% hurdle is not close.
5. **"Substantial reserves" is asserted and load-bearing.** Page 8 concludes liquidity is not a constraint;
   no reserve figure appears in ten pages; page 9 lists weakened reserves as decisive.
6. **Active participation is treated as near-certain** for a Nevada owner of a Texas property paying $3,800
   for management. If it fails the loss suspends, the deduction has no current value, and the cost of debt
   rises from 5.30% to 6.80% — which *strengthens* the case for prepaying, for a different reason than given.
7. **The nominal figure leads.** Discounted at the loan's own rate the present value of prepaying is
   **exactly zero** — a loan discounted at its own rate is worth its balance. Page 8 does carry the correct
   5.30% opportunity-cost frame; pages 1 and 9 headline $131,738 anyway.
8. **Two savings figures were published** — $131,072, then $131,738. The PDF is right; the first was never
   retracted.
9. **Recapture is explained but never priced.**
10. **The app cannot test the sensitivity both documents rely on** — eleven inputs, and no field for
    insurance, repairs or vacancy.
11. Smaller: "near the full-allowance range" at $95,000 when he is below $100,000 and inside it; §199A never
    mentioned; the app curtails at month 1 while the PDF curtails at month 0.

## What the rebuild adds

Escrow reconciliation · six options including recast-then-overpay and the pre-tax alternative · Schedule E
split into 2026 partial year and stabilized year against the report's own column · §469 allowance, phaseout,
suspension and the active-participation failure case feeding back into the cost of debt · present-value
discounting · priced §1250 exposure · liquidity stress test against the visa grace period · insurance,
repairs and vacancy as first-class inputs.

## Still unresolved

Escrow breakdown of the $2,000 draft (**ask first**) · current property-tax statement post-reassessment ·
landlord insurance quote · land/building allocation · recast terms in writing · unused pre-tax room ·
liquid reserve balance · active-participation evidence · Substantial Presence Test result · any personal
use · other debt above 6.8% after tax.

---

Not tax, legal or investment advice. A deterministic planning model that reproduces the prior documents'
arithmetic and exposes the assumptions behind it. Bracket thresholds and the standard deduction are editable
and must be verified against the current IRS release. Depreciation basis, residency status, active
participation, recast eligibility and prepayment terms require confirmation from a CPA and the loan servicer
before any money moves.
