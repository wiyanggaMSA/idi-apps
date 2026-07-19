# Implementation Roadmap (Peta Jalan Eksekusi)

Dokumen ini merangkum seluruh hasil audit menjadi panduan eksekusi bertahap (Phased Implementation). Pendekatan ini aman dan tidak merusak fungsionalitas yang ada saat ini.

## Phase 1: Stabilkan Database Constraints (High Priority)
**Target**: Mencegah inkonsistensi paling fundamental di level DB.
- **Aksi 1**: Buat Migration untuk menambahkan constraint `UNIQUE (member_id, period_ym)` pada `dues_payment_allocations`.
- **Aksi 2**: Buat Migration untuk menambahkan kolom `transaction_number` pada tabel `cash_transactions` dan buat generator unik di Service.
- **Testing**: Manual check apakah duplikasi tertolak oleh DB.

## Phase 2: Transaksi Kas *Immutable* (Prudent Finance)
**Target**: Transaksi final tidak boleh diedit nominal/tipe sembarangan.
- **Aksi 1**: Hapus fungsionalitas Edit nominal di `TransactionsController@update`. (Hanya diizinkan ganti keterangan/lampiran).
- **Aksi 2**: Ubah flow user yang ingin "Revisi", arahkan mereka ke fitur *Request Void* -> Approve -> Bikin mutasi kas baru (Reversal Pattern).
- **Testing**: Pastikan UI Edit Form didisable untuk field nominal/kategori.

## Phase 3: Pencegahan *Race Condition* (Double Submit)
**Target**: Frontend & Backend tidak memproses 2 kali dari klik cepat.
- **Aksi 1**: Di sisi Frontend (React), pastikan atribut `disabled={processing}` aktif.
- **Aksi 2**: Di sisi Backend (Laravel), implementasikan `Cache::lock` selama proses `storePayment` di `DuesLedgerService`.

## Phase 4: Refactor Controller & Service (SRP)
**Target**: Kode lebih rapi dan maintainable.
- **Aksi 1**: Ekstrak perhitungan saldo berjalan (`running_balance`) dari `TransactionsController` ke Service khusus atau Eloquent Scope.
- **Aksi 2**: Terapkan Laravel Policies untuk sentralisasi fungsi pengecekan akses (contoh: `AuditController` dan `TransactionsController`).

## Phase 5: Automated Testing Coverage
**Target**: Melindungi aplikasi dari regresi di masa depan.
- **Aksi 1**: Buat folder `tests/Feature/Finance`.
- **Aksi 2**: Implementasikan skenario dari `10-testing-plan.md`. Tulis minimal test untuk *Store Cash*, *Store Dues*, dan *Void Flow*.

## Phase 6: Reporting Hardening & Logging Lanjutan
**Target**: Memastikan integritas laporan selamanya.
- **Aksi 1**: Terapkan fitur tutup periode bulanan (*Period Locking*).
- **Aksi 2**: Review hasil log *Spatie Activitylog* di produksi secara berkala untuk memastikan tidak ada perubahan "gelap".
- **Aksi 3**: Review UI halaman Laporan untuk menghilangkan kalkulasi berulang.

*Catatan Eksekusi*: Kerjakan urut berdasarkan fase di atas. Buat branch terpisah untuk setiap fase sebelum di-merge ke branch utama.
