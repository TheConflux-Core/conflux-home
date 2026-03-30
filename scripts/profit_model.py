#!/usr/bin/env python3
"""
Conflux Home — Hybrid Pricing Profit Model
Simulates revenue, costs, break-even, and LTV for app subscriptions + API credit packs.
"""

# ── Pricing Constants ──────────────────────────────────────────────────────

SUBSCRIPTION_TIERS = {
    "Free":  {"price": 0.00,    "credits": 500,    "overage": 0.0},
    "Power": {"price": 24.99,   "credits": 10_000, "overage": 0.003},
    "Pro":   {"price": 49.99,   "credits": 30_000, "overage": 0.002},
}

API_PACKS = {
    "Starter":    {"price": 9.99,   "credits": 5_000},
    "Growth":     {"price": 24.99,  "credits": 15_000},
    "Scale":      {"price": 49.99,  "credits": 35_000},
    "Business":   {"price": 99.99,  "credits": 80_000},
    "Enterprise": {"price": 199.99, "credits": 180_000},
}

# Model provider costs per 1K tokens (input, output)
MODEL_COSTS = {
    "core":     {"in": 0.00,  "out": 0.00,  "credits": 1},
    "standard": {"in": 0.15,  "out": 0.60,  "credits": 2},
    "pro":      {"in": 0.50,  "out": 1.50,  "credits": 3},
    "ultra":    {"in": 3.00,  "out": 15.00, "credits": 5},
}

# Usage assumptions
AVG_TOKENS_IN  = 500
AVG_TOKENS_OUT = 500

# Model usage distribution (must sum to 1.0)
MODEL_USAGE = {"core": 0.40, "standard": 0.30, "pro": 0.20, "ultra": 0.10}

# Subscription tier distribution
SUB_DIST = {"Free": 0.70, "Power": 0.20, "Pro": 0.10}

# API tier distribution
API_DIST = {
    "Starter": 0.40, "Growth": 0.30, "Scale": 0.20,
    "Business": 0.08, "Enterprise": 0.02,
}

# Retention (months)
RETENTION = {"Power": 6, "Pro": 12}

INFRA_COST_MONTHLY = 500.00


# ── Helper Functions ───────────────────────────────────────────────────────

def provider_cost_per_request(model_name: str) -> float:
    """Actual $ cost to us for one average request through a given model."""
    m = MODEL_COSTS[model_name]
    return (AVG_TOKENS_IN / 1000) * m["in"] + (AVG_TOKENS_OUT / 1000) * m["out"]


def blended_provider_cost_per_credit() -> float:
    """
    Weighted-average provider cost per credit issued.
    Each model burns `credits` per request, so cost/credit = cost_per_request / credits.
    """
    total = 0.0
    for model, share in MODEL_USAGE.items():
        cost_req = provider_cost_per_request(model)
        credits_per_req = MODEL_COSTS[model]["credits"]
        total += share * (cost_req / credits_per_req) if credits_per_req else 0.0
    return total


def credits_per_user_month(tier: str, avg_requests: int = 200) -> dict:
    """Estimate credits consumed and overage for a subscription user."""
    info = SUBSCRIPTION_TIERS[tier]
    consumed = avg_requests * weighted_credits_per_request()
    included = info["credits"]
    overage_credits = max(0, consumed - included)
    overage_rev = overage_credits * info["overage"]
    return {"consumed": consumed, "included": included,
            "overage_credits": overage_credits, "overage_rev": overage_rev}


def weighted_credits_per_request() -> float:
    """Expected credits burned per request across model mix."""
    return sum(share * MODEL_COSTS[m]["credits"] for m, share in MODEL_USAGE.items())


def cost_per_request_blended() -> float:
    """Blended provider cost for one request across model mix."""
    return sum(share * provider_cost_per_request(m) for m, share in MODEL_USAGE.items())


# ── 1. Subscription Revenue Projections ────────────────────────────────────

