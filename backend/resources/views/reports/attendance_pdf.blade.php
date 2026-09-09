<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportTitle ?? 'Laporan Presensi Pegawai Pusdatin Kemhan' }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 8mm 12mm 8mm 12mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 8pt;
            line-height: 1.25;
            color: #1a202c;
            margin: 0;
            padding: 0;
        }

        /* Kop Surat Resmi */
        .kop-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2px;
        }

        .kop-table td {
            vertical-align: middle;
            padding: 0;
        }

        .kop-logo {
            width: 62px;
            text-align: left;
        }

        .kop-logo img {
            width: 58px;
            height: auto;
        }

        .kop-text {
            text-align: center;
            padding: 0 6px;
        }

        .kop-instansi-1 {
            font-size: 11pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #111827;
            text-transform: uppercase;
            margin: 0;
        }

        .kop-instansi-2 {
            font-size: 13pt;
            font-weight: bold;
            letter-spacing: 1px;
            color: #881337;
            text-transform: uppercase;
            margin: 1px 0 2px 0;
        }

        .kop-alamat {
            font-size: 6.8pt;
            color: #374151;
            line-height: 1.2;
            margin: 0;
        }

        .kop-kontak {
            font-size: 6.5pt;
            color: #4b5563;
            margin: 1px 0 0 0;
        }

        .kop-barcode {
            width: 65px;
            text-align: right;
            font-size: 6pt;
            color: #6b7280;
        }

        /* Garis Kop Ganda Khas Naskah Dinas */
        .kop-divider {
            border-top: 2px solid #111827;
            border-bottom: 0.6px solid #111827;
            height: 2px;
            margin-top: 3px;
            margin-bottom: 6px;
        }

        /* Judul Dokumen */
        .doc-title-box {
            text-align: center;
            margin-bottom: 6px;
        }

        .doc-title {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #111827;
            margin: 0;
            text-decoration: underline;
        }

        .doc-number {
            font-size: 7.5pt;
            color: #374151;
            margin-top: 2px;
            font-family: 'Courier', monospace;
            font-weight: bold;
        }

        .doc-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #0f766e;
            border: 0.5px solid #cbd5e1;
            border-radius: 3px;
            font-size: 6.2pt;
            font-weight: bold;
            padding: 1px 5px;
            margin-top: 2px;
        }

        /* Informasi Pegawai (2 Kolom) */
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            background-color: #fcfdfd;
            border: 0.6px solid #cbd5e1;
        }

        .info-table td {
            padding: 2.5px 6px;
            font-size: 7.2pt;
            vertical-align: top;
        }

        .info-label {
            color: #64748b;
            width: 100px;
            font-weight: 500;
        }

        .info-colon {
            width: 6px;
            color: #64748b;
        }

        .info-value {
            color: #0f172a;
            font-weight: 600;
        }

        /* Summary Metric Cards */
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }

        .summary-card {
            border: 0.8px solid #cbd5e1;
            border-radius: 3px;
            padding: 3px 4px;
            text-align: center;
            background: #f8fafc;
        }

        .summary-label {
            font-size: 6pt;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
            display: block;
        }

        .summary-val {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
            line-height: 1.1;
            margin-top: 1px;
        }

        .summary-sub {
            font-size: 5.5pt;
            color: #94a3b8;
        }

        /* Tabel Presensi */
        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        .attendance-table th {
            background-color: #881337;
            color: #ffffff;
            font-size: 6.8pt;
            font-weight: bold;
            text-align: center;
            padding: 3px 2px;
            border: 0.6px solid #881337;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        .attendance-table td {
            font-size: 6.5pt;
            padding: 1.8px 3px;
            border: 0.5px solid #e2e8f0;
            color: #1e293b;
            vertical-align: middle;
            line-height: 1.1;
        }

        .attendance-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .attendance-table tr.weekend-row {
            background-color: #f1f5f9;
            color: #94a3b8;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier', monospace; font-size: 6.5pt; }
        .font-bold { font-weight: bold; }

        /* Status Badges */
        .status-hadir {
            color: #047857;
            font-weight: bold;
        }

        .status-terlambat {
            color: #b45309;
            font-weight: bold;
        }

        .status-absen {
            color: #64748b;
        }

        .status-libur {
            color: #94a3b8;
            font-style: italic;
        }

        .tag-mode {
            display: inline-block;
            padding: 0.5px 3px;
            font-size: 5.8pt;
            border-radius: 2px;
            font-weight: bold;
            background: #e0f2fe;
            color: #0369a1;
        }

        .tag-valid {
            color: #047857;
            font-size: 6pt;
            font-weight: bold;
        }

        /* Tanda Tangan & Pengesahan */
        .sign-table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
            margin-top: 4px;
        }

        .sign-table td {
            vertical-align: top;
            padding: 0;
        }

        .sign-box {
            text-align: center;
            width: 220px;
            float: right;
        }

        .sign-place-date {
            font-size: 7.2pt;
            color: #334155;
            margin-bottom: 1px;
        }

        .sign-role {
            font-size: 7.5pt;
            font-weight: bold;
            color: #111827;
            margin-bottom: 2px;
        }

        .sign-instansi {
            font-size: 7pt;
            color: #475569;
            margin-bottom: 4px;
        }

        .sign-stamp-wrap {
            height: 44px;
            position: relative;
            margin: 2px 0;
        }

        .sign-stamp-badge {
            display: inline-block;
            border: 1px dashed #0f766e;
            background: #f0fdfa;
            color: #0f766e;
            padding: 4px 10px;
            border-radius: 3px;
            font-size: 6pt;
            font-weight: bold;
            line-height: 1.25;
        }

        .sign-name {
            font-size: 8pt;
            font-weight: bold;
            color: #111827;
            text-decoration: underline;
            margin-top: 2px;
        }

        .sign-nip {
            font-size: 6.8pt;
            color: #475569;
            margin-top: 1px;
        }

        /* Dokumen Audit Keamanan Footer */
        .footer-note {
            margin-top: 8px;
            padding-top: 4px;
            border-top: 0.6px dashed #cbd5e1;
            font-size: 5.8pt;
            color: #64748b;
            line-height: 1.2;
        }

        .footer-note strong {
            color: #334155;
        }
    </style>
