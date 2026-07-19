# Domain dan Database Design - Modul Program Kerja

Tanggal desain: 2026-07-16

## Hasil Verifikasi Step 2

Audit Step 1 sesuai dengan source code saat ini:

- Project memakai Laravel 12, Inertia React, Spatie Permission, dan Spatie Activitylog.
- Belum ada source code, tabel, route, model, atau page untuk Program Kerja.
- `users` memiliki relasi `member()`.
- `members` memiliki `division_id` dan `position_id`.
- `divisions` adalah entitas bidang.
- `positions` adalah entitas jabatan.
- `document_links` sudah tersedia sebagai polymorphic link ke `documents`, sehingga modul ini tidak perlu membuat sistem dokumen paralel.
- Belum ada entitas periode kepengurusan.

Desain ini tidak membuat migration pada Step 2. Migration baru baru dibuat pada Step 3.

## Prinsip Domain

Modul Program Kerja harus menyimpan data terstruktur untuk:

- program kerja per bidang;
- aktivitas/task dan milestone;
- dependency Gantt;
- approval history;
- assignment PIC dan anggota;
- kolaborasi antarbidang;
- risiko/kendala;
- evaluasi;
- dokumen;
- audit fields dan activity log.

Backend wajib menjadi sumber kebenaran untuk:

- scope bidang;
- permission;
- status transition;
- dependency graph;
- task hierarchy;
- self-approval prevention;
- akses dokumen.

## Tabel yang Dirancang

### `work_program_periods`

Tujuan: menyimpan periode kepengurusan agar Program Kerja tidak hanya bergantung pada field teks/tahun.

Kolom:

- `id`
- `name`
- `code`, nullable, unique
- `start_date`
- `end_date`
- `is_active`, boolean default true
- `notes`, nullable
- `created_by`, FK `users`, nullable on delete
- `updated_by`, FK `users`, nullable on delete
- timestamps
- soft deletes

Constraint dan index:

- unique `code`
- index `is_active`
- index `start_date`, `end_date`
- check `end_date >= start_date`

Relasi:

- has many `work_programs`
- belongs to creator/updater user

Catatan:

- Ini berbeda dari `finance_periods`; periode kepengurusan bersifat organisasi/program, bukan tutup buku bulanan.

### `work_programs`

Tujuan: tabel utama program kerja.

Kolom:

- `id`
- `uuid`, unique
- `program_code`, unique
- `name`
- `work_program_period_id`, FK `work_program_periods`
- `year`, unsigned small integer
- `division_id`, FK `divisions`
- `category`, nullable
- `type`, nullable
- `nature`, string enum
- `source`, string enum
- `status`, string enum default `draft`
- `priority`, string enum default `medium`
- `description`, text nullable
- `background`, text nullable
- `objectives`, text nullable
- `target_audience`, text nullable
- `success_indicators`, text nullable
- `expected_output`, text nullable
- `location`, nullable
- `planned_start_date`, date nullable
- `planned_end_date`, date nullable
- `actual_start_date`, date nullable
- `actual_end_date`, date nullable
- `estimated_budget`, decimal 15,2 default 0
- `realized_budget`, decimal 15,2 default 0
- `budget_source`, nullable
- `primary_pic_user_id`, FK `users`, nullable on delete
- `submitted_at`, timestamp nullable
- `submitted_by`, FK `users`, nullable on delete
- `approved_at`, timestamp nullable
- `approved_by`, FK `users`, nullable on delete
- `rejected_at`, timestamp nullable
- `rejected_by`, FK `users`, nullable on delete
- `completed_at`, timestamp nullable
- `evaluated_at`, timestamp nullable
- `archived_at`, timestamp nullable
- `internal_notes`, text nullable
- `lock_version`, unsigned integer default 0
- `created_by`, FK `users`, nullable on delete
- `updated_by`, FK `users`, nullable on delete
- timestamps
- soft deletes

Enum terkontrol:

- `nature`: `routine`, `incidental`, `strategic`, `collaborative`
- `source`: `field_proposal`, `organizational_mandate`, `work_meeting_result`, `evaluation_follow_up`
- `priority`: `low`, `medium`, `high`, `critical`
- `status`: lihat bagian status transition

