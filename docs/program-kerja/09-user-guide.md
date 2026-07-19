# User Guide - Modul Program Kerja

Tanggal update: 2026-07-16

## Membuka Modul

1. Login ke aplikasi.
2. Buka menu `Program Kerja`.
3. Pilih `Daftar Program` untuk melihat dashboard dan daftar program.
4. Pilih `Laporan` untuk membuka report dan export.

Menu dan tombol hanya muncul sesuai permission user.

## Membuat Program

1. Buka `Program Kerja > Daftar Program`.
2. Klik `Tambah Program`.
3. Isi minimal:
   - nama program;
   - periode;
   - tahun;
   - bidang;
   - sifat program;
   - sumber program;
   - prioritas.
4. Lengkapi data pendukung seperti tanggal, PIC, tujuan, indikator, anggaran, dan lokasi.
5. Simpan form.

Program baru tersimpan sebagai `Draft`.

## Menyimpan Draft

Selama status masih `Draft`, data program dapat diedit melalui tombol aksi pada daftar atau halaman detail.

Draft dapat dihapus jika user memiliki permission delete.

## Membuat Task

1. Buka detail program.
2. Masuk ke tab Gantt atau Aktivitas.
3. Tambahkan task dengan nama, tanggal rencana, PIC, assignee, bobot, dan status.
4. Simpan.

Task dapat memiliki PIC dan beberapa assignee.

## Membuat Milestone

1. Saat membuat atau mengedit task, aktifkan opsi milestone.
2. Isi tanggal mulai dan selesai dengan tanggal yang sama.
3. Simpan.

Milestone dipakai sebagai penanda titik penting pada Gantt.

## Membuat Dependency

1. Buka detail program.
2. Masuk ke area Gantt/dependency.
3. Pilih predecessor task.
4. Pilih successor task.
5. Pilih tipe dependency:
   - finish to start;
   - start to start;
   - finish to finish;
   - start to finish.
6. Isi lag days bila diperlukan.
7. Simpan.

Dependency ditolak jika membuat circular dependency atau menghubungkan task di luar program yang sama.

## Mengajukan Program

1. Pastikan program lengkap:
   - nama;
   - periode;
   - tahun;
   - bidang;
   - tanggal mulai dan selesai;
   - PIC utama;
   - tujuan atau indikator keberhasilan.
2. Buka detail program.
3. Klik aksi `Ajukan`.

Status berubah dari `Draft` atau `Revision Requested` menjadi `Submitted`.

## Melakukan Review

1. Reviewer membuka program dengan status `Submitted`.
2. Klik `Start Review`.
3. Tambahkan catatan bila perlu.

Status berubah menjadi `Under Review`.

Reviewer tidak boleh menjadi submitter program yang sama.

## Meminta Revisi

1. Buka program dengan status `Under Review`.
2. Klik `Request Revision`.
3. Isi alasan revisi.
4. Simpan.

Status berubah menjadi `Revision Requested`.

Pembuat/PIC dapat memperbaiki data lalu mengajukan ulang.

## Approve

1. Buka program dengan status `Under Review`.
2. Klik `Approve`.
3. Isi catatan bila perlu.
4. Simpan.

Status berubah menjadi `Approved`.

Creator atau submitter tidak dapat approve programnya sendiri.

## Reject

1. Buka program dengan status `Under Review`.
2. Klik `Reject`.
3. Isi alasan penolakan.
4. Simpan.

Status berubah menjadi `Rejected`.

## Update Progres

1. Buka detail program.
2. Jika program sudah approved, klik `Jadwalkan`.
3. Setelah status `Terjadwal`, klik `Mulai Pelaksanaan`.
4. Buka Gantt atau Monitoring.
5. Pilih task.
6. Update progress 0 sampai 100.
7. Pilih status task bila diperlukan.
8. Isi catatan update.
9. Simpan.

Update progress menyimpan riwayat pada progress history.

Catatan: backend membatasi update progress pada program berstatus `scheduled` atau `in_progress`.

## Menahan dan Melanjutkan Program

1. Saat program berstatus `Berjalan`, klik `Tahan`.
2. Isi alasan penahanan.
3. Simpan.
4. Untuk melanjutkan, klik `Lanjutkan`.

Status berpindah dari `Berjalan` ke `Ditahan`, lalu kembali ke `Berjalan`.

