import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type {
  AdminStatsResponse,
  AnggotaRecord,
  DetailPesananRecord,
  FinancialReportSummary,
  OrderStatus,
  PaymentMethod,
  SimpananJenis,
  SimpananTipe,
  UserRecord,
  UserRole,
} from './src/types/koperasi.ts';
import {
  appendLog,
  generateId,
  generateSalt,
  generateTransactionNo,
  hashPassword,
  loadDatabase,
  withDbLock,
} from './server/db.ts';

dotenv.config();

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'KOPERASI_DIGITAL_PRO_WITNO_HMAC_2026';

interface SessionPayload {
  id_user: string;
  username: string;
  role: UserRole;
  id_anggota: string | null;
  exp: number;
}

interface AuthedRequest extends Request {
  session?: SessionPayload;
}

function signToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeUser(u: Required<UserRecord>): UserRecord {
  const { password_hash: _ph, salt: _s, ...safe } = u;
  return safe;
}

function attachSession(req: AuthedRequest, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    const verified = verifyToken(token);
    if (verified) req.session = verified;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.session) {
    res.status(401).json({ error: 'Sesi login diperlukan. Silakan masuk terlebih dahulu.' });
    return;
  }
  next();
}

function requireRole(roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.session) {
      res.status(401).json({ error: 'Autentikasi diperlukan.' });
      return;
    }
    if (!roles.includes(req.session.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk fitur ini.' });
      return;
    }
    next();
  };
}

