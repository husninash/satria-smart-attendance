<?php

use App\Http\Controllers\AttendanceApiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExportApiController;
use App\Http\Controllers\UserApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - SATRIA Smart Attendance (Pusdatin Kemhan)
|--------------------------------------------------------------------------
*/

// Auth Routes (OOP)
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/auth/me', [AuthController::class, 'me']);
Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

// Attendance & Dashboard Routes (OOP)
Route::get('/qr/monitor', [AttendanceApiController::class, 'getDynamicQrMonitor']);
Route::get('/dashboard', [AttendanceApiController::class, 'getDashboardSummary']);
Route::post('/attendance/scan', [AttendanceApiController::class, 'scan']);
Route::post('/requests', [AttendanceApiController::class, 'submitRequest']);
Route::put('/requests/{id}/status', [AttendanceApiController::class, 'updateRequestStatus']);

// User / Pegawai Management Routes (OOP)
Route::get('/users', [UserApiController::class, 'index']);
Route::post('/users', [UserApiController::class, 'store']);
Route::put('/users/{id}', [UserApiController::class, 'update']);
Route::delete('/users/{id}', [UserApiController::class, 'destroy']);

// Export Report Routes (OOP)
Route::get('/export/report', [ExportApiController::class, 'getMonthlyReport']);
Route::get('/export/csv', [ExportApiController::class, 'downloadCsv']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
