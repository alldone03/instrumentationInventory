<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\WorkArea;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $phonska14 = WorkArea::where('name', 'Phonska 1 dan 4')->first();
        $phonska23 = WorkArea::where('name', 'Phonska 2 dan 3')->first();

        // 1. Super Admin (TKNO Admin)
        User::firstOrCreate(
            ['email' => 'admin@instrument.test'],
            [
                'name' => 'Admin Instrument Workshop',
                'password' => Hash::make('password'),
                'role' => 'tkno_admin',
                'work_area_id' => null,
                'badge_number' => 'ADM-001',
            ]
        );

        // 2. TKO Supervisor Phonska 1 & 4
        User::firstOrCreate(
            ['email' => 'tko.phonska14@instrument.test'],
            [
                'name' => 'Supervisor Phonska 1 & 4 (TKO)',
                'password' => Hash::make('password'),
                'role' => 'tko',
                'work_area_id' => $phonska14?->id,
                'badge_number' => 'TKO-101',
            ]
        );

        // 3. TKO Supervisor Phonska 2 & 3
        User::firstOrCreate(
            ['email' => 'tko.phonska23@instrument.test'],
            [
                'name' => 'Supervisor Phonska 2 & 3 (TKO)',
                'password' => Hash::make('password'),
                'role' => 'tko',
                'work_area_id' => $phonska23?->id,
                'badge_number' => 'TKO-102',
            ]
        );

        // 4. TKNO Field Technician Phonska 1 & 4
        User::firstOrCreate(
            ['email' => 'teknisi.phonska14@instrument.test'],
            [
                'name' => 'Teknisi Lapangan 1 (TKNO)',
                'password' => Hash::make('password'),
                'role' => 'tkno',
                'work_area_id' => $phonska14?->id,
                'badge_number' => 'TKNO-201',
            ]
        );

        // 5. TKNO Field Technician Phonska 2 & 3
        User::firstOrCreate(
            ['email' => 'teknisi.phonska23@instrument.test'],
            [
                'name' => 'Teknisi Lapangan 2 (TKNO)',
                'password' => Hash::make('password'),
                'role' => 'tkno',
                'work_area_id' => $phonska23?->id,
                'badge_number' => 'TKNO-202',
            ]
        );
    }
}

