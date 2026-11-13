/**
 * ============================================================================
 * KOPERASI DIGITAL PRO — KREATIF BY WITNO
 * Google Apps Script Backend (Code.gs)
 * Database: Google Sheets (16 Sheet Otomatis) + Google Drive Media Storage
 * Security: SHA-256 Salted Hash, Token CacheSession, RBAC, LockService, Audit Log
 * ============================================================================
 */

const APP_CONFIG = {
  APP_NAME: 'KOPERASI DIGITAL PRO',
  BRANDING: 'KREATIF BY WITNO',
  DRIVE_FOLDER_NAME: 'KOPERASI_DIGITAL_PRO_MEDIA',
  SESSION_TTL_SECONDS: 21600, // 6 jam
  SECRET_PEPPER: 'KDP_WITNO_2026_SECURE_PEPPER'
};

const SHEET_SCHEMAS = {
  USERS: ['id_user', 'username', 'password_hash', 'salt', 'nama_lengkap', 'email', 'no_hp', 'role', 'id_anggota', 'status', 'created_at', 'last_login'],
  ANGGOTA: ['id_anggota', 'kode_anggota', 'nik', 'nama', 'alamat', 'no_hp', 'email', 'tanggal_gabung', 'status_anggota', 'saldo_pokok', 'saldo_wajib', 'saldo_sukarela', 'limit_kredit', 'foto_url', 'qr_token'],
  PRODUK: ['id_produk', 'kode_produk', 'barcode', 'nama_produk', 'id_kategori', 'nama_kategori', 'id_supplier', 'deskripsi', 'harga_normal', 'harga_anggota', 'harga_promo', 'stok', 'stok_min', 'satuan', 'foto_url', 'rating', 'terjual', 'unggulan', 'status', 'created_at'],
  KATEGORI: ['id_kategori', 'nama_kategori', 'ikon', 'deskripsi', 'urutan', 'status'],
  KERANJANG: ['id_keranjang', 'id_user', 'id_produk', 'qty', 'updated_at'],
  PESANAN: ['id_pesanan', 'nomor_pesanan', 'id_user', 'id_anggota', 'nama_pembeli', 'channel', 'metode_pembayaran', 'subtotal', 'diskon_anggota', 'diskon_promo', 'total_bayar', 'uang_diterima', 'kembalian', 'status_pesanan', 'catatan', 'kasir_id', 'idempotency_key', 'created_at', 'updated_at'],
  DETAIL_PESANAN: ['id_detail', 'id_pesanan', 'id_produk', 'kode_produk', 'nama_produk', 'qty', 'harga_satuan', 'diskon_item', 'subtotal'],
  PEMBAYARAN: ['id_pembayaran', 'nomor_pembayaran', 'id_pesanan', 'nomor_pesanan', 'metode', 'jumlah', 'referensi_gateway', 'bukti_url', 'status_pembayaran', 'verified_by', 'created_at'],
  SIMPANAN: ['id_simpanan', 'nomor_transaksi', 'id_anggota', 'nama_anggota', 'jenis_simpanan', 'tipe', 'jumlah', 'saldo_sesudah', 'metode', 'keterangan', 'petugas_id', 'created_at'],
  PINJAMAN: ['id_pinjaman', 'nomor_pinjaman', 'id_anggota', 'nama_anggota', 'jumlah_pinjaman', 'tenor_bulan', 'bunga_persen', 'total_bunga', 'total_kewajiban', 'angsuran_per_bulan', 'sisa_pokok', 'sisa_tagihan', 'tujuan', 'status', 'approved_by', 'created_at', 'jatuh_tempo_berikutnya'],
  ANGSURAN: ['id_angsuran', 'nomor_transaksi', 'id_pinjaman', 'nomor_pinjaman', 'id_anggota', 'angsuran_ke', 'pokok_dibayar', 'bunga_dibayar', 'denda', 'total_bayar', 'metode', 'petugas_id', 'created_at'],
  KAS: ['id_kas', 'nomor_transaksi', 'tanggal', 'jenis', 'kategori_akun', 'jumlah', 'keterangan', 'referensi_id', 'user_id', 'created_at'],
  SUPPLIER: ['id_supplier', 'kode_supplier', 'nama_supplier', 'kontak_person', 'no_hp', 'alamat', 'kategori_pasokan', 'hutang_usaha', 'status'],
  PENGUMUMAN: ['id_pengumuman', 'judul', 'isi', 'kategori', 'prioritas', 'target_role', 'penulis', 'status', 'created_at'],
  LOG_AKTIVITAS: ['id_log', 'timestamp', 'id_user', 'username', 'role', 'aksi', 'modul', 'detail', 'ip_atau_device'],
  PENGATURAN: ['kunci', 'nilai', 'deskripsi', 'updated_at']
};

/* =========================== WEB APP ENTRYPOINT =========================== */

function doGet() {
  ensureDatabaseReady_();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('KOPERASI DIGITAL PRO — KREATIF BY WITNO')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* =========================== DATABASE SETUP =============================== */

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (e) {
      // fallback to active spreadsheet
    }
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }
  const created = SpreadsheetApp.create('DB_KOPERASI_DIGITAL_PRO');
  props.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function ensureDatabaseReady_() {
  const ss = getSpreadsheet_();
  const usersSheet = ss.getSheetByName('USERS');
  if (!usersSheet || usersSheet.getLastRow() < 2) {
    setupDatabase();
  }
}

