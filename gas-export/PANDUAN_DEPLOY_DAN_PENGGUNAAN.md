# Panduan Deploy, Konfigurasi & Penggunaan — KOPERASI DIGITAL PRO (KREATIF BY WITNO)

## 1. Struktur Database Google Sheets (16 Sheet Otomatis)
1. `USERS` — Akun login, salted SHA-256 hash, role (`ADMIN`, `KASIR`, `ANGGOTA`).
2. `ANGGOTA` — Data anggota, saldo pokok/wajib/sukarela, limit kredit, QR token.
3. `PRODUK` — Katalog produk, kode SKU, barcode, harga normal/anggota/promo, stok, foto Drive.
4. `KATEGORI` — Kategori etalase marketplace.
5. `KERANJANG` — Keranjang belanja persisten per pengguna.
6. `PESANAN` — Header transaksi marketplace & kasir POS beserta `idempotency_key`.
7. `DETAIL_PESANAN` — Rincian item setiap pesanan.
8. `PEMBAYARAN` — Log pembayaran Tunai, Transfer Bank, QRIS, dan Saldo Koperasi.
9. `SIMPANAN` — Mutasi setoran dan penarikan simpanan anggota.
10. `PINJAMAN` — Pengajuan, persetujuan, tenor, bunga, dan sisa tagihan pinjaman.
11. `ANGSURAN` — Riwayat cicilan pokok, bunga, dan denda.
12. `KAS` — Buku kas masuk/keluar otomatis & manual untuk Laba Rugi dan Neraca.
13. `SUPPLIER` — Data pemasok barang dagangan dan hutang usaha.
14. `PENGUMUMAN` — Informasi resmi dan promosi koperasi.
15. `LOG_AKTIVITAS` — Audit log seluruh aksi penting dan keamanan.
16. `PENGATURAN` — Nama koperasi, bunga pinjaman, rekening bank, merchant QRIS, dan persentase SHU.

## 2. Cara Deploy ke Google Apps Script
1. Buka **Google Drive** dan buat **Google Spreadsheet** baru (atau biarkan `setupDatabase()` membuatnya otomatis).
2. Di dalam Spreadsheet, klik menu **Extensions -> Apps Script**.
3. Buat 4 file di editor Apps Script:
   - `Code.gs` (salin isi `/gas-export/Code.gs`)
   - `index.html` (salin isi `/gas-export/index.html`)
   - `CSS.html` (salin isi `/gas-export/CSS.html`)
   - `JavaScript.html` (salin isi `/gas-export/JavaScript.html`)
4. Aktifkan tampilan `appsscript.json` di *Project Settings* dan salin konfigurasi dari `/gas-export/appsscript.json`.
5. Jalankan fungsi **`setupDatabase`** sekali dari toolbar editor Apps Script dan berikan izin (*Authorize Access*) untuk Google Sheets & Google Drive.
6. Klik **Deploy -> New deployment -> Web app**:
   - *Execute as*: **Me (Pemilik Spreadsheet)**
   - *Who has access*: **Anyone** (autentikasi ditangani oleh sistem login internal berbasis role).
7. Salin URL Web App untuk diakses dari desktop maupun dipasang ke layar utama HP.

## 3. Akun Bawaan (Segera Ubah Password Setelah Login Pertama)
- **Admin Koperasi**: `admin` / `Admin123!`
- **Petugas / Kasir**: `kasir` / `Kasir123!`
- **Anggota Contoh**: `anggota1` / `Anggota123!`

## 4. Panduan Penggunaan Per Role
### A. Admin Koperasi
- Memantau statistik harian, grafik omzet, dan aktivitas terbaru di **Dashboard Admin**.
- Menambah/mengubah produk, kategori, harga normal vs harga anggota vs harga promo, serta cetak Barcode/QR Produk.
- Mendaftarkan anggota baru, mencetak Kartu QR Anggota, dan mengelola akun Kasir/Admin.
- Menyetujui pengajuan pinjaman, memverifikasi pembayaran transfer, mencatat kas operasional, dan mengekspor laporan Laba Rugi, Neraca, serta SHU ke Excel/PDF.

### B. Petugas / Kasir
- Membuka menu **Kasir POS**, memindai barcode produk atau memilih barang secara langsung.
- Memilih akun Anggota untuk menerapkan harga khusus anggota secara otomatis atau memproses pembeli umum.
- Menghitung uang kembalian tunai, QRIS, atau potong Saldo Koperasi, lalu mencetak struk resmi.

### C. Anggota Koperasi
- Login ke aplikasi, melihat promo & saldo Simpanan Sukarela di Beranda.
- Berbelanja layaknya marketplace, memilih metode pembayaran (Saldo Koperasi / QRIS / Transfer / Tunai), dan memantau status pesanan hingga *Siap Diambil*.
- Melihat Kartu QR Anggota, riwayat mutasi simpanan, simulasi & pengajuan pinjaman, serta mengunduh bukti transaksi.
