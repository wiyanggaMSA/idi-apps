# API Contract - Modul Program Kerja

Tanggal update: 2026-07-16

## Ringkasan

Semua endpoint modul Program Kerja berada pada web route Inertia dengan middleware `auth` dan `verified`.

```text
prefix: /work-programs
route name: work-programs.
namespace controller: App\Http\Controllers\WorkPrograms
```

Response terbagi dua:

- Halaman Inertia untuk list, detail, dan laporan.
- JSON untuk task, dependency, Gantt, monitoring, dokumen, budget, risiko, dan evaluasi.

## Endpoint Utama

| Method | Path | Route | Fungsi |
| --- | --- | --- | --- |
| GET | `/work-programs` | `work-programs.index` | List dan dashboard Program Kerja |
| POST | `/work-programs` | `work-programs.store` | Membuat draft program |
| GET | `/work-programs/{workProgram}` | `work-programs.show` | Detail program |
| PATCH | `/work-programs/{workProgram}` | `work-programs.update` | Update draft/revisi |
| DELETE | `/work-programs/{workProgram}` | `work-programs.destroy` | Hapus draft |

### List Program

Query:

| Parameter | Type | Catatan |
| --- | --- | --- |
| `search` | string | Cari kode, nama, kategori, deskripsi |
| `year` | integer | Tahun program |
| `period_id` | integer | Periode Program Kerja |
| `division_id` | integer | Bidang |
| `status` | string | Status program |
| `priority` | string | Prioritas |
| `pic_user_id` | integer | PIC utama |
| `category` | string | Kategori |
| `start_date` | date | Planned start >= tanggal |
| `end_date` | date | Planned end <= tanggal |
| `sortBy` | string | Whitelist sort field |
| `sortDir` | `asc`/`desc` | Arah sort |
| `perPage` | integer | 1 sampai 100 |

Allowed sort:

```text
program_code, name, year, status, priority, planned_start_date,
planned_end_date, estimated_budget, created_at, updated_at
```

Component:

```text
WorkPrograms/Index
```

Props utama:

- `programs`: paginator program yang sudah discoped oleh `visibleTo(user)`.
- `dashboard`: total, draft, pending approval, revision, approved, in progress, completed, overdue, approval queue, upcoming deadlines, progress average.
- `notifications`: notifikasi Program Kerja terbaru untuk user login.
- `filters`: filter aktif.
- `options`: periode, bidang, user, status, priority, nature, source.

### Create Draft

Required payload:

```json
{
  "name": "Program Edukasi",
  "work_program_period_id": 1,
  "year": 2026,
  "division_id": 1,
  "nature": "routine",
  "source": "field_proposal",
  "priority": "medium"
}
```

Optional payload:

```json
{
  "program_code": "PROKER-2026-001",
  "category": "Edukasi",
  "type": "Seminar",
  "description": "...",
  "background": "...",
  "objectives": "...",
  "target_audience": "...",
  "success_indicators": "...",
  "expected_output": "...",
  "location": "...",
  "planned_start_date": "2026-08-01",
  "planned_end_date": "2026-08-31",
  "actual_start_date": null,
  "actual_end_date": null,
  "estimated_budget": 1500000,
  "realized_budget": 0,
  "budget_source": "Kas organisasi",
  "primary_pic_user_id": 1,
  "internal_notes": "Catatan internal"
}
```

Rules penting:

- Status selalu dibuat `draft`.
- `program_code` otomatis dibuat bila kosong.
- User tanpa global view hanya dapat membuat program pada bidangnya.
- Tanggal akhir tidak boleh sebelum tanggal mulai.
- Anggaran tidak boleh negatif.

Success:

```text
302 redirect ke work-programs.show
flash success
```

### Update Draft/Revisi

Payload sama seperti create, tetapi semua field bersifat parsial.

Rules:

- Hanya status `draft` dan `revision_requested`.
- User non-global tidak dapat memindahkan program ke bidang lain.
- Service menaikkan `lock_version`.
- Activity log: `work_program.updated`.

### Delete Draft

Rules:

- Hanya status `draft`.
- Membutuhkan `work_program.delete`.
- Soft delete.
- Activity log: `work_program.deleted`.

## Workflow Endpoint