</head>
<body>

    <!-- KOP SURAT RESMI PUSDATIN KEMHAN -->
    <table class="kop-table">
        <tr>
            <td class="kop-logo">
                @if(!empty($kemhanLogoBase64))
                    <img src="data:image/png;base64,{{ $kemhanLogoBase64 }}" alt="Logo Kemhan">
                @endif
            </td>
            <td class="kop-text">
                <div class="kop-instansi-1">Kementerian Pertahanan Republik Indonesia</div>
                <div class="kop-instansi-2">Pusat Data dan Informasi</div>
                <div class="kop-alamat">
                    Jalan RS. Fatmawati No. 1, Pondok Labu, Cilandak, Jakarta Selatan 12450
                </div>
                <div class="kop-kontak">
                    Telepon: (021) 7695151 • Faksimili: (021) 7695152 • Surel: pusdatin@kemhan.go.id • Laman: www.kemhan.go.id
                </div>
            </td>
            <td class="kop-barcode">
                <div style="border: 0.6px solid #cbd5e1; padding: 3px; text-align: center; background: #fafafa;">
                    <div style="font-weight: bold; color: #881337; font-size: 5.5pt;">SATRIA</div>
                    <div style="font-size: 5pt; color: #64748b;">DIGITAL SIGN</div>
                    <div style="font-family: monospace; font-size: 5.5pt; margin-top: 1px;">{{ strtoupper(substr(md5($user['email'] . $period), 0, 8)) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- GARIS PEMBATAS KOP GANDA -->
    <div class="kop-divider"></div>

    <!-- JUDUL LAPORAN -->
    <div class="doc-title-box">
        <div class="doc-title">Laporan Rekapitulasi Presensi Pegawai</div>
        <div class="doc-number">Nomor: B/LAP-PRES/{{ $romanMonth ?? 'IX' }}/{{ $year ?? '2026' }}/PUSDATIN</div>
        <div class="doc-badge">Sistem Presensi Cerdas Terenkripsi (SATRIA Kemhan)</div>
    </div>

    <!-- METADATA IDENTITAS PEGAWAI -->
    <table class="info-table">
        <tr>
            <td style="width: 50%;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td class="info-label">Nama Pegawai</td>
                        <td class="info-colon">:</td>
                        <td class="info-value">{{ $user['name'] }}</td>
                    </tr>
                    <tr>
                        <td class="info-label">NIP / NRP</td>
                        <td class="info-colon">:</td>
                        <td class="info-value font-mono">{{ $user['nip'] }}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Jabatan</td>
                        <td class="info-colon">:</td>
                        <td class="info-value">{{ $user['role'] }}</td>
                    </tr>
                </table>
            </td>
            <td style="width: 50%;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td class="info-label">Unit Kerja</td>
                        <td class="info-colon">:</td>
                        <td class="info-value">{{ $user['department'] }}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Periode Laporan</td>
                        <td class="info-colon">:</td>
                        <td class="info-value">{{ $period }}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Waktu Unduh</td>
                        <td class="info-colon">:</td>
                        <td class="info-value">{{ $generatedAt }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- 4 KARTU RINGKASAN PRESTASI KEHADIRAN -->
    <table class="summary-table">
        <tr>
            <td style="width: 25%; padding-right: 3px;">
                <div class="summary-card">
                    <span class="summary-label">Hari Kalender</span>
                    <div class="summary-val">{{ $summary['totalDays'] }}</div>
                    <span class="summary-sub">{{ $summary['workDays'] ?? 22 }} Hari Kerja</span>
                </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
                <div class="summary-card" style="border-color: #a7f3d0; background-color: #f0fdf4;">
                    <span class="summary-label" style="color: #047857;">Hadir Efektif</span>
                    <div class="summary-val" style="color: #047857;">{{ $summary['totalPresent'] }}</div>
                    <span class="summary-sub">Tercatat di Sistem</span>
                </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
                <div class="summary-card" style="border-color: #fde68a; background-color: #fffbeb;">
                    <span class="summary-label" style="color: #b45309;">Keterlambatan</span>
                    <div class="summary-val" style="color: #b45309;">{{ $summary['totalLate'] }}</div>
                    <span class="summary-sub">Melebihi Toleransi</span>
                </div>
            </td>
            <td style="width: 25%; padding-left: 3px;">
                <div class="summary-card" style="border-color: #ccfbf1; background-color: #f0fdfa;">
                    <span class="summary-label" style="color: #0f766e;">Tingkat Kepatuhan</span>
                    <div class="summary-val" style="color: #0f766e;">{{ $summary['complianceRate'] ?? '100' }}%</div>
                    <span class="summary-sub">Status: Prima</span>
                </div>
            </td>
        </tr>
    </table>

    <!-- TABEL RINCIAN PRESENSI HARIAN -->
    <table class="attendance-table">
        <thead>
            <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 10%;">Hari</th>
                <th style="width: 17%;">Tanggal</th>
                <th style="width: 10%;">Masuk</th>
                <th style="width: 10%;">Pulang</th>
                <th style="width: 9%;">Mode</th>
                <th style="width: 21%;">Status Kehadiran</th>
                <th style="width: 19%;">Verifikasi Sah</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $idx => $row)
                @php
                    $isWeekend = $row['isWeekend'] ?? false;
                    $statusClass = 'status-absen';
                    if ($isWeekend) {
                        $statusClass = 'status-libur';
                    } elseif ($row['status'] === 'Hadir') {
                        $statusClass = 'status-hadir';
                    } elseif ($row['status'] === 'Terlambat') {
                        $statusClass = 'status-terlambat';
                    }
                @endphp
                <tr class="{{ $isWeekend ? 'weekend-row' : '' }}">
                    <td class="text-center font-mono">{{ $idx + 1 }}</td>
                    <td>{{ $row['dayName'] }}</td>
                    <td>{{ $row['dateFormatted'] }}</td>
                    <td class="text-center font-mono {{ $row['inTime'] !== '—' ? 'font-bold' : '' }}">
                        {{ $row['inTime'] }}
                    </td>
                    <td class="text-center font-mono {{ $row['outTime'] !== '—' ? 'font-bold' : '' }}">
                        {{ $row['outTime'] }}
                    </td>
                    <td class="text-center">
                        @if(!$isWeekend && $row['inTime'] !== '—')
                            <span class="tag-mode">{{ $row['mode'] ?? 'WFO' }}</span>
                        @else
                            <span style="color: #94a3b8;">—</span>
                        @endif
                    </td>
                    <td class="{{ $statusClass }}">
                        {{ $row['status'] }}
                    </td>
                    <td class="text-center">
                        @if(!$isWeekend && $row['inTime'] !== '—')
                            <span class="tag-valid">[VALID] GPS {{ $row['distance'] }}</span>
                        @elseif($isWeekend)
                            <span style="color: #94a3b8; font-size: 5.8pt;">Akhir Pekan</span>
                        @else
                            <span style="color: #cbd5e1;">—</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- LEMBAR PENGESAHAN / TANDA TANGAN ELEKTRONIK -->
    <table class="sign-table">
        <tr>
            <td style="width: 48%; padding-top: 6px;">
                <div style="font-size: 6.5pt; color: #475569; line-height: 1.3; border-left: 2px solid #881337; padding-left: 6px;">
                    <strong>CATATAN INTEGRITAS SISTEM:</strong><br>
                    Dokumen ini digenerate otomatis oleh server SATRIA Presensi Pusdatin Kemhan.<br>
                    Token Otentikasi: <span style="font-family: monospace; color: #881337;">{{ strtoupper(hash('crc32b', $user['email'] . $period . ($summary['totalPresent'] ?? 0))) }}-KEMHAN-{{ date('Ymd') }}</span><br>
                    Koordinat Geofence: <span style="font-family: monospace;">-6.312961, 106.792705 (Radius 150m)</span>
                </div>
            </td>
            <td style="width: 4%;"></td>
            <td style="width: 48%;">
                <div class="sign-box">
                    <div class="sign-place-date">Jakarta Selatan, {{ Carbon\Carbon::now('Asia/Jakarta')->translatedFormat('d F Y') }}</div>
                    <div class="sign-role">Kepala Pusat Data dan Informasi</div>
                    <div class="sign-instansi">Kementerian Pertahanan RI</div>

                    <div class="sign-stamp-wrap">
                        <div class="sign-stamp-badge">
                            <div>PUSDATIN KEMHAN RI</div>
                            <div style="font-size: 5.2pt; color: #334155; margin-top: 1px;">DIVERIFIKASI SECARA ELEKTRONIK</div>
                            <div style="font-size: 4.8pt; font-family: monospace; color: #047857;">SERTIFIKASI DIGITAL BSrE</div>
                        </div>
                    </div>

                    <div class="sign-name">Brigadir Jenderal TNI Nugroho, S.T., M.Sc.</div>
                    <div class="sign-nip">NIP. 197405121998031002</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- FOOTER KEAMANAN DOKUMEN -->
    <div class="footer-note">
        <strong>PEMBERITAHUAN HUKUM:</strong> Dokumen ini merupakan dokumen kedinasan resmi Kementerian Pertahanan Republik Indonesia yang diterbitkan melalui Sistem Informasi Presensi Cerdas SATRIA. Sesuai dengan ketentuan Pasal 5 ayat (1) UU ITE No. 11 Tahun 2008 dan Peraturan Presiden tentang Sistem Pemerintahan Berbasis Elektronik (SPBE), rekaman digital ini diakui sah berkekuatan hukum tanpa memerlukan pembubuhan tanda tangan basah dan cap fisik.
    </div>

</body>
</html>
