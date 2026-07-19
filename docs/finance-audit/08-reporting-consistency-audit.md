# Reporting Consistency Audit

Audit konsistensi pelaporan dan angka summary.

## 1. Analisis Akurasi Saldo (Running Balance)
- **Logika Saat Ini**: Dihitung secara "on the fly" di Controller (`TransactionsController@index`) berdasarkan offset paginasi dan array mutasi.
- **Risiko**: Metode ini rawan *off-by-one errors* atau perhitungan kacau bila user menggunakan fungsi filter dan sorting yang tidak standar. 
- **Rekomendasi Utama**: Sistem keuangan yang tangguh harus memiliki tabel `ledgers` (Buku Besar) atau `monthly_balances` (Saldo Bulanan) yang melakukan persistensi saldo. Sehingga laporan dan halaman list transaksi tidak perlu menghitung saldo dari transaksi 0 sampai N. Cukup ambil saldo tutup periode sebelumnya, ditambah mutasi bulan berjalan.

## 2. Konsistensi Antar Laporan
- **Sumber Data**: `FinancialSummaryService` dan `CashReportService` bertanggung jawab dalam penyusunan rekap. 
- **Validasi**:
  - Filter `voided_at IS NULL` sudah digunakan. Transaksi batal (void) tidak dihitung. Ini **SANGAT PENTING** dan sudah benar.
  - Perlu dipastikan bahwa hasil dari `CashReportService` dan *export data* tidak memiliki perbedaan logika query.

## 3. Rencana Standarisasi Report
1. Buat satu *Repository* atau *Query Scope* khusus (contoh: `ScopeValidTransaction`) yang memaksa `whereNull('voided_at')`. Dengan begini, siapapun developer yang membuat report baru tidak akan tidak sengaja menjumlahkan transaksi void.
2. Sinkronkan timezone laporan (export) dengan timezone aplikasi (default Laravel biasanya UTC, sebaiknya di-*set* ke Asia/Jakarta) agar tanggal potong mutasi (Cut-off date) laporan tidak geser 1 hari.
