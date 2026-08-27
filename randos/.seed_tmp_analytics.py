#!/usr/bin/env python3
"""Seed the skawr-analytics backend with deterministic events for validation.

Prints an EXPECTED summary (per-day totals, funnel, revenue) so the analytics
endpoints can be checked against ground truth.
"""
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

BASE = "http://localhost:8004/api/v1"
EMAIL = "seed.user@skawr.dev"
PASSWORD = "SeedPass123!"
NAME = "Seed User"


def req(method, path, body=None, headers=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


# 1. signup (ok if already exists) then login
st, _ = req("POST", "/auth/signup", {"email": EMAIL, "password": PASSWORD, "name": NAME})
print("signup:", st)
st, login = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD})
print("login:", st)
jwt = login["access_token"]
auth = {"Authorization": f"Bearer {jwt}"}

# 2. create project
st, proj = req("POST", "/projects/", {"name": "Seed Marketplace", "domain": "seed.skawr.com",
                                      "description": "Validation seed project"}, auth)
print("project:", st, proj.get("id"))
project_id = proj["id"]

# 3. create API key (track + query)
st, key = req("POST", f"/projects/{project_id}/api-keys",
              {"name": "seed-key", "permissions": ["track", "query"]}, auth)
print("api-key:", st, key.get("key_prefix"))
api_key = key["key"]
track_h = {"X-API-Key": api_key}

# 4. ingest events
now = datetime.now(timezone.utc)
DAYS = 5  # today + 4 previous days

identities = []
for i in range(1, 7):
    identities.append({"user_id": f"user_{i}", "anonymous_id": f"anon_u{i}"})
for i in range(7, 11):
    identities.append({"user_id": None, "anonymous_id": f"anon_{i}"})

CUR = {1: ("SAR", 100.0), 2: ("USD", 20.0), 3: ("SAR", 250.0),
       4: ("JPY", 5000.0), 5: ("USD", 40.0), 6: ("SAR", 80.0),
       7: ("SAR", 60.0), 8: ("USD", 10.0), 9: ("JPY", 3000.0), 10: ("SAR", 120.0)}

UTM = {1: ("google", "cpc", "summer_sale"), 2: ("facebook", "social", "retargeting"),
       3: ("google", "cpc", "summer_sale"), 4: ("newsletter", "email", "weekly"),
       5: ("facebook", "social", "retargeting"), 6: (None, None, None),
       7: ("google", "organic", "brand"), 8: ("newsletter", "email", "weekly"),
       9: (None, None, None), 10: ("tiktok", "social", "influencer")}

FX = {"SAR": 1.0, "USD": 3.75}

FUNNEL = ["pageview", "product_view", "add_to_cart", "purchase"]


def depth_for(idx, day):
    v = (idx + day) % 4
    return [4, 1, 3, 2][v]


events = []
expected_per_date = {}
expected_funnel = {s: 0 for s in FUNNEL}
expected_rev_sar = 0.0
expected_unconv = {}
expected_paying_users = set()
attr_last_touch_source = {}

for day in range(DAYS):
    d = now - timedelta(days=day)
    base_ts = d.replace(hour=10, minute=0, second=0, microsecond=0)
    date_str = base_ts.strftime("%Y-%m-%d")
    for idx, ident in enumerate(identities, start=1):
        depth = depth_for(idx, day)
        src, med, camp = UTM[idx]
        sess = f"s_{idx}_{date_str}"
        for step_i in range(depth):
            name = FUNNEL[step_i]
            ts = base_ts + timedelta(minutes=5 * step_i)
            props = {}
            if name == "purchase":
                cur, amt = CUR[idx]
                props = {"revenue": amt, "currency": cur}
            ev = {
                "event_name": name,
                "user_id": ident["user_id"],
                "anonymous_id": ident["anonymous_id"],
                "session_id": sess,
                "timestamp": ts.isoformat(),
                "page_url": f"https://seed.skawr.com/products/{idx}",
                "path": "/products" if name != "pageview" else "/",
                "properties": props,
            }
            if name == "pageview" and src:
                ev["utm_source"] = src
                ev["utm_medium"] = med
                ev["utm_campaign"] = camp
            events.append((ev, date_str))
            expected_funnel[name] += 1
            if name == "purchase":
                cur, amt = CUR[idx]
                if cur in FX:
                    sar = amt * FX[cur]
                    expected_rev_sar += sar
                    if ident["user_id"]:
                        expected_paying_users.add(ident["user_id"])
                    tsrc = src or "(direct)"
                    attr_last_touch_source[tsrc] = attr_last_touch_source.get(tsrc, 0.0) + sar
                else:
                    u = expected_unconv.setdefault(cur, {"amount": 0.0, "tx": 0})
                    u["amount"] += amt
                    u["tx"] += 1
        expected_per_date[date_str] = expected_per_date.get(date_str, 0) + depth

conv_tx = 0
unconv_tx = 0
for day in range(DAYS):
    for idx, ident in enumerate(identities, start=1):
        if depth_for(idx, day) == 4:
            cur, amt = CUR[idx]
            if cur in FX:
                conv_tx += 1
            else:
                unconv_tx += 1

ok = 0
fail = 0
for ev, date_str in events:
    st, resp = req("POST", "/events/track", ev, track_h)
    if st == 201:
        ok += 1
    else:
        fail += 1
        if fail <= 3:
            print("track FAIL", st, resp)

print("\n=== INGEST RESULT ===")
print(f"events posted ok={ok} fail={fail} total={len(events)}")

total_expected = sum(expected_per_date.values())
print("\n=== EXPECTED (ground truth) ===")
print("project_id:", project_id)
print("api_key:", api_key)
print("jwt (trunc):", jwt[:25] + "...")
print("total events (all funnel):", total_expected)
print("per-date:", json.dumps(expected_per_date, sort_keys=True))
print("today:", now.strftime("%Y-%m-%d"), "count:", expected_per_date[now.strftime("%Y-%m-%d")])
print("funnel step totals:", expected_funnel)
print("convertible purchases:", conv_tx, "unconvertible(JPY):", unconv_tx)
print("expected total_revenue_sar:", round(expected_rev_sar, 2))
print("expected unconvertible:", expected_unconv)
print("expected paying users (logged-in):", sorted(expected_paying_users))
print("attribution last_touch by source (SAR):",
      {k: round(v, 2) for k, v in attr_last_touch_source.items()})

with open("/Users/smsaleh/Documents/Skawr/.seed_ctx.json", "w") as f:
    json.dump({"project_id": project_id, "api_key": api_key, "jwt": jwt,
               "today": now.strftime("%Y-%m-%d"),
               "total_expected": total_expected,
               "expected_per_date": expected_per_date,
               "expected_funnel": expected_funnel,
               "expected_rev_sar": round(expected_rev_sar, 2),
               "expected_unconv": expected_unconv,
               "conv_tx": conv_tx, "unconv_tx": unconv_tx}, f)
print("\nsaved .seed_ctx.json")
