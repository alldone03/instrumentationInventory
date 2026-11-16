<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->canManageItems();
    }

    public function rules(): array
    {
        return [
            'mn_code' => ['nullable', 'string', 'max:50'],
            'item_name' => ['required', 'string', 'max:255'],
            'sap_description' => ['nullable', 'string', 'max:255'],
            'item_category' => ['required', 'in:consumable_part,tool'],
            'type' => ['required', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:50'],
            'no_po' => ['nullable', 'string', 'max:50'],
            'sap_classification' => ['nullable', 'string', 'max:100'],
            'sap_status' => ['nullable', 'in:PD,ND,VB'],
            'reorder_point' => ['nullable', 'integer', 'min:0'],
            'min_lot_size' => ['nullable', 'integer', 'min:0'],
            'system_stock' => ['required', 'integer', 'min:0'],
            'actual_stock' => ['nullable', 'integer', 'min:0'],
            'last_stock_opname_at' => ['nullable', 'date'],
            'location_id' => ['nullable', 'exists:locations,id'],
            'owner_work_area_id' => ['required', 'exists:work_areas,id'],
            'notes' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'images.*' => ['file', 'image', 'max:5120'], // 5MB max
        ];
    }
}