Constraint dan index:

- unique `uuid`
- unique `program_code`
- index `work_program_period_id`
- index `year`
- index `division_id`
- index `status`
- index `priority`
- index `primary_pic_user_id`
- composite index `division_id`, `status`
- composite index `year`, `division_id`, `status`
- check `planned_end_date >= planned_start_date` bila keduanya tidak null
- check `actual_end_date >= actual_start_date` bila keduanya tidak null
- check budget tidak negatif

Relasi:

- belongs to period
- belongs to division
- belongs to primary PIC user
- belongs to creator/updater/submitter/approver/rejecter users
- has many tasks
- has many approvals
- has many assignments
- has many collaborator divisions
- has many risks
- has one evaluation
- morph many document links melalui `document_links`

### `work_program_assignments`

Tujuan: menyimpan anggota tim program dan role mereka.

Kolom:

- `id`
- `work_program_id`, FK cascade delete
- `user_id`, FK `users`, restrict/nullOnDelete sesuai keputusan migration Step 3; rekomendasi `restrictOnDelete`
- `role`, string enum
- `assigned_by`, FK `users`, nullable
- `assigned_at`, timestamp nullable
- timestamps

Enum role:

- `primary_pic`
- `member`
- `reviewer`
- `observer`

Constraint dan index:

- unique `work_program_id`, `user_id`, `role`
- index `user_id`
- index `role`

Relasi:

- belongs to program
- belongs to user
- belongs to assigner

Catatan:

- `primary_pic_user_id` tetap disimpan di `work_programs` untuk query cepat, tetapi `work_program_assignments` menjadi sumber anggota tim lengkap.

### `work_program_collaborator_divisions`

Tujuan: menyimpan bidang kolaborator.

Kolom:

- `id`
- `work_program_id`, FK cascade delete
- `division_id`, FK `divisions`, restrictOnDelete
- timestamps

Constraint dan index:

- unique `work_program_id`, `division_id`
- index `division_id`

Relasi:

- belongs to program
- belongs to division

### `work_program_tasks`

Tujuan: menyimpan aktivitas, milestone, dan struktur hierarchy Gantt.

Kolom:

- `id`
- `work_program_id`, FK cascade delete
- `parent_task_id`, self FK nullable nullOnDelete
- `task_code`, nullable
- `sort_order`, unsigned integer default 0
- `name`
- `description`, text nullable
- `planned_start_date`, date nullable
- `planned_end_date`, date nullable
- `actual_start_date`, date nullable
- `actual_end_date`, date nullable
- `duration_days`, unsigned integer nullable
- `progress`, unsigned tiny integer default 0
- `weight`, decimal 8,2 default 0
- `status`, string enum default `todo`
- `priority`, string enum default `medium`
- `is_milestone`, boolean default false
- `pic_user_id`, FK `users`, nullable
- `estimated_cost`, decimal 15,2 default 0
- `realized_cost`, decimal 15,2 default 0
- `notes`, text nullable
- `lock_version`, unsigned integer default 0
- `created_by`, FK `users`, nullable
- `updated_by`, FK `users`, nullable
- timestamps
- soft deletes

Enum status task:

- `todo`
- `in_progress`
- `blocked`
- `completed`
- `cancelled`

Constraint dan index:

- unique nullable pair `work_program_id`, `task_code` jika `task_code` tidak null
- index `work_program_id`
- index `parent_task_id`
- index `status`
- index `pic_user_id`
- composite index `work_program_id`, `parent_task_id`, `sort_order`
- check `progress between 0 and 100`
- check `weight >= 0`
- check cost tidak negatif
- check `planned_end_date >= planned_start_date` bila keduanya tidak null
- check `actual_end_date >= actual_start_date` bila keduanya tidak null

Relasi:

- belongs to program
- belongs to parent task
- has many child tasks
- belongs to PIC user
- has many task assignees
- has many outgoing dependencies
- has many incoming dependencies
- has many risks
- morph many document links melalui `document_links`

Aturan milestone:

- `is_milestone = true` berarti durasi 0 atau tanggal mulai sama dengan tanggal selesai.
- Bila milestone punya dua tanggal berbeda, backend menolak.

