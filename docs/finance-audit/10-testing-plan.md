# Testing Plan (Rencana Pengujian)

Aplikasi finansial tidak boleh dinaikkan ke produksi (atau diubah) tanpa perlindungan *Automated Testing*. Dokumen ini memandu testing apa saja yang harus dibuat.

## 1. Prioritas Pengujian (High Priority)
Bagian ini berinteraksi dengan perpindahan uang dan perubahan saldo.

1. **Transaction Store Test (Feature)**:
   - *Case 1*: Berhasil mencatat uang masuk.
   - *Case 2*: Gagal mencatat jika parameter tidak lengkap.
2. **Dues Payment Test (Feature)**:
   - *Case 1*: Bayar iuran 1 bulan sukses.
   - *Case 2*: Bayar iuran 3 bulan sekaligus (pastikan 3 baris alokasi dibuat).
   - *Case 3*: **Gagal/Error** jika mencoba membayar periode yang sama (Overlap protection).
3. **Maker-Checker & Void Flow (Feature)**:
   - *Case 1*: User bisa *Request Void* (Status `PENDING`).
   - *Case 2*: Pemohon tidak bisa *Approve* permohonannya sendiri.
   - *Case 3*: Approver sukses mem-void (Data terupdate `voided_at`, log tercatat).
   - *Case 4*: Transaksi Kas hasil dari iuran otomatis ter-void jika tagihan iurannya di-void.

## 2. Pengujian Menengah (Medium Priority)
1. **Ledger Running Balance (Unit)**:
   - Pastikan logic perulangan saldo awal + mutasi = saldo akhir selalu konsisten.
2. **Idempotency/Concurrency (Unit/Feature)**:
   - Lakukan dua request bersamaan pada endpoint bayar iuran (mensimulasikan race condition). Harus 1 yang tembus, 1 gagal.

## 3. Standar Penulisan Tes
- Gunakan `PHPUnit` atau `Pest` (tergantung setup project saat ini).
- Gunakan `RefreshDatabase` trait pada setiap pengujian untuk isolasi environment.
- Jangan *Mock* bagian yang menghitung uang. Hitung uang harus divalidasi ke database sungguhan. Mock diizinkan hanya untuk external service (seperti Payment Gateway jika ada di masa depan).
