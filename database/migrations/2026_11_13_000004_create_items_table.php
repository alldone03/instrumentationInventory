<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('mn_code')->nullable()->index();
            $table->string('item_name');
            $table->string('sap_description')->nullable();
            $table->string('item_category')->default('consumable_part'); // 'consumable_part', 'tool'
            $table->string('type')->default('Accessories / Sparepart');
            $table->string('sap_classification')->nullable();
            $table->string('sap_status')->nullable(); // 'PD', 'ND', 'VB'
            $table->integer('reorder_point')->default(0);
            $table->integer('min_lot_size')->default(0);
            $table->integer('system_stock')->default(0);
            $table->integer('actual_stock')->default(0);
            $table->timestamp('last_stock_opname_at')->nullable();
            $table->foreignId('location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('owner_work_area_id')->constrained('work_areas')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};

