# CODEX MASTER PLAYBOOK
## Modul Program Kerja Bidang dan Gantt Chart Aplikasi IDI

Dokumen ini adalah **single source of truth** untuk implementasi modul Program Kerja Bidang dan Gantt Chart pada aplikasi IDI.

Gunakan dokumen ini sebagai instruksi utama Codex.

---

# CARA MENGGUNAKAN

Simpan file ini di project, misalnya:

```text
docs/program-kerja/CODEX-PLAYBOOK.md
```

Kemudian jalankan Codex secara bertahap dengan perintah sederhana:

```text
Baca docs/program-kerja/CODEX-PLAYBOOK.md lalu Jalankan Step 1.
```

Setelah selesai:

```text
Baca docs/program-kerja/CODEX-PLAYBOOK.md lalu Jalankan Step 2.
```

Lanjutkan sampai step terakhir.

Codex wajib:

1. hanya mengerjakan step yang diminta;
2. membaca hasil step sebelumnya;
3. memverifikasi hasil sebelum menyatakan selesai;
4. berhenti setelah step tersebut selesai;
5. tidak melompat ke step berikutnya;
6. tidak menganggap pekerjaan selesai hanya karena UI dapat dibuka;
7. menggunakan kondisi source code project sebagai fakta utama;
8. menulis asumsi secara eksplisit jika sesuatu belum tersedia;
9. tidak mengubah arsitektur project tanpa alasan yang terdokumentasi;
10. membuat laporan pada akhir setiap step.

---

# KONTEKS BISNIS

Modul ini digunakan untuk memasukkan, mengajukan, menyetujui, menjalankan, memonitor, mengevaluasi, dan melaporkan program kerja masing-masing bidang pada organisasi IDI.

Alur utama:

```text
Bidang membuat draft
→ bidang melengkapi program, aktivitas, jadwal, PIC, dan anggaran
→ bidang mengajukan program
→ pengurus melakukan review
→ pengurus meminta revisi, menyetujui, atau menolak
→ program yang disetujui dijalankan
→ progres dimonitor
→ kegiatan diselesaikan
→ evaluasi dan laporan dilakukan
→ program diarsipkan
```

Semua pengguna terkait dapat terlibat sesuai:

- role;
- permission;
- jabatan;
- bidang;
- assignment;
- scope organisasi;
- tanggung jawab pada program atau task.

Jangan memberikan akses yang sama kepada semua pengguna.

---

# TUJUAN MODUL

Modul harus mendukung:

- penyusunan program kerja;
- pengajuan program kerja;
- review dan persetujuan;
- revisi;
- penolakan;
- pengelolaan aktivitas dan milestone;
- Gantt Chart;
- dependency antaraktivitas;
- penanggung jawab;
- progres;
- keterlambatan;
- risiko dan kendala;
- anggaran;
- dokumen;
- evaluasi;
- audit trail;
- notifikasi;
- laporan;
- export;
- scope akses berdasarkan organisasi dan bidang.

---

# PRINSIP IMPLEMENTASI

Sebelum membuat kode, Codex wajib:

1. memeriksa struktur backend dan frontend;
2. membaca dokumentasi project;
3. mengidentifikasi framework dan versinya;
4. mengidentifikasi pola controller, service, repository, model, DTO, dan validation;
5. mengidentifikasi sistem authentication;
6. mengidentifikasi role dan permission;
7. mencari entitas organisasi, bidang, pengguna, jabatan, dan periode kepengurusan;
8. mencari pola workflow approval;
9. mencari pola audit trail;
10. mencari pola upload dokumen;
11. mencari pola notifikasi;
12. mencari pola export;
13. mencari design system;
14. mencari komponen tabel, form, modal, badge, chart, dan layout;
15. menggunakan pola yang sudah ada;
16. menghindari arsitektur paralel;
17. menghindari mock data pada final implementation;
18. memastikan frontend terhubung ke backend dan database;
19. menambahkan testing;
20. memastikan authorization selalu diperiksa di backend.

---

# DOMAIN PROGRAM KERJA

## Data Program

Program kerja minimal memiliki:

- ID atau UUID;
- kode program;
- nama program;
- periode kepengurusan;
- tahun;
- bidang pengusul;
- kategori;
- jenis;
- sifat program:
  - rutin;
  - insidental;
  - strategis;
  - kolaboratif;