| Method | Path | Route | Status asal | Status tujuan |
| --- | --- | --- | --- | --- |
| POST | `/{workProgram}/submit` | `work-programs.submit` | `draft`, `revision_requested` | `submitted` |
| POST | `/{workProgram}/withdraw` | `work-programs.withdraw` | `submitted` | `draft` |
| POST | `/{workProgram}/start-review` | `work-programs.start-review` | `submitted` | `under_review` |
| POST | `/{workProgram}/request-revision` | `work-programs.request-revision` | `under_review` | `revision_requested` |
| POST | `/{workProgram}/approve` | `work-programs.approve` | `under_review` | `approved` |
| POST | `/{workProgram}/reject` | `work-programs.reject` | `under_review` | `rejected` |
| POST | `/{workProgram}/schedule` | `work-programs.schedule` | `approved` | `scheduled` |
| POST | `/{workProgram}/start-execution` | `work-programs.start-execution` | `scheduled` | `in_progress` |
| POST | `/{workProgram}/hold` | `work-programs.hold` | `in_progress` | `on_hold` |
| POST | `/{workProgram}/resume` | `work-programs.resume` | `on_hold` | `in_progress` |
| POST | `/{workProgram}/complete` | `work-programs.complete` | `in_progress` | `completed` |
| POST | `/{workProgram}/archive` | `work-programs.archive` | `evaluated` | `archived` |

Payload note:

```json
{
  "note": "Catatan review"
}
```

Rules:

- `request-revision` dan `reject` wajib `note`.
- Self approval ditolak untuk creator/submitter.
- Semua transisi memakai DB transaction dan row lock.
- Semua aksi membuat `work_program_approvals`.
- Semua aksi menulis Spatie Activitylog.
- Notifikasi dibuat idempotent.
- `schedule` membutuhkan minimal satu task dengan tanggal rencana lengkap.
- `complete` membutuhkan semua task aktif completed dan progress program 100%.
- `hold` wajib note.
- `archive` membutuhkan `work_program.archive`.

## Task Endpoint

| Method | Path | Route | Fungsi |
| --- | --- | --- | --- |
| GET | `/{workProgram}/tasks` | `work-programs.tasks.index` | List task |
| POST | `/{workProgram}/tasks` | `work-programs.tasks.store` | Create task |
| PATCH | `/{workProgram}/tasks/{task}` | `work-programs.tasks.update` | Update task |
| PATCH | `/{workProgram}/tasks/{task}/progress` | `work-programs.tasks.progress` | Update progres task |
| PATCH | `/{workProgram}/tasks/bulk-schedule` | `work-programs.tasks.bulk-schedule` | Bulk schedule/Gantt update |
| DELETE | `/{workProgram}/tasks/{task}` | `work-programs.tasks.destroy` | Delete task |

Create/update payload utama:

```json
{
  "parent_task_id": null,
  "task_code": "TASK-001",
  "sort_order": 1,
  "name": "Persiapan kegiatan",
  "description": "...",
  "planned_start_date": "2026-08-01",
  "planned_end_date": "2026-08-07",
  "actual_start_date": null,
  "actual_end_date": null,
  "duration_days": 7,
  "progress": 0,
  "weight": 10,
  "status": "todo",
  "priority": "medium",
  "is_milestone": false,
  "pic_user_id": 1,
  "assignee_user_ids": [2, 3],
  "estimated_cost": 0,
  "realized_cost": 0,
  "notes": "Catatan task",
  "lock_version": 0
}
```

Milestone:

- `is_milestone = true`.
- Planned start dan planned end harus sama.

Progress payload:

```json
{
  "progress": 60,
  "status": "in_progress",
  "actual_start_date": "2026-08-01",
  "actual_end_date": null,
  "notes": "Update mingguan",
  "lock_version": 1
}
```

Rules:

- Nested resource divalidasi agar task milik program yang sama.
- `lock_version` dipakai untuk mencegah update stale.
- Perubahan progres dicatat ke `work_program_progress_updates`.
- Assignment task membuat notifikasi `task_assigned`.

## Dependency Endpoint

| Method | Path | Route |
| --- | --- | --- |
| GET | `/{workProgram}/dependencies` | `work-programs.dependencies.index` |
| POST | `/{workProgram}/dependencies` | `work-programs.dependencies.store` |
| DELETE | `/{workProgram}/dependencies/{dependency}` | `work-programs.dependencies.destroy` |

Payload:

```json
{
  "predecessor_task_id": 1,
  "successor_task_id": 2,
  "type": "finish_to_start",
  "lag_days": 0
}
```

Allowed type:

```text
finish_to_start, start_to_start, finish_to_finish, start_to_finish
```

Rules:

- Tidak boleh self-dependency.
- Tidak boleh cross-program dependency.
- Tidak boleh circular dependency.
- Unique per predecessor, successor, type.

## Gantt dan Monitoring

| Method | Path | Route | Fungsi |
| --- | --- | --- | --- |
| GET | `/{workProgram}/gantt` | `work-programs.gantt` | Dataset Gantt |
| GET | `/{workProgram}/monitoring` | `work-programs.monitoring` | Progress, risiko, deadline, history |

Gantt response:

```json
{
  "program": {},
  "tasks": [],
  "dependencies": []
}
```

Monitoring response:

