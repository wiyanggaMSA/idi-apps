# Database Audit

Audit desain dan struktur relasi database untuk kelayakan finansial.

## 1. Analisis Tabel Keuangan Utama
### Tabel `cash_transactions`
- Terdapat kolom `tx_date`, `type`, `amount`, `category_id`, `method_id`, `reference_no`.
- Kolom audit lengkap: `created_by`, `updated_by`, `voided_at`, `voided_by`.
- Timestamps dan Soft Deletes terpasang.
- **Tipe Data Amount**: Menggunakan `unsignedBigInteger`. Ini umum dalam konteks Rupiah (IDR) karena menghindari masalah *floating point precision*. Namun, batas maksimum `BigInteger` adalah sangat besar, sehingga cukup aman. Tidak perlu diganti ke `DECIMAL` kecuali ada kebutuhan multi-currency atau pencatatan pajak sen.

### Tabel `dues_payments` & `dues_payment_allocations`
- Didesain dengan baik untuk memecah total pembayaran (contoh: bayar 3 bulan = 3 baris allocation). 
- Berguna untuk pelaporan *"Member A bayar bulan apa saja"*.

### Tabel `financial_action_requests`
- Menggunakan skema *Polymorphic Relations* (`actionable_type`, `actionable_id`). Sangat fleksibel untuk extend approval ke modul lain.

## 2. Kekurangan & Constraint yang Harus Ditambahkan

1. **Unique Constraint untuk Iuran**:
   Saat ini alokasi iuran belum dijaga di level DB. Jika ada race condition, user bisa tercatat bayar bulan "2026-07" dua kali.
   - **Tindakan**: Tambahkan migration untuk `UNIQUE(member_id, period_ym)` pada tabel `dues_payment_allocations`.

2. **Foreign Key Integrity**:
   - Migration `create_cash_transactions_table` telah mendefinisikan `constrained()->restrictOnDelete()`. Ini adalah *best practice* agar master data tidak bisa dihapus jika sudah digunakan di transaksi.

3. **Nomor Transaksi Otomatis (Transaction Numbering)**:
   - Saat ini tabel tidak memiliki *System Generated Sequence Number* (misal: TRX/2026/07/0001).
   - `reference_no` tampaknya digunakan untuk menyimpan nomor referensi bank. 
   - **Tindakan**: Sebaiknya tambahkan kolom `transaction_number` dengan tipe `VARCHAR` + `UNIQUE INDEX` untuk identifikasi mutlak yang mudah diaudit secara fisik (print-out).