function calculateFinancialSummary(): FinancialReportSummary {
  const db = loadDatabase();
  const sumKas = (jenis: 'MASUK' | 'KELUAR', kategori: string) =>
    db.KAS.filter((k) => k.jenis === jenis && k.kategori_akun === kategori).reduce((s, k) => s + k.jumlah, 0);

  const pendapatanPenjualan = sumKas('MASUK', 'PENDAPATAN_PENJUALAN');
  const pendapatanBunga = sumKas('MASUK', 'PENDAPATAN_BUNGA');
  const totalPendapatan = pendapatanPenjualan + pendapatanBunga;

  const pembelianStok = sumKas('KELUAR', 'PEMBELIAN_STOK');
  const pengeluaranOps = sumKas('KELUAR', 'PENGELUARAN_OPERASIONAL');
  const totalBeban = pembelianStok + pengeluaranOps;
  const labaBersih = totalPendapatan - totalBeban;

  const kasMasukTotal = db.KAS.filter((k) => k.jenis === 'MASUK').reduce((s, k) => s + k.jumlah, 0);
  const kasKeluarTotal = db.KAS.filter((k) => k.jenis === 'KELUAR').reduce((s, k) => s + k.jumlah, 0);
  const kasDanBank = kasMasukTotal - kasKeluarTotal;

  const piutangPinjaman = db.PINJAMAN.filter((p) => p.status === 'AKTIF' || p.status === 'DISETUJUI').reduce(
    (s, p) => s + p.sisa_pokok,
    0
  );
  const nilaiPersediaan = db.PRODUK.filter((p) => p.status === 'AKTIF').reduce(
    (s, p) => s + p.stok * p.harga_anggota * 0.8,
    0
  );

  const simpananPokok = db.ANGGOTA.reduce((s, a) => s + a.saldo_pokok, 0);
  const simpananWajib = db.ANGGOTA.reduce((s, a) => s + a.saldo_wajib, 0);
  const simpananSukarela = db.ANGGOTA.reduce((s, a) => s + a.saldo_sukarela, 0);
  const hutangSupplier = db.SUPPLIER.reduce((s, sp) => s + sp.hutang_usaha, 0);
  const modalKoperasi = sumKas('MASUK', 'MODAL');

  const totalAktiva = kasDanBank + piutangPinjaman + Math.round(nilaiPersediaan);
  const totalKewajiban = simpananSukarela + hutangSupplier;
  const totalEkuitas = simpananPokok + simpananWajib + modalKoperasi + labaBersih;

  const shuPositif = Math.max(0, labaBersih);
  const cfg = db.PENGATURAN;

  return {
    periode: `Tahun Buku ${new Date().getFullYear()}`,
    laba_rugi: {
      pendapatan_penjualan: pendapatanPenjualan,
      pendapatan_bunga_pinjaman: pendapatanBunga,
      total_pendapatan: totalPendapatan,
      pembelian_stok_hpp: pembelianStok,
      pengeluaran_operasional: pengeluaranOps,
      total_beban: totalBeban,
      laba_bersih_shu: labaBersih,
    },
    neraca: {
      aktiva: {
        kas_dan_bank: kasDanBank,
        piutang_pinjaman_anggota: piutangPinjaman,
        nilai_persediaan_barang: Math.round(nilaiPersediaan),
        total_aktiva: totalAktiva,
      },
      kewajiban: {
        simpanan_sukarela_anggota: simpananSukarela,
        hutang_supplier: hutangSupplier,
        total_kewajiban: totalKewajiban,
      },
      ekuitas: {
        simpanan_pokok_anggota: simpananPokok,
        simpanan_wajib_anggota: simpananWajib,
        modal_koperasi: modalKoperasi,
        shu_tahun_berjalan: labaBersih,
        total_ekuitas: totalEkuitas,
      },
      total_kewajiban_dan_ekuitas: totalKewajiban + totalEkuitas,
    },
    alokasi_shu: {
      total_shu: shuPositif,
      jasa_modal: Math.round((shuPositif * cfg.shu_jasa_modal_persen) / 100),
      jasa_anggota: Math.round((shuPositif * cfg.shu_jasa_anggota_persen) / 100),
      dana_cadangan: Math.round((shuPositif * cfg.shu_cadangan_persen) / 100),
      dana_pengurus: Math.round((shuPositif * cfg.shu_pengurus_persen) / 100),
      dana_sosial: Math.round((shuPositif * cfg.shu_sosial_persen) / 100),
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(attachSession);

  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // Ensure DB initialized
  loadDatabase();

  // ======================== AUTH & PUBLIC BOOTSTRAP ========================
  app.get('/api/bootstrap', (req: AuthedRequest, res) => {
    const db = loadDatabase();
    let currentUser: UserRecord | null = null;
    let currentAnggota: AnggotaRecord | null = null;

    if (req.session) {
      const found = db.USERS.find((u) => u.id_user === req.session!.id_user && u.status === 'AKTIF');
      if (found) {
        currentUser = sanitizeUser(found);
        if (found.id_anggota) {
          currentAnggota = db.ANGGOTA.find((a) => a.id_anggota === found.id_anggota) || null;
        }
      }
    }

    const pengumuman = db.PENGUMUMAN.filter((p) => {
      if (p.status !== 'AKTIF') return false;
      if (p.target_role === 'SEMUA') return true;
      return currentUser ? p.target_role === currentUser.role : false;
    });

    res.json({
      pengaturan: db.PENGATURAN,
      kategori: db.KATEGORI.filter((k) => k.status === 'AKTIF').sort((a, b) => a.urutan - b.urutan),
      produk: db.PRODUK.filter((p) => p.status === 'AKTIF'),
      pengumuman,
      user: currentUser,
      anggota: currentAnggota,
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi.' });
      return;
    }

    const result = await withDbLock((db) => {
      const user = db.USERS.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() || u.email.toLowerCase() === username.trim().toLowerCase()
      );
      if (!user) return { error: 'Akun tidak ditemukan.', status: 401 as const };
      if (user.status !== 'AKTIF') return { error: 'Akun dinonaktifkan. Hubungi Admin Koperasi.', status: 403 as const };

      const hashed = hashPassword(password, user.salt);
      if (hashed !== user.password_hash) {
        appendLog(db, { id_user: user.id_user, username: user.username, role: user.role }, 'LOGIN_GAGAL', 'AUTH', 'Percobaan password salah');
        return { error: 'Username atau password salah.', status: 401 as const };
      }

      user.last_login = new Date().toISOString();
      appendLog(db, { id_user: user.id_user, username: user.username, role: user.role }, 'LOGIN_BERHASIL', 'AUTH', `Masuk sebagai ${user.role}`);

      const token = signToken({
        id_user: user.id_user,
        username: user.username,
        role: user.role,
        id_anggota: user.id_anggota,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      const anggota = user.id_anggota ? db.ANGGOTA.find((a) => a.id_anggota === user.id_anggota) || null : null;
      return { token, user: sanitizeUser(user), anggota, status: 200 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.post('/api/auth/register', async (req, res) => {
    const { username, password, nama_lengkap, email, no_hp, nik, alamat } = req.body as Record<string, string>;
    if (!username || !password || !nama_lengkap || !no_hp) {
      res.status(400).json({ error: 'Username, password, nama lengkap, dan nomor HP wajib diisi.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password minimal 6 karakter.' });
      return;
    }

    const result = await withDbLock((db) => {
      if (db.USERS.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
        return { error: 'Username sudah digunakan.', status: 400 as const };
      }
      const idAnggota = generateId('ANG');
      const kodeAnggota = `KOP-${new Date().getFullYear()}-${String(db.ANGGOTA.length + 1).padStart(3, '0')}`;
      const newAnggota: AnggotaRecord = {
        id_anggota: idAnggota,
        kode_anggota: kodeAnggota,
        nik: nik?.trim() || '-',
        nama: nama_lengkap.trim(),
        alamat: alamat?.trim() || '-',
        no_hp: no_hp.trim(),
        email: email?.trim() || `${username.trim()}@koperasi.id`,
        tanggal_gabung: new Date().toISOString().slice(0, 10),
        status_anggota: 'AKTIF',
        saldo_pokok: 0,
        saldo_wajib: 0,
        saldo_sukarela: 0,
        limit_kredit: 5000000,
        foto_url: '',
        qr_token: `KDP-MEMBER-${idAnggota}-${kodeAnggota}`,
      };

      const salt = generateSalt();
      const idUser = generateId('USR');
      const newUser: Required<UserRecord> = {
        id_user: idUser,
        username: username.trim(),
        password_hash: hashPassword(password, salt),
        salt,
        nama_lengkap: nama_lengkap.trim(),
        email: newAnggota.email,
        no_hp: no_hp.trim(),
        role: 'ANGGOTA',
        id_anggota: idAnggota,
        status: 'AKTIF',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      db.ANGGOTA.push(newAnggota);
      db.USERS.push(newUser);
      appendLog(db, { id_user: idUser, username: newUser.username, role: 'ANGGOTA' }, 'REGISTRASI_ANGGOTA', 'AUTH', `Anggota baru ${kodeAnggota}`);

      const token = signToken({
        id_user: idUser,
        username: newUser.username,
        role: 'ANGGOTA',
        id_anggota: idAnggota,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      return { token, user: sanitizeUser(newUser), anggota: newAnggota, status: 201 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.post('/api/auth/logout', requireAuth, async (req: AuthedRequest, res) => {
    await withDbLock((db) => {
      appendLog(db, req.session!, 'LOGOUT', 'AUTH', 'Keluar dari sesi');
    });
    res.json({ ok: true });
  });

  // ======================== CART (SERVER-SYNCED) ========================
  app.get('/api/cart', requireAuth, (req: AuthedRequest, res) => {
    const db = loadDatabase();
    const items = db.KERANJANG.filter((k) => k.id_user === req.session!.id_user);
    res.json(items);
  });

  app.put('/api/cart', requireAuth, async (req: AuthedRequest, res) => {
    const { items } = req.body as { items: Array<{ id_produk: string; qty: number }> };
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Format keranjang tidak valid.' });
      return;
    }
    const saved = await withDbLock((db) => {
      db.KERANJANG = db.KERANJANG.filter((k) => k.id_user !== req.session!.id_user);
      const now = new Date().toISOString();
      const added: typeof db.KERANJANG = [];
      for (const item of items) {
        const prod = db.PRODUK.find((p) => p.id_produk === item.id_produk && p.status === 'AKTIF');
        if (prod && item.qty > 0) {
          const row = {
            id_keranjang: generateId('CRT'),
            id_user: req.session!.id_user,
            id_produk: prod.id_produk,
            qty: Math.min(Math.floor(item.qty), prod.stok),
            updated_at: now,
          };
          db.KERANJANG.push(row);
          added.push(row);
        }
      }
      return added;
    });
    res.json(saved);
  });

  // ======================== CHECKOUT & POS ORDERS ========================
  app.post('/api/orders/checkout', requireAuth, async (req: AuthedRequest, res) => {
    const {
      items,
      metode_pembayaran,
      channel = 'MARKETPLACE',
      target_anggota_id,
      nama_pembeli_umum,
      uang_diterima,
      catatan = '',
      idempotency_key,
    } = req.body as {
      items: Array<{ id_produk: string; qty: number }>;
      metode_pembayaran: PaymentMethod;
      channel?: 'MARKETPLACE' | 'POS_KASIR';
      target_anggota_id?: string | null;
      nama_pembeli_umum?: string;
      uang_diterima?: number;
      catatan?: string;
      idempotency_key: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Keranjang belanja masih kosong.' });
      return;
    }
    if (!idempotency_key) {
      res.status(400).json({ error: 'Idempotency key wajib disertakan untuk mencegah transaksi ganda.' });
      return;
    }
    if (channel === 'POS_KASIR' && !['ADMIN', 'KASIR'].includes(req.session!.role)) {
      res.status(403).json({ error: 'Hanya Admin atau Kasir yang dapat mengakses transaksi POS.' });
      return;
    }

    const result = await withDbLock((db) => {
      if (db.USED_IDEMPOTENCY_KEYS.includes(idempotency_key)) {
        const existing = db.PESANAN.find((p) => p.idempotency_key === idempotency_key);
        if (existing) {
          return {
            duplicate: true,
            order: {
              ...existing,
              items: db.DETAIL_PESANAN.filter((d) => d.id_pesanan === existing.id_pesanan),
              pembayaran: db.PEMBAYARAN.find((pay) => pay.id_pesanan === existing.id_pesanan) || null,
            },
            status: 200 as const,
          };
        }
        return { error: 'Transaksi duplikat terdeteksi.', status: 409 as const };
      }

      // Determine member eligibility
      const resolvedAnggotaId =
        channel === 'POS_KASIR'
          ? target_anggota_id || null
          : req.session!.id_anggota;

      const anggota = resolvedAnggotaId
        ? db.ANGGOTA.find((a) => a.id_anggota === resolvedAnggotaId && a.status_anggota === 'AKTIF') || null
        : null;

      if (metode_pembayaran === 'SALDO_KOPERASI') {
        if (!db.PENGATURAN.izinkan_bayar_saldo_koperasi) {
          return { error: 'Pembayaran menggunakan Saldo Koperasi sedang dinonaktifkan.', status: 400 as const };
        }
        if (!anggota) {
          return { error: 'Pembayaran Saldo Koperasi hanya tersedia untuk Anggota aktif.', status: 400 as const };
        }
      }

      // Server-side authoritative price & stock check
      let subtotalNormal = 0;
      let diskonAnggota = 0;
      let diskonPromo = 0;
      let totalBayar = 0;
      const detailList: DetailPesananRecord[] = [];

      for (const reqItem of items) {
        const qty = Math.floor(Number(reqItem.qty));
        if (!qty || qty <= 0) {
          return { error: 'Jumlah barang harus lebih dari 0.', status: 400 as const };
        }
        const prod = db.PRODUK.find((p) => p.id_produk === reqItem.id_produk && p.status === 'AKTIF');
        if (!prod) {
          return { error: `Produk ${reqItem.id_produk} tidak ditemukan atau nonaktif.`, status: 404 as const };
        }
        if (prod.stok < qty) {
          return { error: `Stok "${prod.nama_produk}" tidak mencukupi (tersisa ${prod.stok}).`, status: 400 as const };
        }

        const basePrice = prod.harga_normal;
        const memberBase = anggota ? prod.harga_anggota : prod.harga_normal;
        const finalUnitPrice =
          prod.harga_promo && prod.harga_promo < memberBase ? prod.harga_promo : memberBase;

        const itemMemberDiscount = anggota ? Math.max(0, basePrice - memberBase) * qty : 0;
        const itemPromoDiscount = Math.max(0, memberBase - finalUnitPrice) * qty;
        const lineSubtotal = finalUnitPrice * qty;

        subtotalNormal += basePrice * qty;
        diskonAnggota += itemMemberDiscount;
        diskonPromo += itemPromoDiscount;
        totalBayar += lineSubtotal;

        detailList.push({
          id_detail: generateId('DTL'),
          id_pesanan: '',
          id_produk: prod.id_produk,
          kode_produk: prod.kode_produk,
          nama_produk: prod.nama_produk,
          qty,
          harga_satuan: finalUnitPrice,
          diskon_item: itemMemberDiscount + itemPromoDiscount,
          subtotal: lineSubtotal,
        });
      }

      // Validate payment balance or cash tendered
      let paidNow = false;
      let statusPesanan: OrderStatus = 'MENUNGGU_PEMBAYARAN';
      let cashReceived = Number(uang_diterima || 0);
      let change = 0;

      if (metode_pembayaran === 'SALDO_KOPERASI' && anggota) {
        if (anggota.saldo_sukarela < totalBayar) {
          return {
            error: `Saldo Simpanan Sukarela tidak mencukupi (Saldo: Rp ${anggota.saldo_sukarela.toLocaleString('id-ID')}, Total: Rp ${totalBayar.toLocaleString('id-ID')}).`,
            status: 400 as const,
          };
        }
        anggota.saldo_sukarela -= totalBayar;
        paidNow = true;
        cashReceived = totalBayar;
        statusPesanan = channel === 'POS_KASIR' ? 'SELESAI' : 'DIPROSES';

        db.SIMPANAN.unshift({
          id_simpanan: generateId('SMP'),
          nomor_transaksi: generateTransactionNo('SMP'),
          id_anggota: anggota.id_anggota,
          nama_anggota: anggota.nama,
          jenis_simpanan: 'SUKARELA',
          tipe: 'TARIK',
          jumlah: totalBayar,
          saldo_sesudah: anggota.saldo_sukarela,
          metode: 'BELANJA_KOPERASI',
          keterangan: `Pembayaran belanja koperasi`,
          petugas_id: req.session!.id_user,
          created_at: new Date().toISOString(),
        });
      } else if (channel === 'POS_KASIR') {
        if (metode_pembayaran === 'TUNAI') {
          if (cashReceived < totalBayar) {
            return { error: 'Uang tunai diterima kurang dari total pembayaran.', status: 400 as const };
          }
          change = cashReceived - totalBayar;
        } else {
          cashReceived = totalBayar;
        }
        paidNow = true;
        statusPesanan = 'SELESAI';
      } else {
        // Marketplace Transfer / QRIS / Tunai di kasir
        statusPesanan = metode_pembayaran === 'TUNAI' ? 'DIPROSES' : 'MENUNGGU_PEMBAYARAN';
      }

      // Deduct stock atomically
      for (const d of detailList) {
        const prod = db.PRODUK.find((p) => p.id_produk === d.id_produk)!;
        prod.stok -= d.qty;
        prod.terjual += d.qty;
      }

      const idPesanan = generateId('ORD');
      const nomorPesanan = generateTransactionNo('KDP');
      const now = new Date().toISOString();

      detailList.forEach((d) => {
        d.id_pesanan = idPesanan;
      });

      const buyerName = anggota
        ? anggota.nama
        : nama_pembeli_umum?.trim() || req.session!.username;

      const orderRow = {
        id_pesanan: idPesanan,
        nomor_pesanan: nomorPesanan,
        id_user: req.session!.id_user,
        id_anggota: anggota ? anggota.id_anggota : null,
        nama_pembeli: buyerName,
        channel,
        metode_pembayaran,
        subtotal: subtotalNormal,
        diskon_anggota: diskonAnggota,
        diskon_promo: diskonPromo,
        total_bayar: totalBayar,
        uang_diterima: cashReceived,
        kembalian: change,
        status_pesanan: statusPesanan,
        catatan: catatan.trim(),
        kasir_id: channel === 'POS_KASIR' ? req.session!.id_user : null,
        idempotency_key,
        created_at: now,
        updated_at: now,
      };

      const paymentRow = {
        id_pembayaran: generateId('PAY'),
        nomor_pembayaran: generateTransactionNo('PAY'),
        id_pesanan: idPesanan,
        nomor_pesanan: nomorPesanan,
        metode: metode_pembayaran,
        jumlah: totalBayar,
        referensi_gateway:
          metode_pembayaran === 'QRIS'
            ? `QRIS-${nomorPesanan}`
            : metode_pembayaran === 'SALDO_KOPERASI'
            ? `SALDO-${anggota?.kode_anggota}`
            : `REF-${nomorPesanan}`,
        bukti_catatan: paidNow ? 'Pembayaran terverifikasi otomatis' : 'Menunggu pembayaran / konfirmasi',
        status_pembayaran: paidNow ? ('TERVERIFIKASI' as const) : ('PENDING' as const),
        verified_by: paidNow ? req.session!.id_user : null,
        created_at: now,
      };

      db.PESANAN.unshift(orderRow);
      db.DETAIL_PESANAN.push(...detailList);
      db.PEMBAYARAN.unshift(paymentRow);
      db.USED_IDEMPOTENCY_KEYS.push(idempotency_key);

      if (channel === 'MARKETPLACE') {
        db.KERANJANG = db.KERANJANG.filter((k) => k.id_user !== req.session!.id_user);
      }

      if (paidNow) {
        db.KAS.unshift({
          id_kas: generateId('KAS'),
          nomor_transaksi: generateTransactionNo('KAS'),
          tanggal: now.slice(0, 10),
          jenis: 'MASUK',
          kategori_akun: 'PENDAPATAN_PENJUALAN',
          jumlah: totalBayar,
          keterangan: `Penjualan ${channel === 'POS_KASIR' ? 'Kasir POS' : 'Marketplace'} ${nomorPesanan} (${metode_pembayaran})`,
          referensi_id: idPesanan,
          user_id: req.session!.id_user,
          created_at: now,
        });
      }

      appendLog(
        db,
        req.session!,
        'CHECKOUT_PESANAN',
        channel === 'POS_KASIR' ? 'KASIR_POS' : 'MARKETPLACE',
        `Order ${nomorPesanan} senilai Rp ${totalBayar.toLocaleString('id-ID')} (${metode_pembayaran})`
      );

      return {
        order: { ...orderRow, items: detailList, pembayaran: paymentRow },
        anggota,
        status: 201 as const,
      };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(result.status).json(result);
  });

  app.get('/api/orders', requireAuth, (req: AuthedRequest, res) => {
    const db = loadDatabase();
    const isStaff = ['ADMIN', 'KASIR'].includes(req.session!.role);
    const orders = db.PESANAN.filter((o) =>
      isStaff ? true : o.id_user === req.session!.id_user || (req.session!.id_anggota && o.id_anggota === req.session!.id_anggota)
    ).map((o) => ({
      ...o,
      items: db.DETAIL_PESANAN.filter((d) => d.id_pesanan === o.id_pesanan),
      pembayaran: db.PEMBAYARAN.find((p) => p.id_pesanan === o.id_pesanan) || null,
    }));
    res.json(orders);
  });

  app.post('/api/orders/:id/confirm-payment', requireAuth, async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const { referensi_gateway, bukti_catatan } = req.body as { referensi_gateway?: string; bukti_catatan?: string };

    const result = await withDbLock((db) => {
      const order = db.PESANAN.find((o) => o.id_pesanan === id);
      if (!order) return { error: 'Pesanan tidak ditemukan.', status: 404 as const };

      const isOwner = order.id_user === req.session!.id_user;
      const isStaff = ['ADMIN', 'KASIR'].includes(req.session!.role);
      if (!isOwner && !isStaff) return { error: 'Akses ditolak.', status: 403 as const };

      const payment = db.PEMBAYARAN.find((p) => p.id_pesanan === id);
      if (payment) {
        if (referensi_gateway) payment.referensi_gateway = referensi_gateway;
        if (bukti_catatan) payment.bukti_catatan = bukti_catatan;
        if (isStaff) {
          payment.status_pembayaran = 'TERVERIFIKASI';
          payment.verified_by = req.session!.id_user;
        }
      }

      if (isStaff && order.status_pesanan === 'MENUNGGU_KONFIRMASI') {
        order.status_pesanan = 'DIPROSES';
        order.updated_at = new Date().toISOString();
        const kasExists = db.KAS.some((k) => k.referensi_id === order.id_pesanan);
        if (!kasExists) {
          db.KAS.unshift({
            id_kas: generateId('KAS'),
            nomor_transaksi: generateTransactionNo('KAS'),
            tanggal: new Date().toISOString().slice(0, 10),
            jenis: 'MASUK',
            kategori_akun: 'PENDAPATAN_PENJUALAN',
            jumlah: order.total_bayar,
            keterangan: `Verifikasi pembayaran pesanan ${order.nomor_pesanan}`,
            referensi_id: order.id_pesanan,
            user_id: req.session!.id_user,
            created_at: new Date().toISOString(),
          });
        }
      } else if (!isStaff && order.status_pesanan === 'MENUNGGU_PEMBAYARAN') {
        order.status_pesanan = 'MENUNGGU_KONFIRMASI';
        order.updated_at = new Date().toISOString();
      }

      appendLog(db, req.session!, 'KONFIRMASI_PEMBAYARAN', 'PESANAN', `Pesanan ${order.nomor_pesanan} -> ${order.status_pesanan}`);
      return { order, status: 200 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.patch('/api/orders/:id/status', requireRole(['ADMIN', 'KASIR']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const { status_pesanan } = req.body as { status_pesanan: OrderStatus };
    const allowed: OrderStatus[] = [
      'MENUNGGU_PEMBAYARAN',
      'MENUNGGU_KONFIRMASI',
      'DIPROSES',
      'SIAP_DIAMBIL',
      'SELESAI',
      'DIBATALKAN',
    ];
    if (!allowed.includes(status_pesanan)) {
      res.status(400).json({ error: 'Status pesanan tidak valid.' });
      return;
    }

    const result = await withDbLock((db) => {
      const order = db.PESANAN.find((o) => o.id_pesanan === id);
      if (!order) return { error: 'Pesanan tidak ditemukan.', status: 404 as const };

      const prevStatus = order.status_pesanan;
      if (prevStatus === 'DIBATALKAN' && status_pesanan !== 'DIBATALKAN') {
        return { error: 'Pesanan yang sudah dibatalkan tidak dapat diaktifkan kembali.', status: 400 as const };
      }

      // Restore stock if newly cancelled
      if (status_pesanan === 'DIBATALKAN' && prevStatus !== 'DIBATALKAN') {
        const items = db.DETAIL_PESANAN.filter((d) => d.id_pesanan === id);
        for (const item of items) {
          const prod = db.PRODUK.find((p) => p.id_produk === item.id_produk);
          if (prod) {
            prod.stok += item.qty;
            prod.terjual = Math.max(0, prod.terjual - item.qty);
          }
        }
      }

      if (['DIPROSES', 'SIAP_DIAMBIL', 'SELESAI'].includes(status_pesanan)) {
        const payment = db.PEMBAYARAN.find((p) => p.id_pesanan === id);
        if (payment && payment.status_pembayaran === 'PENDING') {
          payment.status_pembayaran = 'TERVERIFIKASI';
          payment.verified_by = req.session!.id_user;
        }
        const kasExists = db.KAS.some((k) => k.referensi_id === order.id_pesanan);
        if (!kasExists) {
          db.KAS.unshift({
            id_kas: generateId('KAS'),
            nomor_transaksi: generateTransactionNo('KAS'),
            tanggal: new Date().toISOString().slice(0, 10),
            jenis: 'MASUK',
            kategori_akun: 'PENDAPATAN_PENJUALAN',
            jumlah: order.total_bayar,
            keterangan: `Pembayaran pesanan ${order.nomor_pesanan} (${order.metode_pembayaran})`,
            referensi_id: order.id_pesanan,
            user_id: req.session!.id_user,
            created_at: new Date().toISOString(),
          });
        }
      }

      order.status_pesanan = status_pesanan;
      order.updated_at = new Date().toISOString();
      appendLog(db, req.session!, 'UBAH_STATUS_PESANAN', 'PESANAN', `${order.nomor_pesanan}: ${prevStatus} -> ${status_pesanan}`);
      return { order, status: 200 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ======================== SIMPANAN ANGGOTA ========================
  app.get('/api/simpanan', requireAuth, (req: AuthedRequest, res) => {
    const db = loadDatabase();
    if (req.session!.role === 'ADMIN' || req.session!.role === 'KASIR') {
      res.json({
        riwayat: db.SIMPANAN,
        rekap_anggota: db.ANGGOTA,
      });
      return;
    }
    const myId = req.session!.id_anggota;
    res.json({
      riwayat: db.SIMPANAN.filter((s) => s.id_anggota === myId),
      rekap_anggota: db.ANGGOTA.filter((a) => a.id_anggota === myId),
    });
  });

  app.post('/api/simpanan/transaksi', requireRole(['ADMIN', 'KASIR']), async (req: AuthedRequest, res) => {
    const { id_anggota, jenis_simpanan, tipe, jumlah, metode = 'TUNAI', keterangan = '' } = req.body as {
      id_anggota: string;
      jenis_simpanan: SimpananJenis;
      tipe: SimpananTipe;
      jumlah: number;
      metode?: string;
      keterangan?: string;
    };

    const nominal = Math.round(Number(jumlah));
    if (!id_anggota || !nominal || nominal <= 0) {
      res.status(400).json({ error: 'Anggota dan nominal simpanan (> 0) wajib diisi.' });
      return;
    }

    const result = await withDbLock((db) => {
      const anggota = db.ANGGOTA.find((a) => a.id_anggota === id_anggota);
      if (!anggota) return { error: 'Data anggota tidak ditemukan.', status: 404 as const };

      if (tipe === 'TARIK') {
        if (jenis_simpanan !== 'SUKARELA') {
          return {
            error: 'Sesuai AD/ART koperasi, hanya Simpanan Sukarela yang dapat ditarik sewaktu-waktu (Simpanan Pokok & Wajib hanya saat keluar keanggotaan).',
            status: 400 as const,
          };
        }
        if (anggota.saldo_sukarela < nominal) {
          return { error: 'Saldo Simpanan Sukarela anggota tidak mencukupi.', status: 400 as const };
        }
        anggota.saldo_sukarela -= nominal;
      } else {
        if (jenis_simpanan === 'POKOK') anggota.saldo_pokok += nominal;
        if (jenis_simpanan === 'WAJIB') anggota.saldo_wajib += nominal;
        if (jenis_simpanan === 'SUKARELA') anggota.saldo_sukarela += nominal;
      }

      const saldoSesudah =
        jenis_simpanan === 'POKOK'
          ? anggota.saldo_pokok
          : jenis_simpanan === 'WAJIB'
          ? anggota.saldo_wajib
          : anggota.saldo_sukarela;

      const now = new Date().toISOString();
      const record = {
        id_simpanan: generateId('SMP'),
        nomor_transaksi: generateTransactionNo('SMP'),
        id_anggota: anggota.id_anggota,
        nama_anggota: anggota.nama,
        jenis_simpanan,
        tipe,
        jumlah: nominal,
        saldo_sesudah: saldoSesudah,
        metode,
        keterangan: keterangan.trim() || `${tipe} Simpanan ${jenis_simpanan}`,
        petugas_id: req.session!.id_user,
        created_at: now,
      };

      db.SIMPANAN.unshift(record);
      db.KAS.unshift({
        id_kas: generateId('KAS'),
        nomor_transaksi: generateTransactionNo('KAS'),
        tanggal: now.slice(0, 10),
        jenis: tipe === 'SETOR' ? 'MASUK' : 'KELUAR',
        kategori_akun: 'SIMPANAN_ANGGOTA',
        jumlah: nominal,
        keterangan: `${tipe} Simpanan ${jenis_simpanan} an ${anggota.nama} (${record.nomor_transaksi})`,
        referensi_id: record.id_simpanan,
        user_id: req.session!.id_user,
        created_at: now,
      });

      appendLog(db, req.session!, `${tipe}_SIMPANAN`, 'SIMPANAN', `${anggota.nama} ${jenis_simpanan} Rp ${nominal.toLocaleString('id-ID')}`);
      return { record, anggota, status: 201 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  // ======================== PINJAMAN & ANGSURAN ========================
  app.get('/api/pinjaman', requireAuth, (req: AuthedRequest, res) => {
    const db = loadDatabase();
    const isStaff = req.session!.role === 'ADMIN' || req.session!.role === 'KASIR';
    const pinjaman = isStaff
      ? db.PINJAMAN
      : db.PINJAMAN.filter((p) => p.id_anggota === req.session!.id_anggota);
    const angsuran = isStaff
      ? db.ANGSURAN
      : db.ANGSURAN.filter((a) => a.id_anggota === req.session!.id_anggota);
    res.json({ pinjaman, angsuran });
  });

  app.post('/api/pinjaman/ajukan', requireAuth, async (req: AuthedRequest, res) => {
    const { id_anggota: bodyAnggotaId, jumlah_pinjaman, tenor_bulan, tujuan } = req.body as {
      id_anggota?: string;
      jumlah_pinjaman: number;
      tenor_bulan: number;
      tujuan: string;
    };

    const nominal = Math.round(Number(jumlah_pinjaman));
    const tenor = Math.floor(Number(tenor_bulan));

    if (!nominal || nominal < 500000 || !tenor || tenor < 1 || tenor > 36 || !tujuan?.trim()) {
      res.status(400).json({ error: 'Nominal minimal Rp 500.000, tenor 1–36 bulan, dan tujuan wajib diisi.' });
      return;
    }

    const result = await withDbLock((db) => {
      const targetId =
        req.session!.role === 'ADMIN' && bodyAnggotaId ? bodyAnggotaId : req.session!.id_anggota;
      if (!targetId) return { error: 'Hanya anggota terdaftar yang dapat mengajukan pinjaman.', status: 400 as const };

      const anggota = db.ANGGOTA.find((a) => a.id_anggota === targetId && a.status_anggota === 'AKTIF');
      if (!anggota) return { error: 'Anggota tidak ditemukan atau nonaktif.', status: 404 as const };

      if (nominal > anggota.limit_kredit) {
        return {
          error: `Nominal pinjaman melebihi plafon kredit anggota (Maks: Rp ${anggota.limit_kredit.toLocaleString('id-ID')}).`,
          status: 400 as const,
        };
      }

      const bungaPersen = db.PENGATURAN.bunga_pinjaman_persen_per_bulan;
      const totalBunga = Math.round((nominal * bungaPersen * tenor) / 100);
      const totalKewajiban = nominal + totalBunga;
      const angsuranPerBulan = Math.round(totalKewajiban / tenor);

      const newLoan = {
        id_pinjaman: generateId('PNJ'),
        nomor_pinjaman: generateTransactionNo('PNJ'),
        id_anggota: anggota.id_anggota,
        nama_anggota: anggota.nama,
        jumlah_pinjaman: nominal,
        tenor_bulan: tenor,
        bunga_persen: bungaPersen,
        total_bunga: totalBunga,
        total_kewajiban: totalKewajiban,
        angsuran_per_bulan: angsuranPerBulan,
        sisa_pokok: nominal,
        sisa_tagihan: totalKewajiban,
        tujuan: tujuan.trim(),
        status: 'MENUNGGU_PERSETUJUAN' as const,
        approved_by: null,
        created_at: new Date().toISOString(),
        jatuh_tempo_berikutnya: null,
      };

      db.PINJAMAN.unshift(newLoan);
      appendLog(db, req.session!, 'PENGAJUAN_PINJAMAN', 'PINJAMAN', `${anggota.nama} mengajukan Rp ${nominal.toLocaleString('id-ID')} (${tenor} bln)`);
      return { pinjaman: newLoan, status: 201 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.post('/api/pinjaman/:id/keputusan', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const { keputusan } = req.body as { keputusan: 'SETUJUI' | 'TOLAK' };

    const result = await withDbLock((db) => {
      const loan = db.PINJAMAN.find((p) => p.id_pinjaman === id);
      if (!loan) return { error: 'Data pinjaman tidak ditemukan.', status: 404 as const };
      if (loan.status !== 'MENUNGGU_PERSETUJUAN') {
        return { error: 'Pinjaman ini sudah diproses sebelumnya.', status: 400 as const };
      }

      if (keputusan === 'TOLAK') {
        loan.status = 'DITOLAK';
        loan.approved_by = req.session!.id_user;
        appendLog(db, req.session!, 'TOLAK_PINJAMAN', 'PINJAMAN', `Pinjaman ${loan.nomor_pinjaman} ditolak`);
        return { pinjaman: loan, status: 200 as const };
      }

      loan.status = 'AKTIF';
      loan.approved_by = req.session!.id_user;
      loan.jatuh_tempo_berikutnya = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const now = new Date().toISOString();
      db.KAS.unshift({
        id_kas: generateId('KAS'),
        nomor_transaksi: generateTransactionNo('KAS'),
        tanggal: now.slice(0, 10),
        jenis: 'KELUAR',
        kategori_akun: 'PENCAIRAN_PINJAMAN',
        jumlah: loan.jumlah_pinjaman,
        keterangan: `Pencairan pinjaman ${loan.nomor_pinjaman} an ${loan.nama_anggota}`,
        referensi_id: loan.id_pinjaman,
        user_id: req.session!.id_user,
        created_at: now,
      });

      appendLog(db, req.session!, 'SETUJUI_PINJAMAN', 'PINJAMAN', `Pinjaman ${loan.nomor_pinjaman} disetujui & dicairkan`);
      return { pinjaman: loan, status: 200 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.post('/api/pinjaman/:id/angsuran', requireRole(['ADMIN', 'KASIR']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const { metode = 'TUNAI', denda = 0 } = req.body as { metode?: string; denda?: number };

    const result = await withDbLock((db) => {
      const loan = db.PINJAMAN.find((p) => p.id_pinjaman === id);
      if (!loan) return { error: 'Pinjaman tidak ditemukan.', status: 404 as const };
      if (loan.status !== 'AKTIF') return { error: 'Hanya pinjaman aktif yang dapat dibayar angsurannya.', status: 400 as const };

      const existingInstallments = db.ANGSURAN.filter((a) => a.id_pinjaman === id);
      const angsuranKe = existingInstallments.length + 1;

      const pokokPerBulan = Math.round(loan.jumlah_pinjaman / loan.tenor_bulan);
      const bungaPerBulan = Math.round(loan.total_bunga / loan.tenor_bulan);

      const pokokDibayar = Math.min(pokokPerBulan, loan.sisa_pokok);
      const bungaDibayar = Math.min(bungaPerBulan, Math.max(0, loan.sisa_tagihan - loan.sisa_pokok));
      const dendaVal = Math.max(0, Math.round(Number(denda)));
      const totalBayar = pokokDibayar + bungaDibayar + dendaVal;

      loan.sisa_pokok = Math.max(0, loan.sisa_pokok - pokokDibayar);
      loan.sisa_tagihan = Math.max(0, loan.sisa_tagihan - (pokokDibayar + bungaDibayar));

      if (loan.sisa_tagihan <= 0 || loan.sisa_pokok <= 0) {
        loan.sisa_pokok = 0;
        loan.sisa_tagihan = 0;
        loan.status = 'LUNAS';
        loan.jatuh_tempo_berikutnya = null;
      } else {
        loan.jatuh_tempo_berikutnya = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      }

      const now = new Date().toISOString();
      const angsuranRecord = {
        id_angsuran: generateId('ANGS'),
        nomor_transaksi: generateTransactionNo('ANGS'),
        id_pinjaman: loan.id_pinjaman,
        nomor_pinjaman: loan.nomor_pinjaman,
        id_anggota: loan.id_anggota,
        angsuran_ke: angsuranKe,
        pokok_dibayar: pokokDibayar,
        bunga_dibayar: bungaDibayar,
        denda: dendaVal,
        total_bayar: totalBayar,
        metode,
        petugas_id: req.session!.id_user,
        created_at: now,
      };

      db.ANGSURAN.unshift(angsuranRecord);

      if (pokokDibayar > 0) {
        db.KAS.unshift({
          id_kas: generateId('KAS'),
          nomor_transaksi: generateTransactionNo('KAS'),
          tanggal: now.slice(0, 10),
          jenis: 'MASUK',
          kategori_akun: 'ANGSURAN_PINJAMAN',
          jumlah: pokokDibayar,
          keterangan: `Pokok angsuran ke-${angsuranKe} ${loan.nomor_pinjaman}`,
          referensi_id: angsuranRecord.id_angsuran,
          user_id: req.session!.id_user,
          created_at: now,
        });
      }
      if (bungaDibayar + dendaVal > 0) {
        db.KAS.unshift({
          id_kas: generateId('KAS'),
          nomor_transaksi: generateTransactionNo('KAS'),
          tanggal: now.slice(0, 10),
          jenis: 'MASUK',
          kategori_akun: 'PENDAPATAN_BUNGA',
          jumlah: bungaDibayar + dendaVal,
          keterangan: `Bunga & jasa angsuran ke-${angsuranKe} ${loan.nomor_pinjaman}`,
          referensi_id: angsuranRecord.id_angsuran,
          user_id: req.session!.id_user,
          created_at: now,
        });
      }

      appendLog(db, req.session!, 'BAYAR_ANGSURAN', 'PINJAMAN', `${loan.nomor_pinjaman} ke-${angsuranKe} Rp ${totalBayar.toLocaleString('id-ID')}`);
      return { angsuran: angsuranRecord, pinjaman: loan, status: 201 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  // ======================== ADMIN DASHBOARD & REPORTS ========================
  app.get('/api/admin/stats', requireRole(['ADMIN', 'KASIR']), (_req, res) => {
    const db = loadDatabase();
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = db.PESANAN.filter((o) => o.created_at.startsWith(today) && o.status_pesanan !== 'DIBATALKAN');
    const penjualanHariIni = todayOrders.reduce((s, o) => s + o.total_bayar, 0);

    const totalSimpanan = db.ANGGOTA.reduce((s, a) => s + a.saldo_pokok + a.saldo_wajib + a.saldo_sukarela, 0);
    const totalPinjamanAktif = db.PINJAMAN.filter((p) => p.status === 'AKTIF').reduce((s, p) => s + p.sisa_pokok, 0);
    const totalKas =
      db.KAS.filter((k) => k.jenis === 'MASUK').reduce((s, k) => s + k.jumlah, 0) -
      db.KAS.filter((k) => k.jenis === 'KELUAR').reduce((s, k) => s + k.jumlah, 0);

    // Build 7-day sales & transaction chart
    const chartMap = new Map<string, { penjualan: number; transaksi: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      chartMap.set(d, { penjualan: 0, transaksi: 0 });
    }
    for (const o of db.PESANAN) {
      if (o.status_pesanan === 'DIBATALKAN') continue;
      const d = o.created_at.slice(0, 10);
      if (chartMap.has(d)) {
        const cur = chartMap.get(d)!;
        cur.penjualan += o.total_bayar;
        cur.transaksi += 1;
      }
    }

    const stats: AdminStatsResponse = {
      totalAnggota: db.ANGGOTA.filter((a) => a.status_anggota === 'AKTIF').length,
      totalProduk: db.PRODUK.filter((p) => p.status === 'AKTIF').length,
      pesananHariIni: todayOrders.length,
      penjualanHariIni,
      totalSimpanan,
      totalPinjamanAktif,
      totalKas,
      grafikPenjualan: Array.from(chartMap.entries()).map(([tanggal, val]) => ({
        tanggal: tanggal.slice(5),
        penjualan: val.penjualan,
        transaksi: val.transaksi,
      })),
      produkTerlaris: [...db.PRODUK].sort((a, b) => b.terjual - a.terjual).slice(0, 5),
      aktivitasTerbaru: db.LOG_AKTIVITAS.slice(0, 10),
      pesananMenungguVerifikasi: db.PESANAN.filter((o) => o.status_pesanan === 'MENUNGGU_KONFIRMASI').length,
      pinjamanMenungguPersetujuan: db.PINJAMAN.filter((p) => p.status === 'MENUNGGU_PERSETUJUAN').length,
    };
    res.json(stats);
  });

  app.get('/api/finance/summary', requireRole(['ADMIN']), (_req, res) => {
    const db = loadDatabase();
    res.json({
      kas: db.KAS,
      summary: calculateFinancialSummary(),
    });
  });

  app.post('/api/finance/kas', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { tanggal, jenis, kategori_akun, jumlah, keterangan } = req.body as {
      tanggal?: string;
      jenis: 'MASUK' | 'KELUAR';
      kategori_akun: string;
      jumlah: number;
      keterangan: string;
    };
    const nominal = Math.round(Number(jumlah));
    if (!nominal || nominal <= 0 || !keterangan?.trim()) {
      res.status(400).json({ error: 'Nominal dan keterangan kas wajib diisi.' });
      return;
    }

    const record = await withDbLock((db) => {
      const entry = {
        id_kas: generateId('KAS'),
        nomor_transaksi: generateTransactionNo('KAS'),
        tanggal: tanggal || new Date().toISOString().slice(0, 10),
        jenis,
        kategori_akun: kategori_akun as typeof db.KAS[0]['kategori_akun'],
        jumlah: nominal,
        keterangan: keterangan.trim(),
        referensi_id: 'MANUAL',
        user_id: req.session!.id_user,
        created_at: new Date().toISOString(),
      };
      db.KAS.unshift(entry);
      appendLog(db, req.session!, `KAS_${jenis}`, 'KEUANGAN', `${kategori_akun}: Rp ${nominal.toLocaleString('id-ID')}`);
      return entry;
    });
    res.status(201).json(record);
  });

  // ======================== CRUD: PRODUK, KATEGORI, ANGGOTA, USERS, SUPPLIER, PENGUMUMAN ========================
  app.get('/api/admin/master', requireRole(['ADMIN', 'KASIR']), (_req, res) => {
    const db = loadDatabase();
    res.json({
      produk: db.PRODUK,
      kategori: db.KATEGORI,
      anggota: db.ANGGOTA,
      users: db.USERS.map(sanitizeUser),
      supplier: db.SUPPLIER,
      pengumuman: db.PENGUMUMAN,
      logs: db.LOG_AKTIVITAS,
    });
  });

  app.post('/api/admin/produk', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    if (!body.nama_produk || !body.harga_normal) {
      res.status(400).json({ error: 'Nama produk dan harga normal wajib diisi.' });
      return;
    }
    const created = await withDbLock((db) => {
      const kat = db.KATEGORI.find((k) => k.id_kategori === body.id_kategori) || db.KATEGORI[0];
      const idProduk = generateId('PRD');
      const kodeProduk = String(body.kode_produk || `KOP-${String(db.PRODUK.length + 1).padStart(3, '0')}`);
      const barcode = String(body.barcode || `8991001${String(Date.now()).slice(-6)}`);
      const row = {
        id_produk: idProduk,
        kode_produk: kodeProduk,
        barcode,
        nama_produk: String(body.nama_produk).trim(),
        id_kategori: kat.id_kategori,
        nama_kategori: kat.nama_kategori,
        id_supplier: String(body.id_supplier || db.SUPPLIER[0]?.id_supplier || ''),
        deskripsi: String(body.deskripsi || ''),
        harga_normal: Math.max(0, Number(body.harga_normal)),
        harga_anggota: Math.max(0, Number(body.harga_anggota || body.harga_normal)),
        harga_promo: body.harga_promo ? Math.max(0, Number(body.harga_promo)) : null,
        stok: Math.max(0, Math.floor(Number(body.stok || 0))),
        stok_min: Math.max(0, Math.floor(Number(body.stok_min || 5))),
        satuan: String(body.satuan || 'Pcs'),
        foto_url: String(body.foto_url || '/src/assets/images/prod_beras_organik_1794528005705.jpg'),
        rating: 5.0,
        terjual: 0,
        unggulan: Boolean(body.unggulan),
        status: 'AKTIF' as const,
        created_at: new Date().toISOString(),
      };
      db.PRODUK.unshift(row);
      appendLog(db, req.session!, 'TAMBAH_PRODUK', 'PRODUK', `${row.kode_produk} - ${row.nama_produk}`);
      return row;
    });
    res.status(201).json(created);
  });

  app.put('/api/admin/produk/:id', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const updated = await withDbLock((db) => {
      const idx = db.PRODUK.findIndex((p) => p.id_produk === id);
      if (idx === -1) return null;
      const cur = db.PRODUK[idx];
      const kat = db.KATEGORI.find((k) => k.id_kategori === body.id_kategori) || db.KATEGORI.find((k) => k.id_kategori === cur.id_kategori);
      db.PRODUK[idx] = {
        ...cur,
        nama_produk: body.nama_produk ? String(body.nama_produk).trim() : cur.nama_produk,
        kode_produk: body.kode_produk ? String(body.kode_produk).trim() : cur.kode_produk,
        barcode: body.barcode ? String(body.barcode).trim() : cur.barcode,
        id_kategori: kat ? kat.id_kategori : cur.id_kategori,
        nama_kategori: kat ? kat.nama_kategori : cur.nama_kategori,
        id_supplier: body.id_supplier ? String(body.id_supplier) : cur.id_supplier,
        deskripsi: body.deskripsi !== undefined ? String(body.deskripsi) : cur.deskripsi,
        harga_normal: body.harga_normal !== undefined ? Number(body.harga_normal) : cur.harga_normal,
        harga_anggota: body.harga_anggota !== undefined ? Number(body.harga_anggota) : cur.harga_anggota,
        harga_promo: body.harga_promo ? Number(body.harga_promo) : null,
        stok: body.stok !== undefined ? Math.max(0, Math.floor(Number(body.stok))) : cur.stok,
        stok_min: body.stok_min !== undefined ? Math.max(0, Math.floor(Number(body.stok_min))) : cur.stok_min,
        satuan: body.satuan ? String(body.satuan) : cur.satuan,
        foto_url: body.foto_url !== undefined ? String(body.foto_url) || cur.foto_url : cur.foto_url,
        unggulan: body.unggulan !== undefined ? Boolean(body.unggulan) : cur.unggulan,
        status: body.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
      };
      appendLog(db, req.session!, 'EDIT_PRODUK', 'PRODUK', `Update ${db.PRODUK[idx].nama_produk}`);
      return db.PRODUK[idx];
    });
    if (!updated) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/admin/produk/:id', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const ok = await withDbLock((db) => {
      const prod = db.PRODUK.find((p) => p.id_produk === id);
      if (!prod) return false;
      prod.status = 'NONAKTIF';
      appendLog(db, req.session!, 'NONAKTIF_PRODUK', 'PRODUK', `Nonaktifkan ${prod.nama_produk}`);
      return true;
    });
    if (!ok) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/admin/upload-image', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { filename, dataUrl } = req.body as { filename?: string; dataUrl?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Data gambar tidak valid.' });
      return;
    }
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: 'Format gambar harus PNG, JPG, WEBP, atau GIF.' });
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > 3 * 1024 * 1024) {
      res.status(400).json({ error: 'Ukuran gambar maksimal 3 MB.' });
      return;
    }
    const baseName = String(filename || 'produk')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 32) || 'gambar';
    const savedName = `${baseName}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, savedName), buf);
    const url = `/uploads/${savedName}`;
    await withDbLock((db) => {
      appendLog(db, req.session!, 'UPLOAD_GAMBAR', 'PRODUK', `Upload foto custom ${savedName}`);
    });
    res.status(201).json({ url });
  });

  app.post('/api/admin/kategori', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { nama_kategori, deskripsi, urutan } = req.body as {
      nama_kategori: string;
      deskripsi?: string;
      urutan?: number;
    };
    if (!nama_kategori?.trim()) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }
    const created = await withDbLock((db) => {
      const row = {
        id_kategori: generateId('KAT'),
        nama_kategori: nama_kategori.trim(),
        ikon: 'tag',
        deskripsi: deskripsi?.trim() || '',
        urutan: urutan ? Number(urutan) : db.KATEGORI.length + 1,
        status: 'AKTIF' as const,
      };
      db.KATEGORI.push(row);
      appendLog(db, req.session!, 'TAMBAH_KATEGORI', 'KATEGORI', row.nama_kategori);
      return row;
    });
    res.status(201).json(created);
  });

  app.put('/api/admin/kategori/:id', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const { nama_kategori, deskripsi, urutan, status } = req.body as {
      nama_kategori?: string;
      deskripsi?: string;
      urutan?: number;
      status?: 'AKTIF' | 'NONAKTIF';
    };
    const updated = await withDbLock((db) => {
      const idx = db.KATEGORI.findIndex((k) => k.id_kategori === id);
      if (idx === -1) return null;
      const cur = db.KATEGORI[idx];
      const nextName = nama_kategori !== undefined && nama_kategori.trim() ? nama_kategori.trim() : cur.nama_kategori;
      db.KATEGORI[idx] = {
        ...cur,
        nama_kategori: nextName,
        deskripsi: deskripsi !== undefined ? String(deskripsi).trim() : cur.deskripsi,
        urutan: urutan !== undefined ? Math.max(1, Math.floor(Number(urutan))) : cur.urutan,
        status: status === 'NONAKTIF' ? 'NONAKTIF' : status === 'AKTIF' ? 'AKTIF' : cur.status,
      };
      if (nextName !== cur.nama_kategori) {
        for (const prod of db.PRODUK) {
          if (prod.id_kategori === id) {
            prod.nama_kategori = nextName;
          }
        }
      }
      appendLog(db, req.session!, 'EDIT_KATEGORI', 'KATEGORI', `Update kategori ${nextName}`);
      return db.KATEGORI[idx];
    });
    if (!updated) {
      res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/admin/kategori/:id', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const result = await withDbLock((db) => {
      const idx = db.KATEGORI.findIndex((k) => k.id_kategori === id);
      if (idx === -1) return null;
      const usedByProducts = db.PRODUK.some((p) => p.id_kategori === id);
      const name = db.KATEGORI[idx].nama_kategori;
      if (usedByProducts) {
        db.KATEGORI[idx].status = 'NONAKTIF';
        appendLog(db, req.session!, 'NONAKTIF_KATEGORI', 'KATEGORI', `Nonaktifkan kategori ${name}`);
        return { ok: true, mode: 'NONAKTIF' };
      }
      db.KATEGORI.splice(idx, 1);
      appendLog(db, req.session!, 'HAPUS_KATEGORI', 'KATEGORI', `Hapus kategori ${name}`);
      return { ok: true, mode: 'DELETED' };
    });
    if (!result) {
      res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      return;
    }
    res.json(result);
  });

  app.post('/api/admin/anggota', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { nama, nik, alamat, no_hp, email, username, password, limit_kredit } = req.body as Record<string, unknown>;
    if (!nama || !no_hp) {
      res.status(400).json({ error: 'Nama dan nomor HP anggota wajib diisi.' });
      return;
    }
    const result = await withDbLock((db) => {
      const idAnggota = generateId('ANG');
      const kodeAnggota = `KOP-${new Date().getFullYear()}-${String(db.ANGGOTA.length + 1).padStart(3, '0')}`;
      const newAnggota: AnggotaRecord = {
        id_anggota: idAnggota,
        kode_anggota: kodeAnggota,
        nik: String(nik || '-'),
        nama: String(nama).trim(),
        alamat: String(alamat || '-'),
        no_hp: String(no_hp).trim(),
        email: String(email || `${kodeAnggota.toLowerCase()}@koperasi.id`),
        tanggal_gabung: new Date().toISOString().slice(0, 10),
        status_anggota: 'AKTIF',
        saldo_pokok: 0,
        saldo_wajib: 0,
        saldo_sukarela: 0,
        limit_kredit: Number(limit_kredit || 10000000),
        foto_url: '',
        qr_token: `KDP-MEMBER-${idAnggota}-${kodeAnggota}`,
      };
      db.ANGGOTA.push(newAnggota);

      if (username && password) {
        const uname = String(username).trim();
        if (!db.USERS.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
          const salt = generateSalt();
          db.USERS.push({
            id_user: generateId('USR'),
            username: uname,
            password_hash: hashPassword(String(password), salt),
            salt,
            nama_lengkap: newAnggota.nama,
            email: newAnggota.email,
            no_hp: newAnggota.no_hp,
            role: 'ANGGOTA',
            id_anggota: idAnggota,
            status: 'AKTIF',
            created_at: new Date().toISOString(),
            last_login: null,
          });
        }
      }
      appendLog(db, req.session!, 'TAMBAH_ANGGOTA', 'ANGGOTA', `${kodeAnggota} - ${newAnggota.nama}`);
      return newAnggota;
    });
    res.status(201).json(result);
  });

  app.post('/api/admin/users', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { username, password, nama_lengkap, email, no_hp, role } = req.body as {
      username: string;
      password: string;
      nama_lengkap: string;
      email: string;
      no_hp: string;
      role: UserRole;
    };
    if (!username || !password || !nama_lengkap || !role) {
      res.status(400).json({ error: 'Username, password, nama lengkap, dan role wajib diisi.' });
      return;
    }
    const result = await withDbLock((db) => {
      if (db.USERS.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
        return { error: 'Username sudah terdaftar.', status: 400 as const };
      }
      const salt = generateSalt();
      const newUser: Required<UserRecord> = {
        id_user: generateId('USR'),
        username: username.trim(),
        password_hash: hashPassword(password, salt),
        salt,
        nama_lengkap: nama_lengkap.trim(),
        email: email?.trim() || `${username.trim()}@koperasi.id`,
        no_hp: no_hp?.trim() || '-',
        role,
        id_anggota: null,
        status: 'AKTIF',
        created_at: new Date().toISOString(),
        last_login: null,
      };
      db.USERS.push(newUser);
      appendLog(db, req.session!, 'TAMBAH_USER', 'USERS', `${newUser.username} (${newUser.role})`);
      return { user: sanitizeUser(newUser), status: 201 as const };
    });
    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result.user);
  });

  app.patch('/api/admin/users/:id/toggle', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const updated = await withDbLock((db) => {
      const user = db.USERS.find((u) => u.id_user === id);
      if (!user || user.id_user === req.session!.id_user) return null;
      user.status = user.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
      appendLog(db, req.session!, 'TOGGLE_USER', 'USERS', `${user.username} -> ${user.status}`);
      return sanitizeUser(user);
    });
    if (!updated) {
      res.status(400).json({ error: 'User tidak ditemukan atau tidak dapat menonaktifkan akun sendiri.' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/admin/supplier', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { nama_supplier, kontak_person, no_hp, alamat, kategori_pasokan, hutang_usaha } = req.body as Record<string, unknown>;
    if (!nama_supplier) {
      res.status(400).json({ error: 'Nama supplier wajib diisi.' });
      return;
    }
    const created = await withDbLock((db) => {
      const row = {
        id_supplier: generateId('SUP'),
        kode_supplier: `SUP-${String(db.SUPPLIER.length + 1).padStart(3, '0')}`,
        nama_supplier: String(nama_supplier).trim(),
        kontak_person: String(kontak_person || '-'),
        no_hp: String(no_hp || '-'),
        alamat: String(alamat || '-'),
        kategori_pasokan: String(kategori_pasokan || 'Umum'),
        hutang_usaha: Math.max(0, Number(hutang_usaha || 0)),
        status: 'AKTIF' as const,
      };
      db.SUPPLIER.push(row);
      appendLog(db, req.session!, 'TAMBAH_SUPPLIER', 'SUPPLIER', row.nama_supplier);
      return row;
    });
    res.status(201).json(created);
  });

  app.post('/api/admin/pengumuman', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const { judul, isi, kategori = 'UMUM', prioritas = 'NORMAL', target_role = 'SEMUA' } = req.body as Record<string, string>;
    if (!judul?.trim() || !isi?.trim()) {
      res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
      return;
    }
    const created = await withDbLock((db) => {
      const row = {
        id_pengumuman: generateId('PNG'),
        judul: judul.trim(),
        isi: isi.trim(),
        kategori: kategori as 'UMUM' | 'PROMO' | 'RAPAT' | 'KEUANGAN',
        prioritas: prioritas as 'TINGGI' | 'NORMAL',
        target_role: target_role as 'SEMUA' | UserRole,
        penulis: req.session!.username,
        status: 'AKTIF' as const,
        created_at: new Date().toISOString(),
      };
      db.PENGUMUMAN.unshift(row);
      appendLog(db, req.session!, 'BUAT_PENGUMUMAN', 'PENGUMUMAN', row.judul);
      return row;
    });
    res.status(201).json(created);
  });

  app.put('/api/admin/pengaturan', requireRole(['ADMIN']), async (req: AuthedRequest, res) => {
    const updates = req.body as Partial<ReturnType<typeof loadDatabase>['PENGATURAN']>;
    const updated = await withDbLock((db) => {
      db.PENGATURAN = { ...db.PENGATURAN, ...updates };
      appendLog(db, req.session!, 'UPDATE_PENGATURAN', 'PENGATURAN', 'Profil dan kebijakan koperasi diperbarui');
      return db.PENGATURAN;
    });
    res.json(updated);
  });

  app.get('/api/admin/backup', requireRole(['ADMIN']), (req: AuthedRequest, res) => {
    const db = loadDatabase();
    const safeBackup = {
      ...db,
      USERS: db.USERS.map((u) => ({ ...u, password_hash: '[REDACTED]', salt: '[REDACTED]' })),
      exported_at: new Date().toISOString(),
      exported_by: req.session!.username,
    };
    res.setHeader('Content-Disposition', `attachment; filename="backup-koperasi-digital-pro-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(safeBackup);
  });

  // ======================== VITE MIDDLEWARE / STATIC ========================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KOPERASI DIGITAL PRO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
