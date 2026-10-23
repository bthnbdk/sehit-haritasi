import asyncio, os
from playwright.async_api import async_playwright
OUT = "/home/batu/msb-sehit/shots"
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":1440,"height":900}, locale="tr-TR", device_scale_factor=2)
        pg = await ctx.new_page()
        await pg.goto("http://127.0.0.1:8123", wait_until="networkidle", timeout=60000)
        await pg.wait_for_timeout(3000)
        # click Bursa on the map via app state to avoid scroll jump
        await pg.evaluate("() => { const m = window.__sehit && window.__sehit.map(); if (m) m.flyTo([40.19,29.06],6,{duration:0}); }")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f"{OUT}/desktop_top.png")
        await pg.evaluate("document.querySelector('#map').scrollIntoView({block:'center'})")
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=f"{OUT}/desktop_map.png")
        await pg.screenshot(path=f"{OUT}/desktop_full.png", full_page=True)
        mob = await b.new_context(viewport={"width":390,"height":844}, locale="tr-TR", device_scale_factor=2)
        mp = await mob.new_page()
        await mp.goto("http://127.0.0.1:8123", wait_until="networkidle", timeout=60000)
        await mp.wait_for_timeout(3000)
        await mp.screenshot(path=f"{OUT}/mobile_top.png")
        await mp.evaluate("document.querySelector('#pTitle').scrollIntoView({block:'start'})")
        await mp.wait_for_timeout(600)
        await mp.screenshot(path=f"{OUT}/mobile_panel.png")
        await b.close()
asyncio.run(main())
