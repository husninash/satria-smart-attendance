<?php

namespace App\Services;

use App\Models\Attendance;
use Carbon\Carbon;

class AttendanceService
{
    // Titik koordinat dan nama kantor
    private string $officeName;
    private float $officeLat;
    private float $officeLng;
    private int $maxRadiusMeters;
    private string $workStartTime;
    private string $workEndTime;
    private int $lateToleranceMinutes;

    public function __construct(
        ?string $name = null,
        ?float $lat = null,
        ?float $lng = null,
        ?int $maxRadius = null,
        ?string $startTime = null,
        ?string $endTime = null,
        ?int $lateTolerance = null
    ) {
        $this->officeName = $name ?? env('OFFICE_NAME', 'Pusdatin Kemhan');
        $this->officeLat = $lat ?? (float) env('OFFICE_LAT', -6.312961481933643);
        $this->officeLng = $lng ?? (float) env('OFFICE_LNG', 106.79270558954924);
        $this->maxRadiusMeters = $maxRadius ?? (int) env('OFFICE_RADIUS_METERS', 150);
        $this->workStartTime = $startTime ?? env('WORK_START_TIME', '06:50');
        $this->workEndTime = $endTime ?? env('WORK_END_TIME', '15:30');
        $this->lateToleranceMinutes = $lateTolerance ?? (int) env('LATE_TOLERANCE_MINUTES', 15);
    }

    public function getOfficeName(): string
    {
        return $this->officeName;
    }

    public function getWorkSchedule(): array
    {
        return [
            'startTime' => $this->workStartTime,
            'endTime' => $this->workEndTime,
            'toleranceMinutes' => $this->lateToleranceMinutes,
            'label' => "{$this->workStartTime} – {$this->workEndTime}",
        ];
    }

