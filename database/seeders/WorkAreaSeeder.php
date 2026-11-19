<?php

namespace Database\Seeders;

use App\Models\WorkArea;
use Illuminate\Database\Seeder;

class WorkAreaSeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            'Phonska 1 dan 4',
            'Phonska 2 dan 3',
            'Utilitas, NPK 1, dan ZK',
            'Phonska 4 dan NPK 2, 3, 4',
            'Bagging',
            'Umum / Shared',
            'Shop',
        ];

        foreach ($areas as $name) {
            WorkArea::firstOrCreate(['name' => $name]);
        }
    }
}

