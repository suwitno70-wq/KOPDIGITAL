export type UserRole = 'ADMIN' | 'KASIR' | 'ANGGOTA';

export type OrderStatus =
  | 'MENUNGGU_PEMBAYARAN'
  | 'MENUNGGU_KONFIRMASI'
  | 'DIPROSES'
  | 'SIAP_DIAMBIL'
  | 'SELESAI'
  | 'DIBATALKAN';

export type PaymentMethod = 'SALDO_KOPERASI' | 'TUNAI' | 'TRANSFER_BANK' | 'QRIS';

export type SimpananJenis = 'POKOK' | 'WAJIB' | 'SUKARELA';
export type SimpananTipe = 'SETOR' | 'TARIK';

export type PinjamanStatus =
  | 'MENUNGGU_PERSETUJUAN'
  | 'DISETUJUI'
  | 'AKTIF'
  | 'LUNAS'
  | 'DITOLAK';

export interface UserRecord {
  id_user: string;
  username: string;
  password_hash?: string;
  salt?: string;
  nama_lengkap: string;
  email: string;
  no_hp: string;
  role: UserRole;
  id_anggota: string | null;
  status: 'AKTIF' | 'NONAKTIF';
  created_at: string;
  last_login: string | null;
}

export interface AnggotaRecord {
  id_anggota: string;
  kode_anggota: string;
  nik: string;
  nama: string;
  alamat: string;
  no_hp: string;
  email: string;
  tanggal_gabung: string;
  status_anggota: 'AKTIF' | 'NONAKTIF';
  saldo_pokok: number;
  saldo_wajib: number;
  saldo_sukarela: number;
  limit_kredit: number;
  foto_url: string;
  qr_token: string;
}

export interface KategoriRecord {
  id_kategori: string;
  nama_kategori: string;
  ikon: string;
  deskripsi: string;
  urutan: number;
  status: 'AKTIF' | 'NONAKTIF';
}

export interface ProdukRecord {
  id_produk: string;
  kode_produk: string;
  barcode: string;
  nama_produk: string;
  id_kategori: string;
  nama_kategori: string;
  id_supplier: string;
  deskripsi: string;
  harga_normal: number;
  harga_anggota: number;
  harga_promo: number | null;
  stok: number;
  stok_min: number;
  satuan: string;
  foto_url: string;
  rating: number;
  terjual: number;
  unggulan: boolean;
  status: 'AKTIF' | 'NONAKTIF';
  created_at: string;
}

export interface KeranjangRecord {
  id_keranjang: string;
  id_user: string;
  id_produk: string;
  qty: number;
  updated_at: string;
}

export interface DetailPesananRecord {
  id_detail: string;
  id_pesanan: string;
  id_produk: string;
  kode_produk: string;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  diskon_item: number;
  subtotal: number;
}

export interface PesananRecord {
  id_pesanan: string;
  nomor_pesanan: string;
  id_user: string;
  id_anggota: string | null;
  nama_pembeli: string;
  channel: 'MARKETPLACE' | 'POS_KASIR';
  metode_pembayaran: PaymentMethod;
  subtotal: number;
  diskon_anggota: number;
  diskon_promo: number;
  total_bayar: number;
  uang_diterima: number;
  kembalian: number;
  status_pesanan: OrderStatus;
  catatan: string;
  kasir_id: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  items?: DetailPesananRecord[];
  pembayaran?: PembayaranRecord | null;
}

export interface PembayaranRecord {
  id_pembayaran: string;
  nomor_pembayaran: string;
  id_pesanan: string;
  nomor_pesanan: string;
  metode: PaymentMethod;
  jumlah: number;
  referensi_gateway: string;
  bukti_catatan: string;
  status_pembayaran: 'PENDING' | 'TERVERIFIKASI' | 'GAGAL';
  verified_by: string | null;
  created_at: string;
}

export interface SimpananRecord {
  id_simpanan: string;
  nomor_transaksi: string;
  id_anggota: string;
  nama_anggota: string;
  jenis_simpanan: SimpananJenis;
  tipe: SimpananTipe;
  jumlah: number;
  saldo_sesudah: number;
  metode: string;
  keterangan: string;
  petugas_id: string;
  created_at: string;
}

export interface PinjamanRecord {
  id_pinjaman: string;
  nomor_pinjaman: string;
  id_anggota: string;
  nama_anggota: string;
  jumlah_pinjaman: number;
  tenor_bulan: number;
  bunga_persen: number;
  total_bunga: number;
  total_kewajiban: number;
  angsuran_per_bulan: number;
  sisa_pokok: number;
  sisa_tagihan: number;
  tujuan: string;
  status: PinjamanStatus;
  approved_by: string | null;
  created_at: string;
  jatuh_tempo_berikutnya: string | null;
}

