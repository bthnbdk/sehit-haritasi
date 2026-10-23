/* Şehit Haritası — interactive map of MSB Şehit Bilgi Kapısı records */
(() => {
'use strict';

const I18N = {
  tr: {
    eyebrow: 'Millî Savunma Bakanlığı · Şehit Bilgi Kapısı',
    title: 'Şehit Haritası',
    lede: 'MSB Şehit Bilgi Kapısı\'ndaki 108 binden fazla kayıt, memleket bilgisine göre haritaya işlendi. Bir ilin üzerine gelin, tıklayın; savaş, cephe ve isim dökümünü görün.',
    allwars: 'Tüm savaşlar', ww1: 'I. Dünya Savaşı', indep: 'Kurtuluş Savaşı', balkan: 'Balkan Savaşları',
    onlytr: 'Sadece Türkiye', allgeo: 'Tüm coğrafya', labels: 'Etiketler',
    searchph: 'Memleket ara: Bursa, Selanik, Kudüs…',
    mapnote: 'Daire boyutu şehit sayısıyla, renk memleket bölgesiyle orantılıdır. İl koordinatları il merkezini gösterir.',
    pick: 'Bir memleket seçin',
    empty: 'Haritadan ya da soldaki listelerden bir memleket seçin; savaş, cephe ve isim dökümü burada görünür.',
    top20: 'En çok şehit veren 20 memleket',
    top20h: 'Çubuğa tıklayın: harita o memlekete odaklanır ve detay paneli açılır.',
    bywar: 'Savaşa göre dağılım', bycephe: 'Cepheye göre dağılım',
    byregion: 'Bölgeye göre dağılım', birth: 'Doğum yılı dağılımı',
    ranks: 'Rütbe dağılımı', unmapped: 'Konumu belirlenemeyen memleket adları',
    allplaces: 'Tüm memleketler',
    allh: 'Sütun başlığına tıklayarak sıralayın. Satıra tıklayınca harita o memlekete gider.',
    thplace: 'Memleket', thcount: 'Şehit', thshare: 'Pay', thregion: 'Bölge', thtop: 'En çok kayıp verdiği cephe',
    src: 'Kaynak:', caveat: 'Notlar:', harita: 'Harita:',
    total: 'Toplam şehit kaydı', places: 'Memleket', span: 'Kayıt aralığı',
    share: 'Tüm kayıtlar içindeki pay', war: 'Savaş', cephe: 'Cephe', ilce: 'Memleket içi ilçe/kaza',
    birthspan: 'Doğum yılı aralığı', records: 'isim kaydı', searchrec: 'İsim, baba adı, yer ara…',
    namelist: 'İsim dökümü', nodata: 'Bu savaşta kayıt yok.', clickrec: 'İsim dökümü yükleniyor…',
    of: 'Toplam', shown: 'gösteriliyor', all: 'tümü',
  },
  en: {
    eyebrow: 'Ministry of National Defence · Martyr Records Portal',
    title: 'Map of the Fallen',
    lede: 'More than 108,000 records from the Turkish MoD martyr registry, mapped by place of origin. Hover and click a province to see war, front and name breakdowns.',
    allwars: 'All wars', ww1: 'World War I', indep: 'War of Independence', balkan: 'Balkan Wars',
    onlytr: 'Türkiye only', allgeo: 'Whole geography', labels: 'Labels',
    searchph: 'Search a place: Bursa, Salonica, Jerusalem…',
    mapnote: 'Bubble size is proportional to the number of records; colour shows region of origin. Province coordinates are province centres.',
    pick: 'Select a place',
    empty: 'Pick a place on the map or from the lists; war, front and name breakdowns appear here.',
    top20: 'Top 20 places by number of records',
    top20h: 'Click a bar: the map focuses on that place and opens the detail panel.',
    bywar: 'Distribution by war', bycephe: 'Distribution by front',
    byregion: 'Distribution by region', birth: 'Birth-year distribution',
    ranks: 'Rank distribution', unmapped: 'Place names without a resolved location',
    allplaces: 'All places',
    allh: 'Click a column header to sort. Click a row to fly to that place.',
    thplace: 'Place', thcount: 'Records', thshare: 'Share', thregion: 'Region', thtop: 'Deadliest front',
    src: 'Source:', caveat: 'Notes:', harita: 'Map:',
    total: 'Total records', places: 'Places', span: 'Record span',
    share: 'Share of all records', war: 'War', cephe: 'Front', ilce: 'District within place',
    birthspan: 'Birth years', records: 'name records', searchrec: 'Search name, father, place…',
    namelist: 'Name list', nodata: 'No records for this war.', clickrec: 'Loading name list…',
    of: 'of', shown: 'shown', all: 'all',
  }
};

const REGION_COLOR = {TR:'#d9534f', BALKAN:'#e0a13a', ME:'#4fa3d9', NA:'#b06ad9', CAUCASUS:'#3fb27f', OTHER:'#8b98a8', UNKNOWN:'#54606f'};
const REGION_ORDER = ['TR','BALKAN','ME','NA','CAUCASUS','OTHER'];
const TR_BOUNDS = [[35.6,25.4],[42.4,45.0]];

let LANG = (typeof localStorage !== 'undefined' && localStorage.getItem('msb_lang')) || 'tr';
const T = k => (I18N[LANG][k] || k);
let S = null;                       // summary.json
let places = [];
let map, markerLayer, labelLayer, markers = {};
const state = { war:'ALL', region:null, onlyTR:false, labels:true, q:'', sort:{key:'n', dir:-1} };
const recCache = {};
let current = null;

const fmt = n => n.toLocaleString(LANG === 'tr' ? 'tr-TR' : 'en-US');
const pct = (a,b) => (b ? (a*100/b) : 0).toFixed(1).replace('.', LANG==='tr'?',':'.') + '%';

/* ---------- data ---------- */
function countFor(p, war){
  if (war === 'ALL') return p.n;
  return (p.wars && p.wars[war]) || 0;
}
function visiblePlaces(){
  return places.filter(p => {
    if (!p.lat) return false;
    if (state.onlyTR && p.region !== 'TR') return false;
    if (state.region && p.region !== state.region) return false;
    if (state.q) {
      const q = state.q.toLocaleUpperCase('tr');
      const hay = (p.il + ' ' + (p.label||'')).toLocaleUpperCase('tr');
      if (!hay.includes(q)) return false;
    }
    if (countFor(p, state.war) <= 0) return false;
    return true;
  });
}

/* ---------- init ---------- */
async function boot(){
  applyI18n();
  const res = await fetch('data/summary.json');
  S = await res.json();
  places = S.places;
  document.getElementById('pillPlaces').innerHTML = `<b>${places.length}</b> ${LANG==='tr'?'memleket · 81 il':'places'}`;
  document.getElementById('pillSpan').innerHTML = `<b>1853–1928</b> ${LANG==='tr'?'kayıt aralığı':'record span'}`;
  renderStats();
  renderLegend();
  renderWarSelect();
  renderBars();
  renderTable();
  initMap();
  wire();
  // prefill the detail panel with the largest place so the page is never half-empty
  if (places.length) select(places[0], false);
}

function applyI18n(){
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (I18N[LANG][k]) el.textContent = I18N[LANG][k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.dataset.i18nPh;
    if (I18N[LANG][k]) el.placeholder = I18N[LANG][k];
  });
  const lb = document.getElementById('langBtn');
  if (lb) lb.textContent = LANG === 'tr' ? 'EN' : 'TR';
}

function renderStats(){
  const wars = S.wars.filter(w => w.name !== '-');
  const top = wars[0];
  const cephe = S.cephe.filter(c => c.name && c.name !== '-')[0];
  const topPlace = places[0];
  const abroad = S.meta.total - regionNum('TR');
  const cards = [
    {k:T('total'), v:fmt(S.meta.total), s:LANG==='tr'?'303 il sorgusu · tekilleştirilmiş':'303 province queries · deduplicated'},
    {k:LANG==='tr'?'En çok memleket':'Top place', v:topPlace.il, s:`${fmt(topPlace.n)} · ${pct(topPlace.n, S.meta.total)}`},
    {k:LANG==='tr'?'Baskın savaş':'Dominant war', v:pct(top.n, S.meta.total), s:`${top.name.replace(/\s*\(.*\)/,'')} · ${fmt(top.n)}`},
    {k:LANG==='tr'?'En ölümcül cephe':'Deadliest front', v:pct(cephe.n, S.meta.total), s:`${cephe.name} · ${fmt(cephe.n)}`},
    {k:LANG==='tr'?'Yurt dışı memleket':'Born abroad', v:pct(abroad, S.meta.total), s:`${fmt(abroad)} ${LANG==='tr'?'kayıt · Balkanlar, Orta Doğu, Kafkasya':'records · Balkans, Middle East, Caucasus'}`},
    {k:LANG==='tr'?'Kayıt aralığı':'Record span', v:'77', s:LANG==='tr'?'yıl (1853–1928)':'years (1853–1928)'},
  ];
  document.getElementById('stats').innerHTML = cards.map(c =>
    `<div class="card"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s}</div></div>`).join('');
}
const regionNum = r => (S.regionTotals.find(x => x.region === r) || {n:0}).n;

function renderLegend(){
  const box = document.getElementById('legend');
  const items = REGION_ORDER.map(r => {
    const lab = S.regionLabels[r] || r;
    const n = regionNum(r);
    return `<button class="chip ${state.region===r?'on':''}" data-region="${r}">
      <span class="dot" style="background:${REGION_COLOR[r]}"></span>${lab} <span style="color:var(--tx3)">${fmt(n)}</span></button>`;
  }).join('');
  box.innerHTML = `<span style="font-size:11.5px;color:var(--tx3);letter-spacing:.08em;text-transform:uppercase;font-weight:600">${LANG==='tr'?'Bölge':'Region'}</span>` + items;
  box.querySelectorAll('[data-region]').forEach(b => b.onclick = () => {
    const r = b.dataset.region;
    state.region = state.region === r ? null : r;
    renderLegend(); refreshMap(); renderTable();
  });
}

function renderWarSelect(){
  const sel = document.getElementById('warSel');
  const segWars = [...document.querySelectorAll('#warSeg button')].map(b => b.dataset.war);
  const opts = S.wars.filter(w => w.name && w.name !== '-' && !segWars.includes(w.name));
  sel.innerHTML = `<option value="">${LANG==='tr'?'Diğer savaşlar…':'Other wars…'}</option>` +
    opts.map(w => `<option value="${esc(w.name)}">${esc(w.name)} · ${fmt(w.n)}</option>`).join('');
  sel.onchange = () => { if (sel.value) setWar(sel.value); else setWar('ALL'); };
}
function setWar(w){
  state.war = w;
  document.querySelectorAll('#warSeg button').forEach(b => b.classList.toggle('on', b.dataset.war === w));
  const sel = document.getElementById('warSel');
  sel.value = [...sel.options].some(o => o.value === w) ? w : '';
  refreshMap(); renderTopBars(); renderTable();
}

/* ---------- map ---------- */
function initMap(){
  map = L.map('map', {zoomControl:true, minZoom:3, worldCopyJump:true, preferCanvas:true})
        .fitBounds(TR_BOUNDS, {padding:[10,10]});
  const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
  const dark = L.tileLayer(OSM_URL, {maxZoom:18, attribution:ATTR, className:'darktiles'});
  const light = L.tileLayer(OSM_URL, {maxZoom:18, attribution:ATTR});
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:17, attribution:'&copy; Esri, Maxar, Earthstar Geographics'});
  dark.addTo(map);
  L.control.layers({'Karanlık (OSM)':dark, 'OpenStreetMap':light, 'Uydu':sat}, null, {position:'bottomright'}).addTo(map);
  L.control.scale({imperial:false, position:'bottomleft'}).addTo(map);
  addSizeLegend();

  markerLayer = L.layerGroup().addTo(map);
  labelLayer = L.layerGroup().addTo(map);
  places.forEach(p => {
    if (!p.lat) return;
    const m = L.circleMarker([p.lat, p.lon], {
      radius: 5, color: '#0b0f14', weight: 1, fillColor: REGION_COLOR[p.region] || '#888',
      fillOpacity: .82, bubblingMouseEvents:false
    });
    m.bindTooltip(`<b>${esc(p.il)}</b> — ${fmt(p.n)}`, {direction:'top', className:'altlabel', opacity:1});
    m.bindPopup(() => popupHTML(p), {maxWidth:280, className:'sehitpop'});
    m.on('click', () => select(p, true));
    m.on('mouseover', () => m.setStyle({weight:2, color:'#fff'}));
    m.on('mouseout', () => m.setStyle(select._prev === p.il ? {weight:3, color:'#ffffff'} : {weight:1, color:'#0b0f14'}));
    markers[p.il] = m;
  });
  map.on('zoomend', () => renderLabels());
  refreshMap();
}