- sumber program:
  - usulan bidang;
  - amanat organisasi;
  - hasil rapat kerja;
  - tindak lanjut evaluasi;
- deskripsi;
- latar belakang;
- tujuan;
- sasaran;
- indikator keberhasilan;
- target hasil;
- prioritas:
  - rendah;
  - sedang;
  - tinggi;
  - kritis;
- lokasi;
- tanggal mulai rencana;
- tanggal selesai rencana;
- tanggal mulai aktual;
- tanggal selesai aktual;
- estimasi anggaran;
- realisasi anggaran;
- sumber anggaran;
- penanggung jawab utama;
- anggota tim;
- bidang kolaborator;
- catatan internal;
- created_by;
- updated_by;
- timestamps.

## Status Program

Gunakan status enum atau konstanta terkontrol:

```text
draft
submitted
under_review
revision_requested
approved
rejected
scheduled
in_progress
on_hold
completed
cancelled
evaluated
archived
```

Contoh transisi:

```text
draft → submitted
submitted → under_review
under_review → approved
under_review → revision_requested
under_review → rejected
revision_requested → submitted
approved → scheduled
scheduled → in_progress
in_progress → on_hold
on_hold → in_progress
in_progress → completed
completed → evaluated
evaluated → archived
```

Transisi ilegal harus ditolak oleh backend.

---

# DOMAIN TASK DAN GANTT CHART

Setiap program dapat memiliki banyak task.

Data task minimal:

- ID;
- program_id;
- parent_task_id;
- kode atau nomor urut;
- nama aktivitas;
- deskripsi;
- tanggal mulai rencana;
- tanggal selesai rencana;
- tanggal mulai aktual;
- tanggal selesai aktual;
- durasi;
- progres 0–100%;
- bobot;
- status;
- prioritas;
- milestone;
- penanggung jawab;
- anggota pelaksana;
- estimasi biaya;
- realisasi biaya;
- urutan;
- catatan;
- timestamps.

Jenis dependency minimal:

```text
finish_to_start
start_to_start
finish_to_finish
start_to_finish
```

Dependency dapat memiliki lag.

Validasi wajib:

- task tidak bergantung pada dirinya sendiri;
- circular dependency ditolak;
- tanggal selesai tidak sebelum tanggal mulai;
- progres antara 0–100;
- task selesai harus progres 100%;
- milestone mengikuti aturan durasi yang konsisten;
- dependency divalidasi di backend;
- parent-child hierarchy tidak boleh circular;
- perubahan jadwal tidak boleh merusak dependency tanpa peringatan.

---

# FITUR GANTT CHART

Gantt Chart harus mendukung:

- hierarchy program dan task;
- collapse dan expand;
- timeline;
- bar aktivitas;
- milestone;
- dependency line;
- indikator progres;
- indikator hari ini;
- indikator terlambat;
- tooltip;
- filter;
- zoom:
  - harian;
  - mingguan;
  - bulanan;
  - kuartalan;
- horizontal scroll;
- vertical scroll;
- sticky task column;
- detail task;
- detail program;
- responsive desktop dan tablet;
- fallback tampilan timeline/list untuk mobile.

Interaksi sesuai permission:

- tambah task;
- edit task;
- ubah tanggal;
- ubah durasi;
- ubah progres;
- pindah hierarchy;
- buat milestone;
- buat dependency;
- hapus dependency.

Perubahan drag, resize, atau bulk update harus:

- divalidasi backend;
- menampilkan konfirmasi;
- menangani konflik update;
- menampilkan error yang jelas;
- tercatat pada audit trail.

---

# PERMISSION YANG DISARANKAN

```text
work_program.view
work_program.view_own_field
work_program.create
work_program.update
work_program.delete
work_program.submit
work_program.withdraw
work_program.review
work_program.approve
work_program.reject
work_program.request_revision
work_program.manage_tasks
work_program.update_progress
work_program.manage_budget
work_program.upload_document
work_program.evaluate
work_program.archive
work_program.export
work_program.view_audit_log
```

Scope:

- pengguna bidang melihat data bidangnya sesuai permission;
- PIC task hanya memperbarui bagian yang menjadi tanggung jawabnya;
- reviewer melihat program sesuai scope review;
- superadmin dapat melihat seluruh data;
- authorization tidak boleh hanya mengandalkan frontend.

