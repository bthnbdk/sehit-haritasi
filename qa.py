import asyncio, os, sys, json
from playwright.async_api import async_playwright

BASE = os.environ.get("QA_BASE", "http://127.0.0.1:8123")
OUT = "/tmp/qa"
os.makedirs(OUT, exist_ok=True)
errs, results = [], []

def chk(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""), flush=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":1440,"height":900}, locale="tr-TR")
        pg = await ctx.new_page()
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        await pg.goto(BASE, wait_until="networkidle", timeout=60000)
        await pg.wait_for_timeout(2500)

        chk("title marker", "Şehit Haritası" in await pg.title(), await pg.title())
        chk("summary loaded", await pg.evaluate("document.querySelectorAll('.card').length >= 6"),
            await pg.evaluate("document.querySelectorAll('.card').length"))
        n_markers = await pg.evaluate("window.__sehit.shownMarkers")
        chk("markers rendered", n_markers > 200, n_markers)
        chk("tiles loaded", await pg.evaluate("document.querySelectorAll('img.leaflet-tile-loaded').length") > 3,
            await pg.evaluate("document.querySelectorAll('img.leaflet-tile-loaded').length"))
        chk("top bars", await pg.evaluate("document.querySelectorAll('#topBars .row').length") == 20,
            await pg.evaluate("document.querySelectorAll('#topBars .row').length"))
        chk("table rows", await pg.evaluate("document.querySelectorAll('#allTable tbody tr').length") == 295,
            await pg.evaluate("document.querySelectorAll('#allTable tbody tr').length"))
        chk("legend chips", await pg.evaluate("document.querySelectorAll('#legend [data-region]').length") == 6,
            await pg.evaluate("document.querySelectorAll('#legend [data-region]').length"))
        await pg.screenshot(path=f"{OUT}/01_home.png", full_page=False)

        # click first top bar -> detail panel
        await pg.click("#topBars .row:first-child")
        await pg.wait_for_timeout(2200)
        title = await pg.inner_text("#pTitle")
        chk("panel title set", title.strip() != "", title)
        nrec = await pg.evaluate("document.querySelectorAll('#recBody tr').length")
        chk("record rows in panel", nrec > 3, nrec)
        chk("panel big number", await pg.evaluate("!!document.querySelector('#pBody .big')"), "")
        await pg.screenshot(path=f"{OUT}/02_bursa.png")

        # war filter
        await pg.click("#warSeg button[data-war='KURTULUŞ SAVAŞI (1919-1922)']")
        await pg.wait_for_timeout(1200)
        cnts = await pg.evaluate("[...document.querySelectorAll('#topBars .row .n')].slice(0,5).map(e=>e.textContent)")
        chk("war filter changes counts", cnts[0] != "5.034", cnts)
        nm2 = await pg.evaluate("window.__sehit.shownMarkers")
        chk("war filter keeps map sane", nm2 > 50, nm2)
        await pg.screenshot(path=f"{OUT}/03_indep.png")

        # region filter
        await pg.click("#warSeg button[data-war='ALL']")
        await pg.wait_for_timeout(600)
        await pg.click("#legend [data-region='BALKAN']")
        await pg.wait_for_timeout(1200)
        nm3 = await pg.evaluate("window.__sehit.shownMarkers")
        chk("region filter reduces markers", 0 < nm3 < n_markers, f"{nm3} vs {n_markers}")
        await pg.screenshot(path=f"{OUT}/04_balkan.png")
        await pg.click("#legend [data-region='BALKAN']")
        await pg.wait_for_timeout(800)

        # search
        await pg.fill("#q", "selanik")
        await pg.wait_for_timeout(700)
        nt = await pg.evaluate("document.querySelectorAll('#allTable tbody tr').length")
        chk("search filters table", 0 < nt < 10, nt)

        # mobile
        mob = await b.new_context(viewport={"width":390,"height":844}, locale="tr-TR")
        mp = await mob.new_page()
        await mp.goto(BASE, wait_until="networkidle", timeout=60000)
        await mp.wait_for_timeout(2500)
        ov = await mp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        culprits = await mp.evaluate('''() => {const w=document.documentElement.clientWidth;return [...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>w+1).slice(0,6).map(e=>e.tagName+'#'+(e.id||'')+'.'+(e.className||'')+' → '+Math.round(e.getBoundingClientRect().right))}''')
        print("OVERFLOW CULPRITS:", culprits)
        chk("no horizontal overflow (mobile)", ov <= 1, ov)
        await mp.screenshot(path=f"{OUT}/05_mobile.png", full_page=True)

        hard = [e for e in errs if "pageerror" in e or e.startswith("error")]
        chk("no console errors", len(hard) == 0, hard[:4])
        await b.close()

    fails = [r for r in results if not r[1]]
    print(f"\n{len(results)-len(fails)}/{len(results)} passed")
    print("CONSOLE:", json.dumps(errs[:6], ensure_ascii=False))
    sys.exit(1 if fails else 0)

asyncio.run(main())
