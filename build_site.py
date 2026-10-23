# -*- coding: utf-8 -*-
"""Build site data from records.json + geo.py"""
import json, os, re, unicodedata
from collections import Counter, defaultdict
from geo import GEO

BASE = "/home/batu/msb-sehit"
SITE = os.path.join(BASE, "site")
os.makedirs(os.path.join(SITE, "data", "rec"), exist_ok=True)

recs = json.load(open(os.path.join(BASE, "records.json")))
print("records", len(recs))

TRMAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
def slug(s):
    s = s.translate(TRMAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "x"

WAR_ORDER = [
    "BİRİNCİ DÜNYA SAVAŞI (1914-1918)",
    "KURTULUŞ SAVAŞI (1919-1922)",
    "BALKAN SAVAŞLARI (1912-1913)",
    "OSMANLI-RUS SAVAŞI (1877-1878/93 Harbi)",
    "KIRIM SAVAŞI (1853-1856)",
    "OSMANLI-YUNAN SAVAŞI (1897)",
    "TRABLUSGARP SAVAŞI (1911)",
    "MUHAREBE DIŞI DİĞER ŞEHİTLER (1853-1928)",
]

places = defaultdict(lambda: {"count": 0, "wars": Counter(), "cephe": Counter(),
                             "rutbe": Counter(), "ilce": Counter(), "sinif": Counter(),
                             "birth": [], "death_year": Counter(), "names": []})
for r in recs:
    il = (r.get("İL") or "").strip()
    p = places[il]
    p["count"] += 1
    w = (r.get("HARP") or "").strip() or "-"
    p["wars"][w] += 1
    c = (r.get("CEPHE") or "").strip() or "-"
    p["cephe"][c] += 1
    p["rutbe"][(r.get("RÜTBE") or "").strip() or "-"] += 1
    ic = (r.get("İLÇE") or "").strip()
    if ic and ic not in ("-", "İlçe Seçiniz"):
        p["ilce"][ic] += 1
    m = re.match(r"^(1[89]\d{2}|20\d{2})", (r.get("DOĞUM TARİHİ") or "").strip())
    if m:
        p["birth"].append(int(m.group(1)))
    p["names"].append([
        (r.get("AD SOYAD") or "").strip(),
        (r.get("BABA ADI") or "").strip(),
        (r.get("DOĞUM TARİHİ") or "").strip(),
        (r.get("HARP") or "").strip(),
        (r.get("CEPHE") or "").strip(),
        (r.get("ŞEHADET YERİ") or "").strip(),
        (r.get("RÜTBE") or "").strip(),
        (r.get("İLÇE") or "").strip(),
    ])

REGION_LABEL = {"TR": "Türkiye", "BALKAN": "Balkanlar / Rumeli", "ME": "Orta Doğu",
                "NA": "Kuzey Afrika", "CAUCASUS": "Kafkasya & Asya", "OTHER": "Diğer"}

out_places = []
unmapped = []
for il, p in places.items():
    g = GEO.get(il)
    rec = {
        "il": il,
        "n": p["count"],
        "slug": slug(il),
        "wars": dict(p["wars"].most_common()),
        "cephe": dict(p["cephe"].most_common()),
        "rutbe": dict(p["rutbe"].most_common(5)),
        "ilce": dict(p["ilce"].most_common(8)),
        "birth_min": min(p["birth"]) if p["birth"] else None,
        "birth_max": max(p["birth"]) if p["birth"] else None,
        "birth_known": len(p["birth"]),
    }
    if g:
        rec["lat"], rec["lon"], rec["region"] = g[0], g[1], g[2]
        if g[3] and g[3] != il:
            rec["label"] = g[3]
    else:
        rec["region"] = "UNKNOWN"
        unmapped.append({"il": il, "n": p["count"]})
    out_places.append(rec)
    # per-place record list
    json.dump(p["names"], open(os.path.join(SITE, "data", "rec", rec["slug"] + ".json"), "w"),
              ensure_ascii=False, separators=(",", ":"))

out_places.sort(key=lambda x: -x["n"])

# global aggregates
wars = Counter((r.get("HARP") or "-").strip() for r in recs)
cephe = Counter((r.get("CEPHE") or "-").strip() for r in recs)
rutbe = Counter((r.get("RÜTBE") or "-").strip() for r in recs)
birth_dec = Counter()
for r in recs:
    m = re.match(r"^(1[789]\d{2}|20\d{2})", (r.get("DOĞUM TARİHİ") or "").strip())
    if m:
        y = int(m.group(1))
        birth_dec[(y // 10) * 10] += 1
region_tot = Counter()
for p in out_places:
    region_tot[p["region"]] += p["n"]

# death-year (Hicri/Rumi or Gregorian - kept raw, only marked)
summary = {
    "meta": {
        "source": "T.C. Millî Savunma Bakanlığı — Şehit Bilgi Kapısı",
        "source_url": "https://www.msb.gov.tr/SehitBilgiKapisi/SehitListesi",
        "scraped_at": "2026-10-23",
        "method": "Her il için resmî Excel dışa aktarımı (ExceleAktar?Il=…) çağrıldı; 303 sorgu, tekilleştirilmiş kayıt.",
        "total": len(recs),
        "place_count": len(out_places),
    },
    "wars": [{"name": k, "n": v} for k, v in wars.most_common()],
    "cephe": [{"name": k, "n": v} for k, v in cephe.most_common(14)],
    "rutbe": [{"name": k, "n": v} for k, v in rutbe.most_common(10)],
    "birthDecades": [{"decade": k, "n": v} for k, v in sorted(birth_dec.items())],
    "regionTotals": [{"region": k, "label": REGION_LABEL.get(k, k), "n": v}
                     for k, v in region_tot.most_common()],
    "places": out_places,
    "unmapped": sorted(unmapped, key=lambda x: -x["n"]),
    "regionLabels": REGION_LABEL,
}
json.dump(summary, open(os.path.join(SITE, "data", "summary.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("mapped", len(out_places) - len(unmapped), "unmapped", len(unmapped), sum(u["n"] for u in unmapped), "recs")
print("summary size", os.path.getsize(os.path.join(SITE, "data", "summary.json")))
print("unmapped:", unmapped)