---

# STRUKTUR DOKUMENTASI

Semua dokumen hasil implementasi diletakkan di:

```text
docs/program-kerja/
```

Dokumen yang akan dibuat bertahap:

```text
00-current-state-audit.md
01-implementation-plan.md
02-domain-database-design.md
03-api-contract.md
04-permission-matrix.md
05-workflow-design.md
06-gantt-design.md
07-testing-report.md
08-implementation-result.md
09-user-guide.md
10-final-audit.md
```

---

# FORMAT LAPORAN WAJIB SETIAP STEP

Pada akhir setiap step, Codex wajib melaporkan:

## Step

Nama step yang dikerjakan.

## Tujuan

Tujuan step.

## Temuan

Temuan dari source code atau dokumentasi.

## Implementasi

Perubahan yang dilakukan.

## File Dibuat

Daftar file baru.

## File Diubah

Daftar file yang diubah.

## Database

Migration, tabel, constraint, dan index yang dibuat.

## Endpoint

Endpoint yang dibuat atau diubah.

## Testing

Perintah test dan hasilnya.

## Verifikasi

Acceptance criteria yang diperiksa.

## Kendala

Masalah atau ketidakpastian.

## Status

Gunakan salah satu:

```text
PASS
PARTIAL
FAIL
BLOCKED
```

Jangan memberi status PASS tanpa bukti verifikasi.

---

# STEP 1 — AUDIT PROJECT

## Tujuan

Memahami kondisi nyata project sebelum implementasi.

## Instruksi

Audit:

- struktur backend;
- struktur frontend;
- framework dan versi;
- routing;
- database;
- migration;
- authentication;
- role dan permission;
- organisasi;
- bidang;
- jabatan;
- periode kepengurusan;
- user;
- approval workflow;
- audit trail;
- upload dokumen;
- notifikasi;
- export;
- testing;
- design system;
- library chart;
- library Gantt jika ada.

Cari minimal satu modul existing yang paling representatif sebagai referensi.

Evaluasi kandidat library Gantt open-source berdasarkan:

- lisensi;
- kompatibilitas stack;
- maintenance;
- hierarchy;
- dependency;
- milestone;
- progress;
- drag-and-drop;
- bundle size;
- responsive behavior.

Jangan memasang dependency.

Jangan membuat source code fitur.

## Output

Buat:

```text
docs/program-kerja/00-current-state-audit.md
docs/program-kerja/01-implementation-plan.md
```

## Acceptance Criteria

- struktur project teridentifikasi;
- modul referensi disebutkan;
- model dan tabel terkait ditemukan atau dinyatakan belum ada;
- permission dan scope dianalisis;
- risiko integrasi dicatat;
- kandidat library Gantt dianalisis;
- implementation plan dibagi ke step kecil;
- tidak ada source code fitur yang berubah;
- tidak ada dependency baru.

Berhenti setelah Step 1.

---

# STEP 2 — VERIFIKASI AUDIT DAN DESAIN DOMAIN

## Tujuan

Memastikan audit benar dan menyusun desain domain final.

## Instruksi

Baca:

```text
docs/program-kerja/00-current-state-audit.md
docs/program-kerja/01-implementation-plan.md
```

Bandingkan dengan source code.

Periksa:

- apakah audit sesuai project;
- apakah modul referensi benar;
- apakah struktur organisasi dan bidang benar;
- apakah pola authorization benar;
- apakah rencana file realistis;
- apakah kandidat library Gantt kompatibel;
- apakah ada asumsi yang tidak didukung bukti.

Kemudian susun desain domain dan database.

Tentukan:

- tabel;
- relasi;
- enum;
- constraint;
- index;
- soft delete;
- optimistic locking jika dibutuhkan;
- audit fields;
- organization scope;
- field scope;
- status transition;
- approval history;
- versioning;
- dependency graph;
- hierarchy task.

## Output

Buat atau perbarui:

```text
docs/program-kerja/02-domain-database-design.md
docs/program-kerja/04-permission-matrix.md
docs/program-kerja/05-workflow-design.md
```

Jika audit salah, perbaiki:

```text
00-current-state-audit.md
01-implementation-plan.md
```

Jangan membuat migration pada step ini.

## Acceptance Criteria

