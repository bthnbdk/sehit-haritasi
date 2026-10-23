# Şehit Haritası — interactive map of the Turkish MoD martyr registry

An independent, data-derived visualisation of the records published on the
Turkish Ministry of National Defence *Şehit Bilgi Kapısı* (Martyr Information
Portal). Every record is mapped by **place of origin** (memleket), so you can see
*where* the fallen came from and *how many* — from the 1853 Crimean War to 1928.

**Live:** https://sehit-haritasi.netlify.app

## What it shows

- **108,183 unique records** collected by running the portal's official
  "Excel'e Aktar" (export to Excel) for **each of the 303 place options** in the
  `İl` (province) dropdown — 302 historical/modern provinces and districts plus
  the empty option. Records are de-duplicated on the portal's record ID.
- Bubble map (Leaflet + OpenStreetMap): bubble **size** = number of records,
  **colour** = region of origin (Türkiye, Balkans/Rumelia, Middle East,
  North Africa, Caucasus & Asia, other).
- Filters: war (WWI, War of Independence, Balkan Wars, 1877-78 Ottoman-Russian
  war, …), region, free-text place search, "Türkiye only" / whole-geography view.
- Detail panel per place: war / front / district breakdowns that sum exactly to
  the place total, birth-year range, and a searchable name list (official fields:
  name, father's name, birth year, war, front, place of death, rank, district).
- Global statistics: top 20 places, distribution by war, front, region, rank,
  birth decade; sortable table of all places; list of place names whose location
  could not be resolved.

## Data notes / caveats

1. **Memleket is the recorded place of origin**, not the place of death. The two
   are separate fields in the source data (`İL` vs `ŞEHADET YERİ`).
2. Modern Turkish provinces are plotted at **province-centre coordinates**.
   Historical Ottoman place names (Selanik, Kudüs, Yemen, Trablusgarp, …) are
   plotted at the modern location of the historical settlement, with the modern
   name shown next to the historical one.
3. **20 place names (66 records) could not be located** and are deliberately not
   plotted — they are listed in the UI instead of being guessed.
4. Source records span **1853–1928**; death dates in the source are a mix of
   Hijri/Rumi and Gregorian years, so no time series of deaths is derived.
5. This is **not an official publication**. It is an independent
   visualisation of publicly available data; the Ministry's portal remains the
   authoritative source.

## Pipeline

```
scrape.py      # Playwright: opens the portal, selects each İl option, downloads the
               # official Excel export per place -> raw/*.xlsx  (resumable)
parse.py       # reads the .xlsx files, de-duplicates on ID -> records.json
geo.py         # place name -> (lat, lon, region) table, incl. historical Ottoman names
build_site.py  # aggregates -> site/data/summary.json + site/data/rec/<slug>.json
qa.py          # Playwright QA suite (map, filters, panel, mobile overflow)
```

`raw/` and `records.json` are not committed (the exports belong to the source and
are reproducible with `scrape.py`).

## Local run

```bash
pip install openpyxl playwright && playwright install chromium
python3 scrape.py          # ~6 min, 303 requests, polite 0.35 s delay
python3 parse.py
python3 build_site.py
cd site && python3 -m http.server 8123
```

## Stack

Static site, no build step, no backend: Leaflet 1.9 + OpenStreetMap tiles,
vanilla JS, TR/EN interface toggle.
