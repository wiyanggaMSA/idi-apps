# Security & Authorization Audit

Audit kebijakan perizinan (Permissions), pengamanan data, dan otorisasi modul finansial.

## 1. Current Policies & Gate
* **Validasi Aksi**: `AuditController@canReview()` sudah memeriksa izin dengan `$request->user()->can('dues.void.approve')` atau `'transactions.void.approve'`. Ini menggunakan sistem permission berbasis string (diduga dari *Spatie Permission*).
* **Validasi Transaksi**: `TransactionsController` juga mencegat user jika melakukan edit jumlah nominal tanpa izin `'transactions.adjust.amount'`.

## 2. Kerentanan yang Mungkin Timbul (Mass Assignment)
* Semua model telah mendefinisikan array `$fillable`. Ini melindung dari *Mass Assignment Vulnerability*.
* Field sensitif seperti `voided_at`, `voided_by` ditangani sistem secara internal (service), bukan dipassing sembarangan dari request HTTP.

## 3. Rencana Hardening (Penguatan)
1. **Sentralisasi Policy**: Pindahkan semua pemeriksaan otorisasi yang ada di Controller (menggunakan if-else logic) ke dalam class Laravel Policy (`CashTransactionPolicy`, `DuesPaymentPolicy`).
2. **Controller Middleware**: Terapkan `$this->authorize('update', $transaction)` di setiap method Controller krusial, sehingga secara default tertutup (Secure by default).
3. **Frontend UI Authorization**: Pastikan di React (Inertia), tombol "Batal" atau "Approval" juga tidak dirender jika user di backend tidak memiliki permission, mencegah *false expectation*. Ini biasanya dipassing via props Inertia (misal: `auth.permissions`).