    /**
     * Verifikasi apakah IP koneksi berasal dari Subnet Jaringan WiFi / Intranet Kantor Pusdatin Kemhan.
     */
    public function isOfficeNetworkVerified(?string $ip): bool
    {
        if (empty($ip)) {
            return false;
        }

        $allowedSubnets = explode(',', env('OFFICE_ALLOWED_SUBNETS', '127.0.0.1,10.20.14.,192.168.,172.'));
        foreach ($allowedSubnets as $subnet) {
            $trimmed = trim($subnet);
            if (!empty($trimmed) && str_starts_with($ip, $trimmed)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Hitung jarak geofencing dengan rumus Haversine (dalam meter).
     */
    public function calculateDistance(float $lat, float $lng): int
    {
        $earthRadius = 6371000; // Radius bumi dalam meter
        $dLat = deg2rad($lat - $this->officeLat);
        $dLng = deg2rad($lng - $this->officeLng);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($this->officeLat)) * cos(deg2rad($lat)) *
             sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return (int) round($earthRadius * $c);
    }

    /**
     * Cek apakah pegawai memiliki izin WFH atau Dinas Luar yang telah disetujui untuk hari ini.
     */
    public function getActiveLeaveForToday(int $userId, string $date): ?\App\Models\LeaveRequest
    {
        return \App\Models\LeaveRequest::where('user_id', $userId)
            ->where('status', 'Disetujui')
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->whereIn('type', ['WFH', 'Dinas luar', 'Dinas Luar', 'Cuti', 'Sakit'])
            ->first();
    }

    /**
     * Verifikasi token dynamic QR / 6-Digit Kiosk Code.
     * Memeriksa slot saat ini dan 1 slot sebelumnya untuk toleransi latensi waktu.
     */
    public function verifyDynamicQrToken(?string $token): bool
    {
        if (empty($token)) {
            return false;
        }

        $token = strtoupper(trim(str_replace('-', '', $token)));

        $now = Carbon::now('Asia/Jakarta');
        $stepSeconds = 15; // 15 detik window
        $currentSlot = (int) floor($now->timestamp / $stepSeconds);
        $secretSalt = config('app.key', 'SATRIA_PUSDATIN_KEMHAN_SECRET');

        for ($slotOffset = 0; $slotOffset <= 1; $slotOffset++) {
            $slot = $currentSlot - $slotOffset;
            $rawHash = hash('sha256', "PUSDATIN_KEMHAN_{$slot}_{$secretSalt}");
            $tokenCode = strtoupper(substr($rawHash, 0, 8));
            $expectedToken = "SATRIA-PUSDATIN-{$tokenCode}-{$slot}";
            
            // 6-digit numeric OTP dari hash
            $numericCode = str_pad(hexdec(substr($rawHash, 0, 6)) % 1000000, 6, '0', STR_PAD_LEFT);

            if ($token === $expectedToken || $token === $tokenCode || $token === $numericCode) {
                return true;
            }
        }

        return false;
    }

    /**
     * Deteksi Anomali Konsistensi Detik (Bot / Scheduled Macro Scripting).
     * Jika detik absensi identik dengan riwayat sebelumnya secara persis, tandai anomali.
     */
    public function detectBotConsistency(int $userId, string $currentSeconds): bool
    {
        $recentAttendances = Attendance::where('user_id', $userId)
            ->whereNotNull('in_time')
            ->orderBy('date', 'desc')
            ->limit(3)
            ->get();

        if ($recentAttendances->count() < 2) {
            return false;
        }

        // Ambil detik dari in_time riwayat sebelumnya
        $matchCount = 0;
        foreach ($recentAttendances as $past) {
            $parts = explode(':', (string) $past->in_time);
            $pastSeconds = isset($parts[2]) ? $parts[2] : null;
            if ($pastSeconds !== null && $pastSeconds === $currentSeconds) {
                $matchCount++;
            }
        }

        // Jika konsisten di detik yang persis sama sebanyak 2 kali berturut-turut
        return $matchCount >= 2;
    }

    /**
     * Proses pencatatan absensi pegawai secara OOP (Check-In & Check-Out) dengan deteksi Anti-Fraud & Metadata.
     */
    public function recordAttendance(int $userId, ?float $lat, ?float $lng, array $metadata = []): array
    {
        $now = Carbon::now('Asia/Jakarta');
        $today = $now->toDateString();
        // Catat waktu lengkap dengan presisi DETIK (H:i:s)
        $timeStr = $now->format('H:i:s');
        $currentSeconds = $now->format('s');

        $distance = ($lat !== null && $lng !== null) ? $this->calculateDistance($lat, $lng) : 15;

        // 1. Cek Penugasan / Permohonan Sah (WFH, Dinas Luar, Cuti, Sakit)
        $activeLeave = $this->getActiveLeaveForToday($userId, $today);
        $attendanceMode = 'WFO';
        if ($activeLeave) {
            $attendanceMode = in_array(strtolower($activeLeave->type), ['wfh']) ? 'WFH' : 'Dinas Luar';
        }

        // 2. Verifikasi Jaringan Fisik Kantor (WiFi Footprint)
        $clientIp = $metadata['ip'] ?? null;
        $isNetworkVerified = $this->isOfficeNetworkVerified($clientIp);

        // 3. Multi-Vector Anti-Fraud & Bot Detection Heuristics
        $fraudReasons = [];
        $entropyPenalty = 0.0;

        $accuracy = isset($metadata['accuracy']) ? (int) $metadata['accuracy'] : null;
        $isWebdriver = !empty($metadata['is_webdriver']);
        $dwellTimeMs = isset($metadata['dwell_time_ms']) ? (int) $metadata['dwell_time_ms'] : null;

        // Vektor 1: Mock Location / Fake GPS Injection
        if (!empty($metadata['is_mock'])) {
            $fraudReasons[] = 'Flag Mock Location Perangkat Terdeteksi';
            $entropyPenalty += 0.40;
        }
        if ($accuracy !== null && $accuracy === 0) {
            $fraudReasons[] = 'Anomali Fake GPS (0m Satelit Jitter / Koordinat Statis)';
            $entropyPenalty += 0.45;
        }

        // Vektor 2: Headless Automation Driver (Selenium, Puppeteer, Playwright)
        if ($isWebdriver) {
            $fraudReasons[] = 'Headless Automation Driver (navigator.webdriver = true)';
            $entropyPenalty += 0.50;
        }

        // Vektor 3: Superhuman Reaction Time (< 800ms dari load halaman langsung submit)
        if ($dwellTimeMs !== null && $dwellTimeMs < 800) {
            $fraudReasons[] = "Reaksi Instan Non-Manusiawi ({$dwellTimeMs}ms dwell time)";
            $entropyPenalty += 0.35;
        }

        // Vektor 4: Event Sintetis / Tidak Dipercaya (e.isTrusted === false dari DOM script injection)
        if (isset($metadata['is_trusted']) && $metadata['is_trusted'] === false) {
            $fraudReasons[] = 'Event Klik Sintetis Script (e.isTrusted = false)';
            $entropyPenalty += 0.45;
        }

        // Vektor 5: User-Agent Skrip / Bot Headless (cURL, Python, Postman, HeadlessChrome)
        $ua = strtolower($metadata['user_agent'] ?? '');
        $botSignatures = ['headlesschrome', 'curl', 'python-requests', 'postmanruntime', 'node-fetch', 'axios', 'wget', 'go-http-client'];
        foreach ($botSignatures as $sig) {
            if (str_contains($ua, $sig)) {
                $fraudReasons[] = "User-Agent Skrip Otomatisasi ({$sig})";
                $entropyPenalty += 0.50;
                break;
            }
        }

        // Vektor 6: Anomali Konsistensi Detik Berulang (Bot Cron / Macro Scheduler)
        $isBotSuspicious = $this->detectBotConsistency($userId, $currentSeconds);
        if ($isBotSuspicious) {
            $fraudReasons[] = "Anomali Konsistensi Detik Statis Berulang (:{$currentSeconds})";
            $entropyPenalty += 0.35;
        }

        $isMock = !empty($fraudReasons);
        $entropyScore = $isMock ? min(1.0, 0.45 + $entropyPenalty) : 0.05;
        $fraudReasonText = $isMock ? implode(' | ', $fraudReasons) : 'Terverifikasi Manusiawi (Audit Sah)';

        // 4. Toleransi keterlambatan dihitung dari jam masuk kerja 06:50 + toleransi 15 menit = 07:05
        [$startHour, $startMinute] = explode(':', $this->workStartTime);
        $lateThreshold = Carbon::today('Asia/Jakarta')
            ->setHour((int)$startHour)
            ->setMinute((int)$startMinute)
            ->addMinutes($this->lateToleranceMinutes);

        $status = $now->greaterThan($lateThreshold) ? 'Terlambat' : 'Hadir';
        if ($activeLeave && in_array(strtolower($activeLeave->type), ['dinas luar'])) {
            $status = 'Dinas luar';
        }

        $attendance = Attendance::firstOrNew([
            'user_id' => $userId,
            'date' => $today,
        ]);

        $actionType = 'check-in';
        $message = '';

        if (!$attendance->exists || empty($attendance->in_time)) {
            // Skenario 1: Check-in Pertama (Absen Masuk)
            $attendance->in_time = $timeStr;
            $attendance->status = $status;
            $attendance->attendance_mode = $attendanceMode;
            $attendance->latitude = $lat;
            $attendance->longitude = $lng;
            $attendance->distance_meters = $distance;
            $attendance->ip_address = $metadata['ip'] ?? null;
            $attendance->user_agent = $metadata['user_agent'] ?? null;
            $attendance->is_mock_location = $isMock;
            $attendance->fraud_reason = $fraudReasonText;
            $attendance->entropy_score = $entropyScore;
            $attendance->gps_accuracy = $accuracy;
            $attendance->device_fingerprint = $metadata['device_fingerprint'] ?? null;

            $statusText = $attendanceMode === 'WFH' ? 'Hadir (WFH)' : $status;
            $message = "Check-in berhasil dicatat pada {$timeStr} WIB ({$statusText})";
        } else {
            // Skenario 2: Check-out (Absen Pulang)
            $actionType = 'check-out';
            $attendance->out_time = $timeStr;
            $attendance->ip_address = $metadata['ip'] ?? $attendance->ip_address;
            $attendance->user_agent = $metadata['user_agent'] ?? $attendance->user_agent;
            if ($isMock) {
                $attendance->is_mock_location = true;
                $attendance->fraud_reason = $fraudReasonText;
                $attendance->entropy_score = $entropyScore;
            }
            $message = "Check-out kepulangan berhasil dicatat pada {$timeStr} WIB";
        }

        $attendance->save();

        return [
            'record' => $attendance,
            'actionType' => $actionType,
            'message' => $message,
            'attendanceMode' => $attendanceMode,
            'isMock' => $isMock,
            'isBotSuspicious' => $isBotSuspicious,
            'fraudReason' => $fraudReasonText,
            'entropyScore' => $entropyScore,
            'fraudReasons' => $fraudReasons,
        ];
    }

    /**
     * Generate Dynamic QR Token untuk Layar Monitor Lobby Kantor (Time-Step 10 detik).
     * Mencegah kecurangan pegawai memfoto QR statis / titip absen dari rumah.
     */
    public function generateDynamicQrPayload(): array
    {
        $now = Carbon::now('Asia/Jakarta');
        $stepSeconds = 15;
        $currentSlot = (int) floor($now->timestamp / $stepSeconds);
        $secondsRemaining = $stepSeconds - ($now->timestamp % $stepSeconds);

        $secretSalt = config('app.key', 'SATRIA_PUSDATIN_KEMHAN_SECRET');
        $rawHash = hash('sha256', "PUSDATIN_KEMHAN_{$currentSlot}_{$secretSalt}");
        $tokenCode = strtoupper(substr($rawHash, 0, 8));
        $numericCode = str_pad(hexdec(substr($rawHash, 0, 6)) % 1000000, 6, '0', STR_PAD_LEFT);
        $formattedNumericCode = substr($numericCode, 0, 3) . '-' . substr($numericCode, 3, 3);

        return [
            'token' => "SATRIA-PUSDATIN-{$tokenCode}-{$currentSlot}",
            'displayCode' => $tokenCode,
            'numericCode' => $numericCode,
            'formattedCode' => $formattedNumericCode,
            'slot' => $currentSlot,
            'secondsRemaining' => $secondsRemaining,
            'stepSeconds' => $stepSeconds,
            'generatedAt' => $now->toIso8601String(),
            'officeName' => $this->officeName,
            'workSchedule' => $this->getWorkSchedule(),
        ];
    }
}