def subscription_revenue(total_users: int) -> dict:
    rows = {}
    total_rev = 0.0
    total_overage = 0.0
    for tier, share in SUB_DIST.items():
        n = int(total_users * share)
        info = SUBSCRIPTION_TIERS[tier]
        sub_rev = n * info["price"]
        # Estimate overage (assume 200 requests/mo avg for paying users)
        if tier != "Free":
            creds = credits_per_user_month(tier)
            ov = n * creds["overage_rev"]
        else:
            ov = 0.0
        rows[tier] = {"users": n, "sub_rev": sub_rev, "overage_rev": ov,
                       "total": sub_rev + ov}
        total_rev += sub_rev
        total_overage += ov
    return {"tiers": rows, "total_sub_rev": total_rev,
            "total_overage": total_overage, "grand_total": total_rev + total_overage}


# ── 2. API Revenue Projections ─────────────────────────────────────────────

def api_revenue(total_customers: int) -> dict:
    rows = {}
    total = 0.0
    for pack, share in API_DIST.items():
        n = int(total_customers * share)
        rev = n * API_PACKS[pack]["price"]
        rows[pack] = {"customers": n, "revenue": rev}
        total += rev
    return {"packs": rows, "total": total}


# ── 3. Blended Cost Analysis ───────────────────────────────────────────────

def cost_analysis() -> dict:
    cost_per_credit = blended_provider_cost_per_credit()
    credits_per_req = weighted_credits_per_request()
    cost_per_req = cost_per_request_blended()
    return {
        "blended_cost_per_credit": cost_per_credit,
        "weighted_credits_per_request": credits_per_req,
        "blended_cost_per_request": cost_per_req,
        "model_breakdown": {
            m: {"cost_per_request": provider_cost_per_request(m),
                "cost_per_credit": provider_cost_per_request(m) / MODEL_COSTS[m]["credits"] if MODEL_COSTS[m]["credits"] else 0}
            for m in MODEL_COSTS
        }
    }


# ── 4. Monthly Burn vs Revenue ─────────────────────────────────────────────

def burn_vs_revenue(sub_users: int, api_customers: int, infra: float = INFRA_COST_MONTHLY) -> dict:
    sub = subscription_revenue(sub_users)
    api = api_revenue(api_customers)
    total_rev = sub["grand_total"] + api["total"]

    # Provider cost: estimate total requests
    req_per_sub = 200  # avg monthly requests per subscription user
    req_per_api = 500  # avg monthly requests per API customer
    total_requests = (sub_users * req_per_sub) + (api_customers * req_per_api)
    provider_total = total_requests * cost_per_request_blended()

    total_burn = infra + provider_total
    net = total_rev - total_burn
    return {
        "sub_revenue": sub["grand_total"],
        "api_revenue": api["total"],
        "total_revenue": total_rev,
        "infra_cost": infra,
        "provider_cost": provider_total,
        "total_burn": total_burn,
        "net_profit": net,
        "margin_pct": (net / total_rev * 100) if total_rev > 0 else 0,
    }


# ── 5. Break-Even Analysis ─────────────────────────────────────────────────

