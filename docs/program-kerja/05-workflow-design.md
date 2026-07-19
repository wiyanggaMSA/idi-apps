# Workflow Design - Modul Program Kerja

Tanggal update: 2026-07-16

## Aktor

- Creator: pembuat draft Program Kerja.
- Submitter: user yang mengajukan program.
- Reviewer: user dengan `work_program.review`.
- Approver: user dengan `work_program.approve`.
- PIC utama: `primary_pic_user_id`.
- PIC task: `work_program_tasks.pic_user_id`.
- Assignee task: user pada `work_program_task_assignees`.
- Evaluator: user dengan `work_program.evaluate`.

## State Machine

Status domain yang tersedia:

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

Transisi domain:

```text
draft -> submitted, cancelled
submitted -> draft, under_review, cancelled
under_review -> revision_requested, approved, rejected
revision_requested -> submitted, cancelled
approved -> scheduled, cancelled
scheduled -> in_progress, cancelled
in_progress -> on_hold, completed, cancelled
on_hold -> in_progress
completed -> evaluated
evaluated -> archived
```

Endpoint workflow yang tersedia pada implementasi saat ini:

```text
submit
withdraw
start-review
request-revision
approve
reject
schedule
start-execution
hold
resume
complete
archive
```

Status lanjutan `scheduled`, `in_progress`, `completed`, `evaluated`, dan `archived` sudah terhubung end-to-end. Aksi evaluasi tetap dilakukan melalui endpoint evaluasi.

## Aksi Workflow Implemented

### Submit

From:

```text
draft, revision_requested
```

To:

```text
submitted
```

Validasi:

- program memiliki nama, periode, tahun, bidang, tanggal rencana, PIC utama;
- memiliki tujuan atau indikator keberhasilan;
- user punya permission dan scope;
- tanggal dan budget valid.

Side effect:

- set `submitted_at`;
- set `submitted_by`;
- create approval action `submitted`;
- activity `work_program.submitted`;
- notifikasi `program_submitted`.

### Withdraw

From:

```text
submitted
```

To:

```text
draft
```

Side effect:

- clear `submitted_at`;
- clear `submitted_by`;
- create approval action `withdrawn`;
- activity `work_program.withdrawn`.

### Start Review

From:

```text
submitted
```

To:

```text
under_review
```

Validasi:

- actor punya `work_program.review`;
- actor bukan submitter.

Side effect:

- create approval action `review_started`;
- activity `work_program.review_started`;
- notifikasi `program_review_started`.

### Request Revision

From:

```text
under_review
```

To:

```text
revision_requested
```

Validasi:

- `note` wajib;
- actor bukan creator/submitter.

Side effect:

- create approval action `revision_requested`;
- activity `work_program.revision_requested`;
- notifikasi `program_revision_requested`.

### Approve

From:

```text
under_review
```

To:

```text
approved
```

Validasi:

- actor punya `work_program.approve`;
- actor bukan creator/submitter.

Side effect:

- set `approved_at`;
- set `approved_by`;
- clear rejected marker;
- create approval action `approved`;
- activity `work_program.approved`;
- notifikasi `program_approved`.

### Reject

From:

```text
under_review
```

To:

```text
rejected
```

Validasi:

- `note` wajib;
- actor bukan creator/submitter.

Side effect:

- set `rejected_at`;
- set `rejected_by`;
- clear approved marker;
- create approval action `rejected`;
- activity `work_program.rejected`;
- notifikasi `program_rejected`.

## Evaluasi

Evaluasi dilakukan melalui:

```text
POST /work-programs/{workProgram}/evaluation
```

Rules:

- program harus `completed`;
- field evaluasi utama wajib;
- jika `mark_evaluated = true`, status berubah ke `evaluated`;
- jika `mark_evaluated = true`, approval history action `evaluated` dibuat;
- activity `work_program.evaluated`.

## Aksi Pelaksanaan Implemented

### Schedule

From `approved` to `scheduled`.

Validasi:

- program memiliki minimal satu task;
- semua task memiliki tanggal rencana.

Side effect:

- create approval action `scheduled`;
- activity `work_program.scheduled`.

### Start Execution

From `scheduled` to `in_progress`.

Side effect:

- set `actual_start_date` bila kosong;
- create approval action `started`;
- activity `work_program.started`.

### Hold

From `in_progress` to `on_hold`.

Validasi:

- `note` wajib.

Side effect:

- create approval action `held`;
- activity `work_program.held`.

### Resume

From `on_hold` to `in_progress`.

Side effect:

- create approval action `resumed`;
- activity `work_program.resumed`.

### Complete

From `in_progress` to `completed`.

Validasi:

- semua task aktif harus `completed`;
- progress program harus 100%.

Side effect:

- set `completed_at`;
- set `actual_end_date` bila kosong;
- create approval action `completed`;
- activity `work_program.completed`;
- notifikasi `program_completed`.

### Archive

From `evaluated` to `archived`.

Side effect:

- set `archived_at`;
- create approval action `archived`;
- activity `work_program.archived`.

## Task Workflow

Task status:

```text
todo
in_progress
blocked
completed
cancelled
```

Rules:

- task dikelola oleh user dengan `work_program.manage_tasks` pada program yang masih aktif;
- progress task dapat diubah oleh user dengan `work_program.update_progress` pada program `scheduled` atau `in_progress`;
- update progress membuat row `work_program_progress_updates`;
- `lock_version` mencegah stale update;
- progress program dihitung dari leaf task.

## Dependency Workflow

Saat dependency dibuat:

- predecessor dan successor harus task pada program yang sama;
- predecessor tidak boleh sama dengan successor;
- circular dependency ditolak;
- duplicate dependency ditolak oleh unique constraint;
- activity `work_program.dependency.created`.

Saat dependency dihapus:

- dependency harus milik program;
- activity `work_program.dependency.deleted`.

## Notifikasi

Notifikasi disimpan di `work_program_notifications`.

Jenis yang didukung:

- `program_submitted`;
- `program_review_started`;
- `program_revision_requested`;
- `program_approved`;
- `program_rejected`;
- `program_completed`;
- `task_assigned`;
- `task_deadline_soon`;
- `task_overdue`;
- `progress_stale`;
- `evaluation_required`.

Deduplication:

- `dedupe_key` unik per type, program, task/program, dan recipient.
- Pemanggilan ulang event yang sama tidak membuat duplikasi.

## Audit Trail

Log name:

```text
work_program
```

Event utama:

```text
work_program.created
work_program.updated
work_program.deleted
work_program.submitted
work_program.withdrawn
work_program.review_started
work_program.revision_requested
work_program.approved
work_program.rejected
work_program.task.created
work_program.task.updated
work_program.task.deleted
work_program.task.bulk_schedule_updated
work_program.dependency.created
work_program.dependency.deleted
work_program.budget.updated
work_program.document.uploaded
work_program.document.detached
work_program.risk.created
work_program.risk.updated
work_program.risk.deleted
work_program.evaluated
```

## Error Handling

| Kondisi | Handling |
| --- | --- |
| Unauthorized | 403 |
| Illegal transition | Redirect back dengan `errors.workflow` |
| Missing note | Validation error `note` |
| Self approval | 403 atau domain error |
| Duplicate action setelah status berubah | 403 |
| Lock mismatch | 422 dengan pesan reload |