- setiap tabel memiliki tujuan;
- setiap relasi dijelaskan;
- status transition jelas;
- circular dependency prevention dirancang;
- permission matrix jelas;
- self-approval ditentukan;
- scope bidang dan organisasi jelas;
- desain mengikuti convention project;
- tidak ada source code fitur yang berubah.

Berhenti setelah Step 2.

---

# STEP 3 — DATABASE, MODEL, DAN PERMISSION

## Tujuan

Mengimplementasikan fondasi database dan domain.

## Instruksi

Implementasikan sesuai desain yang telah disetujui:

- migration;
- model atau entity;
- enum atau constant;
- constraint;
- index;
- foreign key;
- repository interface jika pola project menggunakannya;
- permission;
- role mapping bila diperlukan;
- seed permission bila convention project mendukung.

Tabel dapat mencakup, sesuai hasil desain:

```text
work_programs
work_program_tasks
work_program_task_dependencies
work_program_assignees
work_program_approvals
work_program_status_histories
work_program_progress_updates
work_program_documents
work_program_risks
work_program_evaluations
work_program_activity_logs
```

Jangan membuat tabel duplikat jika project sudah memiliki entitas generik.

Tambahkan validasi domain dasar:

- progres 0–100;
- tanggal valid;
- status valid;
- self reference ditolak;
- hierarchy cycle ditolak;
- dependency cycle ditolak.

## Testing

Minimal:

- migration up;
- migration down jika project mendukung;
- model mapping;
- constraint;
- unique rule;
- foreign key;
- permission seed;
- status enum;
- dependency validation.

## Acceptance Criteria

- migration berhasil;
- rollback berhasil bila didukung;
- constraint aktif;
- index tersedia;
- permission tersedia;
- model mengikuti convention;
- test fondasi lulus.

Berhenti setelah Step 3.

---

# STEP 4 — BACKEND CRUD PROGRAM KERJA

## Tujuan

Membuat backend CRUD program kerja yang aman dan sesuai scope.

## Instruksi

Implementasikan:

- list program;
- detail program;
- create draft;
- update draft;
- delete draft;
- filter;
- sorting;
- pagination;
- field scope;
- organization scope;
- validation;
- authorization;
- serializer atau response resource;
- consistent error handling.

Filter minimal:

- tahun;
- periode;
- bidang;
- status;
- prioritas;
- PIC;
- kategori;
- tanggal;
- pencarian.

Aturan:

- hanya draft atau revision_requested yang dapat diedit sesuai permission;
- program submitted atau approved tidak boleh diubah sembarangan;
- delete hanya untuk draft jika aturan bisnis mengizinkan;
- perubahan penting tercatat.

## Output

Buat atau perbarui:

```text
docs/program-kerja/03-api-contract.md
```

## Testing

Minimal:

- create draft;
- update;
- validation;
- scope bidang;
- unauthorized access;
- detail;
- filter;
- pagination;
- delete draft;
- akses lintas bidang ditolak.

## Acceptance Criteria

- CRUD terhubung database;
- tidak ada mock data;
- authorization backend aktif;
- filter bekerja;
- response konsisten;
- test lulus.

Berhenti setelah Step 4.

---

# STEP 5 — WORKFLOW PENGAJUAN DAN PERSETUJUAN

## Tujuan

Mengimplementasikan workflow dari draft sampai approved atau rejected.

## Instruksi

Implementasikan:

- submit;
- withdraw jika diizinkan;
- under review;
- request revision;
- resubmit;
- approve;
- reject;
- status history;
- approval history;
- reviewer notes;
- mandatory reason untuk revisi dan penolakan;
- prevention duplicate approval;
- prevention illegal transition;
- self-approval rule;
- notification jika sistem tersedia;
- audit trail.

Jika project mendukung approval multi-level, buat fondasi yang extensible tanpa menambah kompleksitas tidak perlu.

## Testing

Minimal:

- draft → submitted;
- submitted → under_review;
- review → revision_requested;
- revision_requested → submitted;
- review → approved;
- review → rejected;
- illegal transition ditolak;
- duplicate approval ditolak;
- unauthorized reviewer ditolak;
- self-approval sesuai aturan;
- history tersimpan.

## Acceptance Criteria

- seluruh transisi utama bekerja;
- keputusan reviewer tercatat;
- alasan revisi dan penolakan wajib;
- authorization aktif;
- audit log tersedia;
- test lulus.

