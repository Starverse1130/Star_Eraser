/* ═══════════════════════════════════════════════════════
   Star Eraser — Enhanced Application Logic v2.0
   License: MIT  |  github.com/ayush/star-eraser
═══════════════════════════════════════════════════════ */

// ── CONFIG ──
const DEFAULT_API_KEY = 'Nxz6vxWrvqq4cK8uZa4rAPh8'; // Built-in key for free uses
const API_URL  = 'https://api.remove.bg/v1.0/removebg';
const MAX_SIZE = 12 * 1024 * 1024;
const FREE_LIMIT = 5; // Free uses before user needs own key

// ── PHOTO SIZE PRESETS ──
const PHOTO_SIZES = [
  { id:'passport', name:'Passport',      w:35,  h:45,  desc:'Passport, Aadhaar, DL' },
  { id:'stamp',    name:'Stamp',          w:20,  h:25,  desc:'Application Forms' },
  { id:'visa-us',  name:'US/Canada Visa', w:51,  h:51,  desc:'2×2 inch' },
  { id:'pan',      name:'PAN Card',       w:25,  h:35,  desc:'PAN Card' },
  { id:'sslc',     name:'SSLC/Exam',      w:30,  h:35,  desc:'Board Exam Forms' },
  { id:'uk-visa',  name:'UK/Schengen',    w:35,  h:45,  desc:'UK/Europe Visa' },
  { id:'japan',    name:'Japan Visa',     w:45,  h:45,  desc:'Japan Visa' },
  { id:'china',    name:'China Visa',     w:33,  h:48,  desc:'China Visa' },
  { id:'postcard', name:'Postcard',       w:102, h:152, desc:'4×6 inch Print' },
  { id:'square',   name:'Square DP',      w:40,  h:40,  desc:'Social Media' },
];

// ── CROP RATIO PRESETS ──
const CROP_PRESETS = [
  { name:'Free',           ratio:NaN },
  { name:'Original',       ratio:0 },
  { name:'Passport 35×45', ratio:35/45 },
  { name:'Stamp 20×25',    ratio:20/25 },
  { name:'Visa US 2×2',    ratio:1 },
  { name:'PAN 25×35',      ratio:25/35 },
  { name:'SSLC 30×35',     ratio:30/35 },
  { name:'Japan 45×45',    ratio:1 },
  { name:'China 33×48',    ratio:33/48 },
  { name:'1:1',            ratio:1 },
  { name:'4:3',            ratio:4/3 },
  { name:'3:4',            ratio:3/4 },
  { name:'16:9',           ratio:16/9 },
];

const BG_COLORS = [
  'transparent','#ffffff','#000000','#ef4444','#f97316','#eab308',
  '#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6b7280',
  '#1e293b','#fef3c7','#dbeafe','#fce7f3',
];

const BG_GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
];

const TIPS = [
  'High-res images give the best results',
  'Works best with clear subject edges',
  'Portrait photos are processed faster',
  'You can replace background after removal',
  'Export in WebP for smaller file sizes',
  'Print sheets are generated at 300 DPI',
  'Use Ctrl+Z to undo, Ctrl+S to download',
];

const PROC_STEPS = [
  { id:'upload',  label:'Uploading', icon:'fa-cloud-arrow-up' },
  { id:'analyse', label:'Analysing', icon:'fa-magnifying-glass' },
  { id:'remove',  label:'Removing',  icon:'fa-wand-magic-sparkles' },
  { id:'finish',  label:'Finishing', icon:'fa-circle-check' },
];

const DPI   = 300;
const MM2PX = DPI / 25.4;
const A4    = { w:Math.round(210*MM2PX), h:Math.round(297*MM2PX) };
const SHEET_MARGIN = Math.round(5*MM2PX);
const SHEET_GAP    = Math.round(3*MM2PX);

// ── STATE ──
const S = {
  originalImage:null, croppedImage:null,
  processedImage:null, compositeImage:null,
  currentFile:null, cropper:null,
  currentBg:'transparent',
  exportFmt:'png', exportQual:.92,
  printSize:'passport', printCount:8,
  isFav:false, histId:null,
};

const $ = id => document.getElementById(id);

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════
function init() {
  loadTheme();
  loadStats();
  renderCropPresets();
  renderBgOptions();
  renderSizeGrid();
  bindEvents();
  bindRipple();
  bindKeyboard();
  bindNavbarScroll();
  updateHistBadge();
  updatePreview();
  animateCounters();
  initApiKeyModal();
}

// ═══════════════════════════════════════
//  RIPPLE EFFECT
// ═══════════════════════════════════════
function bindRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tb-btn, .crop-btn, .dl-btn, .gen-btn, .new-btn, .nav-btn, .count-btn, .clear-btn');
    if (!btn) return;
    btn.classList.add('ripple-host');
    const r    = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const rip  = document.createElement('span');
    rip.className = 'ripple';
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
    btn.appendChild(rip);
    rip.addEventListener('animationend', () => rip.remove());
  });
}

// ═══════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (S.processedImage) quickDownload();
    }
    if (e.key === 'Escape') {
      if ($('histPanel').classList.contains('open')) toggleHist();
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
      closeApiKeyModal();
    }
    if (e.key === 't' && !e.ctrlKey) toggleTheme();
    if (e.key === 'h' && !e.ctrlKey) toggleHist();
    if (e.key === 'k' && !e.ctrlKey) openApiKeyModal();
  });
}

