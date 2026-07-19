# Audit Project Saat Ini - Modul Program Kerja

Tanggal audit: 2026-07-16

## Ringkasan

Project adalah aplikasi Laravel 12 dengan Inertia React. Modul Program Kerja belum tersedia sebagai source code fitur, sehingga implementasi berikutnya perlu dibuat sebagai modul baru yang mengikuti pola routing, authorization, service, model, migration, Inertia page, menu, audit log, upload dokumen, export, dan testing yang sudah ada.

Step 1 ini tidak mengubah source fitur dan tidak memasang dependency baru.

## Stack dan Versi

Backend:

- PHP: `^8.2`
- Laravel: `^12.0`
- Inertia Laravel: `^2.0`
- Laravel Sanctum: `^4.0`
- Spatie Permission: `^6.24`
- Spatie Activitylog: `^4.10`
- Maatwebsite Excel: `^3.1`
- DomPDF: `barryvdh/laravel-dompdf ^3.1`
- Browsershot: `spatie/browsershot ^5.2`
- Ziggy: `^2.6`

Frontend:

- React: `^18.2.0`
- Inertia React: `^2.3.11`
- Vite: `^7.0.7`
- Tailwind CSS: `^3.2.1`
- Ant Design: `^6.2.1`
- TanStack React Table: `^8.21.3`
- Recharts: `^3.7.0`
- React Hook Form: `^7.71.1`
- Quill/React Quill untuk rich text

## Struktur Backend

Struktur backend mengikuti konvensi Laravel:

- Controller per domain di `app/Http/Controllers/*`
- Form request di `app/Http/Requests/*`
- Model Eloquent di `app/Models/*`
- Service domain di `app/Services/*`
- Policy di `app/Policies/*`
- Seeder permission dan master data di `database/seeders/*`
- Migration di `database/migrations/*`
- Route web Inertia di `routes/web.php`

Pola penting:

- Route berada di group `auth` dan `verified`.
- Permission dicek di route middleware dan tetap diperiksa ulang dengan policy di controller.
- Operasi bisnis yang berisiko memakai service dan transaksi database.
- Audit trail memakai `spatie/laravel-activitylog` melalui helper `activity()`.
- Upload dokumen memakai tabel `documents` dan Laravel Storage.

## Struktur Frontend

Struktur frontend:

- Layout utama: `resources/js/Layouts/AppLayout.jsx`
- Sidebar/menu: `resources/js/Components/App/AppSidebar.jsx`
- Konfigurasi menu: `resources/js/Config/Menu.jsx`
- Komponen reusable: `resources/js/Components/App/*`
- Page Inertia: `resources/js/Pages/*`
- I18n: `resources/js/i18n/messages.js`

Komponen yang tersedia untuk modul Program Kerja:

- `PageShell`
- `PageHeader`
- `DataTable`
- `FilterBar`
- `SearchInput`
- `StatusBadge`
- `EmptyState`
- `LoadingSkeleton`
- Komponen Ant Design seperti `Button`, `Card`, `Table`, `Modal`, `Drawer`, `Form`, `Input`, `Select`, `DatePicker`, `Upload`, `Tag`, `Tabs`
- Recharts untuk grafik ringkasan, bukan Gantt

## Routing

Routing utama memakai `routes/web.php`. Route Inertia dibuat langsung sebagai web route, bukan API JSON terpisah. Contoh pola:

- Prefix domain: `secretariat`, `members`, `transactions`, `settings`
- Nama route memakai namespace seperti `secretariat.letters.index`
- Route write memakai `post`, `patch`, `delete`
- Middleware permission dipasang per route
- Controller tetap memanggil `$this->authorize(...)`

Untuk Program Kerja, pola route yang disarankan:

- Prefix: `/work-programs`
- Name prefix: `work-programs.`
- Controller namespace: `App\Http\Controllers\WorkPrograms`
- Route Gantt dapat berupa halaman Inertia dan endpoint update terpisah di web route.

## Database dan Migration

Database saat ini memiliki tabel inti:

