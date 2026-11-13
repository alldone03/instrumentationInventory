<?php

namespace App\Http\Controllers;

use App\Models\ItemImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ItemImageController extends Controller
{
    public function setPrimary(Request $request, ItemImage $image): RedirectResponse
    {
        if (!$request->user()->canManageItems()) {
            abort(403, 'Unauthorized');
        }

        ItemImage::where('item_id', $image->item_id)->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);

        return redirect()->back()->with('success', 'Foto utama berhasil diubah.');
    }

    public function destroy(Request $request, ItemImage $image): RedirectResponse
    {
        if (!$request->user()->canManageItems()) {
            abort(403, 'Unauthorized');
        }

        $itemId = $image->item_id;
        $wasPrimary = $image->is_primary;

        if (!str_starts_with($image->image_path, 'http')) {
            Storage::disk('public')->delete($image->image_path);
        }

        $image->delete();

        if ($wasPrimary) {
            $next = ItemImage::where('item_id', $itemId)->first();
            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }

        return redirect()->back()->with('success', 'Foto berhasil dihapus.');
    }
}

