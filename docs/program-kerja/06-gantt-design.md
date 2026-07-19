# Gantt Design - Modul Program Kerja

Tanggal update: 2026-07-16

## Tujuan

Gantt Program Kerja menampilkan struktur program, task, milestone, PIC, assignee, jadwal, progress, dan dependency tanpa library Gantt komersial.

## Komponen

Frontend:

```text
resources/js/Components/WorkPrograms/GanttChart.jsx
```

Backend:

```text
App\Http\Controllers\WorkPrograms\WorkProgramGanttController
App\Services\WorkPrograms\WorkProgramGanttDataService
App\Services\WorkPrograms\WorkProgramTaskService
App\Services\WorkPrograms\WorkProgramTaskDependencyService
App\Services\WorkPrograms\WorkProgramDependencyValidator
```

## Dataset

Endpoint:

```text
GET /work-programs/{workProgram}/gantt
route: work-programs.gantt
```

Response:

```json
{
  "program": {
    "id": "program:1",
    "database_id": 1,
    "name": "Program Edukasi",
    "program_code": "PROKER-0001",
    "status": "approved",
    "planned_start_date": "2026-08-01",
    "planned_end_date": "2026-08-31",
    "progress": 40,
    "division": {"id": 1, "name": "Bidang A", "code": "A"},
    "primary_pic": {"id": 1, "name": "Nama", "email": "user@example.test"}
  },
  "tasks": [],
  "dependencies": []
}
```

Task item:

```json
{
  "id": "task:10",
  "database_id": 10,
  "program_id": 1,
  "parent_id": "program:1",
  "parent_task_id": null,
  "task_code": "TASK-001",
  "name": "Persiapan",
  "status": "todo",
  "priority": "medium",
  "planned_start_date": "2026-08-01",
  "planned_end_date": "2026-08-07",
  "actual_start_date": null,
  "actual_end_date": null,
  "duration_days": 7,
  "progress": 0,
  "weight": 10,
  "is_milestone": false,
  "sort_order": 1,
  "lock_version": 0,
  "pic": {},
  "assignees": []
}
```

Dependency item:

```json
{
  "id": 1,
  "source": "task:10",
  "target": "task:11",
  "predecessor_task_id": 10,
  "successor_task_id": 11,
  "type": "finish_to_start",
  "lag_days": 0
}
```

## Layout Frontend

Gantt memakai custom React layout:

- timeline horizontal berdasarkan rentang tanggal program/task;
- row tree berdasarkan `parent_task_id`;
- milestone digambar sebagai titik/marker;
- progress ditampilkan pada bar;
- dependency ditampilkan sebagai relasi data dan panel;
- detail task dapat diedit lewat form.

## Interaksi

Fitur yang tersedia:

- load dataset Gantt;
- melihat task tree;
- melihat milestone;
- melihat dependency;
- update jadwal/task;
- update progress task;
- bulk schedule update;
- create/delete dependency melalui endpoint backend;
- validasi lock version.

## Validasi Jadwal

Task:

- planned end tidak boleh sebelum planned start;
- actual end tidak boleh sebelum actual start;
- milestone harus memiliki planned start sama dengan planned end;
- parent task tidak boleh menyebabkan hierarchy cycle.

Dependency:

- predecessor dan successor wajib berada pada program yang sama;
- predecessor tidak boleh sama dengan successor;
- circular dependency ditolak;
- lag dibatasi `-365` sampai `365`.

## Progress Formula

Progress program dihitung dari leaf task:

```text
if total weight > 0:
    sum(task.progress * task.weight) / sum(task.weight)
else:
    average(task.progress)
```

Parent task tidak dihitung ganda bila memiliki child.

## Performance

Backend eager-load:

```text
division
primaryPic
tasks.pic
tasks.assignees.user
tasks.outgoingDependencies
```

Index database pendukung:

- `work_program_tasks(work_program_id, parent_task_id, sort_order)`;
- `work_program_tasks(status)`;
- `work_program_tasks(pic_user_id)`;
- `work_program_task_dependencies(work_program_id)`;
- `work_program_task_dependencies(predecessor_task_id)`;
- `work_program_task_dependencies(successor_task_id)`.

## Security

- Endpoint Gantt membutuhkan `WorkProgramPolicy::view`.
- Update task membutuhkan `WorkProgramTaskPolicy::update`.
- Update progress membutuhkan `WorkProgramTaskPolicy::updateProgress`.
- Dependency membutuhkan `WorkProgramTaskPolicy::manageDependency`.
- Nested route memastikan task/dependency berada pada program yang sama.

## Error Handling

| Kondisi | Response |
| --- | --- |
| Tidak punya akses | 403 |
| Task bukan milik program | 404 |
| Lock mismatch | 422 |
| Dependency cycle | 422 |
| Milestone tanggal tidak valid | 422 |