- `users`
- `roles`, `permissions`, dan tabel pivot Spatie Permission
- `divisions`
- `positions`
- `members`
- `documents`
- `document_links`
- `activity_log`
- tabel sekretariat
- tabel iuran
- tabel kas/transaksi
- `financial_action_requests`
- `finance_periods`

Belum ditemukan tabel khusus Program Kerja seperti:

- `work_programs`
- `work_program_tasks`
- `work_program_task_dependencies`
- `work_program_approvals`
- `work_program_documents`
- `work_program_risks`
- `work_program_evaluations`

Beberapa migration lama sudah menambahkan soft delete pada core tables. Modul baru sebaiknya menentukan soft delete sejak migration awal bila data tidak boleh hilang secara permanen.

## Authentication

Authentication memakai Laravel Breeze/Inertia. Route aplikasi utama dilindungi `auth` dan `verified`. `HandleInertiaRequests` membagikan:

- `auth.user`
- `auth.roles`
- `auth.permissions`
- `orgProfile`

Frontend dapat menyembunyikan menu/aksi berdasarkan permission, tetapi backend tetap harus menjadi sumber kebenaran authorization.

## Role dan Permission

Permission dikelola oleh Spatie Permission melalui `database/seeders/RolePermissionSeeder.php`.

Role yang ada:

- `superadmin`
- `admin`
- `sekretaris`
- `ketua`
- `bendahara`
- `anggota`

Belum ada permission Program Kerja. Permission yang nanti perlu ditambahkan mengikuti playbook:

- `work_program.view`
- `work_program.view_own_field`
- `work_program.create`
- `work_program.update`
- `work_program.delete`
- `work_program.submit`
- `work_program.withdraw`
- `work_program.review`
- `work_program.approve`
- `work_program.reject`
- `work_program.request_revision`
- `work_program.manage_tasks`
- `work_program.update_progress`
- `work_program.manage_budget`
- `work_program.upload_document`
- `work_program.evaluate`
- `work_program.archive`
- `work_program.export`
- `work_program.view_audit_log`

Catatan scope:

- Superadmin/admin kemungkinan mendapat seluruh permission.
- Ketua cocok sebagai reviewer/approver.
- Role bidang belum spesifik di role seeder; scope bidang perlu diturunkan dari relasi `users -> members -> division_id` atau desain assignment baru.
- Jangan mengandalkan menu frontend untuk akses.

## Organisasi, Bidang, Jabatan, User

Entitas organisasi:

- Profil organisasi tersimpan di `app_settings`.
- `divisions` mewakili bidang.
- `positions` mewakili jabatan.
- `members` menyimpan `division_id`, `position_id`, dan opsional `user_id`.
- `users` menyimpan akun login.

Seeder master data sudah membuat bidang seperti `ORG`, `MKEK`, `MPPK`, `P2KB`, `YANMAS`, `ADVOKASI`, `HUMAS`, `SEKRETARIAT`, dan `KEU-ASET`.

Belum ditemukan entitas periode kepengurusan. Untuk Program Kerja, field periode kepengurusan perlu dirancang sebagai tabel baru atau field teks/tahun sementara. Rekomendasi awal: desain tabel periode kepengurusan pada Step 2 agar tidak mengunci modul pada field bebas.

## Approval Workflow

Pola approval yang tersedia paling representatif ada pada `financial_action_requests`:

- Request disimpan sebagai model terpisah.
- Target memakai relasi morph.
- Status controlled: `pending`, `approved`, `rejected`.
- Approval/rejection memakai service.
- Self-approval ditolak di service.
- Operasi memakai `DB::transaction()` dan `lockForUpdate()`.
- Event dicatat ke activity log.

Untuk Program Kerja, workflow lebih kompleks daripada void request. Rekomendasi:

- Buat service khusus `WorkProgramWorkflowService`.
- Simpan riwayat review/approval pada tabel khusus, bukan memakai `financial_action_requests`, karena status Program Kerja mencakup submit, review, revisi, approve, reject, schedule, progress, complete, evaluate, archive.
- Terapkan guard transisi status di backend.

## Audit Trail

