# Implementation Notes - Phase 3

## Scope
- Menambahkan backend lock untuk pembayaran iuran.
- Menambahkan backend lock ringan untuk transaksi kas manual yang identik dan paralel.
- Menambahkan loading/disabled state pada form mutasi finance di React Inertia.
- Menjaga proses create tetap memakai `DB::transaction()`.

## Backend Protection
- `DuesLedgerService::storePayment()` memakai `Cache::lock('dues_payment_{memberId}_{startPeriod}', 10)`.
- Lock iuran didapat sebelum validasi overlap pembayaran.
- Jika lock gagal didapatkan, sistem mengembalikan pesan:
  `Pembayaran sedang diproses. Mohon jangan submit berulang.`
- Insert `dues_payments`, `dues_payment_allocations`, dan `cash_transactions` tetap berada dalam `DB::transaction()`.
- Unique constraint `dues_payment_allocations(member_id, period_ym)` dari Phase 1 tetap menjadi safety net database.
- `TransactionsController::store()` memakai lock fingerprint `user_id + tx_date + type + category_id + method_id + amount + reference_no` untuk mencegah submit kas identik yang paralel.
- `FinancialActionRequestService::requestVoid()` mengunci target row saat membuat request void sehingga double submit void tidak membuat pending request ganda.

## Frontend Protection
- `Transactions/Index.jsx`: submit dan void modal sudah memakai loading/disabled state dari Phase 2.
- `Dues/Index.jsx`: input pembayaran, edit pembayaran, dan request void memakai loading/disabled state.
- `Audit/Index.jsx`: approve/reject modal memakai loading/disabled state.

## Batasan
- Belum membuat idempotency key persisten lintas request window.
- Proteksi transaksi kas manual adalah lock jangka pendek untuk request paralel identik, bukan deduplication permanen.
- Tidak ada perubahan business flow, nominal, invoice, void flow, COA, ledger, atau period locking.

## Manual Verification
1. Klik tombol simpan pembayaran iuran dua kali cepat; tombol harus loading dan tidak mengirim request kedua.
2. Kirim dua request pembayaran iuran paralel untuk member dan periode sama; salah satu harus gagal.
3. Pastikan gagal lock menampilkan pesan `Pembayaran sedang diproses. Mohon jangan submit berulang.`
4. Klik submit transaksi kas dua kali cepat; tombol harus loading dan tidak bisa diklik ulang.
5. Klik approve/reject void dua kali cepat; modal harus loading dan tidak mengirim request kedua.
6. Pastikan hanya satu `dues_payment`, satu set allocation, dan satu `cash_transaction` yang terbentuk untuk pembayaran iuran valid.

## Automated Verification
Jalankan:

```bash
php artisan test --filter=FinanceConcurrencyProtectionTest
```
