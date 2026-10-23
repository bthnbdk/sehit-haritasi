/* Şehit Haritası — interactive map + name search over the MSB martyr registry */
(() => {
'use strict';

const I18N = {
  tr: {
    eyebrow: 'Millî Savunma Bakanlığı · Şehit Bilgi Kapısı',
    title: 'Şehit Haritası', lede: 'MSB Şehit Bilgi Kapısı\'ndaki 108 binden fazla kayıt, memleket bilgisine göre haritaya işlendi. Bir ile tıklayın ya da isim arayarak 108.183 kayıt içinde arayın.',
    allwars: 'Tüm savaşlar', ww1: 'I. Dünya Savaşı', indep: 'Kurtuluş Savaşı', balkan: 'Balkan Savaşları',
    onlytr: 'Sadece Türkiye', allgeo: 'Tüm coğrafya', labels: 'Etiketler',
    searchph: 'Memleket ara: Bursa, Selanik, Kudüs…',
    namesearchph: 'İsim ara — 108.183 kayıt: ad, baba adı, şehadet yeri…',
    mapnote: 'Daire boyutu şehit sayısıyla, renk memleket bölgesiyle orantılıdır. İl koordinatları il merkezini gösterir. Küçük daireler için yakınına tıklamanız yeterli.',
    pick: 'Bir memleket seçin',
    empty: 'Haritadan bir memleket seçin ya da yukarıdaki isim aramasını kullanın; döküm burada görünür.',
    top20: 'En çok şehit veren 20 memleket', top20h: 'Çubuğa tıklayın: harita o memlekete odaklanır ve detay paneli açılır.',
    bywar: 'Savaşa göre dağılım', bycephe: 'Cepheye göre dağılım',
    byregion: 'Bölgeye göre dağılım', birth: 'Doğum yılı dağılımı',
    ranks: 'Rütbe dağılımı', unmapped: 'Konumu belirlenemeyen memleket adları',
    allplaces: 'Tüm memleketler', allh: 'Sütun başlığına tıklayarak sıralayın. Satıra tıklayınca harita o memlekete gider.',
    thplace: 'Memleket', thcount: 'Şehit', thshare: 'Pay', thregion: 'Bölge', thtop: 'En çok kayıp verdiği cephe',
    src: 'Kaynak:', caveat: 'Notlar:', harita: 'Harita:', total: 'Toplam şehit kaydı',
    share: 'Tüm kayıtlar içindeki pay', war: 'Savaş', cephe: 'Cephe', ilce: 'Memleket içi ilçe/kaza',
    birthspan: 'Doğum yılı aralığı', records: 'isim kaydı', searchrec: 'Bu memlekette isim, baba adı, yer ara…',
    namelist: 'İsim dökümü', nodata: 'Kayıt yok.', loading: 'Kayıtlar yükleniyor…',
    more: 'Daha fazla göster', shown: 'gösteriliyor', inplace: 'memleket içinde ara',
    searching: 'Aranıyor…', results: 'sonuç', noresults: 'Eşleşme yok. Yazımı sadeleştirin (ör. "mehmet" yerine "mehmet") ya da sadece soyadı/ad yazın.',
    idxloading: '108.183 kayıtlık arama indeksi yükleniyor (ilk aramada bir kez)…', thname: 'Ad', thfather: 'Baba',
    thborn: 'Doğum', thdeath: 'Şehadet yeri', thwar: 'Savaş',
  },
  en: {
    eyebrow: 'Ministry of National Defence · Martyr Records Portal',
    title: 'Map of the Fallen', lede: 'More than 108,000 records from the Turkish MoD martyr registry, mapped by place of origin. Click a province or search a name across all 108,183 records.',
    allwars: 'All wars', ww1: 'World War I', indep: 'War of Independence', balkan: 'Balkan Wars',
    onlytr: 'Türkiye only', allgeo: 'Whole geography', labels: 'Labels',
    searchph: 'Search a place: Bursa, Salonica, Jerusalem…',
    namesearchph: 'Search a name across 108,183 records: name, father, place of death…',
    mapnote: 'Bubble size is proportional to records; colour shows region of origin. Province coordinates are province centres. Click near a small bubble to open it.',
    pick: 'Select a place',
    empty: 'Pick a place on the map or use the name search above; the breakdown appears here.',
    top20: 'Top 20 places by number of records', top20h: 'Click a bar: the map focuses on that place and opens the detail panel.',
    bywar: 'Distribution by war', bycephe: 'Distribution by front', byregion: 'Distribution by region',
    birth: 'Birth-year distribution', ranks: 'Rank distribution', unmapped: 'Place names without a resolved location',
    allplaces: 'All places', allh: 'Click a column header to sort. Click a row to fly to that place.',
    thplace: 'Place', thcount: 'Records', thshare: 'Share', thregion: 'Region', thtop: 'Deadliest front',
    src: 'Source:', caveat: 'Notes:', harita: 'Map:', total: 'Total records',
    share: 'Share of all records', war: 'War', cephe: 'Front', ilce: 'District within place',
    birthspan: 'Birth years', records: 'name records', searchrec: 'Search name, father, place in this province…',
    namelist: 'Name list', nodata: 'No records.', loading: 'Loading records…',
    more: 'Show more', shown: 'shown', inplace: 'search within this place',
    searching: 'Searching…', results: 'results', noresults: 'No match. Try a shorter term or a single word.',
    idxloading: 'Loading the 108,183-record index (first search only)…', thname: 'Name', thfather: 'Father',
    thborn: 'Born', thdeath: 'Place of death', thwar: 'War',
  }
};
const REGION_COLOR = {TR:'#d9534f', BALKAN:'#e0a13a', ME:'#4fa3d9', NA:'#b06ad9', CAUCASUS:'#3fb27f', OTHER:'#8b98a8', UNKNOWN:'#54606f'};
const REGION_ORDER = ['TR','BALKAN','ME','NA','CAUCASUS','OTHER'];
const TR_BOUNDS = [[35.6,25.4],[42.4,45.0]];

let LANG = (typeof localStorage !== 'undefined' && localStorage.getItem('msb_lang')) || 'tr';
const T = k => (I18N[LANG][k] || k);
let S = null, places = [], map, markerLayer, labelLayer, markers = {};
let IDX = null, idxPromise = null, IDX_BLOB = null;
const state = { war:'ALL', region:null, onlyTR:false, labels:true, q:'', gq:'', sort:{key:'n', dir:-1} };
const recCache = {}, resState = {hits:[], shown:0};
let current = null;

const fmt = n => n.toLocaleString(LANG === 'tr' ? 'tr-TR' : 'en-US');
const pct = (a,b) => (b ? (a*100/b) : 0).toFixed(1).replace('.', LANG==='tr'?',':'.') + '%';
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s||'').toLocaleUpperCase('tr');
const countFor = (p, war) => war === 'ALL' ? p.n : ((p.wars && p.wars[war]) || 0);

function visiblePlaces(){
  return places.filter(p => {
    if (!p.lat) return false;
    if (state.onlyTR && p.region !== 'TR') return false;
    if (state.region && p.region !== state.region) return false;
    if (state.q && !norm(p.il + ' ' + (p.label||'')).includes(norm(state.q))) return false;
    return countFor(p, state.war) > 0;
  });
}
const regionNum = r => (S.regionTotals.find(x => x.region === r) || {n:0}).n;

/* ---------------- boot ---------------- */
async function boot(){
  applyI18n();
  const res = await fetch('data/summary.json');
  S = await res.json();
  places = S.places;
  document.getElementById('pillPlaces').innerHTML = `<b>${places.length}</b> ${LANG==='tr'?'memleket · 81 il':'places'}`;
  document.getElementById('pillSpan').innerHTML = `<b>1853–1928</b> ${LANG==='tr'?'kayıt aralığı':'record span'}`;
  renderStats(); renderLegend(); renderWarSelect(); renderBars(); renderTable(); initMap(); wire();
  if (places.length) select(places[0], false);
}
function applyI18n(){
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (I18N[LANG][k]) el.textContent = I18N[LANG][k]; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { const k = el.dataset.i18nPh; if (I18N[LANG][k]) el.placeholder = I18N[LANG][k]; });
  const lb = document.getElementById('langBtn'); if (lb) lb.textContent = LANG === 'tr' ? 'EN' : 'TR';
}

