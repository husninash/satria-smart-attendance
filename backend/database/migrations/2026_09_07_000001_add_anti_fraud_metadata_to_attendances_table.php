<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->string('attendance_mode')->default('WFO')->after('status'); // WFO, WFH, Dinas Luar
            $table->string('ip_address', 45)->nullable()->after('distance_meters');
            $table->text('user_agent')->nullable()->after('ip_address');
            $table->boolean('is_mock_location')->default(false)->after('user_agent');
            $table->integer('gps_accuracy')->nullable()->after('is_mock_location');
            $table->string('device_fingerprint')->nullable()->after('gps_accuracy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn([
                'attendance_mode',
                'ip_address',
                'user_agent',
                'is_mock_location',
                'gps_accuracy',
                'device_fingerprint',
            ]);
        });
    }
};
