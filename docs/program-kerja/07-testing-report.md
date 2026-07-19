# Testing Report Program Kerja

Tanggal audit: 2026-07-16

## Ringkasan

Testing dan hardening dilakukan untuk modul Program Kerja sampai Step 14. Fokus audit:

- permission;
- scope bidang dan assignment;
- workflow;
- task dan dependency;
- Gantt;
- monitoring;
- dokumen;
- budget;
- risiko;
- evaluasi;
- notifikasi;
- report/export;
- migration;
- build frontend;
- lint PHP.

Tidak ada issue kritis terbuka pada modul Program Kerja.

## Perbaikan Hardening Step 13

- Upload dokumen Program Kerja disimpan di disk privat `local`.
- Filename preview/download disanitasi.
- Test dokumen memastikan disk privat.
- Laravel Pint dijalankan untuk file modul Program Kerja.

## Command Verifikasi

| Command | Hasil |
| --- | --- |
| `php artisan test --filter=WorkProgram` | Lulus: 52 tests, 291 assertions |
| `php artisan migrate:fresh --env=testing --force` | Lulus |
| `./vendor/bin/pint --test app/Http/Controllers/WorkPrograms app/Http/Requests/WorkPrograms app/Models/WorkProgram.php app/Models/WorkProgramNotification.php app/Services/WorkPrograms app/Exports/WorkProgramReportExport.php tests/Feature/WorkPrograms` | Lulus: 45 files |
| `npm run build` | Lulus |
| `git diff --check` | Lulus |

Catatan build:

- Node.js saat test: `20.11.1`.
- Vite memberi warning membutuhkan Node `20.19+` atau `22.12+`.
- Browserslist memberi warning data `caniuse-lite` perlu update.
- Warning tidak menggagalkan build.

## Full Suite

`php artisan test` juga dijalankan. Hasilnya terdapat failure non-Program Kerja:

- `/login` dan `/register` mengembalikan 404 pada test auth lama.
- Test delete profile mengharapkan hard delete, sementara user memakai soft delete.

Failure tersebut tidak berasal dari modul Program Kerja dan tidak diperbaiki pada Step 13/14 agar scope tetap fokus pada modul baru.

## Coverage Modul Program Kerja

| Area | Test |
| --- | --- |
| Migration | Foundation tables exist, FK, unique program code |
| Permission | User tanpa permission ditolak |
| Scope | Cross-division own-field ditolak |
| CRUD | Create, update, delete draft |
| Workflow | Submit, withdraw, review, revision, approve, reject, schedule, start, hold, resume, complete, archive |
| Self approval | Creator/submitter tidak bisa approve |
| Invalid transition | Duplicate approval dan transisi ilegal ditolak |
| Task | Create, update, delete, assignee, nested task |
| Milestone | Tanggal milestone wajib valid |
| Dependency | Semua type, duplicate/cycle/cross-program ditolak |
| Progress | Progress update tercatat |
| Monitoring | Weighted leaf task, overdue, blocked, approaching deadline |
| Risiko | Level risk dihitung dan dapat diupdate |
| Dokumen | Upload valid, mime berbahaya ditolak, download scoped |
| Budget | Update budget diaudit |
| Evaluasi | Validasi field wajib, status evaluated, dan history `evaluated` |
| Notifikasi | Recipient tepat dan tidak duplikat |
| Report/export | Filter, scope, unauthorized export, per-program export, XLSX valid |
| Gantt | Dataset berisi program, task, dependency |

## Checklist Security

| Area | Status | Catatan |
| --- | --- | --- |
| IDOR | Lulus | Nested resource ownership check |
| Broken authorization | Lulus | Middleware permission + policy |
| Mass assignment | Lulus | FormRequest + service explicit fields |
| SQL injection | Lulus | Eloquent binding dan sort whitelist |
| XSS | Lulus | React text render, tidak ada raw HTML baru |
| Unsafe upload | Lulus | Mimes, max size, disk privat |
| Unsafe download | Lulus | Authorization + linked document check |
| Duplicate request | Lulus | Lock/version/dedupe |
| Race condition | Lulus | DB transaction dan row lock di workflow/task |
| Invalid transition | Lulus | Domain transition guard |
| Cross-field access | Lulus | `visibleTo(user)` |
| Pagination | Lulus | Index paginated, max 100 |
| Large Gantt dataset | Lulus | Eager-loaded dataset |
| N+1 | Lulus | Relasi utama eager-loaded |
| Index | Lulus | Index tersedia pada query utama |
| Audit | Lulus | Activity log untuk aksi utama |

## Kesimpulan

Modul Program Kerja memenuhi acceptance Step 13/14 dari sisi testing dan dokumentasi teknis.