## Menyelesaikan Program

1. Pastikan semua task aktif sudah berstatus `Selesai`.
2. Pastikan progress program mencapai 100%.
3. Klik `Selesaikan`.
4. Isi catatan bila perlu.
5. Simpan.

Status berubah menjadi `Completed`.

## Mencatat Risiko

1. Buka detail program.
2. Buka tab Risiko atau Monitoring.
3. Tambahkan risiko/issue.
4. Isi:
   - judul;
   - tipe;
   - likelihood;
   - impact;
   - status;
   - mitigasi;
   - PIC risiko;
   - due date.
5. Simpan.

Level risiko dihitung otomatis dari likelihood dan impact.

## Upload Dokumen

1. Buka detail program.
2. Masuk ke tab Dokumen.
3. Klik upload dokumen.
4. Isi judul dan kategori dokumen.
5. Pilih file.
6. Simpan.

Format yang didukung:

```text
pdf, jpg, jpeg, png, webp, doc, docx, xls, xlsx
```

Maksimal ukuran file:

```text
10 MB
```

File tersimpan di storage privat dan hanya dapat diakses lewat authorization aplikasi.

## Evaluasi

1. Pastikan program berstatus `Completed`.
2. Buka detail program.
3. Masuk ke tab Evaluasi.
4. Isi:
   - ringkasan hasil;
   - pencapaian tujuan;
   - hasil indikator;
   - target vs realisasi;
   - evaluasi waktu;
   - hasil anggaran;
   - lessons learned;
   - rekomendasi;
   - tindak lanjut;
   - tanggal evaluasi.
5. Aktifkan mark evaluated jika evaluasi final.
6. Simpan.

Jika final, status berubah menjadi `Evaluated`.

## Arsip Program

1. Pastikan evaluasi sudah final dan status program `Evaluated`.
2. Klik `Arsipkan`.
3. Isi catatan bila perlu.
4. Simpan.

Status berubah menjadi `Archived`.

## Melihat Gantt

1. Buka detail program.
2. Masuk ke tab `Gantt`.
3. Lihat task tree, timeline, progress, milestone, dan dependency.
4. Gunakan detail task untuk membaca atau mengubah jadwal sesuai permission.

Gantt mengambil dataset terbaru dari backend.

## Filter

### Filter Daftar Program

Di halaman `Daftar Program`, filter yang tersedia:

- search;
- status;
- prioritas;
- bidang;
- periode;
- PIC;
- rentang tanggal.

Klik `Terapkan` untuk menjalankan filter. Klik `Reset` untuk menghapus filter.

### Filter Laporan

Di halaman `Laporan`, filter yang tersedia:

- search;
- tahun;
- periode;
- bidang;
- status;
- prioritas;
- PIC;
- progress min/max;
- terlambat;
- anggaran min/max.

Summary dan tabel laporan mengikuti filter aktif.

## Export

### Export Laporan

1. Buka `Program Kerja > Laporan`.
2. Atur filter.
3. Pilih format:
   - Print;
   - PDF;
   - CSV;
   - Excel.

Export selalu mengikuti filter aktif dan scope akses user.

### Export Per Program

1. Buka detail program.
2. Klik tombol export pada header detail.
3. Pilih Print, PDF, CSV, atau Excel.

Export per program memakai filter `program_id` dan tetap divalidasi oleh scope akses backend.

## Notifikasi

Notifikasi Program Kerja muncul pada dashboard Program Kerja.

Jenis notifikasi:

- program diajukan;
- program masuk review;
- revisi diminta;
- program approved;
- program rejected;
- task assigned;
- deadline mendekat;
- task overdue;
- progress belum diperbarui;
- evaluasi diperlukan.

Notifikasi tidak dibuat duplikat untuk event dan penerima yang sama.

## Troubleshooting

| Kondisi | Solusi |
| --- | --- |
| Tombol tidak muncul | Cek permission user |
| Tidak bisa melihat program bidang lain | Scope user dibatasi bidang/assignment |
| Tidak bisa approve | Pastikan bukan creator/submitter |
| Upload ditolak | Cek format dan ukuran file |
| Update task ditolak | Muat ulang data jika lock version berubah |
| Export kosong | Cek filter aktif dan scope akses |