// ═══════════════════════════════════════
//  NAVBAR SCROLL SHADOW
// ═══════════════════════════════════════
function bindNavbarScroll() {
  window.addEventListener('scroll', () => {
    document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 10);
  }, { passive:true });
}

// ═══════════════════════════════════════
//  COUNTER ANIMATION (stats bar)
// ═══════════════════════════════════════
function animateCounters() {
  const s   = getStats();
  const fav = getHist().filter(x => x.fav).length;
  animateNum($('sProcessed'), 0, s.processed, 800);
  animateNum($('sFavs'),      0, fav,         900);
  animateNum($('sDownloads'), 0, s.downloads, 700);
}

function animateNum(el, from, to, dur) {
  if (!el || from === to) return;
  const start = performance.now();
  const tick  = now => {
    const progress = Math.min((now - start) / dur, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  };
  requestAnimationFrame(tick);
}

// ═══════════════════════════════════════
//  EVENT BINDING
// ═══════════════════════════════════════
function bindEvents() {
  const dz = $('dropZone'), fi = $('fileInput');
  dz.addEventListener('click',     () => fi.click());
  dz.addEventListener('dragover',  e  => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', e  => { e.preventDefault(); dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  });

  $('skipCropBtn').addEventListener('click', skipCrop);
  $('confirmCropBtn').addEventListener('click', confirmCrop);

  $('bgPanelBtn').addEventListener('click',     () => togglePanel('bgPanel'));
  $('printPanelBtn').addEventListener('click',  () => togglePanel('printPanel'));
  $('exportPanelBtn').addEventListener('click', () => togglePanel('exportPanel'));
  $('quickDlBtn').addEventListener('click',     quickDownload);
  $('exportDlBtn').addEventListener('click',    exportDownload);
  $('newBtn').addEventListener('click',         resetApp);
  $('favBtn').addEventListener('click',         toggleFav);
  $('copyBtn').addEventListener('click',        copyToClipboard);
  $('shareBtn').addEventListener('click',       shareImage);
  $('customBgBtn').addEventListener('click',    () => $('bgFileInput').click());
  $('bgFileInput').addEventListener('change',   handleCustomBg);

  document.querySelectorAll('.fmt-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.fmt-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    S.exportFmt = b.dataset.fmt;
    $('qualGroup').style.display = S.exportFmt === 'png' ? 'none' : 'block';
  }));
  $('qualSlider').addEventListener('input', e => {
    S.exportQual = e.target.value / 100;
    $('qualVal').textContent = e.target.value + '%';
  });

  $('countMinus').addEventListener('click', () => {
    if (S.printCount > 1) { S.printCount--; bumpCount(); updateCountUI(); }
  });
  $('countPlus').addEventListener('click',  () => { S.printCount++; bumpCount(); updateCountUI(); });
  $('genSheetBtn').addEventListener('click',  generateSheet);

  $('histBtn').addEventListener('click',         toggleHist);
  $('closeHistBtn').addEventListener('click',    toggleHist);
  $('histOverlay').addEventListener('click',     toggleHist);
  $('clearHistBtn').addEventListener('click',    clearHist);
  $('histSearchInput').addEventListener('input', renderHist);

  $('apiKeyBtn').addEventListener('click', openApiKeyModal);

  $('themeBtn').addEventListener('click', toggleTheme);

  initSlider();
}

function bumpCount() {
  const el = $('countVal');
  el.classList.remove('bump');
  requestAnimationFrame(() => el.classList.add('bump'));
}

// ═══════════════════════════════════════
//  FILE HANDLING
// ═══════════════════════════════════════
function handleFile(file) {
  if (!file.type.startsWith('image/')) { toast('Please select a valid image', 'error'); return; }
  if (file.size > MAX_SIZE)            { toast('File too large. Max 12MB', 'error'); return; }
  S.currentFile = file;
  const r = new FileReader();
  r.onload = e => { S.originalImage = e.target.result; openCropper(e.target.result); };
  r.readAsDataURL(file);
}