def break_even(infra: float = INFRA_COST_MONTHLY) -> dict:
    """
    Find how many paying subscription users (Power+Pro) needed to cover infra,
    assuming 200 req/mo and current model mix.
    Also find combined sub+api break-even.
    """
    # Revenue per paying user (blended Power/Pro)
    power_rev = SUBSCRIPTION_TIERS["Power"]["price"]
    pro_rev   = SUBSCRIPTION_TIERS["Pro"]["price"]
    avg_paying_rev = SUB_DIST["Power"] / (SUB_DIST["Power"] + SUB_DIST["Pro"]) * power_rev \
                   + SUB_DIST["Pro"] / (SUB_DIST["Power"] + SUB_DIST["Pro"]) * pro_rev

    # Provider cost per paying user per month
    cost_per_user = 200 * cost_per_request_blended()
    margin_per_user = avg_paying_rev - cost_per_user
    users_needed = int(-(-infra // margin_per_user))  # ceiling division

    # API-only break-even
    starter_rev = API_PACKS["Starter"]["price"]
    api_margin = starter_rev - (500 * cost_per_request_blended())
    # blended API margin
    blended_api_rev = sum(API_DIST[p] * API_PACKS[p]["price"] for p in API_DIST)
    blended_api_cost = 500 * cost_per_request_blended()
    blended_api_margin = blended_api_rev - blended_api_cost
    api_customers_needed = int(-(-infra // blended_api_margin)) if blended_api_margin > 0 else float('inf')

    return {
        "avg_paying_sub_revenue": avg_paying_rev,
        "provider_cost_per_paying_user": cost_per_user,
        "margin_per_paying_user": margin_per_user,
        "paying_sub_users_for_breakeven": users_needed,
        "blended_api_margin_per_customer": blended_api_margin,
        "api_customers_for_breakeven": api_customers_needed,
        "infra_target": infra,
    }


# ── 6. LTV Estimates ───────────────────────────────────────────────────────

def ltv_analysis() -> dict:
    results = {}
    for tier in ["Power", "Pro"]:
        info = SUBSCRIPTION_TIERS[tier]
        months = RETENTION[tier]
        rev_per_user = info["price"] * months
        cost_per_user_month = 200 * cost_per_request_blended()
        cost_total = cost_per_user_month * months
        ltv = rev_per_user - cost_total
        results[tier] = {
            "monthly_price": info["price"],
            "retention_months": months,
            "gross_revenue": rev_per_user,
            "provider_cost": cost_total,
            "ltv_net": ltv,
            "ltv_margin_pct": (ltv / rev_per_user * 100) if rev_per_user > 0 else 0,
        }
    return results


# ── Main ────────────────────────────────────────────────────────────────────

def fmt(n: float) -> str:
    return f"${n:,.2f}"

def main():
    print("=" * 70)
    print("  CONFLUX HOME — HYBRID PRICING PROFIT MODEL")
    print("=" * 70)

    # Cost analysis
    ca = cost_analysis()
    print("\n── 3. BLENDED COST ANALYSIS ──────────────────────────────────────")
    print(f"  Blended cost per credit:       {fmt(ca['blended_cost_per_credit'])}")
    print(f"  Weighted credits per request:  {ca['weighted_credits_per_request']:.2f}")
    print(f"  Blended cost per request:      {fmt(ca['blended_cost_per_request'])}")
    print("  Model breakdown:")
    for m, d in ca["model_breakdown"].items():
        print(f"    {m:10s}  cost/req={fmt(d['cost_per_request']):>8s}  cost/credit={fmt(d['cost_per_credit'])}")

    # 1. Subscription revenue
    print("\n── 1. SUBSCRIPTION REVENUE PROJECTIONS ───────────────────────────")
    print(f"  {'Users':>7s}  {'Free Rev':>10s}  {'Power Rev':>10s}  {'Pro Rev':>10s}  {'Overage':>10s}  {'Total':>12s}")
    for total in [100, 500, 1000, 5000]:
        s = subscription_revenue(total)
        t = s["tiers"]
        print(f"  {total:>7d}  {fmt(t['Free']['sub_rev']):>10s}  {fmt(t['Power']['sub_rev']):>10s}  "
              f"{fmt(t['Pro']['sub_rev']):>10s}  {fmt(s['total_overage']):>10s}  {fmt(s['grand_total']):>12s}")

    # 2. API revenue
    print("\n── 2. API REVENUE PROJECTIONS ────────────────────────────────────")
    print(f"  {'Cust':>7s}  {'Starter':>10s}  {'Growth':>10s}  {'Scale':>10s}  {'Business':>10s}  {'Enterprise':>12s}  {'Total':>12s}")
    for total in [50, 200, 500]:
        a = api_revenue(total)
        p = a["packs"]
        print(f"  {total:>7d}  {fmt(p['Starter']['revenue']):>10s}  {fmt(p['Growth']['revenue']):>10s}  "
              f"{fmt(p['Scale']['revenue']):>10s}  {fmt(p['Business']['revenue']):>10s}  "
              f"{fmt(p['Enterprise']['revenue']):>12s}  {fmt(a['total']):>12s}")

    # 4. Burn vs Revenue
    print("\n── 4. MONTHLY BURN vs REVENUE ────────────────────────────────────")
    milestones = [
        (100,  50),
        (500,  200),
        (1000, 500),
        (5000, 500),
    ]
    print(f"  {'Sub Users':>9s}  {'API Cust':>8s}  {'Sub Rev':>12s}  {'API Rev':>12s}  "
          f"{'Total Rev':>12s}  {'Provider':>12s}  {'Infra':>8s}  {'Burn':>12s}  {'Net':>12s}  {'Margin':>7s}")
    for su, ac in milestones:
        b = burn_vs_revenue(su, ac)
        print(f"  {su:>9d}  {ac:>8d}  {fmt(b['sub_revenue']):>12s}  {fmt(b['api_revenue']):>12s}  "
              f"{fmt(b['total_revenue']):>12s}  {fmt(b['provider_cost']):>12s}  {fmt(b['infra_cost']):>8s}  "
              f"{fmt(b['total_burn']):>12s}  {fmt(b['net_profit']):>12s}  {b['margin_pct']:>6.1f}%")

    # 5. Break-even
    print("\n── 5. BREAK-EVEN ANALYSIS ────────────────────────────────────────")
    be = break_even()
    print(f"  Infra target:                      {fmt(be['infra_target'])}/mo")
    print(f"  Avg paying sub revenue/user:       {fmt(be['avg_paying_sub_revenue'])}")
    print(f"  Provider cost/paying user/mo:      {fmt(be['provider_cost_per_paying_user'])}")
    print(f"  Margin per paying user/mo:         {fmt(be['margin_per_paying_user'])}")
    print(f"  ➜ Paying sub users for break-even: {be['paying_sub_users_for_breakeven']}")
    print(f"  Blended API margin/customer:       {fmt(be['blended_api_margin_per_customer'])}")
    print(f"  ➜ API customers for break-even:    {be['api_customers_for_breakeven']}")

    # 6. LTV
    print("\n── 6. LIFETIME VALUE (LTV) ───────────────────────────────────────")
    ltv = ltv_analysis()
    for tier, d in ltv.items():
        print(f"  {tier}:")
        print(f"    Monthly price:       {fmt(d['monthly_price'])}")
        print(f"    Retention:           {d['retention_months']} months")
        print(f"    Gross revenue:       {fmt(d['gross_revenue'])}")
        print(f"    Provider cost:       {fmt(d['provider_cost'])}")
        print(f"    Net LTV:             {fmt(d['ltv_net'])}  ({d['ltv_margin_pct']:.1f}% margin)")

    # ── Key Metrics Summary ─────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  KEY METRICS SUMMARY")
    print("=" * 70)
    s500 = subscription_revenue(500)
    a200 = api_revenue(200)
    b500 = burn_vs_revenue(500, 200)
    print(f"  At 500 app users + 200 API customers:")
    print(f"    Monthly revenue:    {fmt(b500['total_revenue'])}")
    print(f"    Monthly burn:       {fmt(b500['total_burn'])}")
    print(f"    Monthly net:        {fmt(b500['net_profit'])}")
    print(f"    Margin:             {b500['margin_pct']:.1f}%")
    print(f"  Break-even:           {be['paying_sub_users_for_breakeven']} paying sub users OR {be['api_customers_for_breakeven']} API customers")
    print(f"  Blended cost/credit:  {fmt(ca['blended_cost_per_credit'])}")
    print(f"  Power LTV:            {fmt(ltv['Power']['ltv_net'])} ({RETENTION['Power']}mo)")
    print(f"  Pro LTV:              {fmt(ltv['Pro']['ltv_net'])} ({RETENTION['Pro']}mo)")
    print("=" * 70)


if __name__ == "__main__":
    main()
