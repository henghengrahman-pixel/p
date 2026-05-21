const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const FileStoreFactory = require('session-file-store');
const multer = require('multer');
const methodOverride = require('method-override');
const helmet = require('helmet');
const compression = require('compression');
const sanitizeHtml = require('sanitize-html');
const slugify = require('slugify');

const app = express();
const FileStore = FileStoreFactory(session);

const PORT = Number(process.env.PORT || 8080);
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'storage');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_PATH = process.env.ADMIN_PATH || '/pinktiger8008';
const ADMIN_ID = process.env.ADMIN_ID || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-this-in-railway';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(DATA_DIR);
ensureDir(UPLOAD_DIR);
ensureDir(SESSION_DIR);

const defaultDb = {
  settings: {
    siteName: 'RUPIAHTOTO',
    pageTitle: 'PROMOSI RUPIAHTOTO',
    logoUrl: 'https://pub-e790bcfbcb5f4446856c5ea560bd1cb2.r2.dev/BANNER%20RP%20NEW/rupiahgif.webp',
    headerImageUrl: 'https://pub-e790bcfbcb5f4446856c5ea560bd1cb2.r2.dev/BANNER%20RP%20NEW/rupiahgif.webp',
    backgroundUrl: 'https://cdn.ope8k8.com/BANNER%20RP%20NEW/sosmedrp2025/bgrupiahweb2025new.webp',
    runningText: 'Selamat datang di Rupiahtoto, Slot Gacor, Bandar Togel Online & Live Game Casino Terbesar dan Terpercaya di Indonesia.',
    footerText: '© RUPIAHTOTO. All Rights Reserved.',
    particles: true,
    goldFrame: true
  },
  menus: [
    { id: 'm1', label: 'Prediksi RUPIAHTOTO', url: 'http://prediksi16.rupiahtotoprediksi.com/', active: true, sort: 1 },
    { id: 'm2', label: 'Daftar RUPIAHTOTO', url: 'https://rupiahtotosl.com/', active: true, sort: 2 },
    { id: 'm3', label: 'Cara Bermain', url: 'https://panduan.rupiahtotoprediksi.com/', active: true, sort: 3 }
  ],
  promos: [
    {
      id: 'p1',
      title: 'SYARAT BONUS FREEBET SLOTGAME',
      imageUrl: 'https://cdn.ope8k8.com/BANNER%20RP%20ALL/promo/1RP.webp',
      linkUrl: '',
      active: true,
      openDefault: false,
      sort: 1,
      description: '<p>SYARAT BONUS FREEBET SLOTGAME</p><p><br></p><p>• Bonus FreeBet berlaku untuk permainan khusus SlotGames.</p><p><br></p><p>• Bonus FreeBet hanya berlaku untuk semua Member RUPIAHTOTO.</p><p><br></p><p>• Minimal Deposit untuk klaim Bonus FreeBet Rp.50.000.</p><p><br></p><p>• Maksimal Bonus yang diberikan adalah Rp.500.000.</p><p><br></p><p>• Bonus FreeBet tidak berlaku untuk deposit via PULSA.</p><p><br></p><p>• Bonus berlaku hanya untuk 1 x sehari.</p>'
    },
    {
      id: 'p2',
      title: 'EVENT BONUS BULANAN SLOT & LIVEGAME CASINO',
      imageUrl: 'https://cdn.ope8k8.com/BANNER%20RP%20ALL/promo/2RP.webp',
      linkUrl: '',
      active: true,
      openDefault: false,
      sort: 2,
      description: '<p>EVENT BONUS BULANAN SLOT & LIVEGAME CASINO</p><p><br></p><p>• Wajib memiliki Akun/UserID yang terdaftar pada RUPIAHTOTO.</p><p><br></p><p>• Bonus bulanan dibagikan sesuai ketentuan yang berlaku.</p><p><br></p><p>• Seluruh keputusan RUPIAHTOTO adalah mutlak dan tidak dapat diganggu gugat.</p>'
    }
  ]
};

function readJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return structuredClone(fallback);
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      settings: { ...fallback.settings, ...(parsed.settings || {}) },
      menus: Array.isArray(parsed.menus) ? parsed.menus : fallback.menus,
      promos: Array.isArray(parsed.promos) ? parsed.promos : fallback.promos
    };
  } catch (err) {
    const bad = `${file}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(file, bad); } catch (_) {}
    return structuredClone(fallback);
  }
}

function writeJsonAtomic(file, data) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function db() { return readJsonSafe(DB_FILE, defaultDb); }
function saveDb(data) { writeJsonAtomic(DB_FILE, data); }
if (!fs.existsSync(DB_FILE)) saveDb(defaultDb);

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function cleanUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.startsWith('/uploads/')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\//.test(s)) return s;
  return '';
}

function cleanHtml(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'span', 'br']),
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style']
    },
    allowedSchemes: ['http', 'https', 'data'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
    }
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.webp';
    const base = slugify(path.basename(file.originalname || 'image', ext), { lower: true, strict: true }).slice(0, 50) || 'image';
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE || 8 * 1024 * 1024) },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('File harus gambar PNG/JPG/WEBP/GIF/SVG'));
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));
app.use(express.json({ limit: '3mb' }));
app.use(methodOverride('_method'));
app.use('/assets', express.static(path.join(__dirname, 'public'), { maxAge: NODE_ENV === 'production' ? '7d' : 0 }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: NODE_ENV === 'production' ? '30d' : 0 }));

app.use(session({
  store: new FileStore({ path: SESSION_DIR, retries: 0, ttl: 86400 }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'rp_admin.sid',
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use((req, res, next) => {
  res.locals.adminPath = ADMIN_PATH;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});
function flash(req, type, message) { req.session.flash = { type, message }; }
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect(`${ADMIN_PATH}/login`);
}
function sortBySort(a, b) { return Number(a.sort || 999) - Number(b.sort || 999); }

app.get('/health', (req, res) => res.json({ ok: true, service: 'rupiahtoto-promo-premium' }));

app.get('/', (req, res) => {
  const data = db();
  res.render('index', {
    layout: false,
    settings: data.settings,
    menus: data.menus.filter(x => x.active).sort(sortBySort),
    promos: data.promos.filter(x => x.active).sort(sortBySort)
  });
});

app.get(`${ADMIN_PATH}/login`, (req, res) => {
  if (req.session.isAdmin) return res.redirect(`${ADMIN_PATH}/dashboard`);
  res.render('admin/login', { title: 'Login Admin' });
});
app.post(`${ADMIN_PATH}/login`, (req, res) => {
  const id = String(req.body.username || '').trim();
  const pw = String(req.body.password || '');
  if (id === ADMIN_ID && pw === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminId = id;
    flash(req, 'success', 'Login berhasil.');
    return res.redirect(`${ADMIN_PATH}/dashboard`);
  }
  flash(req, 'danger', 'ID atau password salah.');
  return res.redirect(`${ADMIN_PATH}/login`);
});
app.post(`${ADMIN_PATH}/logout`, requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect(`${ADMIN_PATH}/login`));
});

app.get(`${ADMIN_PATH}`, requireAdmin, (req, res) => res.redirect(`${ADMIN_PATH}/dashboard`));
app.get(`${ADMIN_PATH}/dashboard`, requireAdmin, (req, res) => {
  const data = db();
  res.render('admin/dashboard', { title: 'Dashboard', data });
});

app.get(`${ADMIN_PATH}/settings`, requireAdmin, (req, res) => {
  const data = db();
  res.render('admin/settings', { title: 'Pengaturan Situs', settings: data.settings });
});
app.post(`${ADMIN_PATH}/settings`, requireAdmin, upload.fields([
  { name: 'logoFile', maxCount: 1 },
  { name: 'headerFile', maxCount: 1 },
  { name: 'backgroundFile', maxCount: 1 }
]), (req, res) => {
  const data = db();
  const files = req.files || {};
  data.settings = {
    ...data.settings,
    siteName: String(req.body.siteName || 'RUPIAHTOTO').trim(),
    pageTitle: String(req.body.pageTitle || 'PROMOSI RUPIAHTOTO').trim(),
    logoUrl: files.logoFile?.[0] ? `/uploads/${files.logoFile[0].filename}` : cleanUrl(req.body.logoUrl) || data.settings.logoUrl,
    headerImageUrl: files.headerFile?.[0] ? `/uploads/${files.headerFile[0].filename}` : cleanUrl(req.body.headerImageUrl) || data.settings.headerImageUrl,
    backgroundUrl: files.backgroundFile?.[0] ? `/uploads/${files.backgroundFile[0].filename}` : cleanUrl(req.body.backgroundUrl) || data.settings.backgroundUrl,
    runningText: String(req.body.runningText || '').trim(),
    footerText: String(req.body.footerText || '').trim(),
    particles: req.body.particles === 'on',
    goldFrame: req.body.goldFrame === 'on'
  };
  saveDb(data);
  flash(req, 'success', 'Pengaturan berhasil disimpan.');
  res.redirect(`${ADMIN_PATH}/settings`);
});

app.get(`${ADMIN_PATH}/menus`, requireAdmin, (req, res) => {
  const data = db();
  res.render('admin/menus', { title: 'Menu Tombol', menus: data.menus.sort(sortBySort) });
});
app.post(`${ADMIN_PATH}/menus`, requireAdmin, (req, res) => {
  const data = db();
  data.menus.push({
    id: uid('menu'),
    label: String(req.body.label || 'Menu Baru').trim(),
    url: cleanUrl(req.body.url),
    sort: Number(req.body.sort || data.menus.length + 1),
    active: req.body.active === 'on'
  });
  saveDb(data);
  flash(req, 'success', 'Menu berhasil ditambah.');
  res.redirect(`${ADMIN_PATH}/menus`);
});
app.post(`${ADMIN_PATH}/menus/:id`, requireAdmin, (req, res) => {
  const data = db();
  data.menus = data.menus.map(m => m.id === req.params.id ? {
    ...m,
    label: String(req.body.label || m.label).trim(),
    url: cleanUrl(req.body.url) || m.url,
    sort: Number(req.body.sort || m.sort || 1),
    active: req.body.active === 'on'
  } : m);
  saveDb(data);
  flash(req, 'success', 'Menu berhasil diupdate.');
  res.redirect(`${ADMIN_PATH}/menus`);
});
app.post(`${ADMIN_PATH}/menus/:id/delete`, requireAdmin, (req, res) => {
  const data = db();
  data.menus = data.menus.filter(m => m.id !== req.params.id);
  saveDb(data);
  flash(req, 'success', 'Menu berhasil dihapus.');
  res.redirect(`${ADMIN_PATH}/menus`);
});

app.get(`${ADMIN_PATH}/promos`, requireAdmin, (req, res) => {
  const data = db();
  res.render('admin/promos', { title: 'Kelola Promo', promos: data.promos.sort(sortBySort) });
});
app.get(`${ADMIN_PATH}/promos/new`, requireAdmin, (req, res) => {
  res.render('admin/promo-form', { title: 'Tambah Promo', promo: null });
});
app.post(`${ADMIN_PATH}/promos`, requireAdmin, upload.single('imageFile'), (req, res) => {
  const data = db();
  data.promos.push({
    id: uid('promo'),
    title: String(req.body.title || 'Promo Baru').trim(),
    imageUrl: req.file ? `/uploads/${req.file.filename}` : cleanUrl(req.body.imageUrl),
    linkUrl: cleanUrl(req.body.linkUrl),
    description: cleanHtml(req.body.description),
    active: req.body.active === 'on',
    openDefault: req.body.openDefault === 'on',
    sort: Number(req.body.sort || data.promos.length + 1)
  });
  saveDb(data);
  flash(req, 'success', 'Promo berhasil ditambah.');
  res.redirect(`${ADMIN_PATH}/promos`);
});
app.get(`${ADMIN_PATH}/promos/:id/edit`, requireAdmin, (req, res) => {
  const data = db();
  const promo = data.promos.find(p => p.id === req.params.id);
  if (!promo) return res.status(404).render('404', { title: 'Tidak ditemukan' });
  res.render('admin/promo-form', { title: 'Edit Promo', promo });
});
app.post(`${ADMIN_PATH}/promos/:id`, requireAdmin, upload.single('imageFile'), (req, res) => {
  const data = db();
  data.promos = data.promos.map(p => p.id === req.params.id ? {
    ...p,
    title: String(req.body.title || p.title).trim(),
    imageUrl: req.file ? `/uploads/${req.file.filename}` : (cleanUrl(req.body.imageUrl) || p.imageUrl),
    linkUrl: cleanUrl(req.body.linkUrl),
    description: cleanHtml(req.body.description),
    active: req.body.active === 'on',
    openDefault: req.body.openDefault === 'on',
    sort: Number(req.body.sort || p.sort || 1)
  } : p);
  saveDb(data);
  flash(req, 'success', 'Promo berhasil diupdate.');
  res.redirect(`${ADMIN_PATH}/promos`);
});
app.post(`${ADMIN_PATH}/promos/:id/delete`, requireAdmin, (req, res) => {
  const data = db();
  data.promos = data.promos.filter(p => p.id !== req.params.id);
  saveDb(data);
  flash(req, 'success', 'Promo berhasil dihapus.');
  res.redirect(`${ADMIN_PATH}/promos`);
});

app.use((req, res) => res.status(404).render('404', { title: 'Tidak ditemukan' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (req.session) flash(req, 'danger', err.message || 'Terjadi error.');
  if (req.path.startsWith(ADMIN_PATH)) return res.redirect(`${ADMIN_PATH}/dashboard`);
  res.status(500).send('Terjadi error server.');
});

app.listen(PORT, () => {
  console.log(`RUPIAHTOTO PREMIUM PROMO running on port ${PORT}`);
  console.log(`Admin: ${ADMIN_PATH}/login`);
});