function addSizeLegend(){
  const ctl = L.control({position:'bottomleft'});
  ctl.onAdd = () => {
    const d = L.DomUtil.create('div', 'sizelegend');
    d.innerHTML = `<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9aa7b6;margin-bottom:6px">Kayıt sayısı</div>
      <div class="sl-row"><span class="sl-c" style="width:6px;height:6px"></span><span>1–50</span></div>
      <div class="sl-row"><span class="sl-c" style="width:12px;height:12px"></span><span>500</span></div>
      <div class="sl-row"><span class="sl-c" style="width:20px;height:20px"></span><span>2.000</span></div>
      <div class="sl-row"><span class="sl-c" style="width:28px;height:28px"></span><span>5.000+</span></div>`;
    L.DomEvent.disableClickPropagation(d);
    return d;
  };
  ctl.addTo(map);
}

function popupHTML(p){
  const n = countFor(p, state.war);
  const wars = Object.entries(p.wars).slice(0,3).map(([w,c]) =>
    `<div style="display:flex;justify-content:space-between;gap:10px;color:var(--tx2);font-size:12px">
       <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(w.replace(/\s*\(.*\)/,''))}</span><b style="color:var(--tx)">${fmt(c)}</b></div>`).join('');
  return `<div style="min-width:180px">
    <div style="font-weight:700;font-size:14px;margin-bottom:2px">${esc(p.il)}</div>
    <div style="color:var(--tx3);font-size:11.5px;margin-bottom:8px">${esc(p.label && p.label!==p.il ? p.label : (S.regionLabels[p.region]||''))}</div>
    <div style="font-size:22px;font-weight:700;line-height:1">${fmt(n)}</div>
    <div style="color:var(--tx3);font-size:11px;margin-bottom:8px">${state.war==='ALL'?'kayıt':'bu savaşta'}</div>
    ${wars}</div>`;
}

