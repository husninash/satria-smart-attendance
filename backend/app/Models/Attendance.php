<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'in_time',
        'out_time',
        'status',
        'attendance_mode',
        'latitude',
        'longitude',
        'distance_meters',
        'ip_address',
        'user_agent',
        'is_mock_location',
        'fraud_reason',
        'entropy_score',
        'gps_accuracy',
        'device_fingerprint',
    ];

    protected $casts = [
        'date' => 'date',
        'distance_meters' => 'integer',
        'is_mock_location' => 'boolean',
        'entropy_score' => 'float',
        'gps_accuracy' => 'integer',
    ];

    /**
     * User yang memiliki absensi ini.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
