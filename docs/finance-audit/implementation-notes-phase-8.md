# Implementation Notes - Phase 8: Automated Testing Coverage

## Scope
Fase ini mengimplementasikan cakupan pengujian otomatis (*automated testing coverage*) untuk modul finance. Pengujian dirancang untuk memverifikasi fungsionalitas transaksi kas, iuran, void request (maker-checker), otorisasi akses, konsistensi laporan, serta proteksi idempotensi dan konkurensi langsung ke database pengujian (SQLite `:memory:`) tanpa mock kalkulasi finansial.

## Perubahan & Struktur File Baru
Seluruh test terletak di direktori `tests/Feature/Finance/` dan menggunakan PHPUnit.

### 1. Model Factories
Menambahkan model factories di direktori `database/factories/` agar pengujian dapat menghasilkan data realistis secara efisien:
- `CashCategoryFactory.php`: Menghasilkan kategori transaksi kas masuk/keluar.
- `CashMethodFactory.php`: Menghasilkan metode transaksi kas (cash, transfer, dll).
- `CashTransactionFactory.php`: Menghasilkan data transaksi kas.
- `DuesPaymentFactory.php`: Menghasilkan pembayaran iuran bulanan anggota.

### 2. Feature Tests
- `CashTransactionTest.php`:
  - Membuat transaksi kas masuk & keluar dengan permission yang tepat.
  - Validasi request gagal jika parameter tidak lengkap/invalid.
  - `transaction_number` terisi otomatis pada event `creating`.
  - Field finansial (`amount`, `type`, dll) immutable setelah transaksi tercatat.
  - Field non-finansial (`description`, `reference_no`) dapat diupdate dengan audit log jika policy mengijinkan.
  - Transaksi yang di-void dikeluarkan dari perhitungan laporan kas.
- `DuesPaymentTest.php`:
  - Pembayaran iuran 1 bulan sukses.
  - Pembayaran iuran 3 bulan membuat 3 payment allocation sesuai periode.
  - Proteksi duplikasi iuran pada periode yang sama (overlap protection).
  - Pembayaran iuran menghasilkan `CashTransaction` terkait secara otomatis.
  - Transaksi kas hasil iuran tidak dapat di-edit manual dari endpoint transaksi biasa.
  - `transaction_number` terisi otomatis pada transaksi kas hasil iuran.
- `FinancialActionRequestVoidTest.php`:
  - User dapat mengajukan request void.
  - Status request void baru adalah `PENDING`.
  - Pembuat request void tidak bisa menyetujui (approve) request-nya sendiri.
  - Approver yang berwenang sukses melakukan approval.
  - Approval void mengisi field `voided_at` dan `voided_by`.
  - Void iuran otomatis mem-void transaksi kas terkait.
  - Penolakan (reject) request void tidak mengubah status transaksi target.
- `FinanceAuthorizationTest.php`:
  - User tanpa permission tidak bisa membuat transaksi kas.
  - User tanpa permission tidak bisa me-request void.
  - User tanpa permission tidak bisa meng-approve void.
  - User dengan permission melakukan aksi sesuai role dengan benar.
  - Endpoints backend tetap aman dan mengembalikan status `403` ketika dipanggil langsung lewat HTTP request bypass UI.
- `FinanceReportingConsistencyTest.php`:
  - Total summary (net & closing balance) sesuai dengan akumulasi mutasi detail.
  - Transaksi void diabaikan dalam laporan.
  - Transaksi soft-deleted diabaikan dalam laporan.
  - Query export konsisten dengan data laporan kas.
  - Filter tanggal laporan menghormati timezone `Asia/Jakarta`.
- `FinanceIdempotencyTest.php`:
  - Pengiriman (submit) iuran ganda hanya menghasilkan satu pembayaran valid.
  - Database constraint (`UNIQUE`) menangkap duplikasi `member_id` + `period_ym` pada tabel alokasi iuran.
  - Mekanisme pessimistic lock / idempotency mengembalikan pesan error yang jelas pada request kedua: `"Pembayaran sedang diproses. Mohon jangan submit berulang."`

---

## Cara Menjalankan Automated Tests

### 1. Prasyarat (Prerequisites)
Pastikan dependensi PHPUnit dan SQLite extension telah terinstall. Jalankan di root direktori project.

### 2. Jalankan Seluruh Test Suite Finance
Untuk menjalankan seluruh test modul finance secara bersamaan:
```bash
php artisan test tests/Feature/Finance
```

### 3. Jalankan Test Case Spesifik
Anda dapat menjalankan file test secara terpisah jika ingin memfokuskan debugging:

- **Cash Transaction Test**:
  ```bash
  php artisan test tests/Feature/Finance/CashTransactionTest.php
  ```
- **Dues Payment Test**:
  ```bash
  php artisan test tests/Feature/Finance/DuesPaymentTest.php
  ```
- **Void Maker-Checker Test**:
  ```bash
  php artisan test tests/Feature/Finance/FinancialActionRequestVoidTest.php
  ```
- **Authorization Test**:
  ```bash
  php artisan test tests/Feature/Finance/FinanceAuthorizationTest.php
  ```
- **Reporting Consistency Test**:
  ```bash
  php artisan test tests/Feature/Finance/FinanceReportingConsistencyTest.php
  ```
- **Idempotency & Concurrency Test**:
  ```bash
  php artisan test tests/Feature/Finance/FinanceIdempotencyTest.php
  ```

---

## Hasil Eksekusi Test
Semua 66 test cases (265 assertions) di dalam folder `tests/Feature/Finance/` telah lulus verifikasi (lulus 100% tanpa error).
