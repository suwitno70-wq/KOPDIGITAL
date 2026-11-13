import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AnggotaRecord,
  AngsuranRecord,
  DetailPesananRecord,
  KasRecord,
  KategoriRecord,
  KeranjangRecord,
  LogAktivitasRecord,
  PembayaranRecord,
  PengaturanKoperasi,
  PengumumanRecord,
  PesananRecord,
  PinjamanRecord,
  ProdukRecord,
  SimpananRecord,
  SupplierRecord,
  UserRecord,
} from '../src/types/koperasi.ts';

export interface KoperasiDatabase {
  USERS: Required<UserRecord>[];
  ANGGOTA: AnggotaRecord[];
  PRODUK: ProdukRecord[];
  KATEGORI: KategoriRecord[];
  KERANJANG: KeranjangRecord[];
  PESANAN: Omit<PesananRecord, 'items' | 'pembayaran'>[];
  DETAIL_PESANAN: DetailPesananRecord[];
  PEMBAYARAN: PembayaranRecord[];
  SIMPANAN: SimpananRecord[];
  PINJAMAN: PinjamanRecord[];
  ANGSURAN: AngsuranRecord[];
  KAS: KasRecord[];
  SUPPLIER: SupplierRecord[];
  PENGUMUMAN: PengumumanRecord[];
  LOG_AKTIVITAS: LogAktivitasRecord[];
  PENGATURAN: PengaturanKoperasi;
  USED_IDEMPOTENCY_KEYS: string[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'koperasi-db.json');

export function hashPassword(password: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${password}:KOPERASI_DIGITAL_PRO_WITNO`)
    .digest('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateTransactionNo(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomInt(1000, 9999);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

function daysAgoIso(days: number): string {
  const dt = new Date(Date.now() - days * 86400000);
  return dt.toISOString();
}

export function createInitialDatabase(): KoperasiDatabase {
  const adminSalt = generateSalt();
  const kasirSalt = generateSalt();
  const m1Salt = generateSalt();
  const m2Salt = generateSalt();

  const now = new Date().toISOString();

  const anggota1: AnggotaRecord = {
    id_anggota: 'ANG-001',
    kode_anggota: 'KOP-2026-001',
    nik: '3273011205920001',
    nama: 'Budi Santoso',
    alamat: 'Jl. Merdeka No. 45, Bandung',
    no_hp: '081234567890',
    email: 'budi.santoso@koperasi.id',
    tanggal_gabung: '2025-01-15',
    status_anggota: 'AKTIF',
    saldo_pokok: 500000,
    saldo_wajib: 1800000,
    saldo_sukarela: 2450000,
    limit_kredit: 15000000,
    foto_url: '',
    qr_token: 'KDP-MEMBER-ANG-001-KOP-2026-001',
  };

  const anggota2: AnggotaRecord = {
    id_anggota: 'ANG-002',
    kode_anggota: 'KOP-2026-002',
    nik: '3273022408950004',
    nama: 'Siti Rahmawati',
    alamat: 'Jl. Asia Afrika No. 112, Bandung',
    no_hp: '081298765432',
    email: 'siti.rahmawati@koperasi.id',
    tanggal_gabung: '2025-03-10',
    status_anggota: 'AKTIF',
    saldo_pokok: 500000,
    saldo_wajib: 1500000,
    saldo_sukarela: 3200000,
    limit_kredit: 15000000,
    foto_url: '',
    qr_token: 'KDP-MEMBER-ANG-002-KOP-2026-002',
  };

  const anggota3: AnggotaRecord = {
    id_anggota: 'ANG-003',
    kode_anggota: 'KOP-2026-003',
    nik: '3273041511880002',
    nama: 'Hendra Wijaya',
    alamat: 'Jl. Dago Pakar No. 18, Bandung',
    no_hp: '081355667788',
    email: 'hendra.wijaya@koperasi.id',
    tanggal_gabung: '2025-06-22',
    status_anggota: 'AKTIF',
    saldo_pokok: 500000,
    saldo_wajib: 1200000,
    saldo_sukarela: 1150000,
    limit_kredit: 10000000,
    foto_url: '',
    qr_token: 'KDP-MEMBER-ANG-003-KOP-2026-003',
  };

  const users: Required<UserRecord>[] = [
    {
      id_user: 'USR-ADMIN',
      username: 'admin',
      password_hash: hashPassword('Admin123!', adminSalt),
      salt: adminSalt,
      nama_lengkap: 'Witno Suryanto (Ketua Pengurus)',
      email: 'admin@koperasidigital.id',
      no_hp: '081100000001',
      role: 'ADMIN',
      id_anggota: null,
      status: 'AKTIF',
      created_at: '2025-01-01T08:00:00.000Z',
      last_login: null,
    },
    {
      id_user: 'USR-KASIR',
      username: 'kasir',
      password_hash: hashPassword('Kasir123!', kasirSalt),
      salt: kasirSalt,
      nama_lengkap: 'Rina Kusuma (Kasir Utama)',
      email: 'kasir@koperasidigital.id',
      no_hp: '081100000002',
      role: 'KASIR',
      id_anggota: null,
      status: 'AKTIF',
      created_at: '2025-01-05T08:00:00.000Z',
      last_login: null,
    },
    {
      id_user: 'USR-ANG1',
      username: 'anggota1',
      password_hash: hashPassword('Anggota123!', m1Salt),
      salt: m1Salt,
      nama_lengkap: 'Budi Santoso',
      email: 'budi.santoso@koperasi.id',
      no_hp: '081234567890',
      role: 'ANGGOTA',
      id_anggota: 'ANG-001',
      status: 'AKTIF',
      created_at: '2025-01-15T08:00:00.000Z',
      last_login: null,
    },
    {
      id_user: 'USR-ANG2',
      username: 'anggota2',
      password_hash: hashPassword('Anggota123!', m2Salt),
      salt: m2Salt,
      nama_lengkap: 'Siti Rahmawati',
      email: 'siti.rahmawati@koperasi.id',
      no_hp: '081298765432',
      role: 'ANGGOTA',
      id_anggota: 'ANG-002',
      status: 'AKTIF',
      created_at: '2025-03-10T08:00:00.000Z',
      last_login: null,
    },
  ];

  const kategori: KategoriRecord[] = [
    { id_kategori: 'KAT-01', nama_kategori: 'Sembako & Pangan', ikon: 'wheat', deskripsi: 'Kebutuhan pokok harian anggota', urutan: 1, status: 'AKTIF' },
    { id_kategori: 'KAT-02', nama_kategori: 'Kopi & Minuman', ikon: 'coffee', deskripsi: 'Produk olahan UMKM kopi & herbal', urutan: 2, status: 'AKTIF' },
    { id_kategori: 'KAT-03', nama_kategori: 'Kesehatan & Madu', ikon: 'heart-pulse', deskripsi: 'Madu hutan murni & minyak sehat', urutan: 3, status: 'AKTIF' },
    { id_kategori: 'KAT-04', nama_kategori: 'Batik & Sandang', ikon: 'shirt', deskripsi: 'Seragam batik koperasi & tekstil UMKM', urutan: 4, status: 'AKTIF' },
    { id_kategori: 'KAT-05', nama_kategori: 'Pecah Belah', ikon: 'utensils', deskripsi: 'Peralatan makan keramik & gelas kaca', urutan: 5, status: 'AKTIF' },
    { id_kategori: 'KAT-06', nama_kategori: 'Elektronik', ikon: 'cpu', deskripsi: 'Peralatan elektronik dapur & rumah tangga', urutan: 6, status: 'AKTIF' },
  ];

  const supplier: SupplierRecord[] = [
    {
      id_supplier: 'SUP-01',
      kode_supplier: 'SUP-TANI-01',
      nama_supplier: 'Gapoktan Makmur Sejahtera',
      kontak_person: 'Pak Darmawan',
      no_hp: '081322334455',
      alamat: 'Kab. Cianjur, Jawa Barat',
      kategori_pasokan: 'Beras & Palawija',
      hutang_usaha: 2500000,
      status: 'AKTIF',
    },
    {
      id_supplier: 'SUP-02',
      kode_supplier: 'SUP-UMKM-02',
      nama_supplier: 'Koperasi Tani Toraja & Nusantara',
      kontak_person: 'Ibu Lestari',
      no_hp: '081566778899',
      alamat: 'Bandung & Tana Toraja',
      kategori_pasokan: 'Kopi, Madu & Gula Aren',
      hutang_usaha: 1200000,
      status: 'AKTIF',
    },
    {
      id_supplier: 'SUP-03',
      kode_supplier: 'SUP-BATIK-03',
      nama_supplier: 'Sentra Batik Priangan',
      kontak_person: 'Mas Arifin',
      no_hp: '081799887766',
      alamat: 'Tasikmalaya, Jawa Barat',
      kategori_pasokan: 'Kain & Kemeja Batik',
      hutang_usaha: 0,
      status: 'AKTIF',
    },
    {
      id_supplier: 'SUP-04',
      kode_supplier: 'SUP-ELEK-04',
      nama_supplier: 'Distributor Graha Rumah & Elektronik',
      kontak_person: 'Bapak Hendarto',
      no_hp: '081844556677',
      alamat: 'Jakarta Barat',
      kategori_pasokan: 'Pecah Belah & Elektronik Dapur',
      hutang_usaha: 0,
      status: 'AKTIF',
    },
  ];

  const produk: ProdukRecord[] = [
    {
      id_produk: 'PRD-001',
      kode_produk: 'KOP-BRS-01',
      barcode: '8991001100015',
      nama_produk: 'Beras Organik Nusa Premium 5 Kg',
      id_kategori: 'KAT-01',
      nama_kategori: 'Sembako & Pangan',
      id_supplier: 'SUP-01',
      deskripsi: 'Beras putih organik pulen hasil panen petani mitra koperasi tanpa pemutih dan pestisida sintetis.',
      harga_normal: 85000,
      harga_anggota: 76000,
      harga_promo: 72500,
      stok: 64,
      stok_min: 10,
      satuan: 'Pouch 5 Kg',
      foto_url: '/images/prod_beras_organik_1794528005705.jpg',
      rating: 4.9,
      terjual: 218,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(30),
    },
    {
      id_produk: 'PRD-002',
      kode_produk: 'KOP-KOPI-02',
      barcode: '8991001100022',
      nama_produk: 'Kopi Arabika Toraja Roasted 250g',
      id_kategori: 'KAT-02',
      nama_kategori: 'Kopi & Minuman',
      id_supplier: 'SUP-02',
      deskripsi: 'Biji kopi Arabika single origin Tana Toraja sangrai medium dengan aroma cokelat gelap dan rempah.',
      harga_normal: 95000,
      harga_anggota: 82000,
      harga_promo: 78000,
      stok: 42,
      stok_min: 8,
      satuan: 'Pouch 250g',
      foto_url: '/images/prod_kopi_arabika_1794528004723.jpg',
      rating: 4.9,
      terjual: 156,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(25),
    },
    {
      id_produk: 'PRD-003',
      kode_produk: 'KOP-MDU-03',
      barcode: '8991001100039',
      nama_produk: 'Madu Hutan Liar Murni 350 ml',
      id_kategori: 'KAT-03',
      nama_kategori: 'Kesehatan & Madu',
      id_supplier: 'SUP-02',
      deskripsi: 'Madu mentah murni dari lebah hutan liar nusantara, dipanen lestari tanpa pemanasan dan campuran gula.',
      harga_normal: 125000,
      harga_anggota: 110000,
      harga_promo: null,
      stok: 29,
      stok_min: 5,
      satuan: 'Botol Kaca',
      foto_url: '/images/prod_madu_hutan_1794528004581.jpg',
      rating: 5.0,
      terjual: 134,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(20),
    },
    {
      id_produk: 'PRD-004',
      kode_produk: 'KOP-VCO-04',
      barcode: '8991001100046',
      nama_produk: 'Extra Virgin Coconut Oil 250 ml',
      id_kategori: 'KAT-03',
      nama_kategori: 'Kesehatan & Madu',
      id_supplier: 'SUP-02',
      deskripsi: 'Minyak kelapa murni cold-pressed kaya asam laurat untuk memasak sehat dan perawatan alami.',
      harga_normal: 68000,
      harga_anggota: 58000,
      harga_promo: 55000,
      stok: 38,
      stok_min: 6,
      satuan: 'Botol 250 ml',
      foto_url: '/images/prod_minyak_kelapa_1794528007328.jpg',
      rating: 4.8,
      terjual: 97,
      unggulan: false,
      status: 'AKTIF',
      created_at: daysAgoIso(15),
    },
    {
      id_produk: 'PRD-005',
      kode_produk: 'KOP-BTK-05',
      barcode: '8991001100053',
      nama_produk: 'Kemeja Batik Koperasi Katun Primisima',
      id_kategori: 'KAT-04',
      nama_kategori: 'Batik & Sandang',
      id_supplier: 'SUP-03',
      deskripsi: 'Kemeja batik resmi anggota Koperasi Digital Pro bahan katun halus adem dengan motif geometris hijau-emas.',
      harga_normal: 225000,
      harga_anggota: 185000,
      harga_promo: 175000,
      stok: 24,
      stok_min: 5,
      satuan: 'Pcs',
      foto_url: '/images/prod_batik_koperasi_1794528007074.jpg',
      rating: 4.9,
      terjual: 88,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(10),
    },
    {
      id_produk: 'PRD-006',
      kode_produk: 'KOP-ARN-06',
      barcode: '8991001100060',
      nama_produk: 'Gula Aren Organik Semut & Cetak 500g',
      id_kategori: 'KAT-01',
      nama_kategori: 'Sembako & Pangan',
      id_supplier: 'SUP-01',
      deskripsi: 'Gula aren murni indeks glikemik rendah hasil olahan pengrajin binaan koperasi.',
      harga_normal: 42000,
      harga_anggota: 36000,
      harga_promo: null,
      stok: 53,
      stok_min: 10,
      satuan: 'Kemasan 500g',
      foto_url: '/images/prod_gula_aren_1794528006522.jpg',
      rating: 4.7,
      terjual: 142,
      unggulan: false,
      status: 'AKTIF',
      created_at: daysAgoIso(5),
    },
    {
      id_produk: 'PRD-007',
      kode_produk: 'KOP-PRG-07',
      barcode: '8991001100077',
      nama_produk: 'Set Piring & Mangkuk Keramik Porcelain 12 Pcs',
      id_kategori: 'KAT-05',
      nama_kategori: 'Pecah Belah',
      id_supplier: 'SUP-04',
      deskripsi: 'Set perlengkapan makan keramik tebal tahan panas warna hijau sage elegan: 4 piring makan, 4 piring kue, dan 4 mangkuk.',
      harga_normal: 345000,
      harga_anggota: 289000,
      harga_promo: 265000,
      stok: 18,
      stok_min: 4,
      satuan: 'Set 12 Pcs',
      foto_url: '/images/prod_set_piring_keramik_1794532836936.jpg',
      rating: 4.9,
      terjual: 64,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(3),
    },
    {
      id_produk: 'PRD-008',
      kode_produk: 'KOP-GLS-08',
      barcode: '8991001100084',
      nama_produk: 'Set Teko Pitcher & 4 Gelas Kaca Borosilikat',
      id_kategori: 'KAT-05',
      nama_kategori: 'Pecah Belah',
      id_supplier: 'SUP-04',
      deskripsi: 'Teko kaca borosilikat kapasitas 1.5 Liter beserta 4 gelas kristal bertekstur vertikal untuk sajian tamu dan keluarga.',
      harga_normal: 185000,
      harga_anggota: 155000,
      harga_promo: null,
      stok: 25,
      stok_min: 5,
      satuan: 'Set 5 Pcs',
      foto_url: '/images/prod_set_gelas_kaca_1794532836365.jpg',
      rating: 4.8,
      terjual: 79,
      unggulan: false,
      status: 'AKTIF',
      created_at: daysAgoIso(2),
    },
    {
      id_produk: 'PRD-009',
      kode_produk: 'KOP-RCK-09',
      barcode: '8991001100091',
      nama_produk: 'Digital Smart Rice Cooker Low Watt 1.8 Liter',
      id_kategori: 'KAT-06',
      nama_kategori: 'Elektronik',
      id_supplier: 'SUP-04',
      deskripsi: 'Penanak nasi digital multifungsi hemat daya 400W dengan panci anti lengket tebal, timer memasak, dan layar LED.',
      harga_normal: 620000,
      harga_anggota: 525000,
      harga_promo: 489000,
      stok: 14,
      stok_min: 3,
      satuan: 'Unit',
      foto_url: '/images/prod_rice_cooker_1794532837700.jpg',
      rating: 5.0,
      terjual: 52,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(1),
    },
    {
      id_produk: 'PRD-010',
      kode_produk: 'KOP-BLD-10',
      barcode: '8991001100107',
      nama_produk: 'Blender Kaca Heavy Duty 1.5L Stainless 500W',
      id_kategori: 'KAT-06',
      nama_kategori: 'Elektronik',
      id_supplier: 'SUP-04',
      deskripsi: 'Blender dapur bertenaga 500W dengan gelas kaca tebal anti gores, pisau 6 mata baja tahan karat, dan garansi resmi 1 tahun.',
      harga_normal: 495000,
      harga_anggota: 415000,
      harga_promo: 395000,
      stok: 16,
      stok_min: 3,
      satuan: 'Unit',
      foto_url: '/images/prod_blender_kaca_1794532836548.jpg',
      rating: 4.9,
      terjual: 47,
      unggulan: true,
      status: 'AKTIF',
      created_at: daysAgoIso(1),
    },
  ];

  const simpanan: SimpananRecord[] = [
    {
      id_simpanan: 'SMP-001',
      nomor_transaksi: 'SMP-260115-1001',
      id_anggota: 'ANG-001',
      nama_anggota: 'Budi Santoso',
      jenis_simpanan: 'POKOK',
      tipe: 'SETOR',
      jumlah: 500000,
      saldo_sesudah: 500000,
      metode: 'TUNAI',
      keterangan: 'Setoran simpanan pokok pendaftaran anggota',
      petugas_id: 'USR-ADMIN',
      created_at: daysAgoIso(45),
    },
    {
      id_simpanan: 'SMP-002',
      nomor_transaksi: 'SMP-260201-1002',
      id_anggota: 'ANG-001',
      nama_anggota: 'Budi Santoso',
      jenis_simpanan: 'WAJIB',
      tipe: 'SETOR',
      jumlah: 1800000,
      saldo_sesudah: 1800000,
      metode: 'TRANSFER_BANK',
      keterangan: 'Akumulasi simpanan wajib tahunan',
      petugas_id: 'USR-ADMIN',
      created_at: daysAgoIso(20),
    },
    {
      id_simpanan: 'SMP-003',
      nomor_transaksi: 'SMP-260305-1003',
      id_anggota: 'ANG-001',
      nama_anggota: 'Budi Santoso',
      jenis_simpanan: 'SUKARELA',
      tipe: 'SETOR',
      jumlah: 2450000,
      saldo_sesudah: 2450000,
      metode: 'TRANSFER_BANK',
      keterangan: 'Tabungan sukarela anggota',
      petugas_id: 'USR-ADMIN',
      created_at: daysAgoIso(8),
    },
    {
      id_simpanan: 'SMP-004',
      nomor_transaksi: 'SMP-260310-1004',
      id_anggota: 'ANG-002',
      nama_anggota: 'Siti Rahmawati',
      jenis_simpanan: 'SUKARELA',
      tipe: 'SETOR',
      jumlah: 3200000,
      saldo_sesudah: 3200000,
      metode: 'QRIS',
      keterangan: 'Setoran sukarela Siti Rahmawati',
      petugas_id: 'USR-ADMIN',
      created_at: daysAgoIso(6),
    },
  ];

  const pinjaman: PinjamanRecord[] = [
    {
      id_pinjaman: 'PNJ-001',
      nomor_pinjaman: 'PNJ-261001-4401',
      id_anggota: 'ANG-001',
      nama_anggota: 'Budi Santoso',
      jumlah_pinjaman: 6000000,
      tenor_bulan: 6,
      bunga_persen: 1.5,
      total_bunga: 540000,
      total_kewajiban: 6540000,
      angsuran_per_bulan: 1090000,
      sisa_pokok: 4000000,
      sisa_tagihan: 4360000,
      tujuan: 'Modal pengembangan usaha warung kelontong keluarga',
      status: 'AKTIF',
      approved_by: 'USR-ADMIN',
      created_at: daysAgoIso(60),
      jatuh_tempo_berikutnya: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    },
    {
      id_pinjaman: 'PNJ-002',
      nomor_pinjaman: 'PNJ-261110-4402',
      id_anggota: 'ANG-002',
      nama_anggota: 'Siti Rahmawati',
      jumlah_pinjaman: 4000000,
      tenor_bulan: 4,
      bunga_persen: 1.5,
      total_bunga: 240000,
      total_kewajiban: 4240000,
      angsuran_per_bulan: 1060000,
      sisa_pokok: 4000000,
      sisa_tagihan: 4240000,
      tujuan: 'Pembelian alat jahit produksi konveksi batik',
      status: 'MENUNGGU_PERSETUJUAN',
      approved_by: null,
      created_at: daysAgoIso(2),
      jatuh_tempo_berikutnya: null,
    },
  ];

  const angsuran: AngsuranRecord[] = [
    {
      id_angsuran: 'ANGS-001',
      nomor_transaksi: 'ANGS-261015-2001',
      id_pinjaman: 'PNJ-001',
      nomor_pinjaman: 'PNJ-261001-4401',
      id_anggota: 'ANG-001',
      angsuran_ke: 1,
      pokok_dibayar: 1000000,
      bunga_dibayar: 90000,
      denda: 0,
      total_bayar: 1090000,
      metode: 'TRANSFER_BANK',
      petugas_id: 'USR-ADMIN',
      created_at: daysAgoIso(32),
    },
    {
      id_angsuran: 'ANGS-002',
      nomor_transaksi: 'ANGS-261105-2002',
      id_pinjaman: 'PNJ-001',
      nomor_pinjaman: 'PNJ-261001-4401',
      id_anggota: 'ANG-001',
      angsuran_ke: 2,
      pokok_dibayar: 1000000,
      bunga_dibayar: 90000,
      denda: 0,
      total_bayar: 1090000,
      metode: 'SALDO_KOPERASI',
      petugas_id: 'USR-ADMIN',
      created_at: daysAgoIso(7),
    },
  ];

  const pesanan: Omit<PesananRecord, 'items' | 'pembayaran'>[] = [
    {
      id_pesanan: 'ORD-001',
      nomor_pesanan: 'KDP-261111-8801',
      id_user: 'USR-ANG1',
      id_anggota: 'ANG-001',
      nama_pembeli: 'Budi Santoso',
      channel: 'MARKETPLACE',
      metode_pembayaran: 'SALDO_KOPERASI',
      subtotal: 263000,
      diskon_anggota: 31000,
      diskon_promo: 7500,
      total_bayar: 224500,
      uang_diterima: 224500,
      kembalian: 0,
      status_pesanan: 'SELESAI',
      catatan: 'Ambil di gerai utama koperasi',
      kasir_id: 'USR-KASIR',
      idempotency_key: 'seed-ord-001',
      created_at: daysAgoIso(1),
      updated_at: daysAgoIso(1),
    },
    {
      id_pesanan: 'ORD-002',
      nomor_pesanan: 'KDP-261112-8802',
      id_user: 'USR-ANG1',
      id_anggota: 'ANG-001',
      nama_pembeli: 'Budi Santoso',
      channel: 'MARKETPLACE',
      metode_pembayaran: 'QRIS',
      subtotal: 225000,
      diskon_anggota: 40000,
      diskon_promo: 10000,
      total_bayar: 175000,
      uang_diterima: 175000,
      kembalian: 0,
      status_pesanan: 'SIAP_DIAMBIL',
      catatan: 'Ukuran L mohon disiapkan',
      kasir_id: 'USR-KASIR',
      idempotency_key: 'seed-ord-002',
      created_at: now,
      updated_at: now,
    },
    {
      id_pesanan: 'ORD-003',
      nomor_pesanan: 'KDP-261112-8803',
      id_user: 'USR-ANG2',
      id_anggota: 'ANG-002',
      nama_pembeli: 'Siti Rahmawati',
      channel: 'MARKETPLACE',
      metode_pembayaran: 'TRANSFER_BANK',
      subtotal: 193000,
      diskon_anggota: 25000,
      diskon_promo: 3000,
      total_bayar: 165000,
      uang_diterima: 0,
      kembalian: 0,
      status_pesanan: 'MENUNGGU_KONFIRMASI',
      catatan: 'Sudah transfer BCA an Siti',
      kasir_id: null,
      idempotency_key: 'seed-ord-003',
      created_at: now,
      updated_at: now,
    },
  ];

  const detailPesanan: DetailPesananRecord[] = [
    {
      id_detail: 'DTL-001',
      id_pesanan: 'ORD-001',
      id_produk: 'PRD-001',
      kode_produk: 'KOP-BRS-01',
      nama_produk: 'Beras Organik Nusa Premium 5 Kg',
      qty: 2,
      harga_satuan: 72500,
      diskon_item: 25000,
      subtotal: 145000,
    },
    {
      id_detail: 'DTL-002',
      id_pesanan: 'ORD-001',
      id_produk: 'PRD-002',
      kode_produk: 'KOP-KOPI-02',
      nama_produk: 'Kopi Arabika Toraja Roasted 250g',
      qty: 1,
      harga_satuan: 78000,
      diskon_item: 17000,
      subtotal: 78000,
    },
    {
      id_detail: 'DTL-003',
      id_pesanan: 'ORD-002',
      id_produk: 'PRD-005',
      kode_produk: 'KOP-BTK-05',
      nama_produk: 'Kemeja Batik Koperasi Katun Primisima',
      qty: 1,
      harga_satuan: 175000,
      diskon_item: 50000,
      subtotal: 175000,
    },
    {
      id_detail: 'DTL-004',
      id_pesanan: 'ORD-003',
      id_produk: 'PRD-003',
      kode_produk: 'KOP-MDU-03',
      nama_produk: 'Madu Hutan Liar Murni 350 ml',
      qty: 1,
      harga_satuan: 110000,
      diskon_item: 15000,
      subtotal: 110000,
    },
    {
      id_detail: 'DTL-005',
      id_pesanan: 'ORD-003',
      id_produk: 'PRD-004',
      kode_produk: 'KOP-VCO-04',
      nama_produk: 'Extra Virgin Coconut Oil 250 ml',
      qty: 1,
      harga_satuan: 55000,
      diskon_item: 13000,
      subtotal: 55000,
    },
  ];

  const pembayaran: PembayaranRecord[] = [
    {
      id_pembayaran: 'PAY-001',
      nomor_pembayaran: 'PAY-261111-7001',
      id_pesanan: 'ORD-001',
      nomor_pesanan: 'KDP-261111-8801',
      metode: 'SALDO_KOPERASI',
      jumlah: 224500,
      referensi_gateway: 'INT-SALDO-ANG001',
      bukti_catatan: 'Otomatis potong saldo sukarela',
      status_pembayaran: 'TERVERIFIKASI',
      verified_by: 'SYSTEM',
      created_at: daysAgoIso(1),
    },
    {
      id_pembayaran: 'PAY-002',
      nomor_pembayaran: 'PAY-261112-7002',
      id_pesanan: 'ORD-002',
      nomor_pesanan: 'KDP-261112-8802',
      metode: 'QRIS',
      jumlah: 175000,
      referensi_gateway: 'QRIS-MID-992817',
      bukti_catatan: 'Pembayaran QRIS terverifikasi',
      status_pembayaran: 'TERVERIFIKASI',
      verified_by: 'USR-KASIR',
      created_at: now,
    },
    {
      id_pembayaran: 'PAY-003',
      nomor_pembayaran: 'PAY-261112-7003',
      id_pesanan: 'ORD-003',
      nomor_pesanan: 'KDP-261112-8803',
      metode: 'TRANSFER_BANK',
      jumlah: 165000,
      referensi_gateway: 'TRF-BCA-00192',
      bukti_catatan: 'Menunggu verifikasi mutasi kasir/admin',
      status_pembayaran: 'PENDING',
      verified_by: null,
      created_at: now,
    },
  ];

  const kas: KasRecord[] = [
    {
      id_kas: 'KAS-001',
      nomor_transaksi: 'KAS-260101-0001',
      tanggal: daysAgoIso(60).slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'MODAL',
      jumlah: 35000000,
      keterangan: 'Modal awal pendirian unit usaha Koperasi Digital Pro',
      referensi_id: 'INIT-MODAL',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(60),
    },
    {
      id_kas: 'KAS-002',
      nomor_transaksi: 'KAS-260115-0002',
      tanggal: daysAgoIso(45).slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'SIMPANAN_ANGGOTA',
      jumlah: 12800000,
      keterangan: 'Total akumulasi simpanan pokok, wajib & sukarela anggota aktif',
      referensi_id: 'SMP-REKAP',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(45),
    },
    {
      id_kas: 'KAS-003',
      nomor_transaksi: 'KAS-260912-0003',
      tanggal: daysAgoIso(60).slice(0, 10),
      jenis: 'KELUAR',
      kategori_akun: 'PENCAIRAN_PINJAMAN',
      jumlah: 6000000,
      keterangan: 'Pencairan pinjaman PNJ-261001-4401 an Budi Santoso',
      referensi_id: 'PNJ-001',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(60),
    },
    {
      id_kas: 'KAS-004',
      nomor_transaksi: 'KAS-261001-0004',
      tanggal: daysAgoIso(25).slice(0, 10),
      jenis: 'KELUAR',
      kategori_akun: 'PEMBELIAN_STOK',
      jumlah: 8400000,
      keterangan: 'Kulakan stok barang pangan, kopi & batik koperasi',
      referensi_id: 'PO-SUP-01',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(25),
    },
    {
      id_kas: 'KAS-005',
      nomor_transaksi: 'KAS-261015-0005',
      tanggal: daysAgoIso(10).slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'PENDAPATAN_PENJUALAN',
      jumlah: 14850000,
      keterangan: 'Rekap penjualan ritel marketplace & kasir bulan berjalan',
      referensi_id: 'SLS-REKAP',
      user_id: 'USR-KASIR',
      created_at: daysAgoIso(10),
    },
    {
      id_kas: 'KAS-006',
      nomor_transaksi: 'KAS-261105-0006',
      tanggal: daysAgoIso(7).slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'ANGSURAN_PINJAMAN',
      jumlah: 2000000,
      keterangan: 'Pokok angsuran ke-1 & ke-2 PNJ-261001-4401',
      referensi_id: 'PNJ-001',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(7),
    },
    {
      id_kas: 'KAS-007',
      nomor_transaksi: 'KAS-261105-0007',
      tanggal: daysAgoIso(7).slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'PENDAPATAN_BUNGA',
      jumlah: 180000,
      keterangan: 'Pendapatan jasa/bunga angsuran pinjaman PNJ-261001-4401',
      referensi_id: 'PNJ-001',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(7),
    },
    {
      id_kas: 'KAS-008',
      nomor_transaksi: 'KAS-261108-0008',
      tanggal: daysAgoIso(4).slice(0, 10),
      jenis: 'KELUAR',
      kategori_akun: 'PENGELUARAN_OPERASIONAL',
      jumlah: 1450000,
      keterangan: 'Biaya listrik, internet & kemasan gerai koperasi',
      referensi_id: 'OPR-NOV',
      user_id: 'USR-ADMIN',
      created_at: daysAgoIso(4),
    },
    {
      id_kas: 'KAS-009',
      nomor_transaksi: 'KAS-261111-0009',
      tanggal: daysAgoIso(1).slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'PENDAPATAN_PENJUALAN',
      jumlah: 224500,
      keterangan: 'Penjualan pesanan KDP-261111-8801',
      referensi_id: 'ORD-001',
      user_id: 'USR-KASIR',
      created_at: daysAgoIso(1),
    },
    {
      id_kas: 'KAS-010',
      nomor_transaksi: 'KAS-261112-0010',
      tanggal: now.slice(0, 10),
      jenis: 'MASUK',
      kategori_akun: 'PENDAPATAN_PENJUALAN',
      jumlah: 175000,
      keterangan: 'Penjualan pesanan KDP-261112-8802 (QRIS)',
      referensi_id: 'ORD-002',
      user_id: 'USR-KASIR',
      created_at: now,
    },
  ];

  const pengumuman: PengumumanRecord[] = [
    {
      id_pengumuman: 'PNG-001',
      judul: 'Promo Harga Spesial Anggota Bulan Ini — Hemat hingga 18%',
      isi: 'Seluruh anggota aktif Koperasi Digital Pro otomatis mendapatkan harga khusus anggota serta tambahan potongan promo untuk produk Beras Organik, Kopi Toraja, dan Batik Koperasi.',
      kategori: 'PROMO',
      prioritas: 'TINGGI',
      target_role: 'SEMUA',
      penulis: 'Pengurus Koperasi',
      status: 'AKTIF',
      created_at: daysAgoIso(2),
    },
    {
      id_pengumuman: 'PNG-002',
      judul: 'Persiapan Rapat Anggota Tahunan (RAT) & Pembagian SHU',
      isi: 'Rekapitulasi transaksi belanja anggota dan jasa simpanan sudah tercatat otomatis untuk perhitungan SHU akhir tahun buku. Pastikan simpanan wajib Anda terbayar rutin setiap bulan.',
      kategori: 'RAPAT',
      prioritas: 'NORMAL',
      target_role: 'SEMUA',
      penulis: 'Witno Suryanto',
      status: 'AKTIF',
      created_at: daysAgoIso(5),
    },
  ];

  const logs: LogAktivitasRecord[] = [
    {
      id_log: 'LOG-001',
      timestamp: now,
      id_user: 'SYSTEM',
      username: 'system',
      role: 'ADMIN',
      aksi: 'INISIALISASI_DATABASE',
      modul: 'SISTEM',
      detail: 'Database 16 tabel KOPERASI DIGITAL PRO berhasil diinisialisasi otomatis.',
      ip_atau_device: 'localhost',
    },
  ];

  const pengaturan: PengaturanKoperasi = {
    nama_koperasi: 'KOPERASI DIGITAL PRO',
    tagline: 'Marketplace & Sistem Keuangan Koperasi Modern',
    branding: 'KREATIF BY WITNO',
    alamat: 'Jl. Jenderal Sudirman No. 88, Bandung 40111',
    telepon: '(022) 8880-2026',
    email: 'halo@koperasidigitalpro.id',
    npwp_badan_hukum: 'AHU-0028194.AH.01.29.TAHUN 2025',
    bunga_pinjaman_persen_per_bulan: 1.5,
    simpanan_pokok_wajib: 500000,
    simpanan_wajib_bulanan: 150000,
    izinkan_bayar_saldo_koperasi: true,
    bank_nama: 'Bank BCA',
    bank_rekening: '7750-8891-2026',
    bank_atas_nama: 'KOPERASI DIGITAL PRO',
    qris_merchant_id: 'ID10202600088192',
    qris_merchant_nama: 'KOPERASI DIGITAL PRO',
    shu_jasa_modal_persen: 25,
    shu_jasa_anggota_persen: 30,
    shu_cadangan_persen: 25,
    shu_pengurus_persen: 10,
    shu_sosial_persen: 10,
    logo_url: '/icon.svg',
    katalog_hero_judul: 'Belanja kebutuhan harian lebih hemat dengan harga khusus anggota koperasi.',
    katalog_hero_subjudul:
      'Setiap transaksi otomatis tercatat dalam perhitungan Sisa Hasil Usaha (SHU) tahunan Anda dan mendukung produk UMKM anggota.',
    katalog_hero_foto: '/images/hero_koperasi_banner_1794528004578.jpg',
    katalog_urutan_default: 'TERBARU',
    katalog_tampil_badge_diskon: true,
    katalog_kolom_desktop: 4,
  };

  return {
    USERS: users,
    ANGGOTA: [anggota1, anggota2, anggota3],
    PRODUK: produk,
    KATEGORI: kategori,
    KERANJANG: [],
    PESANAN: pesanan,
    DETAIL_PESANAN: detailPesanan,
    PEMBAYARAN: pembayaran,
    SIMPANAN: simpanan,
    PINJAMAN: pinjaman,
    ANGSURAN: angsuran,
    KAS: kas,
    SUPPLIER: supplier,
    PENGUMUMAN: pengumuman,
    LOG_AKTIVITAS: logs,
    PENGATURAN: pengaturan,
    USED_IDEMPOTENCY_KEYS: ['seed-ord-001', 'seed-ord-002', 'seed-ord-003'],
  };
}

let dbCache: KoperasiDatabase | null = null;
let lockQueue: Promise<void> = Promise.resolve();

export function loadDatabase(): KoperasiDatabase {
  if (dbCache) return dbCache;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    dbCache = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
    return dbCache;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as KoperasiDatabase;

  // Merge newly introduced catalog seed items (e.g. Pecah Belah & Elektronik) into existing DB if missing
  const seed = createInitialDatabase();
  let changed = false;
  for (const kat of seed.KATEGORI) {
    if (!parsed.KATEGORI.some((k) => k.id_kategori === kat.id_kategori)) {
      parsed.KATEGORI.push(kat);
      changed = true;
    }
  }
  for (const sup of seed.SUPPLIER) {
    if (!parsed.SUPPLIER.some((s) => s.id_supplier === sup.id_supplier)) {
      parsed.SUPPLIER.push(sup);
      changed = true;
    }
  }
  for (const prod of seed.PRODUK) {
    if (!parsed.PRODUK.some((p) => p.id_produk === prod.id_produk)) {
      parsed.PRODUK.push(prod);
      changed = true;
    }
  }
  for (const prod of parsed.PRODUK) {
    if (prod.foto_url && prod.foto_url.startsWith('/src/assets/images/')) {
      prod.foto_url = prod.foto_url.replace('/src/assets/images/', '/images/');
      changed = true;
    }
  }
  if (parsed.PENGATURAN?.katalog_hero_foto?.startsWith('/src/assets/images/')) {
    parsed.PENGATURAN.katalog_hero_foto = parsed.PENGATURAN.katalog_hero_foto.replace('/src/assets/images/', '/images/');
    changed = true;
  }
  const mergedPengaturan = { ...seed.PENGATURAN, ...(parsed.PENGATURAN || {}) };
  if (JSON.stringify(mergedPengaturan) !== JSON.stringify(parsed.PENGATURAN)) {
    parsed.PENGATURAN = mergedPengaturan;
    changed = true;
  }
  if (changed) {
    saveDatabase(parsed);
  }
  dbCache = parsed;
  return dbCache;
}

export function saveDatabase(db: KoperasiDatabase): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
  dbCache = db;
}

/**
 * Mutex lock mirroring Google Apps Script LockService.getScriptLock()
 * Prevents concurrent race conditions on stock deduction, savings withdrawal, and checkout.
 */
export async function withDbLock<T>(fn: (db: KoperasiDatabase) => Promise<T> | T): Promise<T> {
  const prev = lockQueue;
  let release!: () => void;
  lockQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    const db = loadDatabase();
    const result = await fn(db);
    saveDatabase(db);
    return result;
  } finally {
    release();
  }
}

export function appendLog(
  db: KoperasiDatabase,
  actor: { id_user: string; username: string; role: string },
  aksi: string,
  modul: string,
  detail: string,
  device = 'Web App'
): void {
  db.LOG_AKTIVITAS.unshift({
    id_log: generateId('LOG'),
    timestamp: new Date().toISOString(),
    id_user: actor.id_user,
    username: actor.username,
    role: actor.role,
    aksi,
    modul,
    detail,
    ip_atau_device: device,
  });
  if (db.LOG_AKTIVITAS.length > 500) {
    db.LOG_AKTIVITAS = db.LOG_AKTIVITAS.slice(0, 500);
  }
}
