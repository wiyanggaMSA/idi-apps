# Audit Struktur Project & Kondisi Saat Ini (Current State Audit)

## 1. Ikhtisar Arsitektur
Aplikasi ini dibangun menggunakan framework **Laravel** untuk backend dan **React + Inertia.js** untuk frontend. Modul keuangan yang saat ini aktif terutama mencakup pengelolaan Kas (Cash) dan Iuran (Dues).

Secara umum, aplikasi sudah mencoba menerapkan pemisahan tanggung jawab (Separation of Concerns) dengan adanya `Controllers`, `Services`, `Requests` validation, dan `Models`. 

## 2. Struktur Folder & Layering Laravel

### 2.1 Controllers
Lokasi: `app/Http/Controllers/`
- **Cash**: Terdapat `TransactionsController`, `CashController`, `CashExportController`, `CashReportsController`. `TransactionsController` cukup padat (sekitar 380 baris) namun logic utamanya sebagian besar sudah mendelegasikan beberapa aspek ke Service.
- **Dues**: Terdapat `DuesController` dan `DuesRecapController`.
- **Finance**: Terdapat `AuditController` yang bertugas sebagai halaman audit trail dan maker-checker (approval void).

*Temuan*: Controller secara umum bertugas menerima request, memanggil service, dan merender Inertia. Ini adalah praktik yang baik. Namun, ada sedikit kebocoran logic perhitungan saldo (running balance) langsung di dalam `TransactionsController@index` yang seharusnya dipindah ke layer Service atau Resource.

### 2.2 Services
Lokasi: `app/Services/`
- **Cash**: `LedgerBalanceService`, `TransactionQueryService`, `CashReportService`, `FinancialSummaryService`.
- **Dues**: `DuesLedgerService` (cukup gemuk, sekitar 600 baris, menangani perhitungan tagihan, tunggakan, dan mutasi iuran), `DuesInvoiceService`, `DuesRecapService`.
- **Finance**: `FinancialActionRequestService` menangani approval void transaksi (maker-checker flow).

*Temuan*: Service bertindak sebagai "God Object" di beberapa kasus (seperti `DuesLedgerService`). Ini bisa diekstraksi menggunakan pola Action Class atau Domain Driver Design jika aplikasi semakin besar.

### 2.3 Models
Lokasi: `app/Models/`
- **Finance Core**: `CashTransaction`, `DuesPayment`, `DuesPaymentAllocation`, `FinancialActionRequest`, `CashCategory`, `CashMethod`, `DuesInvoice`, `DuesSetting`, `DuesPeriod`.

*Temuan*: Model bersih dan hanya mendefinisikan relasi (BelongsTo/HasMany), casts, dan fillable. Sudah menggunakan `SoftDeletes` yang merupakan standar baik untuk aplikasi keuangan.

### 2.4 Validasi (Form Requests)
Lokasi: `app/Http/Requests/`
Terdapat `TransactionStoreRequest`, `TransactionUpdateRequest`, dll. Ini membuktikan bahwa validasi input sudah dipisahkan dari controller.

## 3. Kesimpulan Current State
- **Kelebihan**: Sudah mengadopsi Service Pattern, ada sistem persetujuan (Maker-Checker) menggunakan `FinancialActionRequest`, menggunakan Soft Deletes.
- **Kelemahan/Area Perbaikan**: 
  - Belum murni menggunakan Single Responsibility Principle (SRP) karena Service seperti `DuesLedgerService` melakukan banyak tugas (query database, kalkulasi bisnis, data formatting).
  - Tipe data nominal di database masih menggunakan `unsignedBigInteger` (walaupun aman dari error float, namun belum standar jika harus menggunakan nilai desimal atau multi-currency di masa depan).
  - Sistem Jurnal ganda (Double Entry Ledger) murni belum diterapkan secara utuh (baru mencatat uang masuk/keluar kas secara tunggal).