// ═══════════════════════════════════════
//  CROP TOOL
// ═══════════════════════════════════════
function renderCropPresets() {
  $('cropPresets').innerHTML = CROP_PRESETS.map((p, i) =>
    `<button class="crop-pill${i===0?' active':''}" data-idx="${i}">${p.name}</button>`
  ).join('');
  $('cropPresets').addEventListener('click', e => {
    const btn = e.target.closest('.crop-pill');
    if (!btn) return;
    document.querySelectorAll('.crop-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = CROP_PRESETS[btn.dataset.idx];
    if (!S.cropper) return;
    if (p.ratio === 0) {
      const d = S.cropper.getImageData();
      S.cropper.setAspectRatio(d.naturalWidth / d.naturalHeight);
    } else {
      S.cropper.setAspectRatio(p.ratio);
    }
  });
}

function openCropper(src) {
  $('cropImg').src = src;
  switchView('cropView');
  setTimeout(() => {
    if (S.cropper) S.cropper.destroy();
    S.cropper = new Cropper($('cropImg'), {
      viewMode:1, dragMode:'move', aspectRatio:NaN,
      autoCropArea:.88, responsive:true, guides:true,
      center:true, background:true, movable:true,
      rotatable:false, scalable:false, zoomable:true,
      zoomOnTouch:true, zoomOnWheel:true,
      ready() {
        document.querySelectorAll('.crop-pill').forEach((b,i) => b.classList.toggle('active', i===0));
      },
    });
  }, 100);
}

function confirmCrop() {
  if (!S.cropper) return;
  const canvas = S.cropper.getCroppedCanvas({
    maxWidth:4096, maxHeight:4096,
    imageSmoothingEnabled:true, imageSmoothingQuality:'high',
  });
  S.croppedImage = canvas.toDataURL('image/png');
  canvas.toBlob(blob => {
    removeBg(new File([blob], S.currentFile?.name || 'cropped.png', { type:'image/png' }));
  }, 'image/png');
}

function skipCrop() {
  S.croppedImage = S.originalImage;
  if (S.currentFile) removeBg(S.currentFile);
  else fetch(S.originalImage).then(r=>r.blob()).then(blob=>removeBg(new File([blob],'image.png',{type:'image/png'})));
}

// ═══════════════════════════════════════
//  API CALL
// ═══════════════════════════════════════
async function removeBg(file) {
  // ── Check API key / free limit ──
  const userKey  = getUserApiKey();
  const freeUsed = getFreeCount();

  if (!userKey && freeUsed >= FREE_LIMIT) {
    // Switch back to upload view and show modal
    if (S.cropper) { S.cropper.destroy(); S.cropper = null; }
    switchView('uploadView');
    openApiKeyModal(true); // true = show exhausted state
    return;
  }

  const activeKey = userKey || DEFAULT_API_KEY;

  if (S.cropper) { S.cropper.destroy(); S.cropper = null; }
  switchView('procView');
  $('tipText').textContent = TIPS[Math.random() * TIPS.length | 0];

  // Animate processing steps
  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    if (stepIdx < PROC_STEPS.length - 1) {
      updateProcStep(stepIdx++);
    }
  }, 1500);

  // Animate progress bar
  let prog = 0;
  const progBar = $('progBar');
  const progTimer = setInterval(() => {
    prog = Math.min(prog + Math.random() * 8, 88);
    if (progBar) progBar.style.width = prog + '%';
  }, 300);

  const fd = new FormData();
  fd.append('image_file', file);
  fd.append('size', 'auto');

  try {
    const res = await fetch(API_URL, {
      method:'POST', headers:{'X-Api-Key': activeKey}, body:fd,
    });
    clearInterval(stepTimer); clearInterval(progTimer);
    if (progBar) progBar.style.width = '100%';
    updateProcStep(PROC_STEPS.length - 1);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.errors?.[0]?.title || 'API Error ' + res.status);
    }
    const blob = await res.blob();
    const url  = await new Promise((ok, no) => {
      const r = new FileReader();
      r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob);
    });
    S.processedImage = url; S.compositeImage = url;
    S.currentBg = 'transparent'; S.isFav = false;
    S.histId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    // Increment free counter only when using the built-in key
    if (!userKey) { incFreeCount(); }

    await new Promise(r => setTimeout(r, 400));
    showResult(); saveToHist(); incStat('processed');
    updateApiKeyBtn();
    toast('Background removed! ✨', 'success');
  } catch (err) {
    clearInterval(stepTimer); clearInterval(progTimer);
    console.error(err);
    toast(err.message || 'Failed to remove background', 'error');
    switchView('uploadView');
  }
}

function updateProcStep(idx) {
  document.querySelectorAll('.proc-step').forEach((el, i) => {
    el.classList.toggle('done',   i < idx);
    el.classList.toggle('active', i === idx);
  });
}

// ═══════════════════════════════════════
//  RESULT DISPLAY
// ═══════════════════════════════════════
function showResult() {
  $('imgOrig').src = S.croppedImage || S.originalImage;
  $('imgProc').src = S.compositeImage || S.processedImage;
  setSlider(50);

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('active'));

  $('favBtn').innerHTML = '<i class="fa-regular fa-heart"></i>';
  $('favBtn').classList.remove('fav-on');

  const img = new Image();
  img.onload = () => {
    const kb = (S.currentFile?.size / 1024).toFixed(1) || '?';
    $('imgInfo').innerHTML = `
      <span><i class="fa-solid fa-ruler-combined"></i>${img.width}×${img.height}px</span>
      <span><i class="fa-solid fa-file"></i>${kb} KB</span>
      <span><i class="fa-solid fa-image"></i>${S.currentFile?.name || 'image'}</span>
      <span><i class="fa-solid fa-check-circle"></i><span class="success-badge"><i class="fa-solid fa-sparkles"></i>BG Removed</span></span>`;
    const aspect = img.width / img.height;
    const cw     = $('compareBox').offsetWidth;
    $('compareBox').style.height = Math.min(cw / aspect, 560) + 'px';
  };
  img.src = S.croppedImage || S.originalImage;

  S.printSize = 'passport'; S.printCount = 8;
  document.querySelectorAll('.size-card').forEach(c =>
    c.classList.toggle('active', c.dataset.id === 'passport')
  );
  updateCountUI();
  switchView('resultView');
}