### `work_program_task_assignees`

Tujuan: menyimpan anggota pelaksana task selain PIC utama.

Kolom:

- `id`
- `work_program_task_id`, FK cascade delete
- `user_id`, FK `users`, restrictOnDelete
- `role`, nullable
- timestamps

Constraint dan index:

- unique `work_program_task_id`, `user_id`
- index `user_id`

Relasi:

- belongs to task
- belongs to user

### `work_program_task_dependencies`

Tujuan: menyimpan dependency antar task untuk Gantt.

Kolom:

- `id`
- `work_program_id`, FK cascade delete
- `predecessor_task_id`, FK `work_program_tasks`, cascade delete
- `successor_task_id`, FK `work_program_tasks`, cascade delete
- `type`, string enum
- `lag_days`, integer default 0
- `created_by`, FK `users`, nullable
- timestamps

Enum type:

- `finish_to_start`
- `start_to_start`
- `finish_to_finish`
- `start_to_finish`

Constraint dan index:

- unique `predecessor_task_id`, `successor_task_id`, `type`
- index `work_program_id`
- index `predecessor_task_id`
- index `successor_task_id`
- check `predecessor_task_id <> successor_task_id`

Validasi service:

- predecessor dan successor wajib berada di program yang sama.
- circular dependency ditolak.
- perubahan tanggal task yang melanggar dependency ditolak atau butuh endpoint conflict acknowledgement pada step lanjutan.

### `work_program_approvals`

Tujuan: menyimpan histori workflow program, termasuk submit, review, approval, revision, rejection, withdraw, dan archive.

Kolom:

- `id`
- `work_program_id`, FK cascade delete
- `action`, string enum
- `from_status`, nullable
- `to_status`, nullable
- `actor_id`, FK `users`, restrictOnDelete
- `reviewer_id`, FK `users`, nullable
- `note`, text nullable
- `metadata`, json nullable
- `acted_at`, timestamp
- timestamps

Enum action:

- `created`
- `submitted`
- `withdrawn`
- `review_started`
- `revision_requested`
- `approved`
- `rejected`
- `scheduled`
- `started`
- `held`
- `resumed`
- `completed`
- `cancelled`
- `evaluated`
- `archived`

Constraint dan index:

- index `work_program_id`, `acted_at`
- index `actor_id`
- index `action`
- index `to_status`

Relasi:

- belongs to program
- belongs to actor user
- belongs to reviewer user

Catatan:

- Tabel ini khusus Program Kerja dan tidak memakai `financial_action_requests`, karena domain statusnya lebih luas.

### `work_program_risks`

Tujuan: menyimpan risiko dan kendala program/task.

Kolom:

- `id`
- `work_program_id`, FK cascade delete
- `work_program_task_id`, FK nullable cascade/nullOnDelete
- `type`, enum `risk` atau `issue`
- `title`
- `description`, text nullable
- `severity`, enum `low`, `medium`, `high`, `critical`
- `status`, enum `open`, `mitigating`, `resolved`, `closed`
- `mitigation_plan`, text nullable
- `owner_user_id`, FK users nullable
- `due_date`, date nullable
- `resolved_at`, timestamp nullable
- `created_by`, FK users nullable
- `updated_by`, FK users nullable
- timestamps
- soft deletes

Constraint dan index:

- index `work_program_id`
- index `work_program_task_id`
- index `severity`
- index `status`
- index `owner_user_id`

### `work_program_evaluations`

Tujuan: menyimpan evaluasi akhir program.

Kolom:

- `id`
- `work_program_id`, FK cascade delete, unique
- `result_summary`, text nullable
- `indicator_result`, text nullable
- `budget_result`, text nullable
- `lessons_learned`, text nullable
- `recommendations`, text nullable
- `evaluated_by`, FK `users`, restrict/nullOnDelete sesuai Step 3; rekomendasi restrict
- `evaluated_at`, timestamp
- timestamps

Constraint dan index:

- unique `work_program_id`
- index `evaluated_by`
- index `evaluated_at`

### Dokumen Program dan Task