Audit trail memakai `spatie/laravel-activitylog`. Contoh event:

- `cash_transaction.created`
- `cash_transaction.updated`
- `cash_transaction.void_requested`
- `cash_transaction.void_approved`
- `cash_transaction.void_rejected`

Modul Program Kerja sebaiknya memakai log name `work_program` dan event seperti:

- `work_program.created`
- `work_program.submitted`
- `work_program.review_started`
- `work_program.revision_requested`
- `work_program.approved`
- `work_program.rejected`
- `work_program.task.updated`
- `work_program.progress.updated`
- `work_program.evaluated`
- `work_program.archived`

## Upload Dokumen

Pola upload dokumen:

- Tabel `documents` menyimpan `title`, `category`, `file_path`, `mime_type`, `size`, `uploaded_by`.
- File disimpan melalui Laravel Storage.
- Attachment transaksi memakai foreign key `attachment_document_id`.
- Arsip dan agenda memakai Upload Ant Design di frontend.

Untuk Program Kerja yang dapat memiliki banyak dokumen, sebaiknya gunakan tabel pivot khusus atau relasi `document_links` bila sesuai setelah diverifikasi di Step 2.

## Notifikasi

Belum ditemukan notifikasi domain aplikasi selain notifikasi auth bawaan Laravel untuk email verification/password reset. Tidak ditemukan pola notifikasi internal untuk workflow approval.

Untuk Program Kerja, notifikasi perlu dirancang sebagai bagian terpisah pada step selanjutnya. Untuk MVP awal, flash message Inertia cukup untuk action langsung, tetapi approval lintas user butuh desain notifikasi atau daftar pending review.

## Export

Export tersedia melalui:

- Maatwebsite Excel untuk export spreadsheet.
- DomPDF/Browsershot untuk PDF dan preview dokumen.
- Route report/export dengan permission `reports.export` dan `reports.print`.

Untuk Program Kerja:

- Export list program dan Gantt data ke XLSX dapat mengikuti pola Maatwebsite Excel.
- Export PDF laporan program/evaluasi dapat mengikuti pola report/secretariat PDF.
- Export Gantt visual sebaiknya ditunda sampai Gantt stabil.

## Testing

Testing memakai PHPUnit via `php artisan test`. Test feature sudah tersedia untuk:

- Auth
- Dashboard
- Dues
- Finance
- Secretariat
- Settings backup

Untuk Program Kerja, test minimal:

- Migration dan relasi domain
- Permission dan policy
- CRUD program
- Status transition legal/ilegal
- Scope bidang
- Self-approval prevention
- Task hierarchy dan dependency circular prevention
- Upload dokumen
- Export

## Design System

UI saat ini menggunakan kombinasi:

- Tailwind utility classes
- Ant Design components
- Komponen app sendiri
- Sidebar gelap dengan menu parent/child
- Page berbasis card/table/filter/modal

Modul Program Kerja sebaiknya memakai UI operasional yang rapat dan mudah discan:

- Parent menu baru `Program Kerja`
- Child menu seperti `Daftar Program`, `Gantt`, `Approval`, `Laporan` bila permission tersedia
- Table/list sebagai entry utama
- Form drawer/modal atau dedicated create/edit page sesuai kompleksitas
- Status badge untuk status program/task
- Gantt full-width pada page khusus, bukan card kecil

## Library Chart dan Gantt

Library chart yang sudah terpasang:

- Recharts untuk chart dashboard/report.

Library Gantt belum terpasang.

Kandidat open-source yang diaudit pada 2026-07-16:

