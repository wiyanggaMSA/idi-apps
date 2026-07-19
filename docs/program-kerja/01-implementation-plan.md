# Implementation Plan - Modul Program Kerja

Tanggal rencana: 2026-07-16

## Prinsip

Modul Program Kerja dibangun sebagai modul baru yang mengikuti pola Laravel + Inertia React yang sudah ada. Implementasi dilakukan bertahap sesuai playbook, tanpa membuat arsitektur paralel.

Prinsip teknis:

- Backend menjadi sumber kebenaran untuk authorization, scope, status transition, dependency, dan audit.
- Frontend hanya menyembunyikan aksi berdasarkan permission, bukan menentukan akses final.
- Setiap perubahan status penting dicatat ke activity log.
- Setiap operasi workflow memakai transaksi database.
- Task hierarchy dan dependency divalidasi backend.
- Tidak memakai mock data pada final implementation.
- Tidak memasang dependency Gantt sebelum desain domain dan pilihan library disetujui pada step berikutnya.

## Modul dan Namespace yang Direncanakan

Backend:

- `app/Models/WorkProgram.php`
- `app/Models/WorkProgramTask.php`
- `app/Models/WorkProgramTaskDependency.php`
- `app/Models/WorkProgramApproval.php`
- `app/Models/WorkProgramDocument.php`
- `app/Models/WorkProgramRisk.php`
- `app/Models/WorkProgramEvaluation.php`
- `app/Http/Controllers/WorkPrograms/*`
- `app/Http/Requests/WorkPrograms/*`
- `app/Services/WorkPrograms/*`
- `app/Policies/WorkProgramPolicy.php`
- `app/Policies/WorkProgramTaskPolicy.php`

Frontend:

- `resources/js/Pages/WorkPrograms/Index.jsx`
- `resources/js/Pages/WorkPrograms/Create.jsx`
- `resources/js/Pages/WorkPrograms/Edit.jsx`
- `resources/js/Pages/WorkPrograms/Show.jsx`
- `resources/js/Pages/WorkPrograms/Gantt.jsx`
- `resources/js/Pages/WorkPrograms/Approval.jsx`
- `resources/js/Pages/WorkPrograms/Reports.jsx`
- `resources/js/Components/WorkPrograms/*`

Routes:

- Prefix URL: `/work-programs`
- Route name prefix: `work-programs.`
- Parent menu: `Program Kerja`

Dokumentasi:

- Semua dokumen modul berada di `docs/program-kerja/`.

## Rencana Step Kecil

### Step 2 - Verifikasi Audit dan Desain Domain

Output:

- `docs/program-kerja/02-domain-database-design.md`
- `docs/program-kerja/04-permission-matrix.md`
- `docs/program-kerja/05-workflow-design.md`

Pekerjaan:

- Verifikasi ulang audit terhadap source code.
- Finalisasi tabel dan relasi.
- Tentukan apakah periode kepengurusan menjadi tabel baru.
- Tentukan sumber scope bidang.
- Finalisasi permission matrix per role.
- Finalisasi status transition.
- Pilih kandidat Gantt utama secara desain tanpa install dependency.

### Step 3 - Database, Model, dan Permission

Output:

- Migration domain Program Kerja.
- Model dan relasi dasar.
- Policy dasar.
- Permission di seeder.
- Test database/permission.

Pekerjaan:

- Buat tabel utama Program Kerja.
- Buat tabel task, dependency, approval history, document relation, risk, evaluation bila masuk desain final.
- Tambahkan index dan constraint.
- Tambahkan permission `work_program.*`.
- Tambahkan factory dasar.
- Test migration, relasi, permission, dan scope awal.

### Step 4 - Backend CRUD Program Kerja

Output:

- Controller CRUD.
- Form request.
- Service query/filter.
- Route CRUD.
- Test CRUD dan authorization.

Pekerjaan:

- List program dengan filter status, tahun, bidang, prioritas, search.
- Create/update draft.
- Show detail.
- Delete/soft delete sesuai permission.
- Mapping data Inertia.

### Step 5 - Workflow Pengajuan dan Persetujuan