// ═══════════════════════════════════════
//  COMPARISON SLIDER
// ═══════════════════════════════════════
function initSlider() {
  let drag = false;
  const box = $('compareBox');
  const handle = $('sHandle');
  const start = e => { drag = true; handle.classList.add('dragging'); moveSlider(e); };
  const move  = e => { if (!drag) return; e.preventDefault(); moveSlider(e); };
  const end   = () => { drag = false; handle.classList.remove('dragging'); };
  box.addEventListener('mousedown', start);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);
  box.addEventListener('touchstart', start, { passive:true });
  document.addEventListener('touchmove', move, { passive:false });
  document.addEventListener('touchend', end);
  // Keyboard control when slider focused
  box.setAttribute('tabindex', '0');
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { /* get current pct */ const pct = parseFloat($('sLine').style.left); setSlider(Math.max(0, pct - 3)); }
    if (e.key === 'ArrowRight') { const pct = parseFloat($('sLine').style.left); setSlider(Math.min(100, pct + 3)); }
  });
}

function moveSlider(e) {
  const r = $('compareBox').getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  setSlider(Math.max(0, Math.min(100, (x / r.width) * 100)));
}

function setSlider(pct) {
  $('imgOrig').style.clipPath = `inset(0 ${100-pct}% 0 0)`;
  $('sLine').style.left   = pct + '%';
  $('sHandle').style.left = pct + '%';
}

// ═══════════════════════════════════════
//  BACKGROUND REPLACEMENT
// ═══════════════════════════════════════
function renderBgOptions() {
  $('bgColorsBox').innerHTML = BG_COLORS.map(c => {
    const cls = c === 'transparent' ? 'bg-c tp' : 'bg-c';
    const st  = c === 'transparent' ? '' : `background:${c}`;
    return `<button class="${cls}${c==='transparent'?' active':''}" style="${st}" data-bg="${c}" onclick="applyBgColor('${c}',this)" title="${c}"></button>`;
  }).join('');
  $('bgGradsBox').innerHTML = BG_GRADIENTS.map((g,i) =>
    `<button class="bg-g" style="background:${g}" onclick="applyBgGrad(this,'${encodeURIComponent(g)}')" title="Gradient ${i+1}"></button>`
  ).join('');
}

function applyBgColor(c, btn) {
  S.currentBg = c;
  document.querySelectorAll('.bg-c,.bg-g').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (c === 'transparent') { S.compositeImage = S.processedImage; $('imgProc').src = S.processedImage; }
  else compositeWith(c);
}

function applyBgGrad(btn, encodedG) {
  const g = decodeURIComponent(encodedG);
  S.currentBg = g;
  document.querySelectorAll('.bg-c,.bg-g').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  compositeWith(g);
}

function compositeWith(bg) {
  const cv = $('offCanvas'), ctx = cv.getContext('2d'), img = new Image();
  img.onload = () => {
    cv.width = img.width; cv.height = img.height;
    if (bg.startsWith('linear-gradient')) {
      const cols = bg.match(/#[a-f0-9]{6}/gi) || ['#667eea','#764ba2'];
      const grd  = ctx.createLinearGradient(0, 0, cv.width, cv.height);
      cols.forEach((c,i) => grd.addColorStop(i/(cols.length-1), c));
      ctx.fillStyle = grd;
    } else { ctx.fillStyle = bg; }
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0);
    S.compositeImage = cv.toDataURL('image/png');
    $('imgProc').src = S.compositeImage;
  };
  img.src = S.processedImage;
}

function handleCustomBg(e) {
  const file = e.target.files[0]; if (!file) return;
  const r    = new FileReader();
  r.onload = ev => {
    S.currentBg = 'custom';
    document.querySelectorAll('.bg-c,.bg-g').forEach(b => b.classList.remove('active'));
    const cv = $('offCanvas'), ctx = cv.getContext('2d');
    const fg = new Image(), bg = new Image(); let loaded = 0;
    const done = () => {
      if (++loaded < 2) return;
      cv.width = fg.width; cv.height = fg.height;
      const sc = Math.max(cv.width/bg.width, cv.height/bg.height);
      const bw = bg.width*sc, bh = bg.height*sc;
      ctx.drawImage(bg, (cv.width-bw)/2, (cv.height-bh)/2, bw, bh);
      ctx.drawImage(fg, 0, 0);
      S.compositeImage = cv.toDataURL('image/png');
      $('imgProc').src = S.compositeImage;
      toast('Custom background applied!', 'success');
    };
    fg.onload = done; bg.onload = done;
    fg.src = S.processedImage; bg.src = ev.target.result;
  };
  r.readAsDataURL(file); e.target.value = '';
}

// ═══════════════════════════════════════
//  PRINT SHEET
// ═══════════════════════════════════════
function renderSizeGrid() {
  $('sizeGrid').innerHTML = PHOTO_SIZES.map(s =>
    `<div class="size-card${s.id==='passport'?' active':''}" data-id="${s.id}" onclick="selectSize('${s.id}',this)">
      <div class="size-name">${s.name}</div>
      <div class="size-dim">${s.w}×${s.h}mm</div>
      <div class="size-desc">${s.desc}</div>
    </div>`
  ).join('');
}