```json
{
  "progress": {},
  "summary": {},
  "tasks": [],
  "blocked_tasks": [],
  "overdue_tasks": [],
  "approaching_deadline_tasks": [],
  "risks": [],
  "progress_history": [],
  "latest_update": "2026-07-16 10:00:00"
}
```

Monitoring juga membuat alert operasional idempotent untuk deadline, overdue, stale progress, dan evaluasi diperlukan.

## Budget Endpoint

```text
PATCH /work-programs/{workProgram}/budget
route: work-programs.budget.update
```

Payload:

```json
{
  "estimated_budget": 1500000,
  "realized_budget": 500000,
  "budget_source": "Kas organisasi",
  "internal_notes": "Catatan budget"
}
```

Rules:

- Membutuhkan `work_program.manage_budget`.
- Activity log: `work_program.budget.updated`.

## Document Endpoint

| Method | Path | Route |
| --- | --- | --- |
| GET | `/{workProgram}/documents` | `work-programs.documents.index` |
| POST | `/{workProgram}/documents` | `work-programs.documents.store` |
| GET | `/{workProgram}/documents/{document}/preview` | `work-programs.documents.preview` |
| GET | `/{workProgram}/documents/{document}/download` | `work-programs.documents.download` |
| DELETE | `/{workProgram}/documents/{document}` | `work-programs.documents.destroy` |

Upload multipart:

```text
title: required string
category: proposal|tor_kak|rab|surat_tugas|undangan|notulen|daftar_hadir|foto|laporan|bukti_transaksi|evaluasi|lainnya
document_number: nullable string
document_date: nullable date
description: nullable string
attachment: pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx max 10 MB
```

Rules:

- File disimpan di disk privat `local`.
- Preview/download wajib authorization `view`.
- Dokumen harus terkait dengan program.
- Filename response disanitasi.

## Risk Endpoint

| Method | Path | Route |
| --- | --- | --- |
| POST | `/{workProgram}/risks` | `work-programs.risks.store` |
| PATCH | `/{workProgram}/risks/{risk}` | `work-programs.risks.update` |
| DELETE | `/{workProgram}/risks/{risk}` | `work-programs.risks.destroy` |

Payload:

```json
{
  "work_program_task_id": 1,
  "type": "risk",
  "title": "Vendor terlambat",
  "description": "...",
  "category": "operasional",
  "likelihood": 3,
  "impact": 4,
  "status": "open",
  "mitigation_plan": "...",
  "follow_up": "...",
  "evidence_note": "...",
  "owner_user_id": 1,
  "due_date": "2026-08-10"
}
```

Rules:

- Task risk harus berada pada program yang sama.
- Level dihitung dari `likelihood * impact`.
- Activity log dibuat untuk create/update/delete.

## Evaluation Endpoint

```text
POST /work-programs/{workProgram}/evaluation
route: work-programs.evaluation.upsert
```

Payload wajib:

```json
{
  "result_summary": "...",
  "objective_achievement": "...",
  "indicator_result": "...",
  "target_vs_realization": "...",
  "time_evaluation": "...",
  "budget_result": "...",
  "lessons_learned": "...",
  "recommendations": "...",
  "follow_up": "...",
  "evaluated_at": "2026-09-01 10:00:00",
  "mark_evaluated": true
}
```

Optional:

```json
{
  "constraints": "...",
  "supporting_factors": "...",
  "inhibiting_factors": "...",
  "report_document_id": 10
}
```

Rules:

- Program harus `completed`.
- Jika `mark_evaluated = true`, status program berubah ke `evaluated`.
- Jika `mark_evaluated = true`, history approval action `evaluated` dibuat.
- Activity log: `work_program.evaluated`.

## Report dan Export

| Method | Path | Route | Fungsi |
| --- | --- | --- | --- |
| GET | `/work-programs/report` | `work-programs.report` | Halaman laporan |
| GET | `/work-programs/report/export` | `work-programs.report.export` | Export CSV/XLSX/PDF |
| GET | `/work-programs/report/print` | `work-programs.report.print` | Printable view |

Filter:

```text
search, year, period_id, division_id, status, priority, pic_user_id,
progress_min, progress_max, overdue, budget_min, budget_max, program_id
```

Export:

```text
format=csv|xlsx|pdf
```

Rules:

- Export membutuhkan `work_program.export`.
- Data export tetap mengikuti `visibleTo(user)`.
- `program_id` dipakai untuk export per project dari halaman detail.

## Error Handling

| Kondisi | Response |
| --- | --- |
| Unauthorized | 403 |
| Nested resource bukan milik program | 404 |
| Domain validation gagal | 422 JSON atau redirect back dengan errors |
| Lock version mismatch | 422 dengan pesan reload data |
| File tidak ditemukan | 404 |