Output:

- `WorkProgramWorkflowService`.
- Endpoint submit/review/approve/reject/request revision/withdraw.
- Test status transition.

Pekerjaan:

- Terapkan status transition legal.
- Tolak transisi ilegal.
- Tolak self-approval bila policy memutuskan demikian.
- Catat approval history.
- Catat activity log.

### Step 6 - Backend Task, Milestone, dan Dependency

Output:

- CRUD task.
- CRUD dependency.
- Service validasi hierarchy/dependency.
- Endpoint data Gantt.
- Test circular dependency dan date validation.

Pekerjaan:

- Task parent-child.
- Milestone.
- Progress 0-100.
- Dependency types: `finish_to_start`, `start_to_start`, `finish_to_finish`, `start_to_finish`.
- Lag dependency.
- Validasi tanggal dan circular graph.

### Step 7 - Frontend Daftar, Form, dan Detail Program

Output:

- Parent menu `Program Kerja`.
- Page list, create, edit, show.
- Komponen form dan status badge.
- Test build frontend.

Pekerjaan:

- Tambahkan menu sesuai permission.
- Gunakan page layout dan komponen app yang sudah ada.
- Integrasikan Inertia form dengan backend.
- Tidak memakai mock data.

### Step 8 - Frontend Approval dan Workflow

Output:

- UI approval/revision/rejection.
- Timeline riwayat workflow.
- Guard aksi berdasarkan permission.

Pekerjaan:

- Tombol submit/review/approve/reject sesuai status.
- Modal alasan revisi/penolakan.
- Tampilkan error backend untuk transisi ilegal.

### Step 9 - Gantt Chart Frontend

Output:

- Page Gantt.
- Integrasi library Gantt terpilih atau custom fallback bila belum disetujui.
- Endpoint update jadwal/progress.
- Test build dan interaksi dasar.

Pekerjaan:

- Timeline harian/mingguan/bulanan/kuartalan.
- Hierarchy.
- Milestone.
- Dependency line.
- Progress.
- Today marker.
- Late indicator.
- Responsive desktop/tablet dan fallback mobile.

Catatan library:

- Kandidat utama tetap DHTMLX Gantt Community atau SVAR React Gantt sampai Step 2 memutuskan.

### Step 10 - Monitoring Progres, Risiko, dan Kendala

Output:

- Progress update.
- Risk/issue tracking.
- Dashboard ringkas modul.

Pekerjaan:

- Update progress task/program.
- Status terlambat.
- Risiko/kendala dengan owner dan severity.
- Summary cards/charts.

### Step 11 - Dokumen, Anggaran, dan Evaluasi

Output:

- Upload dokumen program/task.
- Budget planned/actual.
- Evaluasi program.

Pekerjaan:

- Relasi document.
- Validasi file.
- Budget dan realisasi.
- Evaluasi hasil, indikator, rekomendasi.

### Step 12 - Notifikasi, Laporan, dan Export

Output:

- Laporan list dan detail.
- Export XLSX/PDF.
- Desain atau implementasi notifikasi sesuai keputusan step sebelumnya.

Pekerjaan:

- Export berdasarkan permission.
- Report filter tahun/bidang/status.
- Pending approval list sebagai fallback bila notifikasi internal belum tersedia.

### Step 13 - Security, Performance, dan Hardening

Output:

- Audit authorization.
- Index/performance review.
- Test concurrency.

Pekerjaan:

- Pastikan semua write action memiliki policy.
- Cek N+1 query.
- Cek lock/concurrency workflow.
- Cek file access.

### Step 14 - Dokumentasi dan User Guide

Output:

- `docs/program-kerja/09-user-guide.md`
- Update dokumentasi teknis bila diperlukan.

Pekerjaan:

- Guide role bidang.
- Guide reviewer.
- Guide Gantt dan progress.
- Guide export.

### Step 15 - Final Audit

Output:

- `docs/program-kerja/10-final-audit.md`

Pekerjaan:

- Audit source code final terhadap playbook.
- Catat gap dan rekomendasi.
- Jalankan test relevan.

