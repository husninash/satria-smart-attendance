<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seeding Master Data Roles (OOP RBAC)
        $rolePegawai = \App\Models\Role::firstOrCreate(
            ['slug' => 'pegawai'],
            ['name' => 'Pegawai Presensi', 'description' => 'Akses presensi harian QR & pengajuan izin/cuti']
        );

        $roleAdmin = \App\Models\Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin SDM / Pejabat Penilai', 'description' => 'Akses dashboard monitoring & approval pengajuan']
        );

        // 2. Akun Multi-Role (Nashiratul Husni - Memiliki 2 Role: Pegawai + Admin SDM)
        $husni = User::firstOrCreate(
            ['email' => 'husni@satria.id'],
            [
                'name' => 'Nashiratul Husni',
                'nip' => '199208152020121001',
                'department' => 'Subbidang Operasional dan Layanan Infrastruktur',
                'password' => bcrypt('password'),
            ]
        );
        $husni->roles()->sync([$rolePegawai->id, $roleAdmin->id]);

        // 3. Akun Khusus Admin SDM
        $admin = User::firstOrCreate(
            ['email' => 'admin@satria.id'],
            [
                'name' => 'Administrator SDM Pusdatin',
                'nip' => '198503202010121002',
                'department' => 'Bagian Tata Usaha',
                'password' => bcrypt('admin123'),
            ]
        );
        $admin->roles()->sync([$roleAdmin->id]);

        // 4. Akun Pegawai Murni (Hanya Pegawai)
        $staf = User::firstOrCreate(
            ['email' => 'budi@satria.id'],
            [
                'name' => 'Budi Santoso',
                'nip' => '199507122022031003',
                'department' => 'Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi',
                'password' => bcrypt('password'),
            ]
        );
        $staf->roles()->sync([$rolePegawai->id]);

        // Seeding Unit / Department sesuai Bagan Organisasi Pusdatin Kemhan
        $departmentsData = [
            ['name' => 'Pusat Data dan Informasi', 'code' => 'PUSDATIN'],

            ['name' => 'Bagian Tata Usaha', 'code' => 'TU'],
            ['name' => 'Subbagian Program dan Laporan', 'code' => 'PROGLAP'],
            ['name' => 'Subbagian Administrasi Jabatan Fungsional', 'code' => 'ADMJAFUNG'],
            ['name' => 'Subbagian Umum', 'code' => 'UMUM'],

            ['name' => 'Bidang Pengembangan dan Pengelolaan Sisfohan', 'code' => 'BANGSISFO'],
            ['name' => 'Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi', 'code' => 'APLIKASI'],
            ['name' => 'Subbidang Pengumpulan dan Pengelolaan Data', 'code' => 'DATA'],
            ['name' => 'Subbidang Manajemen Sistem Informasi', 'code' => 'MSI'],

            ['name' => 'Bidang Infrastruktur TIK', 'code' => 'INFRATIK'],
            ['name' => 'Subbidang Perencanaan dan Pengembangan Infrastruktur', 'code' => 'RENBANG-INFRA'],
            ['name' => 'Subbidang Operasional dan Layanan Infrastruktur', 'code' => 'OPSYAN-INFRA'],
            ['name' => 'Subbidang Pemeliharaan Infrastruktur', 'code' => 'HAR-INFRA'],

            ['name' => 'Bidang Pengamanan Sisfo dan Sandi', 'code' => 'PAMSISFO'],
            ['name' => 'Subbidang Pengamanan Sistem Informasi', 'code' => 'PAMSIS'],
            ['name' => 'Subbidang Pengawasan dan Evaluasi Pengamanan', 'code' => 'WASEV-PAM'],
            ['name' => 'Subbidang Operasional Persandian', 'code' => 'OPSSANDI'],

            ['name' => 'Kelompok Jabatan Fungsional', 'code' => 'JAFUNG'],
        ];

        foreach ($departmentsData as $d) {
            \App\Models\Department::firstOrCreate(['name' => $d['name']], ['code' => $d['code']]);
        }

        // Seeding Data Kehadiran Bulan Berjalan (September)
        Attendance::firstOrCreate([
            'user_id' => $husni->id,
            'date' => '2026-09-01',
        ], [
            'in_time' => '10:45:19',
            'out_time' => null,
            'status' => 'Terlambat',
            'attendance_mode' => 'WFO',
            'distance_meters' => 31,
            'ip_address' => '10.20.14.55',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'is_mock_location' => false,
            'gps_accuracy' => 12,
        ]);

        // Seeding Data Kehadiran Riwayat Bulan Lalu (Agustus)
        Attendance::firstOrCreate([
            'user_id' => $husni->id,
            'date' => '2026-08-31',
        ], [
            'in_time' => '08:02:44',
            'out_time' => '16:07:31',
            'status' => 'Hadir',
            'attendance_mode' => 'WFO',
            'distance_meters' => 18,
            'ip_address' => '10.20.14.55',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'is_mock_location' => false,
            'gps_accuracy' => 8,
        ]);

        Attendance::firstOrCreate([
            'user_id' => $husni->id,
            'date' => '2026-08-28',
        ], [
            'in_time' => '08:19:07',
            'out_time' => '16:11:52',
            'status' => 'Terlambat',
            'attendance_mode' => 'WFH',
            'distance_meters' => 4500,
            'ip_address' => '182.253.11.82',
            'user_agent' => 'Mozilla/5.0 (Linux; Android 14)',
            'is_mock_location' => false,
            'gps_accuracy' => 15,
        ]);

        Attendance::firstOrCreate([
            'user_id' => $husni->id,
            'date' => '2026-08-27',
        ], [
            'in_time' => '08:00:15',
            'out_time' => '16:04:48',
            'status' => 'Hadir',
            'attendance_mode' => 'WFO',
            'distance_meters' => 13,
            'ip_address' => '10.20.14.55',
            'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
            'is_mock_location' => false,
            'gps_accuracy' => 5,
        ]);

        // Seeding Pengajuan
        LeaveRequest::firstOrCreate([
            'user_id' => $husni->id,
            'reason' => 'Pendampingan rapat koordinasi sistem TIK',
        ], [
            'type' => 'Dinas luar',
            'start_date' => '2026-08-26',
            'end_date' => '2026-08-26',
            'status' => 'Disetujui',
        ]);

        LeaveRequest::firstOrCreate([
            'user_id' => $staf->id,
            'reason' => 'Jadwal giliran WFH unit MSA',
        ], [
            'type' => 'WFH (Work From Home)',
            'start_date' => '2026-09-07',
            'end_date' => '2026-09-07',
            'status' => 'Menunggu',
        ]);

        // Seeding Kehadiran Staf Lain dengan Berbagai Indikator Audit (Sah, WFH, dan Anomali Bot)
        Attendance::firstOrCreate([
            'user_id' => $staf->id,
            'date' => '2026-09-01',
        ], [
            'in_time' => '07:05:00',
            'out_time' => '15:35:00',
            'status' => 'Hadir',
            'attendance_mode' => 'WFO',
            'distance_meters' => 20,
            'ip_address' => '10.20.14.88',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HeadlessChrome',
            'is_mock_location' => true,
            'fraud_reason' => 'Headless Automation Driver (navigator.webdriver = true) | Reaksi Instan (140ms)',
            'entropy_score' => 0.95,
            'gps_accuracy' => 10,
        ]);

        $fakeGpsUser = User::firstOrCreate(
            ['email' => 'deni@satria.id'],
            [
                'name' => 'Deni Kurniawan',
                'nip' => '199611032023051004',
                'department' => 'Infrastruktur TIK',
                'password' => bcrypt('password'),
            ]
        );
        $fakeGpsUser->roles()->sync([$rolePegawai->id]);

        Attendance::firstOrCreate([
            'user_id' => $fakeGpsUser->id,
            'date' => '2026-09-01',
        ], [
            'in_time' => '06:55:12',
            'out_time' => null,
            'status' => 'Hadir',
            'attendance_mode' => 'WFO',
            'distance_meters' => 5,
            'ip_address' => '180.252.99.12',
            'user_agent' => 'Android Mock Provider / FakeGPS Location Spoofer',
            'is_mock_location' => true,
            'fraud_reason' => 'Anomali Fake GPS (0m Satelit Jitter) | Flag Mock Location Perangkat',
            'entropy_score' => 0.90,
            'gps_accuracy' => 0,
        ]);
    }
}
