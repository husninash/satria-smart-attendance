# Hadirin — Sistem Absensi Pegawai

Hadirin adalah prototipe sistem absensi pegawai berbasis web yang menggunakan konsep **QR dinamis** dan **geofencing**. Aplikasi dirancang responsif sehingga nyaman digunakan melalui komputer maupun telepon seluler.

> Versi ini merupakan demonstrasi antarmuka dan alur kerja. Pemindaian QR, geofencing, autentikasi, dan database produksi belum terhubung ke layanan backend sebenarnya.

## Demo

Website dapat dibuka melalui:

**https://hadirin-absensi.nashiratulhusni.chatgpt.site**

## Fitur

### Pegawai

- Beranda dan status kehadiran hari ini.
- Simulasi pemindaian QR dinamis.
- Simulasi validasi akun, jadwal, dan lokasi.
- Bukti keberhasilan absensi.
- Riwayat check-in dan check-out.
- Filter riwayat berdasarkan status.
- Pengajuan izin, sakit, cuti, dinas luar, dan koreksi absensi.
- Unggah lampiran pada formulir pengajuan.
- Penyimpanan data demonstrasi melalui `localStorage`.

### SDM/Admin

- Ringkasan jumlah pegawai.
- Statistik kehadiran dan keterlambatan.
- Jumlah pengajuan yang menunggu persetujuan.
- Monitoring kehadiran berdasarkan unit kerja.

## Konsep Validasi Absensi

Alur absensi yang direncanakan:

1. Pegawai masuk menggunakan akun masing-masing.
2. Pegawai memindai QR yang ditampilkan pada layar kantor.
3. QR berubah setiap 30 detik dan ditandatangani oleh server.
4. Aplikasi meminta lokasi perangkat.
5. Server memeriksa token QR, akun, jadwal, dan jarak dari kantor.
6. Absensi dicatat jika seluruh pemeriksaan valid.

QR sebaiknya tidak berisi nama atau NIP pegawai. Contoh payload konseptual:

```json
{
  "office_id": "OFFICE-01",
  "interval": 59605200,
  "nonce": "8f3c...",
  "signature": "HMAC-SHA256"
}
```

## Teknologi

- React
- TypeScript
- Vinext
- Tailwind CSS
- Shadcn UI
- Lucide Icons
- Browser `localStorage` untuk data demonstrasi

Backend produksi yang direkomendasikan:

- Laravel API
- PostgreSQL atau MySQL
- Redis untuk cache, session, rate limiting, dan queue
- Private object storage untuk dokumen pengajuan

## Menjalankan Secara Lokal

### Persyaratan

- Node.js versi 20 atau lebih baru
- npm

### Instalasi

```bash
npm install
npm run dev
```

Buka alamat lokal yang muncul pada terminal, biasanya:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
```

## Struktur Utama

```text
hadirin-absensi/
├── app/
│   ├── globals.css       # Tema dan tata letak responsif
│   ├── layout.tsx        # Metadata dan root layout
│   └── page.tsx          # Seluruh fitur demonstrasi
├── components/
│   └── ui/               # Komponen Shadcn UI
├── hooks/                # React hooks bawaan starter
├── lib/                  # Utility aplikasi
├── public/               # Aset statis
├── package.json
└── README.md
```

## Tampilan Responsif

- Desktop menggunakan sidebar untuk navigasi.
- Perangkat seluler menggunakan navigasi bawah.
- Tabel dapat digulir secara horizontal pada layar sempit.
- Formulir dan kartu otomatis berubah menjadi satu kolom.
- Tombol utama dibuat cukup besar untuk penggunaan layar sentuh.

## Data Demonstrasi

Riwayat dan pengajuan baru disimpan pada browser melalui `localStorage` dengan key:

```text
hadirin-demo
```

Untuk menghapus data demonstrasi, buka Developer Tools pada browser lalu hapus key tersebut, atau jalankan:

```javascript
localStorage.removeItem("hadirin-demo");
```

## Pengembangan Menuju Produksi

Bagian berikut perlu dikembangkan sebelum digunakan oleh instansi:

- Autentikasi dan role-based access control.
- API serta database terpusat.
- Pembuatan dan validasi QR menggunakan HMAC.
- Validasi geofence di sisi server dengan rumus Haversine.
- Pembatasan satu absensi per pegawai dan sesi kerja.
- Approval pengajuan oleh atasan.
- Audit log yang tidak dapat diubah sembarangan.
- Proteksi CSRF, XSS, IDOR, brute force, dan replay token.
- Kebijakan retensi koordinat dan dokumen pegawai.
- Backup, monitoring, dan load testing.

## Catatan Keamanan

- Jangan menyimpan secret QR di frontend.
- Jangan mempercayai koordinat hanya berdasarkan pemeriksaan JavaScript.
- Seluruh validasi utama harus dilakukan kembali oleh server.
- Gunakan HTTPS pada lingkungan produksi.
- Jangan memasukkan nama, NIP, atau data pribadi ke dalam QR.
- Fingerprint perangkat sebaiknya dipakai sebagai sinyal audit, bukan pengunci mutlak.

## Lisensi

Proyek ini dibuat sebagai prototipe dan bahan pengembangan sistem absensi internal.
