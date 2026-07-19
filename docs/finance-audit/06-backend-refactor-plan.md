# Backend Refactor Plan (Laravel Layering)

Berdasarkan audit terhadap kode backend saat ini, struktur secara umum sudah rapi, namun beberapa komponen membutuhkan refactoring agar lebih scalable dan taat terhadap prinsip SRP (Single Responsibility Principle).

## 1. Analisis Controller
**Kondisi**: `TransactionsController` cukup panjang (380 baris). `index()` method melakukan banyak logika untuk menghitung `running_balance`.
**Rencana Refactor**:
- Ekstrak kalkulasi `running_balance` ke dalam `LedgerBalanceService` atau gunakan custom Eloquent Builder/Collection macro.
- Pindahkan logika penyiapan data (Data Transfer) dari Controller ke Layer Resource (`TransactionResource`), sehingga Controller hanya fokus pada HTTP Request & Response.

## 2. Analisis Service
**Kondisi**: `DuesLedgerService` bertindak sebagai *God Class* (600+ baris) yang menangani list tagihan, pembuatan payload paginasi, kalkulasi tunggakan, hingga insert pembayaran.
**Rencana Refactor**:
- Pecah `DuesLedgerService` menggunakan konsep *Action Classes*:
  - `CalculateMemberDuesAction`
  - `ProcessDuesPaymentAction`
  - `VoidDuesPaymentAction`
- Biarkan service hanya menjadi fasilitator (orchestrator) jika memang masih dibutuhkan.

## 3. Database Transaction & Exception Handling
**Kondisi**: `storePayment`, `updatePayment`, dan method lain sudah di-wrap di dalam `DB::transaction()`. Error handling menggunakan `\RuntimeException` yang ditangkap di Controller dan diubah menjadi `redirect()->back()->withErrors()`.
**Tingkat Kelayakan**: Sudah sangat baik dan memenuhi standar finansial. Tidak perlu refactor mayor pada bagian ini.

## 4. Idempotency Implementation
**Rencana Penambahan**: 
- Buat middleware `EnsureIdempotentRequest`.
- Frontend harus menggenerate UUID (misal: `uuidv4()`) dan menaruhnya di payload request.
- Backend akan mengecek UUID ini di tabel sementara atau Redis. Jika UUID sudah diproses, tolak request untuk mencegah *Double Submit* mutasi kas.
