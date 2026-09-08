<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;

class ExportService
{
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

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $date = Carbon::create($carbonMonth->year, $carbonMonth->month, $d, 0, 0, 0, 'Asia/Jakarta');
            $dateStr = $date->toDateString();
            $isWeekend = $date->isWeekend();

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
                    'location' => 'Pusdatin Kemhan',
                    'distance' => "{$att->distance_meters} m",
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
                    'location' => $isWeekend ? '—' : 'Pusdatin Kemhan',
                    'distance' => '—',
                    'isWeekend' => $isWeekend,
                ];
            }
        }

        return [
            'institution' => 'Pusdatin Kemhan RI',
            'systemName' => 'SATRIA - Smart Attendance',
            'reportTitle' => "Laporan Rekapitulasi Presensi Bulanan - {$monthName}",
            'period' => $monthName,
            'yearMonth' => $yearMonth,
            'generatedAt' => Carbon::now('Asia/Jakarta')->translatedFormat('d F Y, H:i') . ' WIB',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'nip' => '199208152020121001',
                'department' => 'Informatika / Pusdatin Kemhan',
                'role' => 'Pranata Komputer Ahli',
            ],
            'summary' => [
                'totalDays' => $daysInMonth,
                'totalPresent' => $totalPresent,
                'totalLate' => $totalLate,
                'totalAbsent' => $totalAbsent,
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
        fputcsv($output, ['No', 'Hari', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Lokasi', 'Jarak GPS']);

        // Isi Baris Data
        foreach ($report['rows'] as $idx => $row) {
            fputcsv($output, [
                $idx + 1,
                $row['dayName'],
                $row['dateFormatted'],
                $row['inTime'],
                $row['outTime'],
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

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent;
    }
}