function selectSize(id, el) {
  S.printSize = id;
  document.querySelectorAll('.size-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  updateCountUI();
}

function getLayout(sizeObj) {
  const pw   = Math.round(sizeObj.w * MM2PX);
  const ph   = Math.round(sizeObj.h * MM2PX);
  const cols = Math.floor((A4.w - 2*SHEET_MARGIN + SHEET_GAP) / (pw + SHEET_GAP));
  const rows = Math.floor((A4.h - 2*SHEET_MARGIN + SHEET_GAP) / (ph + SHEET_GAP));
  return { cols, rows, max:cols*rows, pw, ph };
}

function updateCountUI() {
  const sz = PHOTO_SIZES.find(s => s.id === S.printSize);
  const ly = getLayout(sz);
  if (S.printCount > ly.max) S.printCount = ly.max;
  $('countVal').textContent  = S.printCount;
  $('countInfo').textContent = `Max ${ly.max} photos per A4 sheet (${ly.cols}×${ly.rows} grid)`;
  updatePreview();
}

function updatePreview() {
  const sz = PHOTO_SIZES.find(s => s.id === S.printSize);
  if (!sz) return;
  const ly = getLayout(sz), cv = $('previewCanvas'), ctx = cv.getContext('2d'), scale = 280/A4.w;
  cv.width = 280; cv.height = Math.round(A4.h * scale);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  const actual = Math.min(S.printCount, ly.max);
  let count = 0;
  for (let r = 0; r < ly.rows; r++) {
    for (let c = 0; c < ly.cols; c++) {
      const x = (SHEET_MARGIN + c*(ly.pw+SHEET_GAP)) * scale;
      const y = (SHEET_MARGIN + r*(ly.ph+SHEET_GAP)) * scale;
      const w = ly.pw*scale, h = ly.ph*scale;
      if (count < actual) {
        ctx.fillStyle = '#e0e7ff'; ctx.fillRect(x,y,w,h);
        if (S.processedImage) {
          const img = new Image();
          img.onload = (function(cx,cy,cw,ch){ return function(){ drawCover(ctx,this,cx,cy,cw,ch); }; })(x,y,w,h);
          img.src = S.processedImage;
        }
        ctx.setLineDash([2,2]); ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1;
        ctx.strokeRect(x,y,w,h); ctx.setLineDash([]);
      } else {
        ctx.fillStyle='#f8fafc'; ctx.fillRect(x,y,w,h);
        ctx.setLineDash([2,2]); ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=.5;
        ctx.strokeRect(x,y,w,h); ctx.setLineDash([]);
      }
      count++;
    }
  }
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.naturalWidth/img.naturalHeight, sr = w/h;
  let sw, sh, sx, sy;
  if (ir > sr) { sh=img.naturalHeight; sw=sh*sr; sx=(img.naturalWidth-sw)/2; sy=0; }
  else         { sw=img.naturalWidth;  sh=sw/sr; sx=0; sy=(img.naturalHeight-sh)/2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function generateSheet() {
  if (!S.processedImage) { toast('No processed image', 'error'); return; }
  const sz = PHOTO_SIZES.find(s => s.id === S.printSize);
  const ly = getLayout(sz), actual = Math.min(S.printCount, ly.max);
  toast('Generating print sheet...', 'info');
  const cv = document.createElement('canvas');
  cv.width = A4.w; cv.height = A4.h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,A4.w,A4.h);
  const img = new Image();
  img.onload = () => {
    let count = 0;
    for (let r=0; r<ly.rows && count<actual; r++) {
      for (let c=0; c<ly.cols && count<actual; c++) {
        const x = SHEET_MARGIN+c*(ly.pw+SHEET_GAP), y = SHEET_MARGIN+r*(ly.ph+SHEET_GAP);
        ctx.fillStyle='#ffffff'; ctx.fillRect(x,y,ly.pw,ly.ph);
        drawCover(ctx, img, x, y, ly.pw, ly.ph);
        ctx.setLineDash([10,6]); ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=1;
        ctx.strokeRect(x-.5,y-.5,ly.pw+1,ly.ph+1); ctx.setLineDash([]);
        count++;
      }
    }
    ctx.fillStyle='#94a3b8';
    ctx.font=`${Math.round(2.5*MM2PX)}px Arial`; ctx.textAlign='center';
    ctx.fillText(`${sz.name} (${sz.w}×${sz.h}mm) · ${actual} photos · Star Eraser`, A4.w/2, A4.h-Math.round(2*MM2PX));
    const link = document.createElement('a');
    link.download = `${sz.name.toLowerCase().replace(/\s+/g,'-')}-A4-sheet.png`;
    link.href = cv.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    incStat('downloads'); toast('Print sheet downloaded!', 'success');
  };
  img.src = S.processedImage;
}

// ═══════════════════════════════════════
//  DOWNLOAD / EXPORT
// ═══════════════════════════════════════
function quickDownload() {
  dlImage(S.compositeImage || S.processedImage, 'png');
  incStat('downloads'); toast('Image downloaded!', 'success');
}

function exportDownload() {
  const src = S.compositeImage || S.processedImage;
  if (S.exportFmt === 'png') { dlImage(src, 'png'); }
  else {
    const cv = $('offCanvas'), ctx = cv.getContext('2d'), img = new Image();
    img.onload = () => {
      cv.width = img.width; cv.height = img.height;
      if (S.exportFmt === 'jpeg') { ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height); }
      ctx.drawImage(img, 0, 0);
      dlImage(cv.toDataURL('image/'+S.exportFmt, S.exportQual), S.exportFmt);
    };
    img.src = src;
  }
  incStat('downloads'); toast(`Exported as ${S.exportFmt.toUpperCase()}!`, 'success');
}

function dlImage(dataUrl, fmt) {
  const name = (S.currentFile?.name?.replace(/\.[^.]+$/,'') || 'star-eraser') +
               '-nobg.' + (fmt==='jpeg'?'jpg':fmt);
  const a = document.createElement('a'); a.download=name; a.href=dataUrl;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ═══════════════════════════════════════
//  COPY & SHARE
// ═══════════════════════════════════════
async function copyToClipboard() {
  try {
    const r = await fetch(S.compositeImage || S.processedImage);
    const blob = await r.blob();
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
    toast('Copied to clipboard!', 'success');
  } catch { toast('Copy not supported in this browser', 'warning'); }
}

async function shareImage() {
  try {
    const r = await fetch(S.compositeImage || S.processedImage);
    const blob = await r.blob();
    const file = new File([blob], 'star-eraser-result.png', {type:'image/png'});
    if (navigator.share && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file], title:'Star Eraser', text:'Background removed with Star Eraser!'});
    } else { toast('Sharing not supported on this device', 'warning'); }
  } catch(e) { if (e.name!=='AbortError') toast('Share cancelled','info'); }
}