/**
 * Jalankan fungsi ini sekali dari editor Apps Script (atau otomatis saat akses pertama)
 * untuk membuat seluruh 16 Sheet beserta header & data awal.
 */
function setupDatabase() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = getSpreadsheet_();
    Object.keys(SHEET_SCHEMAS).forEach(function (sheetName) {
      let sh = ss.getSheetByName(sheetName);
      if (!sh) {
        sh = ss.insertSheet(sheetName);
      }
      if (sh.getLastRow() === 0) {
        const headers = SHEET_SCHEMAS[sheetName];
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.getRange(1, 1, 1, headers.length)
          .setFontWeight('bold')
          .setBackground('#0D6E4E')
          .setFontColor('#FFFFFF');
        sh.setFrozenRows(1);
      }
    });

    // Seed default USERS & ANGGOTA if empty
    const userRows = readSheetObjects_('USERS');
    if (userRows.length === 0) {
      const now = new Date().toISOString();
      const sAdmin = generateSalt_();
      const sKasir = generateSalt_();
      const sAng1 = generateSalt_();

      appendObject_('ANGGOTA', {
        id_anggota: 'ANG-001',
        kode_anggota: 'KOP-2026-001',
        nik: '3273011205920001',
        nama: 'Budi Santoso',
        alamat: 'Jl. Merdeka No. 45, Bandung',
        no_hp: '081234567890',
        email: 'budi@koperasi.id',
        tanggal_gabung: now.slice(0, 10),
        status_anggota: 'AKTIF',
        saldo_pokok: 500000,
        saldo_wajib: 1800000,
        saldo_sukarela: 2450000,
        limit_kredit: 15000000,
        foto_url: '',
        qr_token: 'KDP-MEMBER-ANG-001-KOP-2026-001'
      });

      appendObject_('USERS', {
        id_user: 'USR-ADMIN', username: 'admin', password_hash: hashPassword_('Admin123!', sAdmin), salt: sAdmin,
        nama_lengkap: 'Witno Suryanto (Admin)', email: 'admin@koperasi.id', no_hp: '081100000001',
        role: 'ADMIN', id_anggota: '', status: 'AKTIF', created_at: now, last_login: ''
      });
      appendObject_('USERS', {
        id_user: 'USR-KASIR', username: 'kasir', password_hash: hashPassword_('Kasir123!', sKasir), salt: sKasir,
        nama_lengkap: 'Rina Kusuma (Kasir)', email: 'kasir@koperasi.id', no_hp: '081100000002',
        role: 'KASIR', id_anggota: '', status: 'AKTIF', created_at: now, last_login: ''
      });
      appendObject_('USERS', {
        id_user: 'USR-ANG1', username: 'anggota1', password_hash: hashPassword_('Anggota123!', sAng1), salt: sAng1,
        nama_lengkap: 'Budi Santoso', email: 'budi@koperasi.id', no_hp: '081234567890',
        role: 'ANGGOTA', id_anggota: 'ANG-001', status: 'AKTIF', created_at: now, last_login: ''
      });

      appendObject_('KATEGORI', { id_kategori: 'KAT-01', nama_kategori: 'Sembako & Pangan', ikon: 'wheat', deskripsi: 'Kebutuhan pokok anggota', urutan: 1, status: 'AKTIF' });
      appendObject_('KATEGORI', { id_kategori: 'KAT-02', nama_kategori: 'Kopi & UMKM', ikon: 'coffee', deskripsi: 'Produk unggulan UMKM', urutan: 2, status: 'AKTIF' });
      appendObject_('KATEGORI', { id_kategori: 'KAT-05', nama_kategori: 'Pecah Belah', ikon: 'utensils', deskripsi: 'Peralatan makan keramik & gelas kaca', urutan: 3, status: 'AKTIF' });
      appendObject_('KATEGORI', { id_kategori: 'KAT-06', nama_kategori: 'Elektronik', ikon: 'cpu', deskripsi: 'Peralatan elektronik rumah tangga', urutan: 4, status: 'AKTIF' });

      appendObject_('SUPPLIER', {
        id_supplier: 'SUP-01', kode_supplier: 'SUP-001', nama_supplier: 'Gapoktan Makmur Sejahtera',
        kontak_person: 'Pak Darmawan', no_hp: '081322334455', alamat: 'Cianjur', kategori_pasokan: 'Beras & Pangan',
        hutang_usaha: 0, status: 'AKTIF'
      });

      appendObject_('PRODUK', {
        id_produk: 'PRD-001', kode_produk: 'KOP-BRS-01', barcode: '8991001100015',
        nama_produk: 'Beras Organik Nusa Premium 5 Kg', id_kategori: 'KAT-01', nama_kategori: 'Sembako & Pangan',
        id_supplier: 'SUP-01', deskripsi: 'Beras putih organik pulen hasil panen petani mitra koperasi.',
        harga_normal: 85000, harga_anggota: 76000, harga_promo: 72500, stok: 60, stok_min: 10,
        satuan: 'Pouch 5 Kg', foto_url: '', rating: 4.9, terjual: 120, unggulan: true, status: 'AKTIF', created_at: now
      });

      appendObject_('PRODUK', {
        id_produk: 'PRD-002', kode_produk: 'KOP-KOPI-02', barcode: '8991001100022',
        nama_produk: 'Kopi Arabika Toraja Roasted 250g', id_kategori: 'KAT-02', nama_kategori: 'Kopi & UMKM',
        id_supplier: 'SUP-01', deskripsi: 'Biji kopi Arabika single origin sangrai medium.',
        harga_normal: 95000, harga_anggota: 82000, harga_promo: 78000, stok: 40, stok_min: 8,
        satuan: 'Pouch 250g', foto_url: '', rating: 4.9, terjual: 85, unggulan: true, status: 'AKTIF', created_at: now
      });

      appendObject_('PRODUK', {
        id_produk: 'PRD-007', kode_produk: 'KOP-PRG-07', barcode: '8991001100077',
        nama_produk: 'Set Piring & Mangkuk Keramik Porcelain 12 Pcs', id_kategori: 'KAT-05', nama_kategori: 'Pecah Belah',
        id_supplier: 'SUP-01', deskripsi: 'Set perlengkapan makan keramik tahan panas 12 pcs.',
        harga_normal: 345000, harga_anggota: 289000, harga_promo: 265000, stok: 18, stok_min: 4,
        satuan: 'Set 12 Pcs', foto_url: '', rating: 4.9, terjual: 64, unggulan: true, status: 'AKTIF', created_at: now
      });

      appendObject_('PRODUK', {
        id_produk: 'PRD-009', kode_produk: 'KOP-RCK-09', barcode: '8991001100091',
        nama_produk: 'Digital Smart Rice Cooker Low Watt 1.8 Liter', id_kategori: 'KAT-06', nama_kategori: 'Elektronik',
        id_supplier: 'SUP-01', deskripsi: 'Penanak nasi digital multifungsi hemat daya 400W.',
        harga_normal: 620000, harga_anggota: 525000, harga_promo: 489000, stok: 14, stok_min: 3,
        satuan: 'Unit', foto_url: '', rating: 5.0, terjual: 52, unggulan: true, status: 'AKTIF', created_at: now
      });

      appendObject_('KAS', {
        id_kas: 'KAS-001', nomor_transaksi: 'KAS-INIT-001', tanggal: now.slice(0, 10), jenis: 'MASUK',
        kategori_akun: 'MODAL', jumlah: 25000000, keterangan: 'Modal awal koperasi',
        referensi_id: 'INIT', user_id: 'USR-ADMIN', created_at: now
      });

      appendObject_('PENGUMUMAN', {
        id_pengumuman: 'PNG-001', judul: 'Selamat Datang di KOPERASI DIGITAL PRO',
        isi: 'Nikmati harga khusus anggota dan pencatatan SHU otomatis setiap berbelanja di koperasi.',
        kategori: 'PROMO', prioritas: 'TINGGI', target_role: 'SEMUA', penulis: 'Admin', status: 'AKTIF', created_at: now
      });

      const defaultSettings = {
        nama_koperasi: 'KOPERASI DIGITAL PRO',
        branding: 'KREATIF BY WITNO',
        alamat: 'Jl. Jenderal Sudirman No. 88, Bandung',
        telepon: '(022) 8880-2026',
        bunga_pinjaman_persen_per_bulan: '1.5',
        izinkan_bayar_saldo_koperasi: 'true',
        bank_nama: 'Bank BCA',
        bank_rekening: '7750-8891-2026',
        qris_merchant_id: 'ID10202600088192',
        shu_jasa_modal_persen: '25',
        shu_jasa_anggota_persen: '30',
        shu_cadangan_persen: '25',
        shu_pengurus_persen: '10',
        shu_sosial_persen: '10'
      };
      Object.keys(defaultSettings).forEach(function (k) {
        appendObject_('PENGATURAN', { kunci: k, nilai: defaultSettings[k], deskripsi: k, updated_at: now });
      });

      writeLog_({ id_user: 'SYSTEM', username: 'system', role: 'ADMIN' }, 'SETUP_DATABASE', 'SISTEM', 'Inisialisasi 16 sheet selesai');
    }
    return { ok: true, spreadsheetUrl: ss.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

/* =========================== SECURITY & HELPERS =========================== */

function generateSalt_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function hashPassword_(password, salt) {
  const raw = salt + ':' + password + ':' + APP_CONFIG.SECRET_PEPPER;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return digest.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function createId_(prefix) {
  return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function createTrxNo_(prefix) {
  const now = new Date();
  const ymd = Utilities.formatDate(now, 'Asia/Jakarta', 'yyMMdd');
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return prefix + '-' + ymd + '-' + rnd;
}

function readSheetObjects_(sheetName) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = { _rowIndex: i + 1 };
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = data[i][c];
    }
    rows.push(obj);
  }
  return rows;
}

