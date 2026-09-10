#!/usr/bin/env python3
"""
Independent cross-check of one_property_rental_mortgage_tax_verdict.pdf.

Deliberately a *second implementation*, in a different language, sharing no code
with index.html or test/verify.mjs. Its purpose is to establish that the prior
PDF's figures are correct on their own terms, so that the audit does not rest on
a single implementation.

Derives every published figure from first principles, then derives the two
findings the report does not: the escrow contradiction, and the understatement
in its recast column.

    python3 test/crosscheck.py        # exits non-zero on any mismatch
"""
import math
import sys

# ---------------------------------------------------------------- disclosed facts
PRICE   = 300_000.0
LOAN    = 210_000.0
ANN     = 0.068
N       = 360
RENT_M  = 2_800.0
LUMP    = 30_000.0
SALARY  = 95_000.0
STD_DED = 16_100.0
MARGINAL = 0.22
DRAFT   = 2_000.0          # reported monthly draft, PDF page 2
PTAX    = 2_800.0          # PDF page 2
MGMT    = 3_800.0
HOA     = 828.0
BLDG_PCT = 0.80

r = ANN / 12
fails: list[str] = []


def check(label: str, got: float, want: float, tol: float = 0.51) -> None:
    ok = abs(got - want) <= tol
    if not ok:
        fails.append(label)
    print(f"  {'PASS' if ok else 'FAIL'}  {label:<44} {got:>13,.2f}   (PDF {want:,.2f})")


def payment(bal: float, rate: float, n: int) -> float:
    return bal * rate / (1 - (1 + rate) ** -n)


def run(bal: float, pay: float, months: int) -> tuple[float, float]:
    """Return (interest paid, closing balance) over `months`."""
    interest = 0.0
    for _ in range(months):
        ip = bal * r
        interest += ip
        bal -= pay - ip
    return interest, bal


def fed_tax(taxable: float) -> float:
    """Brackets implied by the PDF's own $12,070 figure (10% ceiling $12,400)."""
    brackets = [(12_400, 0.10), (50_400, 0.12), (105_700, 0.22)]
    tax, lo = 0.0, 0.0
    for hi, rate in brackets:
        if taxable > lo:
            tax += (min(taxable, hi) - lo) * rate
        lo = hi
    return tax + max(0.0, taxable - lo) * 0.24


# ------------------------------------------------------------------- loan figures
print("\n1. Loan mechanics (PDF pages 2 and 7)")
M = payment(LOAN, r, N)
check("contractual P&I", M, 1_369.04)
check("first-month interest", LOAN * r, 1_190.00)
check("first-month scheduled principal", M - LOAN * r, 179.04)

i12_keep, _ = run(LOAN, M, 12)
i12_pay, _ = run(LOAN - LUMP, M, 12)
M_recast = payment(LOAN - LUMP, r, N)
i12_recast, _ = run(LOAN - LUMP, M_recast, 12)

check("interest, months 1-12, keep loan", i12_keep, 14_212, 1.0)
check("interest, months 1-12, +$30k same P&I", i12_pay, 12_107, 1.0)
check("interest, months 1-12, +$30k recast", i12_recast, 12_182, 1.0)
check("recast P&I", M_recast, 1_173.47)

# months to payoff after curtailment, closed form
n_after = -math.log(1 - (LOAN - LUMP) * r / M) / math.log(1 + r)
int_keep = M * N - LOAN
int_pay = M * n_after - (LOAN - LUMP)
int_recast = M_recast * N - (LOAN - LUMP)

check("lifetime interest, keep loan", int_keep, 282_855, 1.0)
check("lifetime interest, +$30k same P&I", int_pay, 151_117, 1.0)
check("lifetime interest, +$30k recast", int_recast, 242_448, 1.0)
check("nominal saving, same P&I", int_keep - int_pay, 131_738, 1.0)
check("nominal saving, recast", int_keep - int_recast, 40_408, 1.0)
print(f"        payoff after curtailment: {int(n_after // 12)}y {n_after % 12:.1f}m   (PDF 20 yr 2 mo)")

# --------------------------------------------------------------- Schedule E figures
print("\n2. Schedule E, stabilized year (PDF page 5)")
opex = PTAX + MGMT + HOA
bldg = PRICE * BLDG_PCT
dep_full = bldg / 27.5
A6_AUG = 0.01364                     # Table A-6, month 8
check("known annual operating expenses", opex, 7_428)
check("full-year depreciation", dep_full, 8_727, 1.0)
check("August 2026 first-year depreciation", bldg * A6_AUG, 3_274, 1.0)

net = RENT_M * 12 - i12_keep - opex - dep_full
check("estimated taxable rental profit", net, 3_233, 1.0)

print("\n3. Federal tax (PDF page 5)")
taxable = SALARY - STD_DED
check("federal tax, salary only", fed_tax(taxable), 12_070, 1.0)
check("federal tax, with rental profit", fed_tax(taxable + net), 12_781, 1.0)
check("rental tax increase", fed_tax(taxable + net) - fed_tax(taxable), 711, 1.0)

