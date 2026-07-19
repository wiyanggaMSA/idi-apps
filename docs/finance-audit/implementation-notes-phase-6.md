# Implementation Notes - Phase 6

## Scope

Fase ini memecah tanggung jawab utama `DuesLedgerService` ke action classes tanpa mengubah route, UI, schema database, aturan overlap payment, sync void ke kas, atau flow bisnis iuran.

## Mapping DuesLedgerService

- Query/list data iuran: `buildIndexPayload`, `latestPaymentsByMember`, filter, pagination, summary.
- Kalkulasi tagihan/tunggakan: dipindah ke `CalculateMemberDuesAction`.
- Proses pembayaran: dipindah ke `ProcessDuesPaymentAction`.
- Proses void pembayaran: dipindah ke `VoidDuesPaymentAction`.
- Formatting response/pagination: tetap di `DuesLedgerService` untuk menjaga kontrak frontend.
- Sinkronisasi ke `cash_transactions`: dipindah ke `SyncDuesPaymentToCashTransactionAction`.

## Action Classes

- `CalculateMemberDuesAction`
  - Menghitung `paid_through`, `due_now`, `arrears_months`, `advance_months`, status, dan nominal tunggakan.
- `ProcessDuesPaymentAction`
  - Mengelola lock pembayaran, validasi periode wajib berurutan, validasi overlap, DB transaction, insert payment, insert allocations, sync kas, dan audit trail.
- `VoidDuesPaymentAction`
  - Menandai pembayaran iuran void dan ikut menandai transaksi kas terkait sebagai void.
- `SyncDuesPaymentToCashTransactionAction`
  - Membuat transaksi kas masuk dari pembayaran iuran.

## Backward Compatibility

`DuesLedgerService` tetap menjadi orchestrator/facade untuk controller dan test existing:

- `storePayment()` tetap tersedia dan mendelegasikan ke `ProcessDuesPaymentAction`.
- `voidPayment()` tetap tersedia dan mendelegasikan ke `VoidDuesPaymentAction`.
- `buildIndexPayload()` tetap mengembalikan struktur payload yang sama untuk React Inertia.

## Hal Yang Tidak Diubah

- Tidak ada perubahan schema database.
- Tidak ada perubahan UI.
- Tidak ada perubahan route.
- Tidak ada perubahan aturan overlap payment.
- Tidak ada perubahan format response dues index.
- Tidak ada perubahan generator `transaction_number`.
- Tidak ada perubahan flow maker-checker void.

## Risiko Tersisa

- `DuesLedgerService` masih menangani query list, filtering, pagination, dan update metadata pembayaran. Ini sengaja dipertahankan untuk menjaga scope refactor tetap kecil.
- `updatePayment()` belum dipindah ke action karena fase ini berfokus pada minimum action yang diminta dan menjaga behavior existing.
- Beberapa helper snapshot audit masih ada lebih dari satu tempat; bisa disatukan nanti bila sudah ada domain audit object yang stabil.

## Manual QA Checklist

- Bayar iuran 1 bulan dari UI, pastikan payment, allocation, dan cash transaction terbentuk.
- Bayar iuran 3 bulan, pastikan ada 3 allocation dan total amount sama dengan 3 x nominal bulanan.
- Coba bayar periode yang sama/overlap, pastikan ditolak dengan pesan existing.
- Request/approve void pembayaran iuran, pastikan transaksi kas terkait ikut void.
- Buka halaman iuran dan pastikan summary, list member, dan history pembayaran tetap tampil.

## Automated Verification

```bash
php artisan test tests/Feature/Finance/DuesLedgerActionsPhase6Test.php
php artisan test tests/Feature/Finance tests/Feature/DuesLedgerTest.php
```

Kedua command di atas sudah lulus pada implementasi fase ini.