function appendObject_(sheetName, obj) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const row = headers.map(function (h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
  });
  sh.appendRow(row);
}

function updateRowById_(sheetName, idCol, idVal, patchObj) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return false;
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idCol);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idIdx]) === String(idVal)) {
      Object.keys(patchObj).forEach(function (key) {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sh.getRange(r + 1, colIdx + 1).setValue(patchObj[key]);
        }
      });
      return true;
    }
  }
  return false;
}

function requireSession_(token, allowedRoles) {
  if (!token) throw new Error('Sesi berakhir. Silakan login kembali.');
  const raw = CacheService.getScriptCache().get('SESSION_' + token);
  if (!raw) throw new Error('Sesi tidak valid atau telah kedaluwarsa.');
  const session = JSON.parse(raw);
  if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
    throw new Error('Akses ditolak: Anda tidak memiliki izin pada modul ini.');
  }
  return session;
}

function writeLog_(actor, aksi, modul, detail) {
  appendObject_('LOG_AKTIVITAS', {
    id_log: createId_('LOG'),
    timestamp: new Date().toISOString(),
    id_user: actor.id_user,
    username: actor.username,
    role: actor.role,
    aksi: aksi,
    modul: modul,
    detail: detail,
    ip_atau_device: 'Google Apps Script WebApp'
  });
}

