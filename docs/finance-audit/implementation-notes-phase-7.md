# Implementation Notes - Phase 7

## Scope

Fase ini menambahkan period locking/tutup buku untuk modul finance tanpa membuat ledger akuntansi penuh, multi-currency, atau laporan keuangan kompleks baru.

## Perubahan

- Menambahkan tabel `finance_periods` untuk status periode bulanan.
- Menambahkan `FinancePeriod` model dan `FinancePeriodPolicy`.
- Menambahkan `FinancePeriodService` untuk:
  - mencari status periode berdasarkan tanggal,
  - memastikan periode masih open sebelum mutasi uang,
  - membuat row periode saat close,
  - menutup periode dengan actor, timestamp, dan notes,
  - menyediakan status periode untuk laporan.
- Menambahkan halaman minimal `Finance/Periods` untuk melihat periode dan melakukan close period.
- Menambahkan status Open/Closed pada laporan kas dan financial summary.
- Menambahkan validasi periode closed pada:
  - create cash transaction,
  - update metadata cash transaction,
  - request void cash transaction,
  - approve void cash transaction,
  - create dues payment,
  - update dues payment,
  - request void dues payment,
  - approve void dues payment,
  - direct service action dues payment/void.

## Schema

Tabel `finance_periods`:

- `period_year`
- `period_month`
- `status` (`open` / `closed`)
- `closed_at`
- `closed_by`
- `reopened_at`
- `reopened_by`
- `notes`
- unique constraint `period_year + period_month`

Kolom reopen disiapkan untuk desain masa depan, tetapi fitur reopen tidak dibuat pada fase ini.

## Policy & Permission

Permission baru:

- `finance.period.view`
- `finance.period.close`
- `finance.period.reopen`

`finance.period.reopen` hanya disiapkan sebagai permission desain; tidak ada route/UI reopen pada fase ini.

## Aturan Kontrol

- Periode tanpa row dianggap `open`.
- Periode dengan status `closed` menolak mutasi baru.
- Koreksi periode closed harus dilakukan melalui adjustment di periode yang masih open.
- Close period tidak menghapus atau mengubah transaksi existing.
- Laporan periode closed tetap bisa dibaca.

## Hal Yang Tidak Dilakukan

- Tidak membuat accounting ledger penuh.
- Tidak membuat monthly balance snapshot.
- Tidak membuat fitur reopen.
- Tidak mengubah flow bisnis iuran.
- Tidak mengubah desain laporan besar-besaran.
- Tidak mengubah schema transaksi kas/iuran existing.

## Risiko Tersisa

- Belum ada monthly balance snapshot, sehingga laporan closed masih dihitung dari transaksi valid historis.
- Belum ada flow reopen/maker-checker untuk reopen.
- Belum ada adjustment transaction type khusus; koreksi masih memakai transaksi normal pada periode open.
- Belum ada larangan close periode yang lebih baru sebelum periode sebelumnya closed.

## Manual QA Checklist

- Buka menu Laporan > Tutup Buku.
- Close periode bulan tertentu dengan notes minimal 3 karakter.
- Pastikan actor dan waktu close muncul di daftar periode.
- Coba buat transaksi kas pada bulan closed, pastikan ditolak.
- Coba buat pembayaran iuran dengan `paid_at` bulan closed, pastikan ditolak.
- Coba request/approve void transaksi bulan closed, pastikan ditolak.
- Buka laporan kas bulan closed, pastikan tetap bisa dibaca dan menampilkan status Closed.
- Pastikan transaksi existing tidak berubah setelah close period.

## Automated Verification

```bash
php artisan test tests/Feature/Finance/FinancePeriodLockingPhase7Test.php
php artisan test tests/Feature/Finance tests/Feature/DuesLedgerTest.php
npm run build
```

Semua command di atas sudah lulus pada implementasi fase ini.
