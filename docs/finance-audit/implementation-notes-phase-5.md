# Implementation Notes - Phase 5

## Scope

Fase ini menstandarkan query reporting kas dan memindahkan kalkulasi running balance transaksi dari controller ke service tanpa mengubah desain laporan, flow void, period locking, atau ledger/double-entry.

## Perubahan

- `CashTransaction` memiliki scope `validForFinance()` dan alias `valid()` untuk transaksi yang sah dihitung dalam laporan.
- Scope valid minimal mengeluarkan transaksi dengan `voided_at` terisi. Soft-deleted rows tetap otomatis dikeluarkan oleh Eloquent `SoftDeletes`.
- `TransactionQueryService` sekarang selalu memakai scope valid dan memakai boundary tanggal reporting finance `Asia/Jakarta` dengan opsi override `finance.reporting_timezone`.
- `LedgerBalanceService` menghitung summary halaman, opening/closing balance, offset balance, dan mendekorasi row transaksi dengan running balance.
- `TransactionsController@index` tidak lagi menghitung running balance langsung di controller.
- `CashReportService`, `FinancialSummaryService`, dan `DashboardMetricsService` memakai definisi transaksi kas valid yang sama.
- Agregasi bulanan memakai ekspresi periode yang kompatibel dengan MySQL dan SQLite agar test reporting dapat berjalan di test database.
- Ringkasan iuran di `FinancialSummaryService` mengecualikan `DuesPayment` yang sudah void pada nilai collected.

## Current Approach

Saldo berjalan masih dihitung dari query transaksi valid dan urutan tampilan, bukan dari tabel ledger atau tabel monthly balance. Ini cukup untuk stabilisasi konsistensi laporan tahap ini, tetapi belum menggantikan ledger akuntansi penuh.

## Risiko Tersisa

- Running balance masih bergantung pada query transaksi historis sehingga bisa menjadi mahal ketika volume transaksi besar.
- Sort selain tanggal tetap harus diperlakukan sebagai saldo berdasarkan urutan tampilan, bukan ledger balance final yang dipersist.
- Belum ada `monthly_balances`; laporan periode panjang masih menghitung dari transaksi.
- Belum ada double-entry ledger; validasi debit/kredit belum tersedia.

## Kapan Perlu Monthly Balances

Gunakan tabel monthly balances saat data transaksi tumbuh besar, laporan bulanan mulai lambat, atau perlu snapshot saldo tutup bulan yang tidak berubah setelah period locking.

## Kapan Perlu Full Ledger/Double-Entry

Gunakan ledger/double-entry saat sistem perlu COA, jurnal debit/kredit, rekonsiliasi bank formal, audit trail accounting lengkap, atau laporan keuangan akuntansi seperti neraca dan laba rugi.

## Query Valid

Semua query kas untuk laporan harus berangkat dari:

```php
CashTransaction::query()->validForFinance()
```

atau melalui `TransactionQueryService::applyFilters()` agar filter void, soft delete, date range, dan filter tampilan tetap konsisten.

## Manual QA Checklist

- Buka halaman transaksi dan pastikan saldo berjalan muncul sesuai urutan tanggal.
- Buat transaksi kas normal dan transaksi void, lalu pastikan transaksi void tidak masuk total laporan kas.
- Soft-delete transaksi di database staging, lalu pastikan transaksi tersebut tidak muncul pada summary.
- Bandingkan total pemasukan/pengeluaran halaman transaksi, laporan kas, ringkasan finansial, dan dashboard untuk periode yang sama.
- Cek filter tanggal pada tanggal transaksi jam `00:00:00` dan `23:59:59` di timezone reporting finance `Asia/Jakarta`.
- Export/PDF laporan kas harus memakai angka yang sama dengan halaman laporan kas karena keduanya memakai `CashReportService`.

## Automated Verification

```bash
php artisan test tests/Feature/Finance/FinanceReportingConsistencyTest.php
php artisan test tests/Feature/Finance
```

Kedua command di atas sudah lulus pada implementasi fase ini.
