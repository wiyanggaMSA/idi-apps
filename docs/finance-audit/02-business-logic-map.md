# Audit Business Logic Finance (Business Logic Map)

Dokumen ini memetakan alur bisnis utama pada modul keuangan yang ada, serta memvalidasi keamanannya berdasarkan prinsip aplikasi finansial.

## 1. Pemasukan Kas & Transaksi Manual
**Alur**: 
- User (admin) menginput transaksi masuk/keluar secara manual via `TransactionsController@store`.
- Validasi dilakukan via `TransactionStoreRequest`.
- Transaksi masuk ke `CashTransaction`.

**Aturan yang sudah diterapkan**:
- Transaksi mencatat `created_by` dan `updated_by`.
- Setiap transaksi mencatat audit trail via `activity()`.
- Upload dokumen didukung (attachment).

**Kekurangan**:
- Tidak ada pencegahan *race condition* secara eksplisit (seperti Optimistic Locking) bila ada saldo yang bergantung secara real-time pada saat mutasi.

## 2. Pembayaran Iuran (Dues)
**Alur**:
- User memproses pembayaran iuran anggota (berdasarkan bulan `start_period` dan `duration`).
- Proses ditangani oleh `DuesLedgerService@storePayment`.
- Pembayaran dicatat di tabel `dues_payments` dan `dues_payment_allocations` (distribusi per bulan).
- Dibuat juga secara sinkron ke tabel `cash_transactions` untuk mencatat pemasukan kas.

**Keamanan**:
- Memiliki proteksi overlap: Tidak bisa bayar pada periode yang sama.
- Memiliki relasi ke transaksi kas: Jika iuran dibatalkan, transaksi kas juga ikut dibatalkan.
- Transaksi kas yang di-generate oleh sistem iuran tidak bisa diubah/dihapus secara manual dari halaman Kas. (Validasi ada di `TransactionsController@update`: `if ($transaction->dues_payment_id) { error }`). Ini **sangat baik**.

## 3. Pembatalan (Void) Transaksi (Maker-Checker)
**Alur**:
- Sistem tidak mengizinkan hard-delete. Jika salah, user harus melakukan *Request Void* (`FinancialActionRequestService@requestVoid`).
- Request ini berstatus `PENDING`.
- User lain (Checker/Approver) akan melakukan `approve()` atau `reject()` melalui halaman `AuditController`.
- Jika di-approve, transaksi di-update `voided_at = now()` (Soft cancel).

**Evaluasi Keamanan**:
- Maker-checker sudah berjalan dengan baik. Pembuat request tidak boleh melakukan approve sendiri (`if ((int) $request->requested_by === (int) $actor->id) throw error`). Ini adalah prinsip **Separation of Duties** yang valid.
- Void membatalkan Dues Payment sekaligus Cash Transaction (terkait sinkronisasi).

## 4. Inkonsistensi Business Logic yang Ditemukan
1. **Editing vs Reversal**: Saat ini transaksi manual *bisa diedit* melalui `TransactionsController@update`. Meskipun log perubahannya dicatat (via Spatie Activitylog), best-practice sistem keuangan murni (Posted Transaction) seharusnya *Immutable*. Edit transaksi seharusnya memicu jurnal balik (Reversal) dan membuat jurnal baru, bukan sekadar melakukan `UPDATE` pada row database.
2. **Double Entry**: Sistem kas hanya bergantung pada agregasi `amount` dengan parameter `type` ('in' atau 'out'). Belum menggunakan sistem *Chart of Accounts* (COA) berskala penuh, melainkan hanya `cash_categories` dan `cash_methods`.
