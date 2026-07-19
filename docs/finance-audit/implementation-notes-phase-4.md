# Implementation Notes - Phase 4

## Scope
- Menambahkan Laravel Policy untuk authorization finance.
- Memindahkan authorization controller finance ke `$this->authorize(...)`.
- Menjaga permission string Spatie yang sudah ada.
- Memastikan frontend tetap hanya mengikuti permission backend dari Inertia shared props.

## Policy
- `CashTransactionPolicy`
  - `viewAny`, `view`, `create`, `update`, `updateNonFinancialFields`, `requestVoid`, `approveVoid`, `viewReport`, `export`
- `DuesPaymentPolicy`
  - `viewAny`, `view`, `create`, `sync`, `update`, `requestVoid`, `approveVoid`, `viewReport`, `export`
- `FinancialActionRequestPolicy`
  - `viewAny`, `review`, `approve`, `reject`

## Controller Authorization
- `TransactionsController` memakai policy untuk list, create, update metadata, attachment view, dan request void.
- `DuesController` memakai policy untuk list, create payment, update payment, void request, dan member payment detail.
- `DuesRecapController` memakai policy untuk view report dan export.
- `CashReportsController` dan `CashExportController` memakai policy sebelum redirect.
- `AuditController` memakai `FinancialActionRequestPolicy` untuk list/review approval.

## Frontend Authorization
- Inertia shared props tetap mengirim `auth.permissions` dari backend.
- React tetap menyembunyikan/disable tombol berdasarkan permission, tetapi backend policy menjadi sumber kebenaran.

## Batasan
- Tidak ada perubahan role baru.
- Tidak ada perubahan schema database.
- Tidak ada perubahan business flow transaksi, iuran, atau void approval.

## Automated Verification
Jalankan:

```bash
php artisan test --filter=FinancePolicyAuthorizationTest
```