function renderStats(){
  const wars = S.wars.filter(w => w.name !== '-'), top = wars[0];
  const cephe = S.cephe.filter(c => c.name && c.name !== '-')[0], topPlace = places[0];
  const abroad = S.meta.total - regionNum('TR');
  const cards = [
    {k:T('total'), v:fmt(S.meta.total), s:LANG==='tr'?'303 il sorgusu · tekilleştirilmiş':'303 province queries · deduplicated'},
    {k:LANG==='tr'?'En çok memleket':'Top place', v:topPlace.il, s:`${fmt(topPlace.n)} · ${pct(topPlace.n, S.meta.total)}`},
    {k:LANG==='tr'?'Baskın savaş':'Dominant war', v:pct(top.n, S.meta.total), s:`${top.name.replace(/\s*\(.*\)/,'')} · ${fmt(top.n)}`},
    {k:LANG==='tr'?'En ölümcül cephe':'Deadliest front', v:pct(cephe.n, S.meta.total), s:`${cephe.name} · ${fmt(cephe.n)}`},
    {k:LANG==='tr'?'Yurt dışı memleket':'Born abroad', v:pct(abroad, S.meta.total), s:`${fmt(abroad)} ${LANG==='tr'?'kayıt · Balkanlar, Orta Doğu, Kafkasya':'records · Balkans, Middle East, Caucasus'}`},
    {k:LANG==='tr'?'Kayıt aralığı':'Record span', v:'77', s:LANG==='tr'?'yıl (1853–1928)':'years (1853–1928)'},
  ];
  document.getElementById('stats').innerHTML = cards.map(c => `<div class="card"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s}</div></div>`).join('');
}
function renderLegend(){
  const items = REGION_ORDER.map(r => {
    const lab = S.regionLabels[r] || r, n = regionNum(r);
    return `<button class="chip ${state.region===r?'on':''}" data-region="${r}"><span class="dot" style="background:${REGION_COLOR[r]}"></span>${lab} <span style="color:var(--tx3)">${fmt(n)}</span></button>`;
  }).join('');
  const box = document.getElementById('legend');
  box.innerHTML = `<span style="font-size:11.5px;color:var(--tx3);letter-spacing:.08em;text-transform:uppercase;font-weight:600">${LANG==='tr'?'Bölge':'Region'}</span>` + items;
  box.querySelectorAll('[data-region]').forEach(b => b.onclick = () => {
    const r = b.dataset.region; state.region = state.region === r ? null : r;
    renderLegend(); refreshMap(); renderTable();
  });
}
function renderWarSelect(){
  const sel = document.getElementById('warSel');
  const segWars = [...document.querySelectorAll('#warSeg button')].map(b => b.dataset.war);
  const opts = S.wars.filter(w => w.name && w.name !== '-' && !segWars.includes(w.name));
  sel.innerHTML = `<option value="">${LANG==='tr'?'Diğer savaşlar…':'Other wars…'}</option>` +
    opts.map(w => `<option value="${esc(w.name)}">${esc(w.name)} · ${fmt(w.n)}</option>`).join('');
  sel.onchange = () => setWar(sel.value || 'ALL');
}
function setWar(w){
  state.war = w;
  document.querySelectorAll('#warSeg button').forEach(b => b.classList.toggle('on', b.dataset.war === w));
  const sel = document.getElementById('warSel');
  sel.value = [...sel.options].some(o => o.value === w) ? w : '';
  refreshMap(); renderTable();
}

