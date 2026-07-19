# Prudent Finance Control Plan

Prinsip kehati-hatian (*prudence*) wajib ada pada aplikasi yang berhubungan dengan nominal uang. Dokumen ini mendefinisikan rencana peningkatan kontrol keuangan.

## 1. Maker-Checker Authorization (Sudah Diterapkan & Perlu Diperluas)
* **Kondisi Saat Ini**: Proses *Void* (Pembatalan) sudah memerlukan approval.
* **Target Peningkatan**: Proses *Edit* transaksi manual (perubahan nominal/kategori) juga harus dilarang, dan disubstitusi menjadi proses Void + Pembuatan Transaksi Baru (Reversal). Jika edit harus diizinkan, maka harus masuk status `PENDING` dan di-approve terlebih dahulu.

## 2. Immutable Posted Transactions
* **Aturan Baru**: Seluruh data yang ada pada `cash_transactions` dan `dues_payments` yang sudah masuk database adalah mutlak (Immutable).
* **Implementasi**: 
  - Hapus fungsi `update` untuk merubah `amount`, `tx_date`, dan `type`.
  - Hanya field deskriptif seperti `notes`, `description`, atau `attachment` yang boleh di-update langsung (dengan log).

## 3. Period Locking (Tutup Buku)
* **Kondisi Saat Ini**: Tidak ada batasan tanggal mundur untuk pencatatan transaksi kas.
* **Rekomendasi**: Tambahkan tabel `finance_periods` dengan status (Open/Closed). Validasi pada semua request store/update bahwa `tx_date` tidak boleh berada di bulan/tahun yang sudah di-close (Tutup Buku).

## 4. Idempotency & Mencegah Double Submit
* **Kondisi Saat Ini**: Sistem hanya mengandalkan frontend loading state.
* **Rekomendasi**:
  - Middleware Backend `Idempotency`. Frontend harus mengirim header/token unik setiap kali memanggil API `POST`.
  - Atau, di level Service, gunakan `Cache::lock` mem-blokir proses paralel untuk user/member yang sama. (Contoh: `Cache::lock('pay_dues_'.$memberId, 5)->get(function() { ... })`).

## 5. Audit Trail Lengkap (Telah Diterapkan dengan Baik)
* **Kondisi Saat Ini**: Spatie Activitylog telah mencatat log `before` dan `after` state, reason, actor, dan event name.
* **Rekomendasi**: Pertahankan dan pastikan dashboard audit trail hanya bisa diakses oleh role Auditor/Super Admin.