Berhenti setelah Step 5.

---

# STEP 6 — BACKEND TASK, MILESTONE, DAN DEPENDENCY

## Tujuan

Membuat backend untuk aktivitas Gantt Chart.

## Instruksi

Implementasikan:

- list task per program;
- create task;
- update task;
- delete task;
- parent-child hierarchy;
- reorder;
- milestone;
- assignee;
- progress;
- weight;
- actual date;
- dependency;
- lag;
- bulk schedule update;
- Gantt dataset endpoint.

Validasi:

- self dependency ditolak;
- circular dependency ditolak;
- circular parent hierarchy ditolak;
- tanggal valid;
- progres valid;
- completed berarti progres 100%;
- milestone mengikuti aturan;
- program scope diperiksa;
- concurrency ditangani sesuai kemampuan stack.

## Testing

Minimal:

- create task;
- nested task;
- milestone;
- update schedule;
- update progress;
- dependency semua tipe;
- self dependency ditolak;
- circular dependency ditolak;
- hierarchy cycle ditolak;
- unauthorized access ditolak;
- Gantt dataset benar.

## Acceptance Criteria

- task tersimpan ke database;
- dependency aman;
- hierarchy aman;
- endpoint Gantt tersedia;
- test lulus.

Berhenti setelah Step 6.

---

# STEP 7 — FRONTEND DAFTAR, FORM, DAN DETAIL PROGRAM

## Tujuan

Membangun frontend utama program kerja.

## Instruksi

Gunakan design system project.

Bangun:

## Dashboard Program Kerja

Tampilkan:

- total program;
- draft;
- menunggu persetujuan;
- revisi;
- approved;
- in progress;
- completed;
- overdue;
- approval queue;
- upcoming deadline;
- progress summary.

## Daftar Program

Kolom:

- kode;
- nama;
- bidang;
- periode;
- tanggal;
- PIC;
- progres;
- status;
- prioritas;
- anggaran;
- aksi.

Fitur:

- search;
- filter;
- sorting;
- pagination;
- loading;
- empty state;
- error state.

## Form Program

Section:

1. informasi dasar;
2. tujuan dan indikator;
3. jadwal;
4. tim;
5. anggaran;
6. task;
7. dokumen;
8. review.

## Detail Program

Tab:

- Ringkasan
- Gantt
- Aktivitas
- Tim
- Anggaran
- Progres
- Risiko
- Dokumen
- Evaluasi
- Riwayat

Action harus mengikuti permission.

Jangan membuat tombol yang backend-nya belum tersedia.

## Testing

- render list;
- filter;
- form validation;
- create;
- edit;
- permission-based action;
- loading;
- error;
- empty state.

## Acceptance Criteria

- frontend menggunakan API aktual;
- tidak ada mock data;
- form menyimpan ke backend;
- permission tercermin di UI;
- responsive;
- tidak ada console error relevan;
- build berhasil.

Berhenti setelah Step 7.

---

# STEP 8 — FRONTEND APPROVAL DAN WORKFLOW

## Tujuan

Menyediakan UI pengajuan dan persetujuan.

## Instruksi

Bangun:

- submit dialog;
- withdraw action jika tersedia;
- approval queue;
- review detail;
- revision request dialog;
- approve dialog;
- reject dialog;
- reviewer notes;
- status history;
- version comparison jika fondasi tersedia;
- notification state bila tersedia.

UX:

- revisi wajib alasan;
- reject wajib alasan;
- approve menampilkan ringkasan;
- aksi destruktif membutuhkan konfirmasi;
- error backend ditampilkan jelas;
- status badge konsisten.

## Testing

- submit;
- request revision;
- resubmit;
- approve;
- reject;
- permission;
- error state;
- duplicate click protection.

## Acceptance Criteria

- workflow dapat dijalankan dari UI;
- perubahan status tersimpan;
- reviewer notes terlihat;
- authorization backend tetap aktif;
- test dan build lulus.

Berhenti setelah Step 8.

---

# STEP 9 — GANTT CHART FRONTEND

## Tujuan

Membangun Gantt Chart interaktif yang menggunakan data aktual.

## Instruksi

Gunakan library yang telah dipilih pada audit.

Sebelum instalasi:

