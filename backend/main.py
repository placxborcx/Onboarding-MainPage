# main.py
import os
import json
import math
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# load .env for local dev (Lambda will use environment variables)
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, ".env"))

PARKING_API_KEY = os.getenv("PARKING_API_KEY")
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://main.d2fkwp0o2zqc0o.amplifyapp.com")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGIN}})

USERS_FILE = os.path.join(basedir, "users.json")
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, "w") as f:
        json.dump([], f)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat()})


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json or {}
    name = data.get("name")
    email = data.get("email")
    if not name or not email:
        return jsonify({"success": False, "message": "name and email required"}), 400

    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        users.append({"name": name, "email": email, "created_at": datetime.utcnow().isoformat()})
        f.seek(0)
        json.dump(users, f, indent=2)
        f.truncate()

    return jsonify({"success": True, "message": "Signed up"}), 201


# helper: haversine distance in metres
def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def geocode_address(q: str):
    if not MAPBOX_TOKEN:
        return None
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(q)}.json"
    params = {"access_token": MAPBOX_TOKEN, "limit": 1}
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    feats = r.json().get("features", [])
    if not feats:
        return None
    lon, lat = feats[0]["center"]
    return float(lat), float(lon)


@app.route("/api/parking", methods=["GET"])
def get_parking():
    """
    Generic combined datasets endpoint (keeps your old behaviour).
    """
    headers = {}
    if PARKING_API_KEY:
        headers["COM"] = PARKING_API_KEY

    try:
        urls = {
            "onstreet": "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/on-street-parking-bay-sensors/records?limit=100",
            "sign_plates": "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/sign-plates-located-in-each-parking-zone/records?limit=100",
            "parking_zone": "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/parking-zones-linked-to-street-segments/records?limit=100",
        }

        combined = {}
        for k, u in urls.items():
            resp = requests.get(u, headers=headers, timeout=12)
            resp.raise_for_status()
            combined[k] = resp.json()

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    return jsonify({"success": True, "data": combined})


@app.route("/api/parking/nearby", methods=["GET", "OPTIONS"])
def parking_nearby():
    # allow preflight
    if request.method == "OPTIONS":
        return ("", 204)

    q = (request.args.get("q") or "").strip()
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)

    # resolve center
    if lat is None or lon is None:
        if not q:
            return jsonify({"success": False, "error": "Provide q (address) or lat & lon"}), 400
        geopt = geocode_address(q)
        if not geopt:
            return jsonify({"success": False, "error": f"Could not geocode '{q}'"}), 404
        lat, lon = geopt

    # fetch nearby sensors using geofilter.distance
    headers = {}
    if PARKING_API_KEY:
        headers["COM"] = PARKING_API_KEY

    base_url = "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/on-street-parking-bay-sensors/records"
    radius_m = 1000
    LIMIT = 100
    MAX_PAGES = 5

    all_results = []
    offset = 0
    for _ in range(MAX_PAGES):
        params = {"geofilter.distance": f"{lat},{lon},{radius_m}", "limit": LIMIT, "offset": offset}
        resp = requests.get(base_url, headers=headers, params=params, timeout=12)
        resp.raise_for_status()
        chunk = resp.json().get("results", [])
        all_results.extend(chunk)
        if len(chunk) < LIMIT:
            break
        offset += LIMIT

    # compute distances and aggregate by zone_number
    cleaned = []
    for r in all_results:
        loc = r.get("location") or {}
        rlat = loc.get("lat")
        rlon = loc.get("lon")
        if rlat is None or rlon is None:
            continue
        dist_m = haversine_m(lat, lon, float(rlat), float(rlon))
        cleaned.append({
            "distance_m": round(dist_m, 1),
            "lat": float(rlat),
            "lon": float(rlon),
            "kerbsideid": r.get("kerbsideid"),
            "status_description": r.get("status_description"),
            "status_timestamp": r.get("status_timestamp"),
            "lastupdated": r.get("lastupdated"),
            "zone_number": r.get("zone_number"),
        })

    # aggregate into groups (zone or kerbside)
    groups = {}
    for item in cleaned:
        zone = item.get("zone_number") or f"kerb_{item.get('kerbsideid')}"
        g = groups.setdefault(zone, {"total": 0, "available": 0, "lat_sum": 0.0, "lon_sum": 0.0, "count": 0, "min_dist": float("inf")})
        g["total"] += 1
        if (item.get("status_description") or "").lower() == "unoccupied":
            g["available"] += 1
        g["lat_sum"] += item["lat"]
        g["lon_sum"] += item["lon"]
        g["count"] += 1
        if item["distance_m"] < g["min_dist"]:
            g["min_dist"] = item["distance_m"]

    output = []
    for zone, g in groups.items():
        avg_lat = g["lat_sum"] / g["count"]
        avg_lon = g["lon_sum"] / g["count"]
        dist_km = g["min_dist"] / 1000.0 if g["min_dist"] < float("inf") else None
        output.append({
            "name": f"Zone {zone}",
            "availableSpaces": int(g["available"]),
            "totalSpaces": int(g["total"]),
            "address": None,
            "distance": f"{dist_km:.2f} km" if dist_km is not None else None,
            "price": None,
            "coordinates": {"lat": round(avg_lat, 6), "lng": round(avg_lon, 6)}
        })

    output.sort(key=lambda x: float(x["distance"].split()[0]) if x["distance"] else 9999)

    return jsonify({
        "query": {"location": q or None, "lat": lat, "lon": lon},
        "results": output,
        "total": len(output),
        "message": "No carpark available" if not output else "OK"
    })


# no app.run() here — Lambda will use the wrapper file
