<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AntiFraudAttendanceTest extends TestCase
{
    use RefreshDatabase;
    public function test_attendance_records_anti_fraud_metadata_and_detects_mock(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'husni@satria.id'],
            ['name' => 'Nashiratul Husni', 'password' => bcrypt('password')]
        );

        $service = app(AttendanceService::class);

        // Uji Skenario 1: Scan WFO dengan metadata audit lengkap & tanpa mock
        $res = $service->recordAttendance($user->id, -6.3129, 106.7927, [
            'ip' => '10.20.14.99',
            'user_agent' => 'Mozilla/5.0 Pusdatin Security Agent',
            'is_mock' => false,
            'accuracy' => 10,
        ]);

        $this->assertEquals('WFO', $res['attendanceMode']);
        $this->assertFalse($res['isMock']);
        $this->assertEquals('10.20.14.99', $res['record']->ip_address);
        $this->assertEquals(10, $res['record']->gps_accuracy);

        // Uji Skenario 2: Anomali Fake GPS (Akurasi 0 m atau flag is_mock true)
        $resMock = $service->recordAttendance($user->id, -6.3129, 106.7927, [
            'ip' => '192.168.1.50',
            'user_agent' => 'Android Mock Provider',
            'is_mock' => true,
            'accuracy' => 0,
        ]);

        $this->assertTrue($resMock['isMock']);
        $this->assertTrue((bool)$resMock['record']->is_mock_location);
    }

    public function test_attendance_supports_wfh_without_blocking_office_distance(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'husni@satria.id'],
            ['name' => 'Nashiratul Husni', 'password' => bcrypt('password')]
        );

        $today = now('Asia/Jakarta')->toDateString();

        // Buat izin WFH yang sudah disetujui hari ini
        LeaveRequest::create([
            'user_id' => $user->id,
            'type' => 'WFH',
            'start_date' => $today,
            'end_date' => $today,
            'reason' => 'Jadwal giliran WFH unit TIK',
            'status' => 'Disetujui',
        ]);

        $service = app(AttendanceService::class);

        // Absen dari rumah (jarak jauh misal 15 km)
        $res = $service->recordAttendance($user->id, -6.2000, 106.8166, [
            'ip' => '180.252.1.2',
            'user_agent' => 'Home ISP',
            'is_mock' => false,
            'accuracy' => 15,
        ]);

        $this->assertEquals('WFH', $res['attendanceMode']);
        $this->assertFalse($res['isMock']);
    }

    public function test_bot_consistency_detection_on_identical_seconds(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'botuser@satria.id'],
            ['name' => 'Bot Test User', 'password' => bcrypt('password')]
        );

        $service = app(AttendanceService::class);

        // Simulasi riwayat absensi lampau dengan detik yang persis sama (misal selalu di detik :00)
        \App\Models\Attendance::create([
            'user_id' => $user->id,
            'date' => '2026-08-20',
            'in_time' => '07:00:00',
            'status' => 'Hadir',
        ]);
        \App\Models\Attendance::create([
            'user_id' => $user->id,
            'date' => '2026-08-21',
            'in_time' => '07:01:00',
            'status' => 'Hadir',
        ]);

        // Cek anomali jika absensi berikutnya juga tepat di detik :00
        $isBot = $service->detectBotConsistency($user->id, '00');
        $this->assertTrue($isBot, 'Deteksi bot harus true jika detik identik persis berturut-turut');

        // Jika detik wajar/manusiawi (misal detik 47)
        $isNatural = $service->detectBotConsistency($user->id, '47');
        $this->assertFalse($isNatural, 'Deteksi bot harus false jika detik bervariasi alami');
    }

    public function test_headless_webdriver_and_superhuman_dwell_time_detection(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'headlessuser@satria.id'],
            ['name' => 'Headless Bot User', 'password' => bcrypt('password')]
        );

        $service = app(AttendanceService::class);

        // Kasus 1: Menggunakan Selenium/Puppeteer (is_webdriver = true)
        $resBotDriver = $service->recordAttendance($user->id, -6.3129, 106.7927, [
            'ip' => '10.20.14.50',
            'user_agent' => 'Mozilla/5.0 HeadlessChrome',
            'is_webdriver' => true,
            'dwell_time_ms' => 3000,
        ]);
        $this->assertTrue($resBotDriver['isMock'], 'Harus menandai isMock=true jika client adalah WebDriver');

        // Kasus 2: Dwell time tidak wajar (< 800ms bot script)
        $resInstantBot = $service->recordAttendance($user->id, -6.3129, 106.7927, [
            'ip' => '10.20.14.50',
            'user_agent' => 'Mozilla/5.0',
            'is_webdriver' => false,
            'dwell_time_ms' => 120, // 120 milidetik (mustahil dilakukan manusia)
        ]);
        $this->assertTrue($resInstantBot['isMock'], 'Harus menandai isMock=true jika dwell time < 800ms');
    }

    public function test_synthetic_events_and_automated_script_agent_detection(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'curluser@satria.id'],
            ['name' => 'cURL User', 'password' => bcrypt('password')]
        );

        $service = app(AttendanceService::class);

        // Kasus 1: Script injection e.isTrusted = false
        $resUntrusted = $service->recordAttendance($user->id, -6.3129, 106.7927, [
            'ip' => '10.20.14.50',
            'user_agent' => 'Mozilla/5.0',
            'is_trusted' => false,
        ]);
        $this->assertTrue($resUntrusted['isMock'], 'Harus menandai isMock=true jika e.isTrusted bernilai false');
        $this->assertStringContainsString('Klik Sintetis', $resUntrusted['fraudReason']);

        // Kasus 2: cURL / Python script tool
        $resCurl = $service->recordAttendance($user->id, -6.3129, 106.7927, [
            'ip' => '10.20.14.50',
            'user_agent' => 'python-requests/2.28.1',
        ]);
        $this->assertTrue($resCurl['isMock'], 'Harus menandai isMock=true jika user agent teridentifikasi sebagai skrip');
        $this->assertStringContainsString('python-requests', $resCurl['fraudReason']);
    }
}
