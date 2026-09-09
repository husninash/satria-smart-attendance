# 🏛️ SATRIA - Smart Attendance System (Pusdatin Kemhan)

> **Sistem Presensi Pegawai Berbasis Dynamic QR Code, Geofencing, dan Audit Forensik Keaslian Presensi.**

Aplikasi presensi terintegrasi yang dirancang khusus untuk lingkungan **Pusat Data dan Informasi (Pusdatin) Kementerian Pertahanan Republik Indonesia**, dibangun dengan arsitektur **OOP Laravel REST API** dan antarmuka modern **Next.js / React / TypeScript**.

---

## 🚀 Fitur Unggulan

- 📱 **Dynamic QR Monitor Kiosk**: Token QR dinamis yang berganti secara berkala untuk ditampilkan di layar monitor/TV lobby kantor, mencegah kecurangan foto/tangkapan layar statis.
- 🛡️ **Forensik & Anti-Fraud Telemetri**: Validasi keaslian presensi, deteksi mock GPS, geofencing area kantor, analisis pola bot, dan audit trail log.
- 🏢 **Struktur Organisasi Pusdatin Kemhan**: Pemetaan unit kerja resmi (Bagian Tata Usaha, Bidang Bangsisfohan, Bidang Infratik, Bidang Pamsisfo, dan Kelompok Jabatan Fungsional) dengan menu dropdown bertingkat (`optgroup`).
- 📋 **Approval Pengajuan Pegawai**: Alur pengajuan dan verifikasi perizinan pegawai (WFH, Izin, Sakit, Cuti, Dinas Luar).
- 👤 **Manajemen Profil Mandiri**: Pembaruan biodata personal, NIP, unit kerja, serta pergantian password terenkripsi.
- 📊 **Monitoring Kehadiran Real-Time**: Rekapitulasi per unit kerja, analitik kepatuhan, serta ekspor laporan bulanan (CSV).

---

## 🛠️ Tech Stack

- **Backend**: Laravel 11 (PHP 8.2+), Laravel Sanctum, MySQL, Architecture OOP / Service Pattern
- **Frontend**: Next.js (App Router) / React 19 / Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts

---

## ⚙️ Panduan Menjalankan Aplikasi

### 1. Prasyarat
- Laragon (PHP >= 8.2, MySQL port `33006`, Apache) & Composer
- Node.js >= 18 & npm

### 2. Menjalankan Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
> Server backend akan berjalan di: `http://127.0.0.1:8000`

### 3. Menjalankan Frontend (Next.js / Vite)
```bash
cd frontend
npm install
npm run dev
```
> Antarmuka web akan aktif di: `https://localhost:5173`

---

## 🔑 Akun Uji Coba Default

| Peran | Nama Pegawai | Email Kedinasan | Password |
|---|---|---|---|
| **Admin SDM Pusdatin** | Administrator SDM | `admin@satria.id` | `admin123` |
| **Pegawai Presensi** | Budi Santoso | `budi@satria.id` | `password` |
| **Pegawai Presensi** | Nashiratul Husni | `husni@satria.id` | `password` |
| **Pegawai Presensi** | Deni Kurniawan | `deni@satria.id` | `password` |

---

## 📄 Lisensi
Hak Cipta © 2026 SATRIA - Pusdatin Kementerian Pertahanan RI.
