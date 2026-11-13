<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\ItemImage;
use App\Models\Location;
use App\Models\WorkArea;
use Illuminate\Database\Seeder;

class ItemSeeder extends Seeder
{
    public function run(): void
    {
        $phonska14 = WorkArea::where('name', 'Phonska 1 dan 4')->first();
        $phonska23 = WorkArea::where('name', 'Phonska 2 dan 3')->first();
        $utilitas = WorkArea::where('name', 'Utilitas, NPK 1, dan ZK')->first();
        $shared = WorkArea::where('name', 'Umum / Shared')->first();

        $locL1R3 = Location::where('name', 'L1. Rak 3')->first();
        $locL2R1 = Location::where('name', 'L2. Rak 1')->first();
        $locGudangBawah = Location::where('name', 'Gudang Bawah')->first();
        $locGBR3A = Location::where('name', 'GB. Rak 3A')->first();
        $locGAR2A = Location::where('name', 'GA. Rak 2A/3A')->first();
        $locL8 = Location::where('name', 'L8')->first();

        $items = [
            [
                'mn_code' => '6193311',
                'item_name' => 'IDD IIIA Flame Detector Amplifier',
                'sap_description' => 'IDD IIIA FLAME DETECTOR AMMPLIFIER -- D-',
                'item_category' => 'consumable_part',
                'type' => 'Burner',
                'sap_classification' => 'Other',
                'sap_status' => 'PD',
                'reorder_point' => 1,
                'min_lot_size' => 1,
                'system_stock' => 4,
                'actual_stock' => 4,
                'last_stock_opname_at' => now()->subDays(5),
                'location_id' => $locL1R3?->id,
                'owner_work_area_id' => $phonska14?->id,
                'notes' => 'hanya di incenerator 02/06 (saat ini)',
                'images' => [
                    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
                ],
            ],
            [
                'mn_code' => '6116686',
                'item_name' => 'Transmitter Pressure Rosemount 3051',
                'sap_description' => 'PRESSURE TRANSMITTER ROSEMOUNT 3051CD2A',
                'item_category' => 'consumable_part',
                'type' => 'Pressure',
                'sap_classification' => 'CONTROL VALVE DAN SOV',
                'sap_status' => 'VB',
                'reorder_point' => 2,
                'min_lot_size' => 1,
                'system_stock' => 6,
                'actual_stock' => 6,
                'last_stock_opname_at' => now()->subDays(3),
                'location_id' => $locL2R1?->id,
                'owner_work_area_id' => $shared?->id,
                'notes' => 'Stok reguler workshop instrument',
                'images' => [
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=600&auto=format&fit=crop&q=80',
                ],
            ],
            [
                'mn_code' => '7012345',
                'item_name' => 'Fluke 789 ProcessMeter Multimeter',
                'sap_description' => 'PROCESS CALIBRATOR FLUKE 789 MULTIMETER',
                'item_category' => 'tool',
                'type' => 'Safety Device',
                'sap_classification' => 'Other',
                'sap_status' => 'ND',
                'reorder_point' => 0,
                'min_lot_size' => 0,
                'system_stock' => 3,
                'actual_stock' => 3,
                'last_stock_opname_at' => now()->subDays(2),
                'location_id' => $locGudangBawah?->id,
                'owner_work_area_id' => $shared?->id,
                'notes' => 'Toolkit kalibrasi workshop (Wajib kembali)',
                'images' => [
                    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&auto=format&fit=crop&q=80',
                ],
            ],
            [
                'mn_code' => null, // NO MN test case
                'item_name' => 'HART Communicator 475 Handheld Field Tool',
                'sap_description' => null,
                'item_category' => 'tool',
                'type' => 'PLC/DCS',
                'sap_classification' => 'PLC & DCS',
                'sap_status' => null,
                'reorder_point' => 0,
                'min_lot_size' => 0,
                'system_stock' => 2,
                'actual_stock' => 2,
                'last_stock_opname_at' => now()->subDays(1),
                'location_id' => $locGBR3A?->id,
                'owner_work_area_id' => $phonska23?->id,
                'notes' => 'Belum ada nomor MN SAP, unit di rak instrumen Phonska 2 & 3',
                'images' => [
                    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=600&auto=format&fit=crop&q=80',
                ],
            ],
            [
                'mn_code' => '6154321',
                'item_name' => 'Diaphragm Actuator Fisher 657 Size 40',
                'sap_description' => 'ACTUATOR DIAPHRAGM FISHER TYPE 657 SZ 40',
                'item_category' => 'consumable_part',
                'type' => 'Control Valve',
                'sap_classification' => 'CONTROL VALVE DAN SOV',
                'sap_status' => 'PD',
                'reorder_point' => 2,
                'min_lot_size' => 2,
                'system_stock' => 5,
                'actual_stock' => 5,
                'last_stock_opname_at' => now()->subDays(6),
                'location_id' => $locGAR2A?->id,
                'owner_work_area_id' => $phonska23?->id,
                'notes' => 'Sparepart darurat area Phonska 2 dan 3',
                'images' => [
                    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
                ],
            ],
            [
                'mn_code' => '6133452',
                'item_name' => 'Digital Valve Controller FIELDVUE DVC6200',
                'sap_description' => 'DIGITAL VALVE CONTROLLER FISHER DVC6200',
                'item_category' => 'consumable_part',
                'type' => 'Control Valve',
                'sap_classification' => 'CONTROL VALVE DAN SOV',
                'sap_status' => 'PD',
                'reorder_point' => 2,
                'min_lot_size' => 1,
                'system_stock' => 3,
                'actual_stock' => 3,
                'last_stock_opname_at' => now()->subDays(4),
                'location_id' => $locL8?->id,
                'owner_work_area_id' => $utilitas?->id,
                'notes' => 'Khusus area Utilitas & NPK',
                'images' => [
                    'https://images.unsplash.com/photo-1581092335878-2d9ff86ca2bf?w=600&auto=format&fit=crop&q=80',
                ],
            ],
        ];

        foreach ($items as $data) {
            $images = $data['images'] ?? [];
            unset($data['images']);

            $item = Item::create($data);

            foreach ($images as $index => $imgPath) {
                ItemImage::create([
                    'item_id' => $item->id,
                    'image_path' => $imgPath,
                    'is_primary' => $index === 0,
                ]);
            }
        }
    }
}