### Step 16 - Perbaikan Hasil Final Audit

Output:

- Fix gap final audit.
- Test ulang.
- Laporan akhir.

Pekerjaan:

- Perbaiki hanya gap dari Step 15.
- Tidak menambah scope baru.

## Urutan Implementasi Teknis

1. Kunci desain domain dan permission.
2. Bangun database dan model.
3. Bangun CRUD backend.
4. Bangun workflow backend.
5. Bangun task/dependency backend.
6. Bangun UI list/form/detail.
7. Bangun UI approval.
8. Bangun Gantt.
9. Tambahkan monitoring, dokumen, budget, evaluasi.
10. Tambahkan export/report/notifikasi.
11. Hardening dan dokumentasi.

## Rencana Authorization

Backend:

- Route middleware permission untuk gate kasar.
- Policy untuk akses model dan scope.
- Service untuk aturan workflow dan transisi status.
- Query scope untuk membatasi data berdasarkan bidang.

Frontend:

- Menu dan tombol membaca `auth.permissions`.
- UI tetap menangani error 403/validation dari backend.

Scope awal yang perlu diputuskan Step 2:

- `view`: melihat semua sesuai role reviewer/admin.
- `view_own_field`: melihat program pada bidang user.
- PIC task: hanya update progress/task yang ditugaskan.
- Reviewer: review sesuai role/permission dan scope organisasi.

## Rencana Data dan Status

Status program mengikuti playbook:

- `draft`
- `submitted`
- `under_review`
- `revision_requested`
- `approved`
- `rejected`
- `scheduled`
- `in_progress`
- `on_hold`
- `completed`
- `cancelled`
- `evaluated`
- `archived`

Status task akan ditentukan pada Step 2, tetapi minimal perlu:

- `todo`
- `in_progress`
- `blocked`
- `completed`
- `cancelled`

Setiap transisi status program harus memiliki guard backend.

## Rencana Testing

Test yang dibuat bertahap:

- `tests/Feature/WorkPrograms/WorkProgramDatabaseTest.php`
- `tests/Feature/WorkPrograms/WorkProgramAuthorizationTest.php`
- `tests/Feature/WorkPrograms/WorkProgramCrudTest.php`
- `tests/Feature/WorkPrograms/WorkProgramWorkflowTest.php`
- `tests/Feature/WorkPrograms/WorkProgramTaskDependencyTest.php`
- `tests/Feature/WorkPrograms/WorkProgramDocumentTest.php`
- `tests/Feature/WorkPrograms/WorkProgramExportTest.php`

Command verifikasi:

- `php artisan test --filter=WorkProgram`
- `npm run build`

## Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Scope bidang tidak konsisten karena user belum tentu punya member | Step 2 menentukan fallback assignment atau constraint user-member |
| Workflow terlalu kompleks bila digabung dengan `financial_action_requests` | Buat approval history khusus Program Kerja |
| Circular dependency task | Service graph validation dan test khusus |
| Circular parent-child task | Validasi ancestor saat create/update |
| Gantt library free tidak cukup | Proof-of-fit pada Step 9 sebelum fitur drag kompleks |
| Bundle frontend besar | Gantt dibuat page khusus dan dipertimbangkan lazy import |
| Permission frontend/backend tidak sinkron | Policy menjadi sumber kebenaran dan test authorization |
| Dokumen program bocor lintas bidang | Endpoint download wajib authorize ke program/task terkait |

## Batas Step 1

Sudah dilakukan:

- Audit struktur project.
- Audit stack dan versi.
- Audit routing, auth, permission, organisasi, bidang, jabatan, user.
- Audit pola workflow, audit trail, upload, export, testing, design system.
- Evaluasi kandidat Gantt open-source.
- Penyusunan rencana implementasi.

Belum dilakukan:

- Tidak membuat migration.
- Tidak membuat model.
- Tidak membuat route Program Kerja.
- Tidak membuat menu Program Kerja.
- Tidak membuat UI Program Kerja.
- Tidak memasang dependency.

## Status

PASS untuk Step 1.
