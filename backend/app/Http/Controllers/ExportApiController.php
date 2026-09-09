<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExportApiController extends Controller
{
    private ExportService $exportService;

    public function __construct(ExportService $exportService)
    {
        $this->exportService = $exportService;
    }

    /**
     * Resolusi identitas pegawai aktif berdasarkan ID (Admin), Sanctum Token, Header X-User-Email, atau fallback.
     */
    private function resolveUser(Request $request): User
    {
        if ($userId = $request->input('user_id') ?: $request->query('user_id')) {
            $found = User::find($userId);
            if ($found) {
                return $found;
            }
        }

        if ($token = $request->bearerToken()) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken && $accessToken->tokenable instanceof User) {
                return $accessToken->tokenable;
            }
        }

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

        return User::first() ?? User::firstOrCreate(
            ['email' => 'husni@satria.id'],
            ['name' => 'Nashiratul Husni', 'password' => bcrypt('password')]
        );
    }

    /**
     * Dapatkan preview data laporan bulanan (JSON)
     */
    public function getMonthlyReport(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $month = $request->input('month', now()->format('Y-m'));

        $report = $this->exportService->generateMonthlyReportData($user->id, $month);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Download file CSV / Excel Laporan Presensi
     */
    public function downloadCsv(Request $request): Response
    {
        $user = $this->resolveUser($request);

        $month = $request->input('month', now()->format('Y-m'));
        $report = $this->exportService->generateMonthlyReportData($user->id, $month);
        $csvContent = $this->exportService->generateCsvString($report);

        $filename = "Laporan_Presensi_SATRIA_{$user->name}_{$month}.csv";

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }

    /**
     * Download Dokumen PDF Resmi Berlogo Pusdatin Kemhan
     */
    public function downloadPdf(Request $request): Response
    {
        $user = $this->resolveUser($request);

        $month = $request->input('month', now()->format('Y-m'));
        $report = $this->exportService->generateMonthlyReportData($user->id, $month);
        $pdf = $this->exportService->generatePdfReport($report);

        $cleanNip = preg_replace('/[^0-9A-Za-z]/', '', $user->nip ?: 'Kemhan');
        $cleanMonth = preg_replace('/[^0-9\-]/', '', $month);
        $filename = "Laporan_Resmi_Presensi_Pusdatin_Kemhan_{$cleanNip}_{$cleanMonth}.pdf";

        return $pdf->download($filename);
    }
}