// ═══════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════
function getHist()  { try { return JSON.parse(localStorage.getItem('se_hist')) || []; } catch { return []; } }
function setHist(h) {
  try { localStorage.setItem('se_hist', JSON.stringify(h)); }
  catch(e) {
    if (e.name === 'QuotaExceededError') {
      h.splice(0, Math.ceil(h.length/2));
      localStorage.setItem('se_hist', JSON.stringify(h));
      toast('Storage full — old items removed', 'warning');
    }
  }
}

function saveToHist() {
  const h = getHist();
  h.unshift({
    id:S.histId, thumb:createThumb(S.processedImage, 180),
    processed:S.processedImage, original:S.croppedImage||S.originalImage,
    name:S.currentFile?.name||'image', size:S.currentFile?.size||0,
    ts:Date.now(), fav:false,
  });
  if (h.length > 15) h.pop();
  setHist(h); updateHistBadge();
}

function createThumb(dataUrl, maxDim) {
  try {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), img = new Image();
    img.src = dataUrl;
    const sc = Math.min(maxDim/(img.naturalWidth||maxDim), maxDim/(img.naturalHeight||maxDim), 1);
    cv.width  = (img.naturalWidth||maxDim)*sc; cv.height = (img.naturalHeight||maxDim)*sc;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', .5);
  } catch { return dataUrl; }
}