- konfirmasi lisensi;
- konfirmasi kompatibilitas;
- konfirmasi tidak komersial jika project tidak memiliki lisensi.

Implementasikan:

- task tree;
- timeline;
- progress bar;
- milestone;
- dependency line;
- today marker;
- overdue indicator;
- collapse-expand;
- zoom harian, mingguan, bulanan, kuartalan;
- filter;
- tooltip;
- detail drawer atau modal;
- responsive fallback;
- drag atau resize bila library mendukung;
- confirmation sebelum save;
- rollback UI jika backend menolak;
- optimistic update hanya bila aman.

Filter minimal:

- periode;
- tahun;
- bidang;
- status program;
- status task;
- prioritas;
- PIC;
- overdue.

## Performance

Perhatikan:

- data besar;
- unnecessary rerender;
- memoization;
- virtualization bila tersedia;
- debounced filter;
- lazy loading jika diperlukan.

## Testing

- render;
- filter;
- collapse;
- milestone;
- dependency;
- update progress;
- update schedule;
- error rollback;
- permission;
- responsive fallback.

## Acceptance Criteria

- data berasal dari backend;
- dependency terlihat;
- progress terlihat;
- perubahan tersimpan;
- error ditangani;
- tidak ada console error relevan;
- build berhasil.

Berhenti setelah Step 9.

---

# STEP 10 — MONITORING PROGRES, RISIKO, DAN KENDALA

## Tujuan

Menambahkan monitoring operasional.

## Instruksi

Implementasikan:

- progress update history;
- weighted progress;
- overdue detection;
- blocked task;
- schedule deviation;
- risk register;
- mitigation;
- PIC mitigation;
- follow-up;
- evidence attachment;
- latest update;
- task approaching deadline;
- task overdue.

Rumus progres:

- gunakan weighted progress jika bobot tersedia;
- jika tidak, gunakan average;
- cegah double counting parent dan child;
- dokumentasikan rumus.

Risiko minimal:

- judul;
- deskripsi;
- kategori;
- kemungkinan;
- dampak;
- level;
- mitigasi;
- PIC;
- deadline;
- status.

Level:

```text
low
medium
high
extreme
```

## Testing

- weighted progress;
- average progress;
- no double counting;
- overdue;
- blocked;
- risk level;
- progress history;
- scope access.

## Acceptance Criteria

- progress program akurat;
- histori update tersimpan;
- risiko dan mitigasi dapat dikelola;
- overdue terdeteksi;
- test lulus.

Berhenti setelah Step 10.

---

# STEP 11 — DOKUMEN, ANGGARAN, DAN EVALUASI

## Tujuan

Melengkapi administrasi program.

## Instruksi

Implementasikan dokumen:

- proposal;
- TOR atau KAK;
- RAB;
- surat tugas;
- undangan;
- notulen;
- daftar hadir;
- foto;
- laporan;
- bukti transaksi;
- evaluasi;
- lainnya.

Validasi:

- ekstensi;
- MIME;
- ukuran;
- authorization;
- safe filename;
- secure download;
- visibility.

Anggaran:

- estimasi;
- realisasi;
- sumber;
- perubahan;
- audit trail.

Evaluasi:

- capaian tujuan;
- capaian indikator;
- target vs realisasi;
- evaluasi waktu;
- evaluasi anggaran;
- kendala;
- faktor pendukung;
- faktor penghambat;
- rekomendasi;
- tindak lanjut;
- lesson learned;
- evaluator;
- tanggal;
- laporan.

Status evaluated hanya dapat digunakan jika data minimum terpenuhi.

## Testing

- upload;
- download authorization;
- invalid MIME;
- size limit;
- budget update;
- evaluation validation;
- evaluated transition.

## Acceptance Criteria

- dokumen aman;
- anggaran tercatat;
- evaluasi lengkap;
- audit trail aktif;
- test lulus.

Berhenti setelah Step 11.

---

# STEP 12 — NOTIFIKASI, LAPORAN, DAN EXPORT

## Tujuan

Menambahkan notifikasi dan pelaporan.

## Instruksi

Notifikasi untuk:

- program diajukan;
- program masuk review;
- revisi diminta;
- approved;
- rejected;
- task assigned;
- deadline mendekat;
- task overdue;
- progress belum diperbarui;
- program completed;
- evaluasi diperlukan.

Cegah duplicate notification.

