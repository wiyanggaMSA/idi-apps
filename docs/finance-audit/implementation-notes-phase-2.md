# Implementation Notes - Phase 2

## Scope
- Mengunci update field finansial pada transaksi kas yang sudah tercatat.
- Mengizinkan update metadata aman: `description`, `reference_no`, dan lampiran.
- Menyesuaikan modal React Inertia agar field finansial read-only saat edit.
- Menjaga audit trail untuk perubahan metadata.

## Field Finansial Yang Dikunci
- `amount`
- `type`
- `tx_date`
- `category_id`
- `method_id`
- `dues_payment_id`
- `transaction_number`
- `created_by`
- `voided_at`
- `voided_by`

Jika field tersebut dikirim dengan nilai berbeda pada endpoint update, backend menolak request dengan pesan:

> Transaksi yang sudah tercatat tidak dapat diubah pada nominal/tanggal/tipe/kategori. Silakan lakukan void/reversal lalu buat transaksi baru.

## Field Yang Masih Bisa Diubah
- `description`
- `reference_no` sebagai referensi eksternal/manual, bukan nomor internal sistem
- `attachment_document_id` melalui upload lampiran baru atau hapus lampiran

## Audit Trail
Update metadata tetap mencatat:
- actor
- timestamp dari activity log
- reason
- before snapshot
- after snapshot
- daftar `changes`

## Manual Verification
1. Buka halaman transaksi kas.
2. Edit transaksi manual.
3. Pastikan field tanggal, tipe, kategori, metode, dan nominal disabled.
4. Ubah keterangan atau referensi, isi alasan, lalu simpan.
5. Pastikan perubahan tersimpan dan audit trail `cash_transaction.updated` berisi before/after/changes.
6. Kirim PATCH manual dengan `amount`, `type`, `tx_date`, `category_id`, atau `method_id` berbeda.
7. Pastikan backend menolak request dan data transaksi tidak berubah.
8. Coba edit transaksi hasil iuran; backend tetap menolak.

## Automated Verification
Jalankan:

```bash
php artisan test --filter=CashTransactionImmutabilityTest
```
