<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_code')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('requester_work_area_id')->nullable()->constrained('work_areas')->nullOnDelete();
            $table->string('transaction_type'); // 'material_take', 'tool_borrow'
            $table->string('status'); // 'pending_approval', 'approved', 'rejected', 'borrowed', 'returned', 'completed'
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('checkout_photo_path');
            $table->string('return_photo_path')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->text('purpose_notes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};