function renderHist() {
  const h = getHist(), q = $('histSearchInput').value.toLowerCase();
  const f = q ? h.filter(x => x.name.toLowerCase().includes(q)) : h;
  if (!f.length) {
    $('histList').innerHTML = `<div class="hist-empty"><i class="fa-regular fa-images"></i><p>${q?'No matches found':'No history yet'}</p></div>`;
    return;
  }
  $('histList').innerHTML = f.map(it => `
    <div class="hist-item" data-id="${it.id}">
      <img class="hist-item-img" src="${it.thumb||it.processed}" alt="${it.name}" loading="lazy" onclick="loadHist('${it.id}')">
      <div class="hist-item-info">
        <div class="hist-item-name">${it.name}</div>
        <div class="hist-item-date">${timeAgo(it.ts)}</div>
      </div>
      <div class="hist-item-acts">
        <button onclick="loadHist('${it.id}')" title="Load"><i class="fa-solid fa-arrow-rotate-left"></i></button>
        <button onclick="dlHist('${it.id}')" title="Download"><i class="fa-solid fa-download"></i></button>
        <button onclick="favHist('${it.id}')" title="Favorite" style="color:${it.fav?'var(--danger)':''}">
          <i class="fa-${it.fav?'solid':'regular'} fa-heart"></i></button>
        <button onclick="delHist('${it.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}

function loadHist(id) {
  const h = getHist(), it = h.find(x => x.id===id); if (!it) return;
  S.originalImage=it.original; S.croppedImage=it.original;
  S.processedImage=it.processed; S.compositeImage=it.processed;
  S.currentBg='transparent'; S.isFav=it.fav; S.histId=it.id;
  S.currentFile={name:it.name, size:it.size};
  showResult();
  if (S.isFav) { $('favBtn').innerHTML='<i class="fa-solid fa-heart"></i>'; $('favBtn').classList.add('fav-on'); }
  toggleHist(); toast('Loaded from history', 'info');
}

function dlHist(id) {
  const h=getHist(), it=h.find(x=>x.id===id); if (!it) return;
  dlImage(it.processed,'png'); incStat('downloads'); toast('Downloaded!','success');
}

function favHist(id) {
  const h=getHist(), it=h.find(x=>x.id===id); if (!it) return;
  it.fav=!it.fav; setHist(h); renderHist(); loadStats();
  if (S.histId===id) {
    S.isFav=it.fav;
    $('favBtn').innerHTML=`<i class="fa-${it.fav?'solid':'regular'} fa-heart"></i>`;
    $('favBtn').classList.toggle('fav-on', it.fav);
  }
}

function delHist(id) {
  setHist(getHist().filter(x=>x.id!==id)); renderHist(); updateHistBadge(); loadStats(); toast('Removed','info');
}

function clearHist() {
  if (!confirm('Clear all history?')) return;
  localStorage.removeItem('se_hist'); renderHist(); updateHistBadge(); toast('History cleared','info');
}

function updateHistBadge() {
  const c=getHist().length;
  $('histBadge').textContent=c;
  $('histBadge').classList.toggle('show', c>0);
}

function toggleFav() {
  if (!S.histId) return; S.isFav=!S.isFav;
  $('favBtn').innerHTML=`<i class="fa-${S.isFav?'solid':'regular'} fa-heart"></i>`;
  $('favBtn').classList.toggle('fav-on', S.isFav);
  const h=getHist(), it=h.find(x=>x.id===S.histId);
  if (it) { it.fav=S.isFav; setHist(h); }
  loadStats(); toast(S.isFav?'Added to favorites!':'Removed from favorites', S.isFav?'success':'info');
}

// ═══════════════════════════════════════
//  STATS
// ═══════════════════════════════════════
function getStats() { try { return JSON.parse(localStorage.getItem('se_stats')) || {processed:0,downloads:0}; } catch { return {processed:0,downloads:0}; } }
function loadStats() {
  const s=getStats(), fav=getHist().filter(x=>x.fav).length;
  $('sProcessed').textContent=s.processed; $('sFavs').textContent=fav; $('sDownloads').textContent=s.downloads;
}
function incStat(key) {
  const s=getStats(); s[key]=(s[key]||0)+1;
  localStorage.setItem('se_stats', JSON.stringify(s)); loadStats();
  animateNum(key==='processed'?$('sProcessed'):$('sDownloads'), s[key]-1, s[key], 400);
}

// ═══════════════════════════════════════
//  THEME
// ═══════════════════════════════════════
function toggleTheme() {
  const next = document.documentElement.dataset.theme==='dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('se_theme', next);
  $('themeIcon').className = next==='dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  toast(next==='dark' ? 'Dark mode on 🌙' : 'Light mode on ☀️', 'info');
}
function loadTheme() {
  const t = localStorage.getItem('se_theme') || 'dark';
  document.documentElement.dataset.theme = t;
  $('themeIcon').className = t==='dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

// ═══════════════════════════════════════
//  VIEW & PANEL HELPERS
// ═══════════════════════════════════════
function switchView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
}

function resetApp() {
  if (S.cropper) { S.cropper.destroy(); S.cropper=null; }
  S.originalImage=S.croppedImage=S.processedImage=S.compositeImage=S.currentFile=null;
  S.currentBg='transparent'; S.isFav=false; S.histId=null;
  switchView('uploadView');
}

function togglePanel(id) {
  const p=$(id), open=p.classList.contains('open');
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open'));
  document.querySelectorAll('.tb-btn').forEach(b=>b.classList.remove('active'));
  if (!open) {
    p.classList.add('open');
    // Mark button active
    const btnMap = { bgPanel:'bgPanelBtn', printPanel:'printPanelBtn', exportPanel:'exportPanelBtn' };
    if (btnMap[id]) $(btnMap[id]).classList.add('active');
    setTimeout(() => p.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
  }
}

function closePanel(id) { $(id).classList.remove('open'); }

function toggleHist() {
  const open = $('histPanel').classList.contains('open');
  $('histPanel').classList.toggle('open');
  $('histOverlay').classList.toggle('open');
  if (!open) renderHist();
}

// ═══════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════
function toast(msg, type='info') {
  const icons = {success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation'};
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span class="toast-body">${msg}</span><span class="toast-close" onclick="this.parentElement.remove()" title="Dismiss">✕</span>`;
  $('toastWrap').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4000);
}

// ═══════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'Just now';
  if (d < 3600000)  return (d/60000|0)  + 'm ago';
  if (d < 86400000) return (d/3600000|0)+ 'h ago';
  if (d < 604800000)return (d/86400000|0)+'d ago';
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

// ═══════════════════════════════════════
//  LAUNCH
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);

// ═══════════════════════════════════════
//  API KEY HELPERS
// ═══════════════════════════════════════
function getUserApiKey()  { return localStorage.getItem('se_api_key') || ''; }
function setUserApiKey(k) { localStorage.setItem('se_api_key', k.trim()); }
function clearUserApiKey(){ localStorage.removeItem('se_api_key'); }
function getFreeCount()   { return parseInt(localStorage.getItem('se_free_count') || '0', 10); }
function incFreeCount()   { localStorage.setItem('se_free_count', getFreeCount() + 1); }

// ═══════════════════════════════════════
//  API KEY MODAL
// ═══════════════════════════════════════
function initApiKeyModal() {
  // Bind all modal buttons
  $('closeApiModal').addEventListener('click',  closeApiKeyModal);
  $('cancelApiModal').addEventListener('click', closeApiKeyModal);
  $('apiModalOverlay').addEventListener('click', closeApiKeyModal);
  $('saveApiKey').addEventListener('click', saveApiKeyHandler);
  $('removeKeyBtn').addEventListener('click', removeApiKeyHandler);
  $('apiKeyToggle').addEventListener('click', toggleApiKeyVisibility);

  // Update nav button on load
  updateApiKeyBtn();
}