Gunakan tabel existing:

- `documents`
- `document_links`

Desain:

- Upload program membuat row `documents` dengan `category = work_program`.
- Link ke program memakai `document_links.linkable_type = WorkProgram`.
- Upload task membuat row `documents` dengan `category = work_program_task`.
- Link ke task memakai `document_links.linkable_type = WorkProgramTask`.

Alasan:

- Project sudah punya pola polymorphic document link.
- Tidak perlu tabel `work_program_documents` kecuali Step 3 menemukan kebutuhan metadata tambahan khusus dokumen Program Kerja.

## Relasi Utama

```text
work_program_periods 1 ── * work_programs
divisions 1 ── * work_programs
users 1 ── * work_programs as primary_pic/created_by/updated_by
work_programs 1 ── * work_program_tasks
work_program_tasks 1 ── * work_program_tasks as parent/children
work_programs 1 ── * work_program_task_dependencies
work_program_tasks 1 ── * dependencies as predecessor/successor
work_programs 1 ── * work_program_approvals
work_programs 1 ── * work_program_assignments
work_program_tasks 1 ── * work_program_task_assignees
work_programs 1 ── * work_program_risks
work_program_tasks 1 ── * work_program_risks
work_programs 1 ── 1 work_program_evaluations
documents * ── * work_programs/work_program_tasks through document_links
```

## Organization Scope dan Field Scope

Sumber scope bidang:

1. Utama: `users.member.division_id`.
2. Fallback untuk tim program: `work_program_assignments.user_id`.
3. Fallback untuk task: `work_program_task_assignees.user_id` atau `work_program_tasks.pic_user_id`.
4. Reviewer/admin global: permission `work_program.view`, `work_program.review`, atau role `admin/superadmin`.

Aturan:

- User dengan `work_program.view` dapat melihat semua program sesuai kebijakan role global.
- User dengan `work_program.view_own_field` dapat melihat program jika `work_programs.division_id` sama dengan `user.member.division_id`.
- PIC program dapat melihat dan mengubah bagian yang diizinkan pada program yang ditugaskan.
- PIC task dapat update progress task yang ditugaskan, meskipun bukan bidang pengusul.
- Bidang kolaborator dapat melihat program jika ada row di `work_program_collaborator_divisions`.

Jika user tidak punya member/division:

- Tidak mendapat scope bidang otomatis.
- Masih bisa mendapat akses melalui permission global atau assignment eksplisit.

## Status Transition Program

Status:

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

Transisi legal:

| From | To | Action |
| --- | --- | --- |
| `draft` | `submitted` | submit |
| `submitted` | `draft` | withdraw |
| `submitted` | `under_review` | start review |
| `under_review` | `revision_requested` | request revision |
| `under_review` | `approved` | approve |
| `under_review` | `rejected` | reject |
| `revision_requested` | `submitted` | resubmit |
| `approved` | `scheduled` | schedule |
| `scheduled` | `in_progress` | start |
| `in_progress` | `on_hold` | hold |
| `on_hold` | `in_progress` | resume |
| `in_progress` | `completed` | complete |
| `draft` | `cancelled` | cancel |
| `submitted` | `cancelled` | cancel |
| `revision_requested` | `cancelled` | cancel |
| `approved` | `cancelled` | cancel |
| `scheduled` | `cancelled` | cancel |
| `in_progress` | `cancelled` | cancel |
| `completed` | `evaluated` | evaluate |
| `evaluated` | `archived` | archive |

Aturan:

- Transisi ilegal ditolak backend.
- Program `archived`, `rejected`, dan `cancelled` tidak dapat diedit kecuali oleh permission khusus di step lanjutan.
- Submit wajib memiliki minimal nama, periode, tahun, bidang, tanggal rencana, PIC, dan minimal satu indikator keberhasilan.
- Approve/reject/revision wajib membuat row `work_program_approvals`.
- Self-approval ditolak.

## Status Transition Task

Status task:

- `todo`
- `in_progress`
- `blocked`
- `completed`
- `cancelled`

Transisi legal:

