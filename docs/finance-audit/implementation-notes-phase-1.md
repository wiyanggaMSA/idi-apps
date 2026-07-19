# Implementation Notes - Phase 1

## Scope
- Menambahkan unique constraint `dues_payment_allocations(member_id, period_ym)`.
- Menambahkan nomor transaksi internal `cash_transactions.transaction_number`.
- Menambahkan generator nomor transaksi backend dengan sequence bulanan.
- Backfill nomor transaksi lama tanpa menghapus atau mengubah nominal transaksi.

## Preflight Duplikasi Iuran
Jalankan query ini sebelum migration di database produksi:

```sql
SELECT member_id, period_ym, COUNT(*) AS duplicate_count
FROM dues_payment_allocations
GROUP BY member_id, period_ym
HAVING COUNT(*) > 1;
```

Jika hasil query tidak kosong, hentikan deploy dan lakukan review manual. Migration juga akan menolak berjalan bila duplikasi ditemukan.

## Nomor Transaksi Internal
- Format: `TRX/YYYY/MM/000001`.
- Dibuat di backend melalui `App\Services\Cash\TransactionNumberService`.
- Sequence disimpan pada tabel `cash_transaction_number_sequences`.
- `reference_no` tetap menjadi nomor referensi eksternal/manual dan bukan nomor internal sistem.

## Backfill Data Lama
- Migration mengisi `transaction_number` untuk transaksi lama yang masih `NULL`.
- Urutan backfill per bulan memakai `tx_date`, lalu `id`.
- Data lama tidak dihapus.

## Risiko Tersisa
- Constraint `member_id + period_ym` berlaku untuk semua allocation, termasuk payment yang kemudian di-void. Re-payment untuk periode yang sama setelah void perlu desain lanjutan pada fase berikutnya agar tetap auditable tanpa membuka duplikasi.
- Kolom `transaction_number` masih nullable untuk kompatibilitas migration/backfill. Data baru tetap otomatis diisi oleh backend.

## Manual Verification
1. Jalankan query preflight duplikasi di atas.
2. Jalankan `php artisan migrate`.
3. Buat transaksi kas manual baru dan pastikan `cash_transactions.transaction_number` terisi.
4. Buat dua transaksi pada bulan yang sama dan pastikan nomor berurutan serta berbeda.
5. Buat pembayaran iuran dan pastikan transaksi kas hasil iuran memiliki `transaction_number`.
6. Coba insert allocation kedua dengan `member_id` dan `period_ym` yang sama; database harus menolak.

## Automated Verification
Jalankan:

```bash
php artisan test --filter=FinanceDatabaseIntegrityPhase1Test
```