function openApiKeyModal(exhausted = false) {
  const overlay = $('apiModalOverlay');
  const modal   = $('apiModal');
  const input   = $('apiKeyInput');
  const userKey = getUserApiKey();
  const used    = getFreeCount();
  const rem     = Math.max(0, FREE_LIMIT - used);

  // Update modal icon
  const icon = $('modalIcon');
  icon.className = 'modal-icon';
  if (userKey) icon.classList.add('saved');
  else if (exhausted || rem === 0) icon.classList.add('warning');

  // Update heading
  if (userKey) {
    $('modalHeading').textContent = 'API Key Saved ✓';
    $('modalSubtitle').textContent = 'You have unlimited access with your own key';
  } else if (exhausted || rem === 0) {
    $('modalHeading').textContent = 'Free Limit Reached';
    $('modalSubtitle').textContent = 'Add your own remove.bg key to continue';
  } else {
    $('modalHeading').textContent = 'API Key Settings';
    $('modalSubtitle').textContent = `${rem} free removal${rem !== 1 ? 's' : ''} left · Add key for unlimited access`;
  }

  // Update free usage banner
  const banner = $('freeBanner');
  banner.className = 'free-banner';
  if (userKey) {
    banner.classList.add('unlimited');
    $('freeCountText').textContent = 'Unlimited access active';
    $('freeSubText').textContent   = 'Using your personal remove.bg API key';
  } else if (rem === 0) {
    banner.classList.add('exhausted');
    $('freeCountText').textContent = 'All 5 free removals used';
    $('freeSubText').textContent   = 'Add your own key to continue removing backgrounds';
  } else {
    $('freeCountText').textContent = `${rem} of ${FREE_LIMIT} free removals remaining`;
    $('freeSubText').textContent   = 'No key needed for first 5 images';
  }

  // Render free-use dots
  const dotsEl = $('freeDots');
  dotsEl.innerHTML = Array.from({ length: FREE_LIMIT }, (_, i) => {
    if (userKey)      return `<div class="free-dot used"></div>`;
    if (i < used)     return `<div class="free-dot ${rem === 0 ? 'exhausted' : 'used'}"></div>`;
    return `<div class="free-dot"></div>`;
  }).join('');

  // Show/hide saved key row
  const savedRow = $('keySavedRow');
  if (userKey) {
    savedRow.classList.remove('hidden');
    // Mask key for display
    const masked = userKey.substring(0, 4) + '••••••••' + userKey.slice(-4);
    $('keySavedText').textContent = `Key saved: ${masked} — unlimited access enabled`;
  } else {
    savedRow.classList.add('hidden');
  }

  // Pre-fill input if key exists
  input.value = userKey || '';
  input.type  = 'password';
  $('apiKeyEye').className = 'fa-solid fa-eye';

  // Save button label
  $('saveApiKey').innerHTML = userKey
    ? '<i class="fa-solid fa-floppy-disk"></i> Update Key'
    : '<i class="fa-solid fa-floppy-disk"></i> Save Key';

  overlay.classList.add('open');
  modal.classList.add('open');

  // Focus the input after animation
  setTimeout(() => input.focus(), 300);
}

function closeApiKeyModal() {
  $('apiModalOverlay').classList.remove('open');
  $('apiModal').classList.remove('open');
}

function saveApiKeyHandler() {
  const input = $('apiKeyInput');
  const key   = input.value.trim();
  if (!key) {
    input.focus();
    input.style.borderColor = 'var(--danger)';
    input.style.boxShadow   = '0 0 0 3px rgba(244,63,94,.2)';
    setTimeout(() => { input.style.borderColor = ''; input.style.boxShadow = ''; }, 1600);
    toast('Please enter your API key', 'error');
    return;
  }
  setUserApiKey(key);
  updateApiKeyBtn();
  closeApiKeyModal();
  toast('API key saved! ✓ Unlimited access enabled', 'success');
}

function removeApiKeyHandler() {
  if (!confirm('Remove your saved API key? You will revert to the free tier.')) return;
  clearUserApiKey();
  updateApiKeyBtn();
  closeApiKeyModal();
  toast('API key removed. You have 5 free uses total.', 'info');
}

function toggleApiKeyVisibility() {
  const input = $('apiKeyInput');
  const eye   = $('apiKeyEye');
  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    eye.className = 'fa-solid fa-eye';
  }
}

function updateApiKeyBtn() {
  const btn   = $('apiKeyBtn');
  const badge = $('apiKeyBadge');
  const userKey = getUserApiKey();
  const used    = getFreeCount();
  const rem     = Math.max(0, FREE_LIMIT - used);

  btn.classList.remove('key-saved', 'key-warning');
  badge.classList.remove('show', 'warn', 'danger');

  if (userKey) {
    // Key saved — green, no badge needed
    btn.classList.add('key-saved');
    btn.title = 'API Key Active — Unlimited Access (K)';
  } else if (rem === 0) {
    // Exhausted — warning pulse
    btn.classList.add('key-warning');
    badge.textContent = '!';
    badge.classList.add('show', 'danger');
    btn.title = 'Free limit reached — Add your API key (K)';
  } else {
    // Show remaining count
    badge.textContent = rem;
    badge.classList.add('show');
    if (rem <= 2) badge.classList.add('warn');
    btn.title = `${rem} free removals left — Click to add API key (K)`;
  }
}

// Hidden utility
document.head.insertAdjacentHTML('beforeend', '<style>.hidden{display:none!important}</style>');