print("\n4. Depreciation: mid-month convention reproduces IRS Table A-6")
A6 = [0, 3.485, 3.182, 2.879, 2.576, 2.273, 1.970,
      1.667, 1.364, 1.061, 0.758, 0.455, 0.152]
worst = max(abs(((12 - m) + 0.5) / 12 / 27.5 * 100 - A6[m]) for m in range(1, 13))
ok = worst < 0.001
if not ok:
    fails.append("Table A-6 reproduction")
print(f"  {'PASS' if ok else 'FAIL'}  max deviation across all 12 months     {worst:.4f} pp")

# ------------------------------------------------------- finding 1: escrow gap
print("\n5. FINDING: the $2,000 draft contradicts the $2,800 property tax")
escrow_m = DRAFT - M
escrow_a = escrow_m * 12
print(f"        ${DRAFT:,.2f} draft - ${M:,.2f} P&I = ${escrow_m:,.2f}/mo = ${escrow_a:,.2f}/yr escrow")
print(f"        stated property tax ${PTAX:,.0f}  ->  implied insurance ${escrow_a - PTAX:,.0f}  <-- implausible")
for ins in (1_500, 1_800, 2_400):
    implied = escrow_a - ins
    pct = implied / PRICE * 100
    verdict = "plausible for TX" if 1.2 <= pct <= 2.6 else "implausible"
    print(f"        insurance ${ins:,}  ->  implied property tax ${implied:,.0f} = {pct:.2f}% of price  ({verdict})")

# ------------------------------------------------- finding 2: the headline reverses
print("\n6. FINDING: resolving it reverses the report's headline")
for label, ptax, ins in [("report as written", PTAX, 0.0),
                         ("+ insurance only", PTAX, 1_800.0),
                         ("escrow-implied tax + insurance", 5_772.0, 1_800.0)]:
    n_ = RENT_M * 12 - i12_keep - ptax - MGMT - HOA - ins - dep_full
    if n_ > 0:
        effect = fed_tax(taxable + n_) - fed_tax(taxable)
    else:                                    # full $25k allowance applies below $100k MAGI
        effect = fed_tax(taxable - min(abs(n_), 25_000)) - fed_tax(taxable)
    print(f"        {label:<32} net {n_:>10,.0f}   federal tax effect {effect:>+9,.0f}")
print("        -> 'a small taxable profit, not a tax loss' does not survive normal insurance"
      "\n           plus the escrow-implied property tax.")

# ------------------------------------- finding 3: recast column understates by design
print("\n7. FINDING: the recast column assumes you never overpay")
print(f"        recast required payment      ${M_recast:,.2f}")
print(f"        but voluntarily pay          ${M:,.2f}")
print(f"        -> payoff                    {int(n_after // 12)}y {n_after % 12:.1f}m  (same as 'keep P&I')")
print(f"        -> lifetime interest         ${int_pay:,.0f}  (same as 'keep P&I')")
print(f"        PDF recast row shows         ${int_recast:,.0f}, i.e. ${int_recast - int_pay:,.0f} more")
print("        -> the option that dominates was never placed in the comparison.")

# --------------------------------------------- NPV neutrality, discounted at the rate
print("\n8. Prepayment is exactly NPV-neutral at the loan's own rate")


def payments(bal: float, pay: float) -> list[float]:
    """Actual payment vector, with a correctly-sized final partial payment."""
    out = []
    while bal > 0.005:
        ip = bal * r
        principal = min(pay - ip, bal)
        out.append(ip + principal)
        bal -= principal
    return out


def pv(stream: list[float]) -> float:
    return sum(c / (1 + r) ** t for t, c in enumerate(stream, start=1))


base = payments(LOAN, M)
prepaid = payments(LOAN - LUMP, M)
pv_base, pv_prepaid = pv(base), pv(prepaid)

def identity(label: str, got: float, want: float, tol: float = 0.01) -> None:
    """Assert a derived identity rather than a figure published in the PDF."""
    ok = abs(got - want) <= tol
    if not ok:
        fails.append(label)
    print(f"  {'PASS' if ok else 'FAIL'}  {label:<44} {got:>13,.2f}   (exact {want:,.2f})")


identity("PV of all payments, keep loan  == balance", pv_base, LOAN)
identity("PV of all payments, after $30k == balance", pv_prepaid, LOAN - LUMP)
identity("NPV of the $30,000 prepayment", (pv_base - pv_prepaid) - LUMP, 0.0)
print(f"        {len(base)} payments -> {len(prepaid)} payments, "
      f"final payment ${prepaid[-1]:,.2f} rather than ${M:,.2f}")
print("        A loan discounted at its own rate is worth its balance, so retiring")
print("        $30,000 of balance buys exactly $30,000 of present value. The")
print(f"        ${int_keep - int_pay:,.2f} headline is undiscounted interest, not value created.")

# ---------------------------------------------------------------------------- result
print()
if fails:
    print(f"*** {len(fails)} MISMATCH(ES): {', '.join(fails)} ***")
    sys.exit(1)
print("*** ALL PDF FIGURES INDEPENDENTLY CONFIRMED ***")