function refreshMap(){
  const vis = visiblePlaces();
  const maxN = Math.max(1, ...vis.map(p => countFor(p, state.war)));
  Object.entries(markers).forEach(([il, m]) => {
    const p = places.find(x => x.il === il);
    const n = countFor(p, state.war);
    const shown = vis.includes(p);
    if (!shown){ if (map.hasLayer(m)) markerLayer.removeLayer(m); }
    else {
      if (!map.hasLayer(m)) markerLayer.addLayer(m);
      const r = 4 + 30 * Math.sqrt(n / maxN);
      m.setRadius(r);
      m.setStyle({fillOpacity: .45 + .45 * Math.sqrt(n / maxN)});
    }
  });
  // labels for the biggest bubbles of the current filter
  renderLabels();
  renderTopBars();
}

function renderLabels(){
  labelLayer.clearLayers();
  if (!state.labels) return;
  const z = map.getZoom();
  const maxLabels = z <= 4 ? 0 : z <= 5 ? 6 : z <= 6 ? 12 : z <= 7 ? 20 : 30;
  if (!maxLabels) return;
  const vis = visiblePlaces().slice().sort((a,b) => countFor(b,state.war) - countFor(a,state.war));
  const maxN = Math.max(1, ...vis.map(p => countFor(p, state.war)));
  const placed = [];
  vis.slice(0, maxLabels).forEach(p => {
    const n = countFor(p, state.war);
    if (n < Math.max(30, maxN * 0.04)) return;
    const pt = map.latLngToContainerPoint([p.lat, p.lon]);
    if (placed.some(q => Math.abs(q.x - pt.x) < 54 && Math.abs(q.y - pt.y) < 20)) return;
    placed.push(pt);
    L.marker([p.lat, p.lon], {interactive:false, icon:L.divIcon({
      className:'altlabel', html:`${esc(p.il)} <span style="opacity:.65">${fmt(n)}</span>`, iconSize:[0,0]
    })}).addTo(labelLayer);
  });
}

