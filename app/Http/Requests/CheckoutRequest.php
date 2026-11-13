<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'transaction_type' => ['nullable', 'in:material_take,tool_borrow'],
            'purpose_notes' => ['required', 'string', 'min:3'],
            'checkout_photo' => ['required', 'file', 'image', 'max:5120'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'checkout_photo.required' => 'Foto bukti pengambilan atau peminjaman wajib diunggah!',
            'checkout_photo.image' => 'File bukti harus berupa gambar/foto yang valid.',
            'purpose_notes.required' => 'Keperluan / Tag Number / Work Order wajib diisi.',
            'items.required' => 'Keranjang checkout tidak boleh kosong.',
        ];
    }
}

