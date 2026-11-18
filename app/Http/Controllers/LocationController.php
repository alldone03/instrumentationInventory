<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    /**
     * Store a newly created location.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:locations,name'],
        ]);

        Location::create($validated);

        return redirect()->back()->with('success', "Lokasi \"{$validated['name']}\" berhasil ditambahkan.");
    }

    /**
     * Update the specified location.
     */
    public function update(Request $request, Location $location): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:locations,name,' . $location->id],
        ]);

        $location->update($validated);

        return redirect()->back()->with('success', "Lokasi \"{$location->name}\" berhasil diperbarui.");
    }

    /**
     * Remove the specified location.
     */
    public function destroy(Location $location): RedirectResponse
    {
        // Check if location is referenced by items
        $itemsCount = $location->items()->count();
        if ($itemsCount > 0) {
            return redirect()->back()->with('error', "Lokasi \"{$location->name}\" tidak dapat dihapus karena masih digunakan oleh {$itemsCount} barang.");
        }

        $name = $location->name;
        $location->delete();

        return redirect()->back()->with('success', "Lokasi \"{$name}\" berhasil dihapus.");
    }
}
