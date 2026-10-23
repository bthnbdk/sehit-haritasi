import os, json, openpyxl, re
from collections import Counter, defaultdict

RAW = "/home/batu/msb-sehit/raw"
OUT = "/home/batu/msb-sehit"
recs = {}
per_file = {}
bad = []
for fn in sorted(os.listdir(RAW)):
    if not fn.endswith(".xlsx"):
        continue
    name = fn[:-5]
    try:
        wb = openpyxl.load_workbook(os.path.join(RAW, fn), read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
    except Exception as e:
        bad.append((name, str(e)))
        continue
    if not rows:
        per_file[name] = 0
        continue
    hdr = [str(h).strip() if h is not None else "" for h in rows[0]]
    cnt = 0
    for r in rows[1:]:
        if r is None or all(v is None or str(v).strip() == "" for v in r):
            continue
        d = {hdr[i]: ("" if r[i] is None else str(r[i]).strip()) for i in range(min(len(hdr), len(r)))}
        rid = d.get("ID", "")
        key = rid or ("|".join(d.values()))
        if key in recs:
            continue
        d["_q"] = name
        recs[key] = d
        cnt += 1
    per_file[name] = cnt

print("files", len(per_file), "unique", len(recs), "bad", bad)
json.dump(per_file, open(os.path.join(OUT, "per_file.json"), "w"), ensure_ascii=False, indent=1)
all_rows = list(recs.values())
json.dump(all_rows, open(os.path.join(OUT, "records.json"), "w"), ensure_ascii=False, indent=0)

tot = len(all_rows)
print("TOTAL", tot)
il = Counter(r.get("İL", "") for r in all_rows)
print("distinct il", len(il))
print("top15", il.most_common(15))
print("sum", sum(il.values()))
# sample of unmapped / unknown small ones
print("per_file of 'İl Seçiniz'", per_file.get("İl Seçiniz"))