function getSettingsMap_() {
  const rows = readSheetObjects_('PENGATURAN');
  const map = {};
  rows.forEach(function (r) { map[r.kunci] = r.nilai; });
  return map;
}

/* =========================== AUTHENTICATION =============================== */

function loginUser(username, password) {
  ensureDatabaseReady_();
  const users = readSheetObjects_('USERS');
  const u = users.find(function (row) {
    return String(row.username).toLowerCase() === String(username).trim().toLowerCase();
  });
  if (!u) throw new Error('Username tidak ditemukan.');
  if (u.status !== 'AKTIF') throw new Error('Akun dinonaktifkan oleh Admin.');
  if (hashPassword_(password, u.salt) !== u.password_hash) {
    writeLog_({ id_user: u.id_user, username: u.username, role: u.role }, 'LOGIN_GAGAL', 'AUTH', 'Password salah');
    throw new Error('Username atau password salah.');
  }

  const token = Utilities.getUuid();
  const session = {
    id_user: u.id_user,
    username: u.username,
    nama_lengkap: u.nama_lengkap,
    role: u.role,
    id_anggota: u.id_anggota || ''
  };
  CacheService.getScriptCache().put('SESSION_' + token, JSON.stringify(session), APP_CONFIG.SESSION_TTL_SECONDS);
  updateRowById_('USERS', 'id_user', u.id_user, { last_login: new Date().toISOString() });
  writeLog_(session, 'LOGIN_BERHASIL', 'AUTH', 'Login sebagai ' + u.role);

  let anggota = null;
  if (u.id_anggota) {
    anggota = readSheetObjects_('ANGGOTA').find(function (a) { return a.id_anggota === u.id_anggota; }) || null;
  }
  return { token: token, user: session, anggota: anggota };
}

function logoutUser(token) {
  if (token) {
    const raw = CacheService.getScriptCache().get('SESSION_' + token);
    if (raw) {
      writeLog_(JSON.parse(raw), 'LOGOUT', 'AUTH', 'Keluar dari sistem');
      CacheService.getScriptCache().remove('SESSION_' + token);
    }
  }
  return { ok: true };
}

/* =========================== BOOTSTRAP & DRIVE ============================ */

function getBootstrapData(token) {
  ensureDatabaseReady_();
  let session = null;
  let anggota = null;
  if (token) {
    try {
      session = requireSession_(token);
      if (session.id_anggota) {
        anggota = readSheetObjects_('ANGGOTA').find(function (a) { return a.id_anggota === session.id_anggota; }) || null;
      }
    } catch (e) {
      session = null;
    }
  }
  return {
    pengaturan: getSettingsMap_(),
    kategori: readSheetObjects_('KATEGORI').filter(function (k) { return k.status === 'AKTIF'; }),
    produk: readSheetObjects_('PRODUK').filter(function (p) { return p.status === 'AKTIF'; }),
    pengumuman: readSheetObjects_('PENGUMUMAN').filter(function (p) { return p.status === 'AKTIF'; }),
    user: session,
    anggota: anggota
  };
}