/* ---------------- map ---------------- */
function initMap(){
  map = L.map('map', {zoomControl:true, minZoom:3, worldCopyJump:true}).fitBounds(TR_BOUNDS, {padding:[10,10]});
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
      radius: 7, color:'#0b0f14', weight:1.2, fillColor: REGION_COLOR[p.region] || '#888', fillOpacity:.85
    });
    m.bindTooltip(`<b>${esc(p.il)}</b> — ${fmt(p.n)}`, {direction:'top', className:'altlabel', opacity:1});
    m.bindPopup(() => popupHTML(p), {maxWidth:280});
    m.on('click', ev => {
      if (ev.originalEvent) L.DomEvent.stopPropagation(ev.originalEvent);
      select(pickBest(p), true);
    });
    m.on('mouseover', () => m.setStyle({weight:2.5, color:'#fff'}));
    m.on('mouseout', () => m.setStyle(select._prev === p.il ? {weight:3, color:'#fff'} : {weight:1.2, color:'#0b0f14'}));
    markers[p.il] = m;
  });
  // safety net: a click anywhere near a bubble selects it (tiny bubbles are hard to hit)
  map.on('click', e => {
    const cands = [];
    visiblePlaces().forEach(p => {
      const pt = map.latLngToContainerPoint([p.lat, p.lon]);
      cands.push({p, d: Math.hypot(pt.x - e.containerPoint.x, pt.y - e.containerPoint.y)});
    });
    cands.sort((a,b) => a.d - b.d || b.p.n - a.p.n);
    const best = cands[0];
    if (best && best.d <= 26) select(best.p, false);
  });
  map.on('zoomend', () => renderLabels());
  refreshMap();
}
function addSizeLegend(){
  const ctl = L.control({position:'bottomleft'});
  ctl.onAdd = () => {
    const d = L.DomUtil.create('div','sizelegend');
    d.innerHTML = `<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9aa7b6;margin-bottom:6px">Kayıt sayısı</div>
      <div class="sl-row"><span class="sl-c" style="width:7px;height:7px"></span><span>1–50</span></div>
      <div class="sl-row"><span class="sl-c" style="width:13px;height:13px"></span><span>500</span></div>
      <div class="sl-row"><span class="sl-c" style="width:21px;height:21px"></span><span>2.000</span></div>
      <div class="sl-row"><span class="sl-c" style="width:30px;height:30px"></span><span>5.000+</span></div>`;
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
    <div style="font-weight:700;font-size:14px">${esc(p.il)}</div>
    <div style="color:var(--tx3);font-size:11.5px;margin-bottom:8px">${esc(p.label && p.label!==p.il ? p.label : (S.regionLabels[p.region]||''))}</div>
    <div style="font-size:22px;font-weight:700;line-height:1">${fmt(n)}</div>
    <div style="color:var(--tx3);font-size:11px;margin-bottom:8px">${state.war==='ALL'?'kayıt':'bu savaşta'}</div>${wars}</div>`;
}
function refreshMap(){
  const vis = visiblePlaces();
  const maxN = Math.max(1, ...vis.map(p => countFor(p, state.war)));
  places.forEach(p => {
    if (!p.lat) return;
    const m = markers[p.il], n = countFor(p, state.war), shown = vis.includes(p);
    if (!shown){ if (markerLayer.hasLayer(m)) markerLayer.removeLayer(m); return; }
    if (!markerLayer.hasLayer(m)) markerLayer.addLayer(m);
    m.setRadius(6 + 30 * Math.sqrt(n / maxN));
    m.setStyle({fillOpacity: .45 + .45 * Math.sqrt(n / maxN)});
  });
  renderLabels();
  renderTopBars();
}
function renderLabels(){
  labelLayer.clearLayers();
  if (!state.labels) return;
  const z = map.getZoom();
  const maxLabels = z <= 3 ? 0 : z <= 4 ? 5 : z <= 5 ? 9 : z <= 6 ? 14 : z <= 7 ? 22 : 30;
  if (!maxLabels) return;
  const vis = visiblePlaces().slice().sort((a,b) => countFor(b,state.war) - countFor(a,state.war));
  const maxN = Math.max(1, ...vis.map(p => countFor(p, state.war)));
  const placed = [];
  vis.slice(0, maxLabels).forEach(p => {
    const n = countFor(p, state.war);
    if (n < Math.max(25, maxN * 0.035)) return;
    const pt = map.latLngToContainerPoint([p.lat, p.lon]);
    if (placed.some(q => Math.abs(q.x - pt.x) < 52 && Math.abs(q.y - pt.y) < 19)) return;
    placed.push(pt);
    L.marker([p.lat, p.lon], {interactive:false, icon:L.divIcon({
      className:'altlabel', html:`${esc(p.il)} <span style="opacity:.65">${fmt(n)}</span>`, iconSize:[0,0]})}).addTo(labelLayer);
  });
}
// several place names can share one coordinate (RİZE/LAZİSTAN, İSTANBUL/ÜMRANİYE,
// HATAY/ANTAKYA…): resolve a click to the biggest of the co-located places
function pickBest(p){
  const pt = map.latLngToContainerPoint([p.lat, p.lon]);
  const cands = visiblePlaces().map(q => {
    const c = map.latLngToContainerPoint([q.lat, q.lon]);
    return {q, d: Math.hypot(c.x - pt.x, c.y - pt.y)};
  }).sort((a,b) => a.d - b.d || b.q.n - a.q.n);
  const best = cands[0];
  if (!best) return p;
  return cands.filter(c => c.d <= best.d + 4).sort((a,b) => b.q.n - a.q.n)[0].q;
}

function flyTo(p){
  if (!p.lat) return;
  const n = countFor(p, state.war);
  map.flyTo([p.lat, p.lon], n > 1500 ? 7 : n > 400 ? 8 : 9, {duration:.7});
  const m = markers[p.il]; if (m) m.openPopup();
}

/* ---------------- detail panel ---------------- */
async function select(p, fly){
  current = p;
  resState.hits = [];
  if (select._prev && markers[select._prev] && select._prev !== p.il) markers[select._prev].setStyle({weight:1.2, color:'#0b0f14'});
  select._prev = p.il;
  if (markers[p.il]) markers[p.il].setStyle({weight:3, color:'#fff'});
  if (fly) flyTo(p);

  document.getElementById('pTitle').textContent = p.il;
  const tag = document.getElementById('pTag');
  tag.classList.remove('hide'); tag.textContent = S.regionLabels[p.region] || p.region; tag.style.borderColor = REGION_COLOR[p.region];

  const n = p.n;
  const warEnt = Object.entries(p.wars), warTop = warEnt.slice(0,5);
  const warRest = warEnt.slice(5).reduce((a,[,c]) => a+c, 0);
  const warRows = warTop.map(([w,c]) => barRow(w.replace(/\s*\(.*\)/,''), c, n)).join('')
    + (warRest ? barRow(`${LANG==='tr'?'Diğer savaşlar':'Other wars'} (${warEnt.length-5})`, warRest, n) : '');
  const cepheEnt = Object.entries(p.cephe), cepheTop = cepheEnt.filter(([k]) => k !== '-').slice(0,6);
  const cepheRest = cepheEnt.filter(([k]) => k !== '-' && !cepheTop.some(([x]) => x === k)).reduce((a,[,c]) => a+c, 0);
  const cepheRows = cepheTop.map(([w,c]) => barRow(w, c, n)).join('')
    + (cepheRest ? barRow(LANG==='tr'?'Diğer cepheler':'Other fronts', cepheRest, n) : '')
    + (p.cephe['-'] ? barRow(LANG==='tr'?'Belirtilmemiş':'Not recorded', p.cephe['-'], n) : '');
  const ilceTags = Object.entries(p.ilce).slice(0,8).map(([k,v]) => `<span class="tag" style="margin:0 4px 4px 0">${esc(k)} · ${fmt(v)}</span>`).join('');
  const bspan = (p.birth_min && p.birth_max) ? `${p.birth_min} – ${p.birth_max}` : '—';

  document.getElementById('pBody').innerHTML = `
    <div class="pgrid">
      <div class="pcol">
        <div class="big">${fmt(n)}</div>
        <div class="sub">${T('share')}: ${pct(n, S.meta.total)}${p.label && p.label!==p.il ? ' · '+esc(p.label) : ''}</div>
        <div class="hr"></div><div class="lbl">${T('war')}</div>${warRows}
        <div class="hr"></div><div class="lbl">${T('cephe')}</div>${cepheRows}
        ${ilceTags ? `<div class="hr"></div><div class="lbl">${T('ilce')}</div><div>${ilceTags}</div>` : ''}
        <div class="hr"></div><div class="lbl">${T('birthspan')}</div>
        <div style="font-size:13px;color:var(--tx2)">${bspan} <span style="color:var(--tx3)">(${fmt(p.birth_known)} ${LANG==='tr'?'kayıtta biliniyor':'known'})</span></div>
      </div>
      <div class="pcol">
        <div class="lbl">${T('namelist')} · ${fmt(n)} ${T('records')} <span style="color:var(--tx3);text-transform:none;letter-spacing:0">— ${T('inplace')}</span></div>
        <input class="recsearch" type="search" id="recQ" placeholder="${T('searchrec')}">
        <div class="rlist"><table class="rtable"><thead><tr>
          <th>${T('thname')}</th><th>${T('thfather')}</th><th>${T('thborn')}</th><th>${T('thwar')}</th><th>${T('thdeath')}</th>
        </tr></thead><tbody id="recBody"><tr><td colspan="5" style="color:var(--tx3)"><span class="spin"></span> ${T('loading')}</td></tr></tbody></table></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px">
          <div style="font-size:11.5px;color:var(--tx3)" id="recFoot"></div>
          <button class="chip" id="recMore" style="display:none">${T('more')}</button>
        </div>
      </div>
    </div>`;

  const recs = await loadRecs(p);
  let list = recs, shown = 0;
  const draw = reset => {
    const tb = document.getElementById('recBody'); if (!tb) return;
    if (reset) shown = 0;
    shown = Math.min(list.length, shown + 120);
    tb.innerHTML = list.slice(0, shown).map(r => `<tr>
        <td>${esc(r[0]||'—')}</td><td>${esc(r[1]||'')}</td><td>${esc(r[2]||'')}</td>
        <td title="${esc(r[3]||'')}">${esc((r[3]||'').replace(/\s*\(.*\)/,''))}</td><td>${esc(r[5]||'—')}</td></tr>`).join('')
      || `<tr><td colspan="5" style="color:var(--tx3)">${T('nodata')}</td></tr>`;
    const foot = document.getElementById('recFoot');
    if (foot) foot.textContent = `${fmt(shown)} / ${fmt(list.length)} ${T('shown')}`;
    const more = document.getElementById('recMore');
    if (more) more.style.display = shown < list.length ? '' : 'none';
  };
  draw(true);
  const more = document.getElementById('recMore'); if (more) more.onclick = () => draw(false);
  const q = document.getElementById('recQ');
  if (q) q.oninput = () => {
    const v = norm(q.value.trim());
    list = v ? recs.filter(r => norm(r.join(' ')).includes(v)) : recs;
    draw(true);
  };
}
function barRow(label, v, total){
  return `<div class="barrow"><div><div class="t">${esc(label)}</div>
    <div class="bar"><i style="width:${Math.max(2,(v/total)*100)}%"></i></div></div><div class="n">${fmt(v)}</div></div>`;
}
async function loadRecs(p){
  if (recCache[p.slug]) return recCache[p.slug];
  const r = await fetch(`data/rec/${p.slug}.json`);
  const j = await r.json();
  recCache[p.slug] = j;
  return j;
}

/* ---------------- global name search ---------------- */
async function loadIndex(){
  if (IDX) return IDX;
  if (!idxPromise) idxPromise = fetch('data/search.json').then(r => r.json()).then(j => { IDX = j; return j; });
  return idxPromise;
}
function buildBlob(){
  if (IDX_BLOB) return IDX_BLOB;
  const {rows, places: P, wars: W} = IDX;
  IDX_BLOB = new Array(rows.length);
  for (let i = 0; i < rows.length; i++){
    const r = rows[i];
    IDX_BLOB[i] = norm(`${r[0]} ${r[1]} ${r[5]} ${r[7]} ${r[8]} ${P[r[3]]} ${W[r[4]]}`);
  }
  return IDX_BLOB;
}
async function globalSearch(raw){
  const q = norm(raw.trim());
  const body = document.getElementById('pBody');
  if (q.length < 2){ return; }
  document.getElementById('pTitle').textContent = LANG==='tr' ? `İsim arama: “${raw.trim()}”` : `Name search: “${raw.trim()}”`;
  document.getElementById('pTag').classList.add('hide');
  if (!IDX){
    body.innerHTML = `<div class="empty"><span class="spin"></span> ${T('idxloading')}</div>`;
  }
  await loadIndex();
  const blob = buildBlob();
  const toks = q.split(/\s+/).filter(t => t.length > 1 || q.length <= 3);
  const hits = [];
  for (let i = 0; i < blob.length && hits.length < 5000; i++){
    let ok = true;
    for (let k = 0; k < toks.length; k++) if (!blob[i].includes(toks[k])) { ok = false; break; }
    if (ok) hits.push(i);
  }
  // relevance: exact "AD BABA" / "AD" matches first, then prefix matches, then the rest
  const qFlat = q.replace(/\s+/g, ' ').trim();
  const score = i => {
    const r = IDX.rows[i];
    const name = norm(r[0]), father = norm(r[1]), both = name + ' ' + father;
    if (both === qFlat) return 5;
    if (name === qFlat) return 4;
    if (name.startsWith(toks[0]) && father && father.startsWith(toks[toks.length-1])) return 3;
    if (name.startsWith(qFlat)) return 2;
    return 1;
  };
  hits.sort((x, y) => score(y) - score(x));
  resState.hits = hits; resState.shown = 0;
  drawResults(raw.trim());
}
function drawResults(term){
  const {rows, places: P, wars: W} = IDX;
  const body = document.getElementById('pBody');
  const total = resState.hits.length;
  const extra = total >= 5000 ? '+' : '';
  body.innerHTML = `
    <div class="lbl">${fmt(total)}${extra} ${T('results')} <span style="color:var(--tx3);text-transform:none;letter-spacing:0">— ${T('thname')}/${T('thfather')}/${T('thdeath')}/${T('thplace')||'memleket'} ${LANG==='tr'?'içinde':'in'}</span></div>
    ${total === 0 ? `<div class="empty">${T('noresults')}</div>` : `
    <div class="rlist" style="max-height:520px"><table class="rtable"><thead><tr>
      <th>${T('thname')}</th><th>${T('thfather')}</th><th>${T('thborn')}</th>
      <th>${T('thplace')}</th><th>${T('thwar')}</th><th>${T('thdeath')}</th></tr></thead>
      <tbody id="resBody"></tbody></table></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px">
      <div style="font-size:11.5px;color:var(--tx3)" id="recFoot"></div>
      <button class="chip" id="recMore">${T('more')}</button>
    </div>`}`;
  if (total === 0) return;
  const more = () => {
    const tb = document.getElementById('resBody');
    const start = resState.shown;
    resState.shown = Math.min(total, start + 80);
    const rowsHtml = resState.hits.slice(start, resState.shown).map(i => {
      const r = rows[i], il = P[r[3]];
      return `<tr class="resrow" data-il="${esc(il)}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td>
        <td style="color:var(--tx)">${esc(il)}</td><td>${esc((W[r[4]]||'').replace(/\s*\(.*\)/,''))}</td><td>${esc(r[5]||'—')}</td></tr>`;
    }).join('');
    tb.insertAdjacentHTML('beforeend', rowsHtml);
    tb.querySelectorAll('.resrow').forEach(tr => tr.onclick = () => {
      const p = places.find(x => x.il === tr.dataset.il);
      if (p) select(p, true);
    });
    document.getElementById('recFoot').textContent = `${fmt(resState.shown)} / ${fmt(total)}${extra} ${T('shown')}`;
    if (resState.shown >= total) document.getElementById('recMore').style.display = 'none';
  };
  more();
  const btn = document.getElementById('recMore');
  if (btn && resState.shown >= total) btn.style.display = 'none';
  if (btn) btn.onclick = more;
}

/* ---------------- charts / table ---------------- */
function renderBars(){
  barList('warBars', S.wars.filter(w => w.name !== '-'), S.meta.total, '#e0764f');
  barList('cepheBars', S.cephe.filter(c => c.name && c.name !== '-').slice(0, 9), S.meta.total, '#4f9be0');
  barList('regionBars', S.regionTotals.map(r => ({name:r.label, n:r.n, region:r.region})), S.meta.total, null);
  barList('rankBars', S.rutbe.filter(r => r.name !== '-').slice(0, 8), S.meta.total, '#b06ad9');
  const bd = S.birthDecades.filter(d => d.decade >= 1820 && d.decade <= 1930);
  const maxb = Math.max(...bd.map(d => d.n));
  const el = document.getElementById('birthBars');
  el.innerHTML = bd.map(d => {
    const h = Math.round((d.n / maxb) * 54);
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px" title="${d.decade}s · ${fmt(d.n)}">
      <div style="font-size:9.5px;color:var(--tx3)">${d.n > maxb*0.35 ? fmt(d.n) : ''}</div>
      <div style="width:100%;height:${h}px;background:linear-gradient(180deg,#e0a13a,#8a5a1c);border-radius:3px 3px 0 0"></div>
      <div style="font-size:9.5px;color:var(--tx3)">${String(d.decade).slice(2)}</div></div>`;
  }).join('');
  Object.assign(el.style, {display:'flex', alignItems:'flex-end', gap:'2px', minHeight:'80px'});
  document.getElementById('unmappedBox').innerHTML = S.unmapped.length
    ? S.unmapped.map(u => `<span class="tag" style="margin:0 4px 4px 0">${esc(u.il)} · ${fmt(u.n)}</span>`).join('') : '—';
  renderTopBars();
}
function barList(id, items, total, color){
  const el = document.getElementById(id), max = Math.max(1, ...items.map(i => i.n));
  el.innerHTML = items.map(i => {
    const c = i.region ? REGION_COLOR[i.region] : (color || '#b8433f');
    return `<div class="row"><div class="t" title="${esc(i.name)}">${esc(i.name)}</div>
      <div class="track"><i style="width:${Math.max(1.5,(i.n/max)*100)}%;background:${c}"></i></div>
      <div class="n">${fmt(i.n)}</div></div>`;
  }).join('');
}
function renderTopBars(){
  const el = document.getElementById('topBars');
  const list = places.filter(p => countFor(p, state.war) > 0).sort((a,b) => countFor(b,state.war) - countFor(a,state.war)).slice(0, 20);
  const max = Math.max(1, ...list.map(p => countFor(p, state.war)));
  el.innerHTML = list.map((p,i) => {
    const n = countFor(p, state.war);
    return `<div class="row" data-il="${esc(p.il)}"><div class="t" title="${esc(p.il)}"><span style="color:var(--tx3)">${i+1}.</span> ${esc(p.il)}</div>
      <div class="track"><i style="width:${Math.max(1.5,(n/max)*100)}%;background:${REGION_COLOR[p.region]||'#b8433f'}"></i></div>
      <div class="n">${fmt(n)}</div></div>`;
  }).join('');
  el.querySelectorAll('.row').forEach(r => r.onclick = () => {
    const p = places.find(x => x.il === r.dataset.il); if (p) select(p, true);
  });
}
function renderTable(){
  const tb = document.querySelector('#allTable tbody');
  const q = norm(state.q);
  let rows = places.filter(p => (!state.region || p.region === state.region) && (!q || norm(p.il + ' ' + (p.label||'')).includes(q)));
  const {key, dir} = state.sort;
  const topCephe = p => (Object.entries(p.cephe).find(([k]) => k !== '-') || ['—'])[0];
  const val = p => key === 'il' ? p.il : key === 'n' ? p.n : key === 'share' ? p.n : key === 'region' ? (S.regionLabels[p.region] || '') : topCephe(p);
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
    const p = places.find(x => x.il === tr.dataset.il); if (p) select(p, true);
  });
}