| Library | Lisensi | Kompatibilitas | Kekuatan | Risiko |
| --- | --- | --- | --- | --- |
| DHTMLX Gantt Community | MIT untuk Community Edition terbaru menurut dokumentasi DHTMLX | Framework-agnostic, dapat diintegrasikan ke React | Mendukung grid, timeline, project/milestone, empat tipe dependency, drag scheduling, zoom, export tertentu | Perlu validasi fitur mana yang Community vs Pro; integrasi React manual; bundle dan styling perlu diuji |
| SVAR React Gantt | MIT untuk core menurut situs/repo SVAR | React native | Core React modern, dependencies, drag-and-drop, customization | Ada edisi Pro; harus pastikan fitur critical path/baseline/resource tidak dibutuhkan di free core |
| Frappe Gantt | MIT | JS/SVG framework-agnostic | Ringan, zero dependency, dependency/progress/view modes | API lebih sederhana; hierarchy kompleks dan UX enterprise mungkin perlu banyak custom |
| gantt-task-react | MIT | React/TypeScript | Mudah untuk React, progress dan timeline dasar | Release terakhir GitHub tercatat 2022; maintenance rendah; kurang cocok untuk modul jangka panjang |

Sumber evaluasi:

- DHTMLX open-source page: https://dhtmlx.com/docs/products/dhtmlxGantt/open-source/
- DHTMLX GitHub: https://github.com/DHTMLX/gantt
- SVAR React Gantt: https://svar.dev/react/gantt/
- SVAR GitHub: https://github.com/svar-widgets/react-gantt
- Frappe Gantt: https://github.com/frappe/gantt
- gantt-task-react GitHub: https://github.com/MaTeMaTuK/gantt-task-react

Rekomendasi awal untuk Step 2:

- Kandidat utama: DHTMLX Gantt Community atau SVAR React Gantt.
- Pilih DHTMLX bila prioritasnya dependency, milestone, hierarchy, grid timeline matang, dan kemampuan Gantt kompleks.
- Pilih SVAR bila prioritasnya integrasi React dan API komponen modern.
- Jangan memasang dependency sebelum desain domain final dan proof-of-fit diputuskan.

## Modul Referensi

Modul referensi utama untuk Program Kerja:

- Backend workflow dan audit: transaksi kas + audit approval.
- Upload dokumen: transaksi kas dan sekretariat arsip.
- Frontend table/form/modal: transaksi, anggota, settings.
- Report/export: laporan kas dan resume keuangan.

Alasan:

- Pola transaksi menunjukkan policy, service, upload attachment, audit log, lock, idempotensi dasar, dan approval.
- Pola sekretariat menunjukkan dokumen, status, versi, PDF, dan workflow dokumen.
- Pola settings menunjukkan master data bidang/jabatan/user/role/permission.

## Risiko Integrasi

- Belum ada periode kepengurusan, sehingga perlu desain domain baru.
- Scope bidang belum tersedia langsung di `users`; perlu menghubungkan user ke member/division atau tabel assignment.
- Belum ada notifikasi domain untuk approval.
- Workflow Program Kerja lebih kompleks daripada approval void yang sudah ada.
- Gantt membutuhkan validasi dependency backend agar drag/resize frontend tidak menjadi sumber data korup.
- Data task hierarchy dan dependency rawan circular reference.
- Bundle Gantt dapat membesar; perlu lazy loading atau page khusus bila library besar.
- Menu frontend saat ini filter permission sederhana satu permission per item; submenu Program Kerja perlu dirancang agar tetap jelas.
- Worktree saat audit sudah memiliki banyak perubahan lain yang tidak terkait Step 1; implementasi berikutnya harus menjaga scope modul baru.

## Asumsi Terdokumentasi

- Satu user bidang dapat ditentukan dari relasi `members.user_id -> members.division_id`, tetapi belum tentu semua user login punya member.
- Ketua/admin/superadmin dapat menjadi reviewer awal, tetapi matrix final harus dikunci pada Step 2.
- Modul Program Kerja akan memakai web route Inertia seperti modul lain, bukan API-only module.
- Semua authorization final tetap diperiksa backend melalui policy/service.

## Acceptance Criteria Step 1

- Struktur project teridentifikasi: PASS.
- Modul referensi disebutkan: PASS.
- Model dan tabel terkait ditemukan atau dinyatakan belum ada: PASS.
- Permission dan scope dianalisis: PASS.
- Risiko integrasi dicatat: PASS.
- Kandidat library Gantt dianalisis: PASS.
- Tidak ada dependency baru: PASS.
- Tidak ada source code fitur yang berubah pada Step 1: PASS.
