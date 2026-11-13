# Panduan Deploy KOPERASI DIGITAL PRO ke Hosting DewaHoster

Aplikasi **KOPERASI DIGITAL PRO** (*Branding: KREATIF BY WITNO*) dibangun sebagai aplikasi full-stack **Node.js + Express + React + Vite + PWA** yang siap dijalankan di layanan **DewaHoster** (baik **cPanel Node.js App** pada Cloud/Shared Hosting maupun **VPS Ubuntu + PM2 + Nginx**).

---

## Persyaratan Server
- **Node.js**: versi **20.x** atau **22.x** (direkomendasikan Node 20 LTS / Node 22).
- **Build Produksi**: hasil kompilasi frontend ada di folder `dist/` dan hasil kompilasi server Node.js ada di folder `dist-server/server.mjs`.
- **Penyimpanan Data Persisten**:
  - Database JSON otomatis tersimpan di `data/koperasi-db.json` (pastikan folder `data/` memiliki izin tulis/write).
  - Foto produk/banner yang diunggah Admin tersimpan di `public/uploads/` (pastikan folder `public/uploads/` memiliki izin tulis/write).

---

## Persiapan Kode Sebelum Upload
Jalankan perintah berikut di komputer lokal (atau pastikan sudah dibuild sebelum zip):

```bash
npm install
npm run build
```

Perintah `npm run build` akan menghasilkan:
1. `dist/` → Seluruh file frontend React + CSS + gambar katalog (`/images/*`) + PWA manifest & Service Worker.
2. `dist-server/server.mjs` → Backend Express production bundle (ringan, tidak membutuhkan `vite` saat runtime).

---

## Opsi 1: Deploy di DewaHoster cPanel (Setup Node.js App)

1. **Siapkan File ZIP untuk Upload**:
   Kompres file/folder berikut menjadi satu file `.zip` (tanpa menyertakan `node_modules/`):
   - `dist/`
   - `dist-server/`
   - `public/` *(berisi `public/images/` dan `public/uploads/`)*
   - `data/` *(opsional; akan dibuat otomatis saat start pertama jika belum ada)*
   - `package.json`
   - `.env` *(salin dari `.env.example`, isi `SESSION_SECRET` dengan kunci acak yang kuat)*

2. **Upload & Ekstrak di File Manager cPanel**:
   - Masuk ke **cPanel DewaHoster → File Manager**.
   - Buat folder aplikasi di luar `public_html`, misalnya `/home/username/koperasi-pro`.
   - Upload file `.zip` ke folder tersebut lalu klik **Extract**.

3. **Konfigurasi di Menu "Setup Node.js App"**:
   - Buka **cPanel → Software → Setup Node.js App → Create Application**.
   - **Node.js version**: pilih `20.x` atau `22.x`.
   - **Application mode**: `Production`.
   - **Application root**: `koperasi-pro` (sesuai folder ekstraksi).
   - **Application URL**: pilih domain/subdomain Anda (misalnya `koperasi.domainanda.com`).
   - **Application startup file**: `dist-server/server.mjs`.
   - Pada bagian **Environment variables**, tambahkan:
     - `NODE_ENV` = `production`
     - `SESSION_SECRET` = `(buat kunci rahasia acak panjang, minimal 32 karakter)`
     - `APP_URL` = `https://koperasi.domainanda.com`
   - Klik **Create**.

4. **Install Dependensi & Jalankan**:
   - Setelah aplikasi dibuat, klik tombol **Run NPM Install** di halaman Setup Node.js App (atau melalui Terminal cPanel dengan masuk ke virtual env Node.js lalu jalankan `npm install --omit=dev`).
   - Klik **Restart** pada aplikasi Node.js.
   - Uji akses `https://koperasi.domainanda.com/api/health` → harus mengembalikan JSON `{"status":"ok","app":"KOPERASI DIGITAL PRO"}`.

---

## Opsi 2: Deploy di VPS DewaHoster (Ubuntu + PM2 + Nginx + SSL)

1. **Install Node.js 20 LTS & PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx
   sudo npm install -g pm2
   ```

2. **Upload Kode & Build di Server**:
   ```bash
   mkdir -p /var/www/koperasi-pro
   cd /var/www/koperasi-pro
   # Upload source code ke /var/www/koperasi-pro, lalu:
   cp .env.example .env
   nano .env   # Atur SESSION_SECRET dan APP_URL
   npm install
   npm run build
   ```

3. **Jalankan dengan PM2**:
   ```bash
   NODE_ENV=production pm2 start dist-server/server.mjs --name koperasi-pro
   pm2 save
   pm2 startup
   ```

4. **Konfigurasi Nginx Reverse Proxy**:
   Buat file `/etc/nginx/sites-available/koperasi-pro`:
   ```nginx
   server {
       listen 80;
       server_name domainanda.com www.domainanda.com;

       client_max_body_size 10M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Aktifkan konfigurasi & pasang SSL gratis Let's Encrypt:
   ```bash
   sudo ln -s /etc/nginx/sites-available/koperasi-pro /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d domainanda.com -d www.domainanda.com
   ```

---

## Catatan Keamanan Setelah Deploy
1. Login sebagai Admin (`admin` / `Admin123!`), lalu segera buat akun Admin baru melalui menu **Anggota & Users** dan nonaktifkan akun default atau ganti password segera.
2. Pastikan file `.env` dan folder `data/` tidak dapat diakses langsung melalui `public_html`.
3. Lakukan backup berkala melalui menu **Audit & Backup → Backup Database (JSON)**.