/* ---------------- wiring ---------------- */
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
  let qt, gt;
  document.getElementById('q').oninput = ev => {
    clearTimeout(qt);
    qt = setTimeout(() => { state.q = ev.target.value.trim(); refreshMap(); renderTable(); }, 160);
  };
  document.getElementById('gq').oninput = ev => {
    clearTimeout(gt);
    const v = ev.target.value;
    gt = setTimeout(() => {
      state.gq = v;
      if (v.trim().length < 2){ if (current) select(current, false); else renderEmpty(); return; }
      globalSearch(v).catch(e => console.error(e));
    }, 320);
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
  window.__sehit = {
    get visible(){ return visiblePlaces().map(p => p.il); },
    get shownMarkers(){ return Object.keys(markers).filter(k => map.hasLayer(markers[k])).length; },
    state, places: () => places, map: () => map,
    search: q => globalSearch(q), idxLoaded: () => !!IDX
  };
}
function renderEmpty(){
  document.getElementById('pTitle').textContent = T('pick');
  document.getElementById('pTag').classList.add('hide');
  document.getElementById('pBody').innerHTML = `<div class="empty">${T('empty')}</div>`;
}

boot().catch(e => {
  document.getElementById('map').innerHTML = `<div style="padding:30px;color:#e6edf3;font-size:13px">Veri yüklenemedi: ${e.message}</div>`;
  console.error(e);
});
})();
