# Frontend Inertia Audit (React)

Audit terhadap komponen React Inertia terkait Modul Finance.

## 1. Kondisi Tampilan & Logika Frontend
Secara keseluruhan, aplikasi menggunakan ReactJS dan InertiaJS, yang berarti state manajemen dan routing dihandle oleh backend.

### Kelebihan yang Ditemukan:
- Tombol aksi seperti "Edit" atau "Hapus" tidak dimunculkan (atau divalidasi dengan error message) jika status transaksi terkait iuran. Parameter validasi dikendalikan oleh backend (`transaction->dues_payment_id`).
- Komponen menggunakan validasi form standar.
- Konfirmasi pembatalan menggunakan alasan (`reason`) sudah diimplementasikan (memanggil *request void*).

### Risiko & Kelemahan:
1. **Disabled Submit Button**: Sangat krusial dalam form finansial bahwa tombol `Simpan` harus *disabled* `processing={true}` saat formulir dikirim, untuk meminimalkan human-error klik dua kali. (Perlu dicek di seluruh komponen form finance).
2. **Double Logic**: Perhitungan total, sisa bayar, dan status (seperti 'MENUNGGAK', 'LUNAS') sebaiknya *pure* dikirim dari API/Backend. Frontend tidak boleh menghitung ulang (re-calculate) nominal penting untuk menghindari perbedaan visual jika logic di-update sepihak. Saat ini logic diproses di `DuesLedgerService`, yang mana ini sudah sesuai *best practice*.
3. **Format Mata Uang (Currency Formatting)**: Pastikan fungsi `Intl.NumberFormat` atau library serupa diaplikasikan seragam pada semua field nominal. Tidak boleh ada input float jika backend meminta integer, dan sebaiknya ada komponen `NumberInput` khusus finance (seperti *auto-thousands separator*).

## 2. Rencana Perbaikan (Frontend)
- Lakukan penyisiran (sweeping) ke seluruh Form komponen finance (`Transactions/Index.jsx` & `Dues/Index.jsx`).
- Pastikan atribut `disabled={form.processing}` disematkan pada setiap tombol mutasi.
- Jika ada angka agregat di UI, pastikan merender dari `props` backend (`summary.total_arrears` dsb), bukan menghitung `transactions.reduce()` di JavaScript.