function flyTo(p){
  if (!p.lat) return;
  const n = countFor(p, state.war);
  const z = n > 1500 ? 7 : n > 400 ? 8 : 9;
  map.flyTo([p.lat, p.lon], z, {duration:.7});
  const m = markers[p.il];
  if (m){ m.openPopup(); }
}

/* ---------- detail panel ---------- */
async function select(p, fly){
  current = p;
  // highlight the selected bubble, restore the previous one
  if (select._prev && markers[select._prev] && select._prev !== p.il){
    markers[select._prev].setStyle({weight:1, color:'#0b0f14'});
  }
  select._prev = p.il;
  if (markers[p.il]) markers[p.il].setStyle({weight:3, color:'#ffffff'});
  if (fly) flyTo(p);
  document.getElementById('pTitle').textContent = p.il;
  const tag = document.getElementById('pTag');
  tag.classList.remove('hide');
  tag.textContent = S.regionLabels[p.region] || p.region;
  tag.style.borderColor = REGION_COLOR[p.region];
  const body = document.getElementById('pBody');
  const n = p.n;
  const warEnt = Object.entries(p.wars);
  const warTop = warEnt.slice(0,5);
  const warRest = warEnt.slice(5).reduce((a, [,c]) => a + c, 0);
  const warRows = warTop.map(([w,c]) => barRow(w.replace(/\s*\(.*\)/,''), c, n)).join('')
    + (warRest ? barRow(`${LANG==='tr'?'Diğer savaşlar':'Other wars'} (${warEnt.length-5})`, warRest, n) : '');
  const cepheEnt = Object.entries(p.cephe);
  const cepheTop = cepheEnt.filter(([k]) => k !== '-').slice(0,5);
  const cepheRest = cepheEnt.filter(([k]) => k !== '-' && !cepheTop.some(([x]) => x === k))
                             .reduce((a, [,c]) => a + c, 0);
  const cepheRows = cepheTop.map(([w,c]) => barRow(w, c, n)).join('')
    + (cepheRest ? barRow(LANG==='tr'?'Diğer cepheler':'Other fronts', cepheRest, n) : '')
    + (p.cephe['-'] ? barRow(LANG==='tr'?'Belirtilmemiş':'Not recorded', p.cephe['-'], n) : '');
  const ilceTags = Object.entries(p.ilce).slice(0,8).map(([k,v]) => `<span class="tag" style="margin:0 4px 4px 0">${esc(k)} · ${fmt(v)}</span>`).join('');
  const bspan = (p.birth_min && p.birth_max) ? `${p.birth_min} – ${p.birth_max}` : '—';
  body.innerHTML = `
    <div class="big">${fmt(n)}</div>
    <div class="sub">${T('share')}: ${pct(n, S.meta.total)}${p.label && p.label!==p.il ? ' · '+esc(p.label) : ''}</div>
    <div class="hr"></div>
    <div class="lbl">${T('war')}</div>${warRows}
    <div class="hr"></div>
    <div class="lbl">${T('cephe')}</div>${cepheRows}
    ${ilceTags ? `<div class="hr"></div><div class="lbl">${T('ilce')}</div><div>${ilceTags}</div>` : ''}
    <div class="hr"></div>
    <div class="lbl">${T('birthspan')}</div><div style="font-size:13px;color:var(--tx2)">${bspan} <span style="color:var(--tx3)">(${fmt(p.birth_known)} ${LANG==='tr'?'kayıtta biliniyor':'known'})</span></div>
    <div class="hr"></div>
    <div class="lbl">${T('namelist')} · <span id="recCount">${fmt(n)}</span> ${T('records')}</div>
    <input class="recsearch" type="search" id="recQ" placeholder="${T('searchrec')}">
    <div class="rlist"><table class="rtable"><thead><tr>
      <th>Ad</th><th>${LANG==='tr'?'Baba':'Father'}</th><th>${LANG==='tr'?'Doğum':'Born'}</th>
      <th>${T('war')}</th><th>${LANG==='tr'?'Şehadet yeri':'Place of death'}</th></tr></thead>
      <tbody id="recBody"><tr><td colspan="5" style="color:var(--tx3)"><span class="spin"></span> ${T('clickrec')}</td></tr></tbody></table></div>
    <div style="font-size:11.5px;color:var(--tx3);margin-top:7px" id="recFoot"></div>`;

  const recs = await loadRecs(p);
  let shown = 0;
  const draw = (list, q) => {
    const ub = document.getElementById('recBody'); if (!ub) return;
    shown = Math.min(list.length, 200);
    ub.innerHTML = list.slice(0, shown).map(r => `<tr>
      <td>${esc(r[0]||'—')}</td><td>${esc(r[1]||'')}</td><td>${esc(r[2]||'')}</td>
      <td title="${esc(r[3]||'')}">${esc((r[3]||'').replace(/\s*\(.*\)/,''))}</td><td>${esc(r[5]||'—')}</td></tr>`).join('')
      || `<tr><td colspan="5" style="color:var(--tx3)">${T('nodata')}</td></tr>`;
    const foot = document.getElementById('recFoot');
    if (foot) foot.textContent = q ? `${fmt(list.length)} ${LANG==='tr'?'eşleşme':'matches'}` :
      `${fmt(shown)} / ${fmt(list.length)} ${LANG==='tr'?'kayıt gösteriliyor (ilk 200)':'records shown (first 200)'}`;
  };
  draw(recs, '');
  const q = document.getElementById('recQ');
  if (q) q.oninput = () => {
    const v = q.value.toLocaleUpperCase('tr').trim();
    draw(v ? recs.filter(r => (r.join(' ') || '').toLocaleUpperCase('tr').includes(v)) : recs, v);
  };
}
function barRow(label, v, total){
  return `<div class="barrow"><div><div class="t">${esc(label)}</div>
    <div class="bar"><i style="width:${Math.max(2,(v/total)*100)}%"></i></div></div>
    <div class="n">${fmt(v)}</div></div>`;
}
async function loadRecs(p){
  if (recCache[p.slug]) return recCache[p.slug];
  const r = await fetch(`data/rec/${p.slug}.json`);
  const j = await r.json();
  recCache[p.slug] = j;
  return j;
}

