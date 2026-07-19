# Permission Matrix - Modul Program Kerja

Tanggal update: 2026-07-16

## Permission

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

## Role Mapping

| Permission | superadmin | admin | ketua | sekretaris | bendahara | anggota |
| --- | --- | --- | --- | --- | --- | --- |
| `work_program.view` | Ya | Ya | Ya | Tidak | Tidak | Tidak |
| `work_program.view_own_field` | Ya | Ya | Ya | Ya | Ya | Ya |
| `work_program.create` | Ya | Ya | Ya | Ya | Tidak | Tidak |
| `work_program.update` | Ya | Ya | Ya | Ya | Tidak | Tidak |
| `work_program.delete` | Ya | Ya | Tidak | Tidak | Tidak | Tidak |
| `work_program.submit` | Ya | Ya | Ya | Ya | Tidak | Tidak |
| `work_program.withdraw` | Ya | Ya | Ya | Ya | Tidak | Tidak |
| `work_program.review` | Ya | Ya | Ya | Tidak | Tidak | Tidak |
| `work_program.approve` | Ya | Ya | Ya | Tidak | Tidak | Tidak |
| `work_program.reject` | Ya | Ya | Ya | Tidak | Tidak | Tidak |
| `work_program.request_revision` | Ya | Ya | Ya | Tidak | Tidak | Tidak |
| `work_program.manage_tasks` | Ya | Ya | Ya | Ya | Tidak | Tidak |
| `work_program.update_progress` | Ya | Ya | Ya | Ya, bila scope sesuai | Ya, bila ditugaskan | Ya, bila ditugaskan |
| `work_program.manage_budget` | Ya | Ya | Ya | Tidak | Ya, bila scope sesuai | Tidak |
| `work_program.upload_document` | Ya | Ya | Ya | Ya | Ya, bila scope sesuai | Ya, bila ditugaskan |
| `work_program.evaluate` | Ya | Ya | Ya | Ya | Tidak | Tidak |
| `work_program.archive` | Ya | Ya | Ya | Tidak | Tidak | Tidak |
| `work_program.export` | Ya | Ya | Ya | Ya | Ya, bila scope sesuai | Tidak |
| `work_program.view_audit_log` | Ya | Ya | Ya | Tidak | Tidak | Tidak |

## Scope Access

### Global

User dapat melihat semua Program Kerja jika memiliki `work_program.view`.

### Own Field

User dapat melihat Program Kerja bidang sendiri jika:

- memiliki `work_program.view_own_field`;
- `user.member.division_id` terisi;
- program berada pada `division_id` yang sama; atau
- bidang user tercatat sebagai collaborator division.

### Assignment

User dapat melihat Program Kerja jika:

- menjadi `primary_pic_user_id`;
- tercatat di `work_program_assignments`;
- menjadi PIC task;
- tercatat sebagai assignee task.

## Policy

### `WorkProgramPolicy`

| Method | Rule ringkas |
| --- | --- |
| `viewAny` | Salah satu permission view/review/update_progress |
| `view` | Global, own-field, collaborator, atau assignment |
| `create` | `work_program.create` |
| `update` | `work_program.update`, status `draft`/`revision_requested`, dan scope sesuai |
| `delete` | `work_program.delete`, status `draft`, dan global view |
| `submit` | `work_program.submit`, status `draft`/`revision_requested`, dan scope sesuai |
| `withdraw` | `work_program.withdraw`, status `submitted`, submitter atau scope sesuai |
| `review` | `work_program.review`, status `submitted`, bukan submitter |
| `approve` | `work_program.approve`, status `under_review`, bukan creator/submitter |
| `reject` | `work_program.reject`, status `under_review`, bukan creator/submitter |
| `requestRevision` | `work_program.request_revision`, status `under_review`, bukan creator/submitter |
| `manageTasks` | `work_program.manage_tasks`, program belum terminal, dan scope sesuai |
| `updateProgress` | `work_program.update_progress`, program `scheduled`/`in_progress`, dan scope sesuai |
| `manageBudget` | `work_program.manage_budget`, dan scope sesuai |
| `uploadDocument` | `work_program.upload_document`, dan program visible |
| `evaluate` | `work_program.evaluate`, status `completed`, dan scope sesuai |
| `archive` | `work_program.archive`, status `evaluated`, dan global view |
| `export` | `work_program.export` |
| `viewAuditLog` | `work_program.view_audit_log`, dan program visible |

### `WorkProgramTaskPolicy`

| Method | Rule ringkas |
| --- | --- |
| `view` | Mengikuti `WorkProgramPolicy::view` |
| `create` | Mengikuti `WorkProgramPolicy::manageTasks` |
| `update` | Mengikuti `WorkProgramPolicy::manageTasks` |
| `delete` | Mengikuti `WorkProgramPolicy::manageTasks` |
| `updateProgress` | Permission progress, program `scheduled`/`in_progress`, serta PIC/assignee/scope program |
| `manageDependency` | Mengikuti `WorkProgramPolicy::manageTasks` |
| `uploadDocument` | Permission upload dan task visible |

## Status Guard

| Status | Update data | Submit | Review | Approve/Reject/Revisi | Manage task | Update progress | Evaluate | Archive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft` | Ya | Ya | Tidak | Tidak | Ya | Tidak | Tidak | Tidak |
| `submitted` | Tidak | Tidak | Ya | Tidak | Tidak | Tidak | Tidak | Tidak |
| `under_review` | Tidak | Tidak | Tidak | Ya | Tidak | Tidak | Tidak | Tidak |
| `revision_requested` | Ya | Ya | Tidak | Tidak | Ya | Tidak | Tidak | Tidak |
| `approved` | Terbatas | Tidak | Tidak | Tidak | Ya | Tidak | Tidak | Tidak |
| `scheduled` | Terbatas | Tidak | Tidak | Tidak | Ya | Ya | Tidak | Tidak |
| `in_progress` | Terbatas | Tidak | Tidak | Tidak | Ya | Ya | Tidak | Tidak |
| `on_hold` | Terbatas | Tidak | Tidak | Tidak | Ya | Tidak | Tidak | Tidak |
| `completed` | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Ya | Tidak |
| `evaluated` | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Ya |
| `archived` | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak |
| `rejected` | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak |
| `cancelled` | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak |

## Backend Authorization Pattern

Setiap route memakai middleware permission. Controller tetap memanggil `$this->authorize(...)` pada resource terkait.

Nested resource wajib melakukan ownership check:

- task harus milik program;
- dependency harus milik program;
- risk harus milik program;
- document harus linked ke program;
- task pada risk/dependency harus berada di program yang sama.

## Frontend Permission Pattern

Frontend membaca `auth.permissions` dari shared props.

- Parent menu `Program Kerja` muncul jika user punya permission view/review/progress terkait.
- Child `Daftar Program` untuk list/dashboard.
- Child `Laporan` untuk halaman report.
- Tombol aksi disembunyikan saat permission tidak ada.
- Backend tetap menjadi sumber kebenaran authorization.

