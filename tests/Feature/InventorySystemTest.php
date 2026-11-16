<?php

namespace Tests\Feature;

use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\Location;
use App\Models\User;
use App\Models\WorkArea;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InventorySystemTest extends TestCase
{
    use RefreshDatabase;

    protected WorkArea $area1;
    protected WorkArea $area2;
    protected WorkArea $sharedArea;
    protected Location $location;
    protected User $admin;
    protected User $tko1;
    protected User $tkno1;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->area1 = WorkArea::create(['name' => 'Phonska 1 dan 4']);
        $this->area2 = WorkArea::create(['name' => 'Phonska 2 dan 3']);
        $this->sharedArea = WorkArea::create(['name' => 'Umum / Shared']);

        $this->location = Location::create(['name' => 'L1. Rak 3']);

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'tkno_admin',
            'work_area_id' => null,
        ]);

        $this->tko1 = User::create([
            'name' => 'TKO Area 1',
            'email' => 'tko1@test.com',
            'password' => bcrypt('password'),
            'role' => 'tko',
            'work_area_id' => $this->area1->id,
        ]);

        $this->tkno1 = User::create([
            'name' => 'TKNO Area 1',
            'email' => 'tkno1@test.com',
            'password' => bcrypt('password'),
            'role' => 'tkno',
            'work_area_id' => $this->area1->id,
        ]);
    }

    public function test_can_view_items_catalog(): void
    {
        Item::create([
            'mn_code' => '6193311',
            'item_name' => 'IDD IIIA Flame Detector',
            'item_category' => 'consumable_part',
            'type' => 'Burner',
            'system_stock' => 5,
            'owner_work_area_id' => $this->area1->id,
            'location_id' => $this->location->id,
        ]);

        $response = $this->actingAs($this->tkno1)->get('/items');
        $response->assertStatus(200);
    }

    public function test_tko_and_admin_can_create_item(): void
    {
        $response = $this->actingAs($this->tko1)->post('/items', [
            'item_name' => 'Transmitter Rosemount 3051',
            'mn_code' => '6116686',
            'item_category' => 'consumable_part',
            'type' => 'Pressure',
            'system_stock' => 10,
            'owner_work_area_id' => $this->sharedArea->id,
            'location_id' => $this->location->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('items', [
            'item_name' => 'Transmitter Rosemount 3051',
            'mn_code' => '6116686',
        ]);
    }

    public function test_tkno_cannot_create_item(): void
    {
        $response = $this->actingAs($this->tkno1)->post('/items', [
            'item_name' => 'Unauthorized Item',
            'item_category' => 'consumable_part',
            'type' => 'Level',
            'system_stock' => 10,
            'owner_work_area_id' => $this->area1->id,
        ]);

        $response->assertForbidden();
    }

    public function test_checkout_same_area_item_is_auto_approved(): void
    {
        $item = Item::create([
            'item_name' => 'Shared Multimeter Fluke',
            'item_category' => 'tool',
            'type' => 'Safety Device',
            'system_stock' => 3,
            'owner_work_area_id' => $this->sharedArea->id,
            'location_id' => $this->location->id,
        ]);

        $photo = UploadedFile::fake()->image('checkout.jpg');

        $response = $this->actingAs($this->tkno1)->post('/transactions', [
            'transaction_type' => 'tool_borrow',
            'purpose_notes' => 'Kalibrasi sinyal 4-20mA di lapangan',
            'checkout_photo' => $photo,
            'items' => [
                ['id' => $item->id, 'quantity' => 1],
            ],
        ]);

        $response->assertRedirect('/transactions');

        // Status is borrowed, stock is immediately decremented
        $this->assertDatabaseHas('inventory_transactions', [
            'status' => 'borrowed',
            'user_id' => $this->tkno1->id,
        ]);

        $this->assertEquals(2, $item->fresh()->system_stock);
    }

    public function test_checkout_different_area_item_triggers_pending_approval(): void
    {
        // Item belongs to Area 2, requester belongs to Area 1
        $item = Item::create([
            'item_name' => 'Special Actuator Phonska 2 & 3',
            'item_category' => 'consumable_part',
            'type' => 'Control Valve',
            'system_stock' => 4,
            'owner_work_area_id' => $this->area2->id,
            'location_id' => $this->location->id,
        ]);

        $photo = UploadedFile::fake()->image('checkout.jpg');

        $response = $this->actingAs($this->tkno1)->post('/transactions', [
            'transaction_type' => 'material_take',
            'purpose_notes' => 'Emergency replacement di unit 04',
            'checkout_photo' => $photo,
            'items' => [
                ['id' => $item->id, 'quantity' => 2],
            ],
        ]);

        $response->assertRedirect('/transactions');

        // Status should be pending_approval and stock NOT decremented yet
        $this->assertDatabaseHas('inventory_transactions', [
            'status' => 'pending_approval',
            'user_id' => $this->tkno1->id,
        ]);

        $this->assertEquals(4, $item->fresh()->system_stock);
    }

    public function test_mixed_cart_splits_into_separate_transactions(): void
    {
        $tool = Item::create([
            'item_name' => 'Fluke Multimeter 789',
            'item_category' => 'tool',
            'type' => 'Safety Device',
            'system_stock' => 5,
            'owner_work_area_id' => $this->sharedArea->id,
            'location_id' => $this->location->id,
        ]);

        $part = Item::create([
            'item_name' => 'Fuse 10A Cartridge',
            'item_category' => 'consumable_part',
            'type' => 'Accessories / Sparepart',
            'system_stock' => 20,
            'owner_work_area_id' => $this->sharedArea->id,
            'location_id' => $this->location->id,
        ]);

        $photo = UploadedFile::fake()->image('checkout.jpg');

        $response = $this->actingAs($this->tkno1)->post('/transactions', [
            'purpose_notes' => 'Pekerjaan perbaikan power supply panel',
            'checkout_photo' => $photo,
            'items' => [
                ['id' => $tool->id, 'quantity' => 1],
                ['id' => $part->id, 'quantity' => 2],
            ],
        ]);

        $response->assertRedirect('/transactions');

        // Harus ada 2 transaksi terpisah
        $this->assertDatabaseHas('inventory_transactions', [
            'transaction_type' => 'tool_borrow',
            'status' => 'borrowed',
            'user_id' => $this->tkno1->id,
        ]);

        $this->assertDatabaseHas('inventory_transactions', [
            'transaction_type' => 'material_take',
            'status' => 'completed',
            'user_id' => $this->tkno1->id,
        ]);

        $this->assertEquals(4, $tool->fresh()->system_stock);
        $this->assertEquals(18, $part->fresh()->system_stock);
    }

    public function test_return_borrowed_tool_increments_stock(): void
    {
        $item = Item::create([
            'item_name' => 'HART Communicator 475',
            'item_category' => 'tool',
            'type' => 'PLC/DCS',
            'system_stock' => 1,
            'owner_work_area_id' => $this->sharedArea->id,
        ]);

        $trx = InventoryTransaction::create([
            'transaction_code' => 'TRX-TEST-001',
            'user_id' => $this->tkno1->id,
            'requester_work_area_id' => $this->area1->id,
            'transaction_type' => 'tool_borrow',
            'status' => 'borrowed',
            'checkout_photo_path' => 'transactions/dummy.jpg',
            'purpose_notes' => 'Testing return flow',
        ]);

        $trx->items()->create([
            'item_id' => $item->id,
            'quantity' => 1,
        ]);

        $returnPhoto = UploadedFile::fake()->image('return.jpg');

        $response = $this->actingAs($this->tkno1)->post("/transactions/{$trx->id}/return", [
            'return_photo' => $returnPhoto,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('inventory_transactions', [
            'id' => $trx->id,
            'status' => 'returned',
        ]);

        // Stock incremented from 1 to 2
        $this->assertEquals(2, $item->fresh()->system_stock);
    }

    public function test_sap_csv_export(): void
    {
        Item::create([
            'mn_code' => '6193311',
            'item_name' => 'Flame Detector Amplifier',
            'sap_description' => 'IDD IIIA FLAME DETECTOR AMMPLIFIER',
            'sap_classification' => 'Other',
            'sap_status' => 'PD',
            'reorder_point' => 1,
            'min_lot_size' => 1,
            'system_stock' => 4,
            'actual_stock' => 4,
            'item_category' => 'consumable_part',
            'type' => 'Burner',
            'owner_work_area_id' => $this->area1->id,
        ]);

        $response = $this->actingAs($this->admin)->get('/items-export/sap');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}

