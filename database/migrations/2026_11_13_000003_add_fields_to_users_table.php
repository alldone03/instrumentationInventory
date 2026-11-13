<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('tkno')->after('email'); // 'tkno', 'tko', 'tkno_admin'
            $table->foreignId('work_area_id')->nullable()->after('role')->constrained('work_areas')->nullOnDelete();
            $table->string('badge_number')->nullable()->after('work_area_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['work_area_id']);
            $table->dropColumn(['role', 'work_area_id', 'badge_number']);
        });
    }
};

