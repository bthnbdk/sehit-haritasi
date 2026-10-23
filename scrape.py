import asyncio, json, time, os, sys
from playwright.async_api import async_playwright

URL = "https://www.msb.gov.tr/SehitBilgiKapisi/SehitListesi"
OUT = "/home/batu/msb-sehit"
RAW = os.path.join(OUT, "raw")
os.makedirs(RAW, exist_ok=True)
LOG = os.path.join(OUT, "scrape.log")

def log(*a):
    m = " ".join(str(x) for x in a)
    print(m, flush=True)
    with open(LOG, "a") as f:
        f.write(m + "\n")

def safe(n):
    return n.replace("/", "_").replace("\\", "_").strip()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await b.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            locale="tr-TR", accept_downloads=True)
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until="networkidle", timeout=90000)
        opts = await pg.eval_on_selector_all("#il option", "els=>els.map(e=>e.textContent.trim()).filter(Boolean)")
        log(f"opts={len(opts)}")
        ok = fail = skip = 0
        for i, name in enumerate(opts, 1):
            fn = os.path.join(RAW, safe(name) + ".xlsx")
            if os.path.exists(fn) and os.path.getsize(fn) > 1000:
                skip += 1
                continue
            for attempt in range(3):
                try:
                    r = await ctx.request.get("https://www.msb.gov.tr/SehitBilgiKapisi/ExceleAktar",
                                              params={"Il": name}, timeout=180000)
                    body = await r.body()
                    if r.status == 200 and body[:2] == b"PK":
                        open(fn, "wb").write(body)
                        ok += 1
                        log(f"[{i}/{len(opts)}] OK {name} {len(body)}B")
                        break
                    else:
                        log(f"[{i}/{len(opts)}] BADSTATUS {name} {r.status} {len(body)}B try{attempt}")
                        await pg.goto(URL, wait_until="domcontentloaded", timeout=90000)
                        await asyncio.sleep(3)
                except Exception as e:
                    log(f"[{i}/{len(opts)}] ERR {name} {type(e).__name__} {e} try{attempt}")
                    await asyncio.sleep(3)
            else:
                fail += 1
                log(f"[{i}/{len(opts)}] FAIL {name}")
            await asyncio.sleep(0.35)
        log(f"DONE ok={ok} skip={skip} fail={fail} total={len(opts)}")
        await b.close()

asyncio.run(main())