function uploadImageToDrive(token, base64Data, fileName, mimeType) {
  const session = requireSession_(token, ['ADMIN', 'KASIR', 'ANGGOTA']);
  const folders = DriveApp.getFoldersByName(APP_CONFIG.DRIVE_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(APP_CONFIG.DRIVE_FOLDER_NAME);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType || 'image/jpeg', fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  writeLog_(session, 'UPLOAD_DRIVE', 'MEDIA', 'Upload ' + fileName);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

/* =========================== CHECKOUT & PESANAN =========================== */

function checkoutOrder(token, payload) {
  const session = requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const idempotencyKey = String(payload.idempotency_key || '');
    if (!idempotencyKey) throw new Error('Idempotency key wajib ada.');
    const existingOrders = readSheetObjects_('PESANAN');
    const dup = existingOrders.find(function (o) { return o.idempotency_key === idempotencyKey; });
    if (dup) return { duplicate: true, order: dup };

    const channel = payload.channel === 'POS_KASIR' ? 'POS_KASIR' : 'MARKETPLACE';
    if (channel === 'POS_KASIR' && ['ADMIN', 'KASIR'].indexOf(session.role) === -1) {
      throw new Error('Hanya Kasir atau Admin yang dapat memproses transaksi POS.');
    }

    const produkList = readSheetObjects_('PRODUK');
    const anggotaList = readSheetObjects_('ANGGOTA');
    const settings = getSettingsMap_();

    const targetAnggotaId = channel === 'POS_KASIR' ? (payload.target_anggota_id || '') : session.id_anggota;
    const anggota = targetAnggotaId ? anggotaList.find(function (a) { return a.id_anggota === targetAnggotaId; }) : null;

    let subtotalNormal = 0;
    let diskonAnggota = 0;
    let diskonPromo = 0;
    let totalBayar = 0;
    const details = [];

    payload.items.forEach(function (reqItem) {
      const qty = Math.floor(Number(reqItem.qty));
      if (qty <= 0) throw new Error('Qty tidak valid.');
      const prod = produkList.find(function (p) { return p.id_produk === reqItem.id_produk && p.status === 'AKTIF'; });
      if (!prod) throw new Error('Produk tidak ditemukan.');
      if (Number(prod.stok) < qty) throw new Error('Stok tidak cukup untuk ' + prod.nama_produk);

      const hNormal = Number(prod.harga_normal);
      const hMember = anggota ? Number(prod.harga_anggota) : hNormal;
      const hPromo = Number(prod.harga_promo || 0);
      const unitPrice = (hPromo > 0 && hPromo < hMember) ? hPromo : hMember;

      subtotalNormal += hNormal * qty;
      diskonAnggota += anggota ? Math.max(0, hNormal - hMember) * qty : 0;
      diskonPromo += Math.max(0, hMember - unitPrice) * qty;
      totalBayar += unitPrice * qty;

      details.push({
        id_detail: createId_('DTL'),
        id_produk: prod.id_produk,
        kode_produk: prod.kode_produk,
        nama_produk: prod.nama_produk,
        qty: qty,
        harga_satuan: unitPrice,
        diskon_item: (hNormal - unitPrice) * qty,
        subtotal: unitPrice * qty,
        new_stok: Number(prod.stok) - qty,
        new_terjual: Number(prod.terjual || 0) + qty
      });
    });

    const metode = payload.metode_pembayaran || 'TUNAI';
    let paidNow = false;
    let statusPesanan = 'MENUNGGU_PEMBAYARAN';
    let uangDiterima = Number(payload.uang_diterima || 0);
    let kembalian = 0;

    if (metode === 'SALDO_KOPERASI') {
      if (settings.izinkan_bayar_saldo_koperasi !== 'true') throw new Error('Pembayaran saldo dinonaktifkan.');
      if (!anggota) throw new Error('Hanya anggota aktif yang dapat membayar dengan saldo koperasi.');
      if (Number(anggota.saldo_sukarela) < totalBayar) throw new Error('Saldo Simpanan Sukarela tidak cukup.');
      const saldoBaru = Number(anggota.saldo_sukarela) - totalBayar;
      updateRowById_('ANGGOTA', 'id_anggota', anggota.id_anggota, { saldo_sukarela: saldoBaru });
      appendObject_('SIMPANAN', {
        id_simpanan: createId_('SMP'), nomor_transaksi: createTrxNo_('SMP'),
        id_anggota: anggota.id_anggota, nama_anggota: anggota.nama, jenis_simpanan: 'SUKARELA',
        tipe: 'TARIK', jumlah: totalBayar, saldo_sesudah: saldoBaru, metode: 'BELANJA_KOPERASI',
        keterangan: 'Pembayaran belanja', petugas_id: session.id_user, created_at: new Date().toISOString()
      });
      paidNow = true;
      uangDiterima = totalBayar;
      statusPesanan = channel === 'POS_KASIR' ? 'SELESAI' : 'DIPROSES';
    } else if (channel === 'POS_KASIR') {
      if (metode === 'TUNAI') {
        if (uangDiterima < totalBayar) throw new Error('Uang tunai kurang.');
        kembalian = uangDiterima - totalBayar;
      } else {
        uangDiterima = totalBayar;
      }
      paidNow = true;
      statusPesanan = 'SELESAI';
    } else {
      statusPesanan = metode === 'TUNAI' ? 'DIPROSES' : 'MENUNGGU_PEMBAYARAN';
    }

    details.forEach(function (d) {
      updateRowById_('PRODUK', 'id_produk', d.id_produk, { stok: d.new_stok, terjual: d.new_terjual });
    });

    const idPesanan = createId_('ORD');
    const nomorPesanan = createTrxNo_('KDP');
    const now = new Date().toISOString();

    const orderObj = {
      id_pesanan: idPesanan, nomor_pesanan: nomorPesanan, id_user: session.id_user,
      id_anggota: anggota ? anggota.id_anggota : '', nama_pembeli: anggota ? anggota.nama : (payload.nama_pembeli_umum || session.nama_lengkap),
      channel: channel, metode_pembayaran: metode, subtotal: subtotalNormal,
      diskon_anggota: diskonAnggota, diskon_promo: diskonPromo, total_bayar: totalBayar,
      uang_diterima: uangDiterima, kembalian: kembalian, status_pesanan: statusPesanan,
      catatan: payload.catatan || '', kasir_id: channel === 'POS_KASIR' ? session.id_user : '',
      idempotency_key: idempotencyKey, created_at: now, updated_at: now
    };
    appendObject_('PESANAN', orderObj);

    details.forEach(function (d) {
      d.id_pesanan = idPesanan;
      appendObject_('DETAIL_PESANAN', d);
    });

    appendObject_('PEMBAYARAN', {
      id_pembayaran: createId_('PAY'), nomor_pembayaran: createTrxNo_('PAY'),
      id_pesanan: idPesanan, nomor_pesanan: nomorPesanan, metode: metode, jumlah: totalBayar,
      referensi_gateway: metode + '-' + nomorPesanan, bukti_url: '',
      status_pembayaran: paidNow ? 'TERVERIFIKASI' : 'PENDING',
      verified_by: paidNow ? session.id_user : '', created_at: now
    });

    if (paidNow) {
      appendObject_('KAS', {
        id_kas: createId_('KAS'), nomor_transaksi: createTrxNo_('KAS'), tanggal: now.slice(0, 10),
        jenis: 'MASUK', kategori_akun: 'PENDAPATAN_PENJUALAN', jumlah: totalBayar,
        keterangan: 'Penjualan ' + nomorPesanan, referensi_id: idPesanan, user_id: session.id_user, created_at: now
      });
    }

    writeLog_(session, 'CHECKOUT_PESANAN', channel, nomorPesanan + ' Rp ' + totalBayar);
    return { order: orderObj, items: details };
  } finally {
    lock.releaseLock();
  }
}

function getOrders(token) {
  const session = requireSession_(token);
  const isStaff = ['ADMIN', 'KASIR'].indexOf(session.role) !== -1;
  const orders = readSheetObjects_('PESANAN').filter(function (o) {
    return isStaff || o.id_user === session.id_user || (session.id_anggota && o.id_anggota === session.id_anggota);
  });
  const details = readSheetObjects_('DETAIL_PESANAN');
  return orders.map(function (o) {
    o.items = details.filter(function (d) { return d.id_pesanan === o.id_pesanan; });
    return o;
  }).reverse();
}

function updateOrderStatus(token, idPesanan, nextStatus) {
  const session = requireSession_(token, ['ADMIN', 'KASIR']);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    updateRowById_('PESANAN', 'id_pesanan', idPesanan, { status_pesanan: nextStatus, updated_at: new Date().toISOString() });
    writeLog_(session, 'UPDATE_STATUS_PESANAN', 'PESANAN', idPesanan + ' -> ' + nextStatus);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* =========================== SIMPANAN & PINJAMAN ========================== */

function getSimpananData(token) {
  const session = requireSession_(token);
  const isStaff = ['ADMIN', 'KASIR'].indexOf(session.role) !== -1;
  const all = readSheetObjects_('SIMPANAN');
  const anggota = readSheetObjects_('ANGGOTA');
  return {
    riwayat: isStaff ? all.reverse() : all.filter(function (s) { return s.id_anggota === session.id_anggota; }).reverse(),
    rekap_anggota: isStaff ? anggota : anggota.filter(function (a) { return a.id_anggota === session.id_anggota; })
  };
}

function transaksiSimpanan(token, payload) {
  const session = requireSession_(token, ['ADMIN', 'KASIR']);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const nominal = Math.round(Number(payload.jumlah));
    if (nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
    const anggota = readSheetObjects_('ANGGOTA').find(function (a) { return a.id_anggota === payload.id_anggota; });
    if (!anggota) throw new Error('Anggota tidak ditemukan.');

    const jenis = payload.jenis_simpanan; // POKOK | WAJIB | SUKARELA
    const tipe = payload.tipe; // SETOR | TARIK
    let saldoBaru = 0;

    if (tipe === 'TARIK') {
      if (jenis !== 'SUKARELA') throw new Error('Hanya Simpanan Sukarela yang boleh ditarik sewaktu-waktu.');
      if (Number(anggota.saldo_sukarela) < nominal) throw new Error('Saldo Sukarela tidak mencukupi.');
      saldoBaru = Number(anggota.saldo_sukarela) - nominal;
      updateRowById_('ANGGOTA', 'id_anggota', anggota.id_anggota, { saldo_sukarela: saldoBaru });
    } else {
      const col = jenis === 'POKOK' ? 'saldo_pokok' : (jenis === 'WAJIB' ? 'saldo_wajib' : 'saldo_sukarela');
      saldoBaru = Number(anggota[col]) + nominal;
      const patch = {};
      patch[col] = saldoBaru;
      updateRowById_('ANGGOTA', 'id_anggota', anggota.id_anggota, patch);
    }

    const now = new Date().toISOString();
    const idSimpanan = createId_('SMP');
    appendObject_('SIMPANAN', {
      id_simpanan: idSimpanan, nomor_transaksi: createTrxNo_('SMP'),
      id_anggota: anggota.id_anggota, nama_anggota: anggota.nama, jenis_simpanan: jenis,
      tipe: tipe, jumlah: nominal, saldo_sesudah: saldoBaru, metode: payload.metode || 'TUNAI',
      keterangan: payload.keterangan || (tipe + ' ' + jenis), petugas_id: session.id_user, created_at: now
    });

    appendObject_('KAS', {
      id_kas: createId_('KAS'), nomor_transaksi: createTrxNo_('KAS'), tanggal: now.slice(0, 10),
      jenis: tipe === 'SETOR' ? 'MASUK' : 'KELUAR', kategori_akun: 'SIMPANAN_ANGGOTA',
      jumlah: nominal, keterangan: tipe + ' Simpanan ' + jenis + ' - ' + anggota.nama,
      referensi_id: idSimpanan, user_id: session.id_user, created_at: now
    });

    writeLog_(session, tipe + '_SIMPANAN', 'SIMPANAN', anggota.nama + ' Rp ' + nominal);
    return { ok: true, saldoBaru: saldoBaru };
  } finally {
    lock.releaseLock();
  }
}

function getPinjamanData(token) {
  const session = requireSession_(token);
  const isStaff = ['ADMIN', 'KASIR'].indexOf(session.role) !== -1;
  const pnj = readSheetObjects_('PINJAMAN');
  const angs = readSheetObjects_('ANGSURAN');
  return {
    pinjaman: isStaff ? pnj.reverse() : pnj.filter(function (p) { return p.id_anggota === session.id_anggota; }).reverse(),
    angsuran: isStaff ? angs.reverse() : angs.filter(function (a) { return a.id_anggota === session.id_anggota; }).reverse()
  };
}

function ajukanPinjaman(token, payload) {
  const session = requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const targetId = session.role === 'ADMIN' && payload.id_anggota ? payload.id_anggota : session.id_anggota;
    const anggota = readSheetObjects_('ANGGOTA').find(function (a) { return a.id_anggota === targetId; });
    if (!anggota) throw new Error('Hanya anggota terdaftar yang dapat mengajukan pinjaman.');

    const nominal = Math.round(Number(payload.jumlah_pinjaman));
    const tenor = Math.floor(Number(payload.tenor_bulan));
    if (nominal < 500000 || tenor < 1) throw new Error('Nominal/tenor pinjaman tidak valid.');
    if (nominal > Number(anggota.limit_kredit)) throw new Error('Melebihi plafon kredit anggota.');

    const settings = getSettingsMap_();
    const bungaPersen = Number(settings.bunga_pinjaman_persen_per_bulan || 1.5);
    const totalBunga = Math.round((nominal * bungaPersen * tenor) / 100);
    const totalKewajiban = nominal + totalBunga;
    const angsuranPerBulan = Math.round(totalKewajiban / tenor);

    appendObject_('PINJAMAN', {
      id_pinjaman: createId_('PNJ'), nomor_pinjaman: createTrxNo_('PNJ'),
      id_anggota: anggota.id_anggota, nama_anggota: anggota.nama,
      jumlah_pinjaman: nominal, tenor_bulan: tenor, bunga_persen: bungaPersen,
      total_bunga: totalBunga, total_kewajiban: totalKewajiban, angsuran_per_bulan: angsuranPerBulan,
      sisa_pokok: nominal, sisa_tagihan: totalKewajiban, tujuan: payload.tujuan || '-',
      status: 'MENUNGGU_PERSETUJUAN', approved_by: '', created_at: new Date().toISOString(), jatuh_tempo_berikutnya: ''
    });
    writeLog_(session, 'AJUKAN_PINJAMAN', 'PINJAMAN', anggota.nama + ' Rp ' + nominal);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function keputusanPinjaman(token, idPinjaman, keputusan) {
  const session = requireSession_(token, ['ADMIN']);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const loan = readSheetObjects_('PINJAMAN').find(function (p) { return p.id_pinjaman === idPinjaman; });
    if (!loan) throw new Error('Pinjaman tidak ditemukan.');
    if (keputusan === 'TOLAK') {
      updateRowById_('PINJAMAN', 'id_pinjaman', idPinjaman, { status: 'DITOLAK', approved_by: session.id_user });
      return { ok: true };
    }
    const now = new Date().toISOString();
    updateRowById_('PINJAMAN', 'id_pinjaman', idPinjaman, { status: 'AKTIF', approved_by: session.id_user });
    appendObject_('KAS', {
      id_kas: createId_('KAS'), nomor_transaksi: createTrxNo_('KAS'), tanggal: now.slice(0, 10),
      jenis: 'KELUAR', kategori_akun: 'PENCAIRAN_PINJAMAN', jumlah: Number(loan.jumlah_pinjaman),
      keterangan: 'Pencairan ' + loan.nomor_pinjaman, referensi_id: idPinjaman, user_id: session.id_user, created_at: now
    });
    writeLog_(session, 'SETUJUI_PINJAMAN', 'PINJAMAN', loan.nomor_pinjaman);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function bayarAngsuran(token, idPinjaman) {
  const session = requireSession_(token, ['ADMIN', 'KASIR']);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const loan = readSheetObjects_('PINJAMAN').find(function (p) { return p.id_pinjaman === idPinjaman; });
    if (!loan || loan.status !== 'AKTIF') throw new Error('Pinjaman tidak aktif.');
    const existingCount = readSheetObjects_('ANGSURAN').filter(function (a) { return a.id_pinjaman === idPinjaman; }).length;
    const pokok = Math.min(Math.round(Number(loan.jumlah_pinjaman) / Number(loan.tenor_bulan)), Number(loan.sisa_pokok));
    const bunga = Math.min(Math.round(Number(loan.total_bunga) / Number(loan.tenor_bulan)), Math.max(0, Number(loan.sisa_tagihan) - Number(loan.sisa_pokok)));
    const sisaPokokBaru = Math.max(0, Number(loan.sisa_pokok) - pokok);
    const sisaTagihanBaru = Math.max(0, Number(loan.sisa_tagihan) - (pokok + bunga));
    const statusBaru = sisaTagihanBaru <= 0 ? 'LUNAS' : 'AKTIF';

    updateRowById_('PINJAMAN', 'id_pinjaman', idPinjaman, {
      sisa_pokok: sisaPokokBaru, sisa_tagihan: sisaTagihanBaru, status: statusBaru
    });

    const now = new Date().toISOString();
    const idAngs = createId_('ANGS');
    appendObject_('ANGSURAN', {
      id_angsuran: idAngs, nomor_transaksi: createTrxNo_('ANGS'), id_pinjaman: idPinjaman,
      nomor_pinjaman: loan.nomor_pinjaman, id_anggota: loan.id_anggota, angsuran_ke: existingCount + 1,
      pokok_dibayar: pokok, bunga_dibayar: bunga, denda: 0, total_bayar: pokok + bunga,
      metode: 'TUNAI', petugas_id: session.id_user, created_at: now
    });

    appendObject_('KAS', {
      id_kas: createId_('KAS'), nomor_transaksi: createTrxNo_('KAS'), tanggal: now.slice(0, 10),
      jenis: 'MASUK', kategori_akun: 'ANGSURAN_PINJAMAN', jumlah: pokok,
      keterangan: 'Pokok angsuran ' + loan.nomor_pinjaman, referensi_id: idAngs, user_id: session.id_user, created_at: now
    });
    if (bunga > 0) {
      appendObject_('KAS', {
        id_kas: createId_('KAS'), nomor_transaksi: createTrxNo_('KAS'), tanggal: now.slice(0, 10),
        jenis: 'MASUK', kategori_akun: 'PENDAPATAN_BUNGA', jumlah: bunga,
        keterangan: 'Bunga angsuran ' + loan.nomor_pinjaman, referensi_id: idAngs, user_id: session.id_user, created_at: now
      });
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* =========================== ADMIN CRUD & LAPORAN ========================= */

function saveProduk(token, payload) {
  const session = requireSession_(token, ['ADMIN']);
  const now = new Date().toISOString();
  const id = payload.id_produk || createId_('PRD');
  const row = {
    id_produk: id,
    kode_produk: payload.kode_produk || ('KOP-' + Math.floor(100 + Math.random() * 900)),
    barcode: payload.barcode || ('8991001' + String(Date.now()).slice(-6)),
    nama_produk: payload.nama_produk,
    id_kategori: payload.id_kategori || 'KAT-01',
    nama_kategori: payload.nama_kategori || 'Sembako & Pangan',
    id_supplier: payload.id_supplier || 'SUP-01',
    deskripsi: payload.deskripsi || '',
    harga_normal: Number(payload.harga_normal),
    harga_anggota: Number(payload.harga_anggota || payload.harga_normal),
    harga_promo: Number(payload.harga_promo || 0),
    stok: Number(payload.stok || 0),
    stok_min: 5,
    satuan: payload.satuan || 'Pcs',
    foto_url: payload.foto_url || '',
    rating: 5.0,
    terjual: 0,
    unggulan: Boolean(payload.unggulan),
    status: 'AKTIF',
    created_at: now
  };
  appendObject_('PRODUK', row);
  writeLog_(session, 'TAMBAH_PRODUK', 'PRODUK', row.nama_produk);
  return row;
}

function getAdminDashboardAndFinance(token) {
  requireSession_(token, ['ADMIN', 'KASIR']);
  const anggota = readSheetObjects_('ANGGOTA');
  const produk = readSheetObjects_('PRODUK').filter(function (p) { return p.status === 'AKTIF'; });
  const pesanan = readSheetObjects_('PESANAN');
  const pinjaman = readSheetObjects_('PINJAMAN');
  const kas = readSheetObjects_('KAS');
  const logs = readSheetObjects_('LOG_AKTIVITAS').reverse().slice(0, 50);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = pesanan.filter(function (o) { return String(o.created_at).slice(0, 10) === today && o.status_pesanan !== 'DIBATALKAN'; });
  const kasMasuk = kas.filter(function (k) { return k.jenis === 'MASUK'; }).reduce(function (s, k) { return s + Number(k.jumlah); }, 0);
  const kasKeluar = kas.filter(function (k) { return k.jenis === 'KELUAR'; }).reduce(function (s, k) { return s + Number(k.jumlah); }, 0);

  const pendapatanJual = kas.filter(function (k) { return k.kategori_akun === 'PENDAPATAN_PENJUALAN'; }).reduce(function (s, k) { return s + Number(k.jumlah); }, 0);
  const pendapatanBunga = kas.filter(function (k) { return k.kategori_akun === 'PENDAPATAN_BUNGA'; }).reduce(function (s, k) { return s + Number(k.jumlah); }, 0);
  const bebanOps = kas.filter(function (k) { return k.jenis === 'KELUAR' && (k.kategori_akun === 'PENGELUARAN_OPERASIONAL' || k.kategori_akun === 'PEMBELIAN_STOK'); }).reduce(function (s, k) { return s + Number(k.jumlah); }, 0);

  return {
    stats: {
      totalAnggota: anggota.length,
      totalProduk: produk.length,
      pesananHariIni: todayOrders.length,
      penjualanHariIni: todayOrders.reduce(function (s, o) { return s + Number(o.total_bayar); }, 0),
      totalSimpanan: anggota.reduce(function (s, a) { return s + Number(a.saldo_pokok) + Number(a.saldo_wajib) + Number(a.saldo_sukarela); }, 0),
      totalPinjamanAktif: pinjaman.filter(function (p) { return p.status === 'AKTIF'; }).reduce(function (s, p) { return s + Number(p.sisa_pokok); }, 0),
      totalKas: kasMasuk - kasKeluar
    },
    labaRugi: {
      pendapatanPenjualan: pendapatanJual,
      pendapatanBunga: pendapatanBunga,
      totalBeban: bebanOps,
      shuBersih: pendapatanJual + pendapatanBunga - bebanOps
    },
    kas: kas.reverse(),
    anggota: anggota,
    logs: logs
  };
}