export interface AngsuranRecord {
  id_angsuran: string;
  nomor_transaksi: string;
  id_pinjaman: string;
  nomor_pinjaman: string;
  id_anggota: string;
  angsuran_ke: number;
  pokok_dibayar: number;
  bunga_dibayar: number;
  denda: number;
  total_bayar: number;
  metode: string;
  petugas_id: string;
  created_at: string;
}

export interface KasRecord {
  id_kas: string;
  nomor_transaksi: string;
  tanggal: string;
  jenis: 'MASUK' | 'KELUAR';
  kategori_akun:
    | 'MODAL'
    | 'PENDAPATAN_PENJUALAN'
    | 'PENDAPATAN_BUNGA'
    | 'SIMPANAN_ANGGOTA'
    | 'PENCAIRAN_PINJAMAN'
    | 'ANGSURAN_PINJAMAN'
    | 'PENGELUARAN_OPERASIONAL'
    | 'PEMBELIAN_STOK'
    | 'HUTANG'
    | 'PIUTANG';
  jumlah: number;
  keterangan: string;
  referensi_id: string;
  user_id: string;
  created_at: string;
}

export interface SupplierRecord {
  id_supplier: string;
  kode_supplier: string;
  nama_supplier: string;
  kontak_person: string;
  no_hp: string;
  alamat: string;
  kategori_pasokan: string;
  hutang_usaha: number;
  status: 'AKTIF' | 'NONAKTIF';
}

export interface PengumumanRecord {
  id_pengumuman: string;
  judul: string;
  isi: string;
  kategori: 'UMUM' | 'PROMO' | 'RAPAT' | 'KEUANGAN';
  prioritas: 'TINGGI' | 'NORMAL';
  target_role: 'SEMUA' | UserRole;
  penulis: string;
  status: 'AKTIF' | 'ARSIP';
  created_at: string;
}

export interface LogAktivitasRecord {
  id_log: string;
  timestamp: string;
  id_user: string;
  username: string;
  role: string;
  aksi: string;
  modul: string;
  detail: string;
  ip_atau_device: string;
}

export interface PengaturanKoperasi {
  nama_koperasi: string;
  tagline: string;
  branding: string;
  alamat: string;
  telepon: string;
  email: string;
  npwp_badan_hukum: string;
  bunga_pinjaman_persen_per_bulan: number;
  simpanan_pokok_wajib: number;
  simpanan_wajib_bulanan: number;
  izinkan_bayar_saldo_koperasi: boolean;
  bank_nama: string;
  bank_rekening: string;
  bank_atas_nama: string;
  qris_merchant_id: string;
  qris_merchant_nama: string;
  shu_jasa_modal_persen: number;
  shu_jasa_anggota_persen: number;
  shu_cadangan_persen: number;
  shu_pengurus_persen: number;
  shu_sosial_persen: number;
  logo_url: string;
  katalog_hero_judul: string;
  katalog_hero_subjudul: string;
  katalog_hero_foto: string;
  katalog_urutan_default: 'TERBARU' | 'TERLARIS' | 'TERMURAH' | 'NAMA';
  katalog_tampil_badge_diskon: boolean;
  katalog_kolom_desktop: 3 | 4;
}

export interface FinancialReportSummary {
  periode: string;
  laba_rugi: {
    pendapatan_penjualan: number;
    pendapatan_bunga_pinjaman: number;
    total_pendapatan: number;
    pembelian_stok_hpp: number;
    pengeluaran_operasional: number;
    total_beban: number;
    laba_bersih_shu: number;
  };
  neraca: {
    aktiva: {
      kas_dan_bank: number;
      piutang_pinjaman_anggota: number;
      nilai_persediaan_barang: number;
      total_aktiva: number;
    };
    kewajiban: {
      simpanan_sukarela_anggota: number;
      hutang_supplier: number;
      total_kewajiban: number;
    };
    ekuitas: {
      simpanan_pokok_anggota: number;
      simpanan_wajib_anggota: number;
      modal_koperasi: number;
      shu_tahun_berjalan: number;
      total_ekuitas: number;
    };
    total_kewajiban_dan_ekuitas: number;
  };
  alokasi_shu: {
    total_shu: number;
    jasa_modal: number;
    jasa_anggota: number;
    dana_cadangan: number;
    dana_pengurus: number;
    dana_sosial: number;
  };
}

export interface AdminStatsResponse {
  totalAnggota: number;
  totalProduk: number;
  pesananHariIni: number;
  penjualanHariIni: number;
  totalSimpanan: number;
  totalPinjamanAktif: number;
  totalKas: number;
  grafikPenjualan: Array<{ tanggal: string; penjualan: number; transaksi: number }>;
  produkTerlaris: ProdukRecord[];
  aktivitasTerbaru: LogAktivitasRecord[];
  pesananMenungguVerifikasi: number;
  pinjamanMenungguPersetujuan: number;
}
