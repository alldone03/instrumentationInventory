<?php

use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\ItemImageController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard alias redirecting to items catalog
    Route::get('/dashboard', function () {
        return redirect()->route('items.index');
    })->name('dashboard');

    // Master Items & Catalog
    Route::get('/items', [ItemController::class, 'index'])->name('items.index');
    Route::post('/items', [ItemController::class, 'store'])->name('items.store');
    Route::post('/items/{item}', [ItemController::class, 'update'])->name('items.update');
    Route::delete('/items/{item}', [ItemController::class, 'destroy'])->name('items.destroy');
    Route::post('/items/{item}/stock-opname', [ItemController::class, 'updateStockOpname'])->name('items.stock-opname');
    Route::get('/items-export/sap', [ItemController::class, 'exportSap'])->name('items.export-sap');

    // Item Images
    Route::post('/item-images/{image}/set-primary', [ItemImageController::class, 'setPrimary'])->name('item-images.set-primary');
    Route::delete('/item-images/{image}', [ItemImageController::class, 'destroy'])->name('item-images.destroy');

    // Locations Master CRUD
    Route::post('/locations', [LocationController::class, 'store'])->name('locations.store');
    Route::put('/locations/{location}', [LocationController::class, 'update'])->name('locations.update');
    Route::delete('/locations/{location}', [LocationController::class, 'destroy'])->name('locations.destroy');

    // Inventory Transactions, Checkout, Approvals & Logs
    Route::get('/transactions', [InventoryTransactionController::class, 'index'])->name('transactions.index');
    Route::post('/transactions', [InventoryTransactionController::class, 'store'])->name('transactions.store');
    Route::post('/transactions/{transaction}/approve', [InventoryTransactionController::class, 'approve'])->name('transactions.approve');
    Route::post('/transactions/{transaction}/reject', [InventoryTransactionController::class, 'reject'])->name('transactions.reject');
    Route::post('/transactions/{transaction}/return', [InventoryTransactionController::class, 'returnTool'])->name('transactions.return');

    // Breeze Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
