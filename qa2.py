import asyncio, os, sys, json
from playwright.async_api import async_playwright

BASE = os.environ.get("QA_BASE", "http://127.0.0.1:8123")
OUT = "/tmp/qa2"
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
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        await pg.goto(BASE, wait_until="networkidle", timeout=60000)
        await pg.wait_for_timeout(2500)

        chk("title", "Şehit Haritası" in await pg.title(), await pg.title())
        chk("markers", await pg.evaluate("window.__sehit.shownMarkers") > 200, await pg.evaluate("window.__sehit.shownMarkers"))
        chk("tiles", await pg.evaluate("document.querySelectorAll('img.leaflet-tile-loaded').length") > 3)
        # panel must sit BELOW the map, centered (same left edge as map)
        geo = await pg.evaluate("""() => {
            const m = document.querySelector('#map').getBoundingClientRect();
            const p = document.querySelector('#panel').getBoundingClientRect();
            return {mapBottom: m.bottom + window.scrollY, panelTop: p.top + window.scrollY,
                    mapLeft: m.left, panelLeft: p.left, mapW: m.width, panelW: p.width};
        }""")
        chk("panel below map", geo["panelTop"] >= geo["mapBottom"] - 2, geo)
        chk("panel spans map width", abs(geo["mapW"] - geo["panelW"]) < 3 and abs(geo["mapLeft"] - geo["panelLeft"]) < 3, geo)
        chk("panel pre-filled", (await pg.inner_text("#pTitle")).strip() == "BURSA", await pg.inner_text("#pTitle"))
        await pg.screenshot(path=f"{OUT}/01_home.png")

        # --- clicking a SMALL bubble slightly off-centre (regression: unclickable bubbles) ---
        await pg.evaluate("window.scrollTo(0,0)")
        target = await pg.evaluate("""() => {
            const m = window.__sehit.map();
            const p = window.__sehit.places().find(x => x.il === 'RİZE');
            const pt = m.latLngToContainerPoint([p.lat, p.lon]);
            return {x: Math.round(pt.x + 5), y: Math.round(pt.y + 5), lat: p.lat, lon: p.lon};
        }""")
        box = await pg.evaluate("() => { const r = document.querySelector('#map').getBoundingClientRect(); return {x:r.left,y:r.top}; }")
        await pg.mouse.click(box["x"] + target["x"], box["y"] + target["y"])
        await pg.wait_for_timeout(1500)
        chk("small bubble click (off-centre)", (await pg.inner_text("#pTitle")).strip() in ("RİZE", "RIZE"), await pg.inner_text("#pTitle"))
        vis = await pg.evaluate("() => { const r=document.querySelector('#panel').getBoundingClientRect(); return {top:Math.round(r.top), vh:window.innerHeight}; }")
        chk("panel scrolls into view after click", vis["top"] >= -2 and vis["top"] < vis["vh"] * 0.4, vis)

        # --- global name search ---
        await pg.fill("#gq", "mehmet")
        await pg.wait_for_selector("#resBody tr", timeout=45000)
        await pg.wait_for_timeout(600)
        n0 = await pg.evaluate("document.querySelectorAll('#resBody tr').length")
        chk("index loads + results", n0 > 10, n0)
        chk("result count label", "sonuç" in (await pg.inner_text("#pBody")).lower())
        await pg.fill("#gq", "mehmet ali")
        await pg.wait_for_function("() => document.querySelector('#pBody') && document.querySelector('#pBody').innerText.includes('SONUÇ')", timeout=45000)
        await pg.wait_for_timeout(400)
        body = await pg.inner_text("#pBody")
        chk("multi-token search", "sonuç" in body.lower(), body[:90])
        # click a result row -> selects that place
        first = await pg.query_selector("#resBody .resrow")
        if first:
            il = await first.get_attribute("data-il")
            await first.click()
            await pg.wait_for_timeout(1500)
            got = (await pg.inner_text("#pTitle")).strip()
            chk("result row selects place", got == il, f"{il} -> {got}")
        else:
            chk("result row selects place", False, "no rows")
        await pg.screenshot(path=f"{OUT}/02_search.png")

        # in-place name search paging
        await pg.fill("#gq", "")
        await pg.wait_for_timeout(1800)
        await pg.evaluate("() => { const p = window.__sehit.places().find(x=>x.il==='BURSA'); }")
        more = await pg.query_selector("#recMore")
        if more:
            before = await pg.evaluate("document.querySelectorAll('#recBody tr').length")
            await more.click()
            await pg.wait_for_timeout(900)
            after = await pg.evaluate("document.querySelectorAll('#recBody tr').length")
            chk("show more grows list", after > before, f"{before} -> {after}")
        else:
            chk("show more grows list", False, "no button")

        # filters still work
        await pg.click("#warSeg button[data-war='KURTULUŞ SAVAŞI (1919-1922)']")
        await pg.wait_for_timeout(1000)
        n2 = await pg.evaluate("window.__sehit.shownMarkers")
        chk("war filter", 30 < n2 < 275, n2)
        await pg.click("#warSeg button[data-war='ALL']")
        await pg.wait_for_timeout(600)

        mob = await b.new_context(viewport={"width":390,"height":844}, locale="tr-TR")
        mp = await mob.new_page()
        await mp.goto(BASE, wait_until="networkidle", timeout=60000)
        await mp.wait_for_timeout(2500)
        ov = await mp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        chk("mobile no overflow", ov <= 1, ov)
        await mp.fill("#gq", "hasan")
        try:
            await mp.wait_for_selector("#resBody tr", timeout=45000)
        except Exception:
            pass
        await mp.wait_for_timeout(600)
        chk("mobile search works", await mp.evaluate("document.querySelectorAll('#resBody tr').length") > 5)
        await mp.screenshot(path=f"{OUT}/03_mobile.png", full_page=False)

        chk("no console errors", not [e for e in errs if "pageerror" in e or e.startswith("error")], errs[:3])
        await b.close()
    fails = [r for r in results if not r[1]]
    print(f"\n{len(results)-len(fails)}/{len(results)} passed")
    sys.exit(1 if fails else 0)

asyncio.run(main())
