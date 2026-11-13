<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            'Gudang Bawah',
            'L8',
            'L3',
            'L10',
            'L1. Rak 1',
            'L1. Rak 2',
            'L1. Rak 3',
            'L1. Rak 4',
            'L1. Rak 5',
            'L2. Rak 1',
            'L2. Rak 2',
            'L2. Rak 3',
            'L2. Rak 4',
            'GB. Rak Gantung',
            'GB. Rak 3A',
            'GA. L1',
            'L9. Rak 1',
            'L9. Rak 3',
            'GA. Rak Gantung',
            'GA. Rak 2A/3A',
            'GA. Rak 2B/3B',
            'GA. Rak 2C/3C',
            'GA. Rak 2D/3D',
            'GA. Rak 4A/4B',
            'GA. Rak 4C',
            'GA. Rak 5A',
            'GA. Rak 5B',
        ];

        foreach ($locations as $name) {
            Location::firstOrCreate(['name' => $name]);
        }
    }
}

