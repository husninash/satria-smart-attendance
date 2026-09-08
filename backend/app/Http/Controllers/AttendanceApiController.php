<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceApiController extends Controller
{
    private AttendanceService $attendanceService;

    public function __construct(AttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
    }

    /**
     * Endpoint untuk Layar Monitor QR Display Kantor / Lobby Pusdatin.
     */
    public function getDynamicQrMonitor(): JsonResponse
    {
        $payload = $this->attendanceService->generateDynamicQrPayload();
        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    /**
     * Resolusi identitas pegawai aktif berdasarkan Sanctum Token, Header X-User-Email, atau fallback.
     */
    private function resolveUser(Request $request): User
    {
        // 1. Coba dari Sanctum Bearer Token
        if ($token = $request->bearerToken()) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken && $accessToken->tokenable instanceof User) {
                return $accessToken->tokenable;
            }
        }

        // 2. Coba dari Header X-User-Email, query parameter email, atau input email
        $email = $request->header('X-User-Email')
            ?: $request->query('email')
            ?: $request->input('email')
            ?: $request->input('user_email');

        if ($email) {
            $user = User::where('email', $email)->first();
            if ($user) {
                return $user;
            }
        }

        // 3. Fallback
        return User::first() ?? User::firstOrCreate(
            ['email' => 'husni@satria.id'],
            ['name' => 'Nashiratul Husni', 'password' => bcrypt('password')]
        );
    }

    /**
     * Dapatkan user aktif dan rangkuman kehadiran sesuai akun login.
     */
    public function getDashboardSummary(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $today = now()->toDateString();
        $todayAttendance = Attendance::where('user_id', $user->id)
            ->where('date', $today)
            ->first();

        $history = Attendance::where('user_id', $user->id)
            ->orderBy('date', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'rawDate' => $item->date->toDateString(),
                    'date' => $item->date->translatedFormat('d M'),
                    'day' => $item->date->translatedFormat('l'),
                    'inTime' => $item->in_time ? substr($item->in_time, 0, 5) : '—',
                    'outTime' => $item->out_time ? substr($item->out_time, 0, 5) : '—',
                    'inTimeExact' => $item->in_time ?? '—',
                    'outTimeExact' => $item->out_time ?? '—',
                    'status' => $item->status,
                    'attendanceMode' => $item->attendance_mode ?? 'WFO',
                    'distance' => $item->distance_meters > 0 ? "{$item->distance_meters} m" : "—",
                    'isMockLocation' => (bool) $item->is_mock_location,
                    'fraudReason' => $item->fraud_reason ?? ($item->is_mock_location ? 'Terdeteksi Anomali Bot' : 'Terverifikasi Manusiawi (Audit Sah)'),
                    'entropyScore' => $item->entropy_score ?? ($item->is_mock_location ? 0.85 : 0.05),
                    'ipAddress' => $item->ip_address,
                    'userAgent' => $item->user_agent,
                    'gpsAccuracy' => $item->gps_accuracy,
                ];
            });

        $auditLogs = Attendance::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'userName' => $item->user?->name ?? 'Pegawai',
                    'userEmail' => $item->user?->email ?? 'pegawai@satria.id',
                    'department' => $item->user?->department ?? 'Infrastruktur TIK',
                    'date' => $item->date->translatedFormat('d M Y'),
                    'inTimeExact' => $item->in_time ?? '—',
                    'outTimeExact' => $item->out_time ?? '—',
                    'status' => $item->status,
                    'attendanceMode' => $item->attendance_mode ?? 'WFO',
                    'isMockLocation' => (bool) $item->is_mock_location,
                    'fraudReason' => $item->fraud_reason ?? ($item->is_mock_location ? 'Terdeteksi Anomali Bot' : 'Terverifikasi Manusiawi (Audit Sah)'),
                    'entropyScore' => $item->entropy_score ?? ($item->is_mock_location ? 0.85 : 0.05),
                    'ipAddress' => $item->ip_address ?? '10.20.14.99',
                    'userAgent' => $item->user_agent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'gpsAccuracy' => $item->gps_accuracy,
                ];
            });

        $userRoleSlugs = $user->roles ? $user->roles->pluck('slug')->toArray() : [];
        $isAdmin = $user->role === 'admin' || in_array('admin', $userRoleSlugs);

        $requestsQuery = $isAdmin
            ? LeaveRequest::with('user')->orderBy('created_at', 'desc')
            : LeaveRequest::with('user')->where('user_id', $user->id)->orderBy('created_at', 'desc');

        $requests = $requestsQuery->get()->map(function ($r) {
            return [
                'id' => $r->id,
                'userName' => $r->user?->name ?? 'Pegawai',
                'department' => $r->user?->department ?? 'Pusdatin Kemhan',
                'type' => $r->type,
                'dates' => $r->start_date ? $r->start_date->translatedFormat('d F Y') : '—',
                'reason' => $r->reason,
                'status' => $r->status,
                'attachment' => $r->attachment_path,
            ];
        });

        // Real Dynamic Admin Metrics & Unit Data from Database
        $totalEmployees = User::count();
        $todayPresent = Attendance::where('date', $today)->where('status', 'Hadir')->count();
        $todayLate = Attendance::where('date', $today)->where('status', 'Terlambat')->count();
        $pendingRequests = LeaveRequest::where('status', 'Menunggu')->count();
        $botAnomaliesCount = Attendance::where('is_mock_location', true)->count();

        $departments = Department::all()->map(function ($dept) use ($today) {
            $deptUserIds = User::where('department', $dept->name)->pluck('id');
            $totalInDept = $deptUserIds->count();
            $presentInDept = Attendance::whereIn('user_id', $deptUserIds)->where('date', $today)->where('status', 'Hadir')->count();
            $lateInDept = Attendance::whereIn('user_id', $deptUserIds)->where('date', $today)->where('status', 'Terlambat')->count();

            return [
                'name' => $dept->name,
                'total' => $totalInDept,
                'present' => $presentInDept,
                'late' => $lateInDept,
            ];
        });

        return response()->json([
            'officeName' => $this->attendanceService->getOfficeName(),
            'workSchedule' => $this->attendanceService->getWorkSchedule(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department ?? 'Infrastruktur TIK',
            ],
            'adminMetrics' => [
                'totalEmployees' => $totalEmployees,
                'presentCount' => $todayPresent,
                'lateCount' => $todayLate,
                'pendingCount' => $pendingRequests,
                'botAnomaliesCount' => $botAnomaliesCount,
                'units' => $departments,
            ],
            'today' => $todayAttendance ? [
                'inTime' => $todayAttendance->in_time ? (strlen($todayAttendance->in_time) > 5 ? $todayAttendance->in_time : "{$todayAttendance->in_time}:00") : '—',
                'outTime' => $todayAttendance->out_time ? (strlen($todayAttendance->out_time) > 5 ? $todayAttendance->out_time : "{$todayAttendance->out_time}:00") : '—',
                'inTimeExact' => $todayAttendance->in_time ?? '—',
                'outTimeExact' => $todayAttendance->out_time ?? '—',
                'status' => $todayAttendance->status,
                'attendanceMode' => $todayAttendance->attendance_mode ?? 'WFO',
                'distance' => "{$todayAttendance->distance_meters} m",
                'isMockLocation' => (bool) $todayAttendance->is_mock_location,
                'fraudReason' => $todayAttendance->fraud_reason ?? 'Terverifikasi Manusiawi',
                'entropyScore' => $todayAttendance->entropy_score ?? 0.05,
            ] : null,
            'attendance' => $history,
            'auditLogs' => $auditLogs,
            'requests' => $requests,
        ]);
    }

    /**
     * Catat absensi check-in / check-out.
     */
    public function scan(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $lat = $request->input('latitude');
        $lng = $request->input('longitude');

        $metadata = [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'is_mock' => $request->boolean('is_mock') || $request->input('isMock') === true,
            'is_webdriver' => $request->boolean('is_webdriver') || $request->input('isWebdriver') === true,
            'is_trusted' => $request->has('is_trusted') ? $request->boolean('is_trusted') : ($request->has('isTrusted') ? $request->boolean('isTrusted') : null),
            'dwell_time_ms' => $request->input('dwell_time_ms'),
            'accuracy' => $request->input('accuracy'),
            'token' => $request->input('token'),
            'device_fingerprint' => $request->input('device_fingerprint'),
        ];

        $result = $this->attendanceService->recordAttendance(
            $user->id,
            $lat ? (float) $lat : null,
            $lng ? (float) $lng : null,
            $metadata
        );

        $record = $result['record'];

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'actionType' => $result['actionType'],
            'attendanceMode' => $result['attendanceMode'],
            'isMock' => $result['isMock'],
            'fraudReason' => $result['fraudReason'],
            'entropyScore' => $result['entropyScore'],
            'fraudReasons' => $result['fraudReasons'],
            'data' => [
                'date' => $record->date->translatedFormat('d M'),
                'day' => $record->date->translatedFormat('l'),
                'inTime' => $record->in_time ? substr($record->in_time, 0, 5) : '—',
                'outTime' => $record->out_time ? substr($record->out_time, 0, 5) : '—',
                'inTimeExact' => $record->in_time ?? '—',
                'outTimeExact' => $record->out_time ?? '—',
                'status' => $record->status,
                'attendanceMode' => $record->attendance_mode,
                'distance' => "{$record->distance_meters} m",
                'isMockLocation' => (bool) $record->is_mock_location,
                'fraudReason' => $record->fraud_reason ?? $result['fraudReason'],
                'entropyScore' => $record->entropy_score ?? $result['entropyScore'],
                'ipAddress' => $record->ip_address,
                'gpsAccuracy' => $record->gps_accuracy,
            ]
        ]);
    }

    /**
     * Simpan formulir permohonan pengajuan izin/cuti/sakit.
     */
    public function submitRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'reason' => 'required|string',
            'attachment' => 'nullable|file|max:5120',
        ]);

        $user = $this->resolveUser($request);

        $filePath = null;
        if ($request->hasFile('attachment')) {
            $filePath = $request->file('attachment')->store('attachments', 'public');
        }

        $leave = LeaveRequest::create([
            'user_id' => $user->id,
            'type' => $validated['type'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'reason' => $validated['reason'],
            'attachment_path' => $filePath,
            'status' => 'Menunggu',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan berhasil dikirim kepada Atasan Unit.',
            'data' => [
                'id' => $leave->id,
                'type' => $leave->type,
                'dates' => $leave->start_date->translatedFormat('d F Y'),
                'reason' => $leave->reason,
                'status' => $leave->status,
            ]
        ]);
    }

    /**
     * Approval Pengajuan oleh Admin SDM (Setujui / Tolak).
     */
    public function updateRequestStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:Disetujui,Ditolak',
        ]);

        $leave = LeaveRequest::findOrFail($id);
        $leave->status = $validated['status'];
        $leave->save();

        return response()->json([
            'success' => true,
            'message' => "Pengajuan {$leave->type} berhasil diubah statusnya menjadi {$leave->status}.",
            'data' => [
                'id' => $leave->id,
                'status' => $leave->status,
            ]
        ]);
    }
}