| From | To |
| --- | --- |
| `todo` | `in_progress` |
| `todo` | `cancelled` |
| `in_progress` | `blocked` |
| `blocked` | `in_progress` |
| `in_progress` | `completed` |
| `in_progress` | `cancelled` |
| `blocked` | `cancelled` |

Aturan:

- Task `completed` wajib `progress = 100`.
- Jika `progress = 100`, backend boleh menyetel status ke `completed` atau menolak bila status tidak sesuai. Keputusan implementasi Step 6: set otomatis lebih ramah.
- Task tidak boleh selesai bila dependency predecessor belum memenuhi aturan tipe dependency.

## Circular Dependency Prevention

### Task Hierarchy

Validasi saat create/update task:

- `parent_task_id` tidak boleh sama dengan task sendiri.
- Parent wajib berada pada program yang sama.
- Saat mengganti parent, service menelusuri ancestor parent sampai root.
- Jika task yang diedit ditemukan di chain ancestor, update ditolak.

### Task Dependency Graph

Validasi saat create dependency:

- predecessor dan successor tidak boleh sama.
- keduanya wajib berada pada program yang sama.
- edge duplikat ditolak.
- service membangun adjacency list dari dependency existing + candidate edge.
- DFS atau Kahn topological sort dipakai untuk mendeteksi cycle.
- Jika cycle terdeteksi, create/update dependency ditolak.

## Versioning dan Optimistic Locking

Gunakan `lock_version` di:

- `work_programs`
- `work_program_tasks`

Aturan:

- Form edit mengirim `lock_version`.
- Update memakai kondisi `where id = ? and lock_version = ?`.
- Jika tidak ada row ter-update, backend mengembalikan error conflict.
- Setiap update sukses menaikkan `lock_version`.

Alasan:

- Gantt drag/resize dan update progress rentan tabrakan antar user.
- Project sudah memakai lock database untuk workflow approval; optimistic locking melengkapi untuk edit UI.

## Audit Fields dan Activity Log

Audit field:

- `created_by`
- `updated_by`
- action-specific fields seperti `submitted_by`, `approved_by`, `evaluated_by`
- timestamps
- soft deletes untuk data utama

Activity log:

- log name `work_program`
- event mengikuti workflow dan perubahan task/progress/budget/document.
- properties menyimpan `before`, `after`, `changes`, `action`, dan `note` seperlunya.

## Rencana Model

Model:

- `WorkProgramPeriod`
- `WorkProgram`
- `WorkProgramAssignment`
- `WorkProgramCollaboratorDivision`
- `WorkProgramTask`
- `WorkProgramTaskAssignee`
- `WorkProgramTaskDependency`
- `WorkProgramApproval`
- `WorkProgramRisk`
- `WorkProgramEvaluation`

Trait:

- `HasFactory`
- `SoftDeletes` untuk period, program, task, risk

Cast:

- tanggal ke `date` atau `datetime`
- decimal budget/cost
- boolean milestone/active
- json metadata approval

## Gantt Compatibility Design

Data Gantt harus dapat dipetakan ke library apapun:

Program node:

- id: `program:{id}`
- text/name
- start/end planned
- progress dari weighted task progress
- type `project`

Task node:

- id: `task:{id}`
- parent id
- start/end planned
- actual start/end
- progress
- milestone flag
- order

Dependency link:

- id
- source/predecessor
- target/successor
- type
- lag

Kandidat utama:

- DHTMLX Gantt Community: lebih matang untuk dependency, milestone, grid/timeline, dan project hierarchy.
- SVAR React Gantt: lebih natural untuk React dan modern component API.

Keputusan desain:

- Backend tidak bergantung pada shape library.
- Buat endpoint mapper khusus Gantt di Step 6/9.
- Step 9 melakukan proof-of-fit sebelum dependency final dipasang.

## Acceptance Criteria Step 2

- Setiap tabel memiliki tujuan: PASS.
- Setiap relasi dijelaskan: PASS.
- Status transition jelas: PASS.
- Circular dependency prevention dirancang: PASS.
- Scope bidang dan organisasi jelas: PASS.
- Optimistic locking dirancang: PASS.
- Desain mengikuti convention project: PASS.
- Tidak ada migration dibuat pada Step 2: PASS.