/* ---------- charts ---------- */
function renderBars(){
  barList('warBars', S.wars.filter(w => w.name !== '-'), S.meta.total, '#e0764f');
  barList('cepheBars', S.cephe.filter(c => c.name && c.name !== '-').slice(0, 9), S.meta.total, '#4f9be0');
  barList('regionBars', S.regionTotals.map(r => ({name:r.label, n:r.n, region:r.region})), S.meta.total, null);
  barList('rankBars', S.rutbe.filter(r => r.name !== '-').slice(0, 8), S.meta.total, '#b06ad9');
  const bd = S.birthDecades.filter(d => d.decade >= 1820 && d.decade <= 1930);
  const maxb = Math.max(...bd.map(d => d.n));
  document.getElementById('birthBars').innerHTML = bd.map(d => {
    const h = Math.round((d.n / maxb) * 54);
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px" title="${d.decade}s · ${fmt(d.n)}">
      <div style="font-size:9.5px;color:var(--tx3)">${d.n > maxb*0.35 ? fmt(d.n) : ''}</div>
      <div style="width:100%;height:${h}px;background:linear-gradient(180deg,#e0a13a,#8a5a1c);border-radius:3px 3px 0 0"></div>
      <div style="font-size:9.5px;color:var(--tx3)">${String(d.decade).slice(2)}</div></div>`;
  }).join('');
  document.getElementById('birthBars').style.display = 'flex';
  document.getElementById('birthBars').style.alignItems = 'flex-end';
  document.getElementById('birthBars').style.gap = '2px';
  document.getElementById('birthBars').style.minHeight = '80px';
  const un = S.unmapped;
  document.getElementById('unmappedBox').innerHTML = un.length
    ? un.map(u => `<span class="tag" style="margin:0 4px 4px 0">${esc(u.il)} · ${fmt(u.n)}</span>`).join('')
    : '—';
  renderTopBars();
}
function barList(id, items, total, color){
  const el = document.getElementById(id);
  const max = Math.max(1, ...items.map(i => i.n));
  el.innerHTML = items.map(i => {
    const c = i.region ? REGION_COLOR[i.region] : (color || '#b8433f');
    return `<div class="row"><div class="t" title="${esc(i.name)}">${esc(i.name)}</div>
      <div class="track"><i style="width:${Math.max(1.5,(i.n/max)*100)}%;background:${c}"></i></div>
      <div class="n">${fmt(i.n)}</div></div>`;
  }).join('');
}
function renderTopBars(){
  const el = document.getElementById('topBars');
  const list = places.filter(p => countFor(p, state.war) > 0)
    .sort((a,b) => countFor(b,state.war) - countFor(a,state.war)).slice(0, 20);
  const max = Math.max(1, ...list.map(p => countFor(p, state.war)));
  const warN = state.war === 'ALL' ? S.meta.total : ((S.wars.find(w => w.name === state.war) || {n:1}).n);
  el.innerHTML = list.map((p,i) => {
    const n = countFor(p, state.war);
    return `<div class="row" data-il="${esc(p.il)}">
      <div class="t" title="${esc(p.il)}"><span style="color:var(--tx3)">${i+1}.</span> ${esc(p.il)}</div>
      <div class="track"><i style="width:${Math.max(1.5,(n/max)*100)}%;background:${REGION_COLOR[p.region]||'#b8433f'}"></i></div>
      <div class="n">${fmt(n)}</div></div>`;
  }).join('');
  el.querySelectorAll('.row').forEach(r => r.onclick = () => {
    const p = places.find(x => x.il === r.dataset.il);
    if (p) select(p, true);
  });
}

/* ---------- table ---------- */
function renderTable(){
  const tb = document.querySelector('#allTable tbody');
  const q = state.q.toLocaleUpperCase('tr');
  let rows = places.filter(p => (!state.region || p.region === state.region) &&
    (!q || (p.il + ' ' + (p.label||'')).toLocaleUpperCase('tr').includes(q)));
  const {key, dir} = state.sort;
  const topCephe = p => (Object.entries(p.cephe).find(([k]) => k !== '-') || ['—'])[0];
  const val = p => key === 'il' ? p.il : key === 'n' ? p.n : key === 'share' ? p.n :
    key === 'region' ? (S.regionLabels[p.region] || '') : topCephe(p);
  rows.sort((a,b) => {
    const x = val(a), y = val(b);
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'tr')) * dir;
  });
  tb.innerHTML = rows.map(p => `<tr data-il="${esc(p.il)}">
    <td>${esc(p.il)}${p.label && p.label !== p.il ? ` <span style="color:var(--tx3);font-size:11.5px">· ${esc(p.label)}</span>` : ''}</td>
    <td style="text-align:right;font-variant-numeric:tabular-nums;color:var(--tx)">${fmt(p.n)}</td>
    <td style="text-align:right;color:var(--tx3)">${pct(p.n, S.meta.total)}</td>
    <td><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${REGION_COLOR[p.region]};margin-right:6px"></span>${esc(S.regionLabels[p.region]||'—')}</td>
    <td style="color:var(--tx2)">${esc(topCephe(p).replace(/\s*\(.*\)/,''))}</td></tr>`).join('');
  tb.querySelectorAll('tr').forEach(tr => tr.onclick = () => {
    const p = places.find(x => x.il === tr.dataset.il);
    if (p) select(p, true);
  });
}

/* ---------- wiring ---------- */
function wire(){
  document.querySelectorAll('#warSeg button').forEach(b => b.onclick = () => setWar(b.dataset.war));
  document.getElementById('btnTR').onclick = ev => {
    state.onlyTR = !state.onlyTR;
    ev.currentTarget.classList.toggle('on', state.onlyTR);
    refreshMap(); renderTable();
    if (state.onlyTR) map.flyToBounds(TR_BOUNDS, {duration:.6});
  };
  document.getElementById('btnAll').onclick = () => {
    state.onlyTR = false; state.region = null;
    document.getElementById('btnTR').classList.remove('on');
    renderLegend(); refreshMap(); renderTable();
    const pts = places.filter(p => p.lat).map(p => [p.lat, p.lon]);
    if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.08), {duration:.8});
  };
  let qt;
  document.getElementById('q').oninput = ev => {
    clearTimeout(qt);
    qt = setTimeout(() => { state.q = ev.target.value.trim(); refreshMap(); renderTable(); }, 160);
  };
  document.getElementById('btnLabels').onclick = ev => {
    state.labels = !state.labels;
    ev.currentTarget.classList.toggle('on', state.labels);
    refreshMap();
  };
  document.querySelectorAll('#allTable th').forEach(th => th.onclick = () => {
    const k = th.dataset.sort;
    state.sort = {key:k, dir: state.sort.key === k ? -state.sort.dir : (k === 'il' || k === 'region' || k === 'top' ? 1 : -1)};
    renderTable();
  });
  document.getElementById('langBtn').onclick = () => {
    LANG = LANG === 'tr' ? 'en' : 'tr';
    try { localStorage.setItem('msb_lang', LANG); } catch(e){}
    location.reload();
  };
  window.addEventListener('resize', () => map && map.invalidateSize());
  // exposed for automated QA / debugging
  window.__sehit = {
    get visible(){ return visiblePlaces().map(p => p.il); },
    get shownMarkers(){ return Object.keys(markers).filter(k => map.hasLayer(markers[k])).length; },
    state, places: () => places, map: () => map
  };
}

boot().catch(e => {
  document.getElementById('map').innerHTML = `<div style="padding:30px;color:#e6edf3;font-size:13px">Veri yüklenemedi: ${e.message}</div>`;
  console.error(e);
});
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
