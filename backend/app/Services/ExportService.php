<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPDFInstance;
use Carbon\Carbon;

class ExportService
{
    /**
     * Konversi angka bulan (1-12) ke angka romawi resmi tata naskah dinas.
     */
    private function getRomanMonth(int $month): string
    {
        $romans = [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV',
            5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII',
            9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
        ];

        return $romans[$month] ?? 'I';
    }

    /**
     * Generate data laporan presensi bulanan pegawai secara OOP.
     *
     * @param int $userId
     * @param string $yearMonth Format YYYY-MM (misal: "2026-09")
     * @return array
     */
    public function generateMonthlyReportData(int $userId, string $yearMonth): array
    {
        $user = User::findOrFail($userId);
        
        $carbonMonth = Carbon::createFromFormat('Y-m', $yearMonth, 'Asia/Jakarta');
        $monthName = $carbonMonth->translatedFormat('F Y');
        $daysInMonth = $carbonMonth->daysInMonth;

        $attendances = Attendance::where('user_id', $userId)
            ->whereYear('date', $carbonMonth->year)
            ->whereMonth('date', $carbonMonth->month)
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy(function ($item) {
                return $item->date->toDateString();
            });

        $reportRows = [];
        $totalPresent = 0;
        $totalLate = 0;
        $totalAbsent = 0;
        $workDays = 0;

        $passedWorkDays = 0;

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $date = Carbon::create($carbonMonth->year, $carbonMonth->month, $d, 0, 0, 0, 'Asia/Jakarta');
            $dateStr = $date->toDateString();
            $isWeekend = $date->isWeekend();

            if (!$isWeekend) {
                $workDays++;
                if ($date->lessThanOrEqualTo(Carbon::today('Asia/Jakarta'))) {
                    $passedWorkDays++;
                }
            }

            if (isset($attendances[$dateStr])) {
                $att = $attendances[$dateStr];
                $status = $att->status;
                if ($status === 'Hadir') $totalPresent++;
                if ($status === 'Terlambat') {
                    $totalPresent++;
                    $totalLate++;
                }

                $reportRows[] = [
                    'dayNumber' => $d,
                    'dateFormatted' => $date->translatedFormat('d F Y'),
                    'dayName' => $date->translatedFormat('l'),
                    'inTime' => $att->in_time ? substr($att->in_time, 0, 5) : '—',
                    'outTime' => $att->out_time ? substr($att->out_time, 0, 5) : '—',
                    'status' => $status,
                    'mode' => $att->attendance_mode ?? 'WFO',
                    'location' => 'Pusdatin Kemhan',
                    'distance' => "{$att->distance_meters} m",
                    'isMock' => (bool) $att->is_mock_location,
                    'isWeekend' => false,
                ];
            } else {
                $status = $isWeekend ? 'Libur Akhir Pekan' : 'Tidak Ada Catatan';
                if (!$isWeekend && $date->lessThanOrEqualTo(Carbon::today('Asia/Jakarta'))) {
                    $totalAbsent++;
                }

                $reportRows[] = [
                    'dayNumber' => $d,
                    'dateFormatted' => $date->translatedFormat('d F Y'),
                    'dayName' => $date->translatedFormat('l'),
                    'inTime' => '—',
                    'outTime' => '—',
                    'status' => $status,
                    'mode' => $isWeekend ? '—' : 'WFO',
                    'location' => $isWeekend ? '—' : 'Pusdatin Kemhan',
                    'distance' => '—',
                    'isMock' => false,
                    'isWeekend' => $isWeekend,
                ];
            }
        }

        $calcDays = $carbonMonth->isCurrentMonth() ? max(1, $passedWorkDays) : max(1, $workDays);
        $complianceRate = min(100, round(($totalPresent / $calcDays) * 100, 1));

        return [
            'institution' => 'Pusdatin Kemhan RI',
            'systemName' => 'SATRIA - Smart Attendance',
            'reportTitle' => "Laporan Rekapitulasi Presensi Bulanan - {$monthName}",
            'period' => $monthName,
            'yearMonth' => $yearMonth,
            'year' => (string) $carbonMonth->year,
            'month' => (int) $carbonMonth->month,
            'romanMonth' => $this->getRomanMonth((int) $carbonMonth->month),
            'generatedAt' => Carbon::now('Asia/Jakarta')->translatedFormat('d F Y, H:i') . ' WIB',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'nip' => $user->nip ?: '199208152020121001',
                'department' => $user->department ?: 'Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi',
                'role' => $user->role ?: 'Pranata Komputer Ahli',
            ],
            'summary' => [
                'totalDays' => $daysInMonth,
                'workDays' => $workDays,
                'totalPresent' => $totalPresent,
                'totalLate' => $totalLate,
                'totalAbsent' => $totalAbsent,
                'complianceRate' => $complianceRate,
            ],
            'rows' => $reportRows,
        ];
    }

    /**
     * Generate format CSV / Excel string.
     */
    public function generateCsvString(array $report): string
    {
        $output = fopen('php://temp', 'r+');
        
        // Header Informasi Dokumen
        fputcsv($output, ['LAPORAN PRESENSI BULANAN PEGAWAI']);
        fputcsv($output, ['Instansi:', $report['institution']]);
        fputcsv($output, ['Nama Pegawai:', $report['user']['name']]);
        fputcsv($output, ['NIP:', $report['user']['nip']]);
        fputcsv($output, ['Unit Kerja:', $report['user']['department']]);
        fputcsv($output, ['Periode:', $report['period']]);
        fputcsv($output, ['Waktu Ekspor:', $report['generatedAt']]);
        fputcsv($output, []); // Baris kosong
        
        // Header Tabel
        fputcsv($output, ['No', 'Hari', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Mode', 'Status Kehadiran', 'Lokasi', 'Jarak GPS']);

        // Isi Baris Data
        foreach ($report['rows'] as $idx => $row) {
            fputcsv($output, [
                $idx + 1,
                $row['dayName'],
                $row['dateFormatted'],
                $row['inTime'],
                $row['outTime'],
                $row['mode'] ?? 'WFO',
                $row['status'],
                $row['location'],
                $row['distance'],
            ]);
        }

        // Summary Baris
        fputcsv($output, []);
        fputcsv($output, ['RANGKUMAN BULAN INI']);
        fputcsv($output, ['Total Hadir:', $report['summary']['totalPresent'] . ' hari']);
        fputcsv($output, ['Total Terlambat:', $report['summary']['totalLate'] . ' kali']);
        fputcsv($output, ['Tingkat Kepatuhan:', $report['summary']['complianceRate'] . '%']);

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent;
    }

    /**
     * Generate Dokumen PDF Resmi berlogo Pusdatin Kemhan.
     */
    public function generatePdfReport(array $report): DomPDFInstance
    {
        $logoPath = public_path('images/kemhan-logo.png');
        $kemhanLogoBase64 = '';

        if (file_exists($logoPath)) {
            $kemhanLogoBase64 = base64_encode(file_get_contents($logoPath));
        }

        $report['kemhanLogoBase64'] = $kemhanLogoBase64;

        $pdf = Pdf::loadView('reports.attendance_pdf', $report);
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOption('isHtml5ParserEnabled', true);
        $pdf->setOption('isRemoteEnabled', false);

        return $pdf;
    }
}