Laporan filter:

- periode;
- tahun;
- bidang;
- status;
- progres;
- prioritas;
- PIC;
- keterlambatan;
- anggaran.

Export sesuai kemampuan project:

- CSV;
- Excel;
- PDF;
- printable view;
- print Gantt bila memungkinkan.

Export wajib mengikuti:

- filter aktif;
- permission;
- scope organisasi;
- scope bidang.

## Testing

- notification recipient;
- no duplicate;
- export filter;
- export scope;
- unauthorized export;
- file output valid.

## Acceptance Criteria

- notifikasi relevan;
- laporan akurat;
- export mengikuti filter;
- authorization aktif;
- test lulus.

Berhenti setelah Step 12.

---

# STEP 13 — SECURITY, PERFORMANCE, DAN HARDENING

## Tujuan

Melakukan audit teknis sebelum finalisasi.

## Instruksi

Periksa:

- IDOR;
- broken authorization;
- mass assignment;
- SQL injection;
- XSS;
- unsafe file upload;
- insecure file download;
- duplicate request;
- race condition;
- invalid status transition;
- self-approval;
- cross-field access;
- pagination;
- large Gantt dataset;
- N+1 query;
- index;
- caching bila relevan;
- error leakage;
- audit completeness.

Perbaiki masalah yang ditemukan.

Jangan menonaktifkan test untuk membuat build lulus.

## Testing

Jalankan:

- unit test;
- integration test;
- frontend test;
- permission test;
- security-relevant test;
- migration test;
- build;
- lint atau static analysis bila tersedia.

## Output

Perbarui:

```text
docs/program-kerja/07-testing-report.md
```

## Acceptance Criteria

- tidak ada issue kritis terbuka;
- test utama lulus;
- build lulus;
- permission diuji;
- query utama diperiksa;
- file upload aman;
- audit trail lengkap.

Berhenti setelah Step 13.

---

# STEP 14 — DOKUMENTASI DAN USER GUIDE

## Tujuan

Membuat dokumentasi teknis dan panduan pengguna.

## Instruksi

Lengkapi:

```text
docs/program-kerja/03-api-contract.md
docs/program-kerja/04-permission-matrix.md
docs/program-kerja/05-workflow-design.md
docs/program-kerja/06-gantt-design.md
docs/program-kerja/07-testing-report.md
docs/program-kerja/08-implementation-result.md
docs/program-kerja/09-user-guide.md
```

User guide minimal menjelaskan:

- membuat program;
- menyimpan draft;
- membuat task;
- membuat milestone;
- membuat dependency;
- mengajukan program;
- melakukan review;
- meminta revisi;
- approve;
- reject;
- update progres;
- mencatat risiko;
- upload dokumen;
- evaluasi;
- melihat Gantt;
- filter;
- export.

Implementation result harus memuat:

- fitur selesai;
- fitur belum selesai;
- file dibuat;
- file diubah;
- migration;
- endpoint;
- permission;
- dependency baru;
- test;
- hasil test;
- risiko;
- rekomendasi.

## Acceptance Criteria

- dokumentasi konsisten dengan kode;
- tidak ada endpoint fiktif;
- user guide dapat dipahami pengguna nonteknis;
- testing report berisi perintah dan hasil nyata.

Berhenti setelah Step 14.

---

# STEP 15 — FINAL AUDIT

## Tujuan

Memastikan seluruh master specification telah dipenuhi.

## Instruksi

Audit seluruh implementasi terhadap dokumen ini.

Periksa satu per satu:

- database;
- model;
- CRUD;
- workflow;
- approval;
- task;
- hierarchy;
- milestone;
- dependency;
- Gantt;
- dashboard;
- monitoring;
- progress;
- risk;
- document;
- budget;
- evaluation;
- notification;
- report;
- export;
- permission;
- audit trail;
- testing;
- build;
- documentation.

Gunakan status:

```text
PASS
PARTIAL
FAIL
NOT_APPLICABLE
```

Untuk PARTIAL atau FAIL tuliskan:

- masalah;
- bukti file;
- dampak;
- tindakan koreksi;
- prioritas.

Perbaiki masalah yang aman diperbaiki tanpa merusak fitur lain.

Setelah perbaikan:

- jalankan kembali test;
- jalankan build;
- periksa migration;
- periksa console error;
- periksa API error;
- periksa permission.

## Output

Buat:

```text
docs/program-kerja/10-final-audit.md
```

## Acceptance Criteria

Modul hanya dinyatakan selesai jika:

- program dapat dibuat;
- program dapat diajukan;
- revisi dapat diminta;
- program dapat disetujui atau ditolak;
- status history tercatat;
- task bertingkat bekerja;
- milestone bekerja;
- dependency tervalidasi;
- Gantt menggunakan data aktual;
- progres dapat diperbarui;
- overdue terdeteksi;
- dashboard menggunakan data aktual;
- risiko dapat dikelola;
- dokumen aman;
- evaluasi bekerja;
- laporan dan export bekerja;
- permission backend aktif;
- audit trail tersedia;
- test utama lulus;
- migration berhasil;
- build berhasil;
- tidak ada mock data pada production flow;
- tidak ada error kritis;
- dokumentasi selesai.

Berhenti setelah Step 15.

---

# STEP 16 — PERBAIKAN HASIL FINAL AUDIT

## Tujuan

Menyelesaikan seluruh temuan PARTIAL dan FAIL dari final audit.

## Instruksi

Baca:

```text
docs/program-kerja/10-final-audit.md
```

Kerjakan hanya temuan:

- FAIL;
- PARTIAL;
- issue kritis;
- issue tinggi;
- issue sedang yang menghambat fungsi inti.

Untuk setiap temuan:

1. verifikasi masalah pada source code;
2. perbaiki root cause;
3. tambahkan atau perbarui test;
4. jalankan test terkait;
5. jalankan regression test;
6. perbarui dokumentasi;
7. perbarui status audit.

Jangan mengubah item PASS tanpa alasan.

## Output

Perbarui:

```text
docs/program-kerja/07-testing-report.md
docs/program-kerja/08-implementation-result.md
docs/program-kerja/10-final-audit.md
```

## Acceptance Criteria

- tidak ada FAIL kritis;
- tidak ada FAIL tinggi;
- fungsi inti PASS;
- test lulus;
- build lulus;
- dokumentasi sesuai kode.

Berhenti setelah Step 16.

---

# PERINTAH VERIFIKASI ULANG PER STEP

Jika ingin memeriksa step tertentu, gunakan:

```text
Baca docs/program-kerja/CODEX-PLAYBOOK.md.
Audit ulang hasil Step X.
Jangan menambah fitur baru.
Verifikasi source code, database, test, dan dokumentasi.
Perbaiki hanya kekurangan pada Step X.
Berhenti setelah verifikasi selesai.
```

---

# PERINTAH HARIAN YANG DISARANKAN

Contoh penggunaan:

```text
Baca docs/program-kerja/CODEX-PLAYBOOK.md lalu Jalankan Step 1.
```

```text
Baca docs/program-kerja/CODEX-PLAYBOOK.md lalu Jalankan Step 2.
```

```text
Baca docs/program-kerja/CODEX-PLAYBOOK.md lalu Jalankan Step 3.
```

Dan seterusnya sampai Step 16.

---

# LARANGAN GLOBAL

Codex dilarang:

- mengerjakan lebih dari satu step tanpa instruksi;
- melompat step;
- menggunakan mock data pada final flow;
- hanya membuat UI;
- hanya membuat backend;
- hardcode user, bidang, role, status, atau periode;
- melewati authorization backend;
- menghapus approval history;
- menghapus audit trail;
- memasang library komersial tanpa izin;
- membuat tabel duplikat;
- membuat endpoint duplikat;
- menyimpan dependency hanya di frontend;
- menyimpan progres hanya di local state;
- menyatakan selesai tanpa test;
- menyatakan PASS tanpa bukti;
- menonaktifkan test;
- mengabaikan migration error;
- mengabaikan build error;
- meninggalkan TODO pada fungsi kritis;
- mengubah arsitektur project secara besar tanpa dokumentasi;
- menebak kondisi project tanpa memeriksa source code.

---

# DEFINISI SELESAI

Implementasi dianggap selesai hanya setelah:

```text
Step 1 sampai Step 16 selesai
```

dan hasil final menunjukkan:

```text
tidak ada FAIL kritis
tidak ada FAIL tinggi
fungsi inti PASS
test utama lulus
build berhasil
migration berhasil
dokumentasi lengkap
```
