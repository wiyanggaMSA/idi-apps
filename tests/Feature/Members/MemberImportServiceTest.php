<?php

namespace Tests\Feature\Members;

use App\Models\User;
use App\Services\Members\MemberImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class MemberImportServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_uses_standard_member_template_columns(): void
    {
        $user = User::factory()->create();
        $file = $this->xlsx([
            [
                'NPA',
                'Nama Lengkap',
                'Pendidikan',
                'No. HP',
                'Jenis Kelamin',
                'Tempat Lahir',
                'Tanggal Lahir',
                'Email',
                'Divisi',
                'Jabatan',
                'Tanggal Bergabung',
                'Status',
                'SIP-1',
                'SIP-2',
                'SIP-3',
                'Alamat',
                'Catatan',
            ],
            [
                '6355',
                'HAERUDIN',
                'Umum',
                '628128784409',
                'Pria',
                'Bandung',
                '09-05-1962',
                'haerudinpurwakarta@example.test',
                null,
                null,
                null,
                'aktif',
                null,
                null,
                null,
                null,
                null,
            ],
        ]);

        app(MemberImportService::class)->import($file, $user->id);

        $this->assertDatabaseHas('members', [
            'npa' => '6355',
            'full_name' => 'HAERUDIN',
            'education' => 'Umum',
            'phone' => '628128784409',
            'gender' => 'M',
            'birth_place' => 'Bandung',
            'email' => 'haerudinpurwakarta@example.test',
        ]);

        $this->assertSame('1962-05-09', \App\Models\Member::first()->birth_date->format('Y-m-d'));
    }

    public function test_import_recovers_template_rows_shifted_by_region_and_branch_columns(): void
    {
        $user = User::factory()->create();
        $file = $this->xlsx([
            [
                'NPA',
                'Nama Lengkap',
                'Pendidikan',
                'No. HP',
                'Jenis Kelamin',
                'Tempat Lahir',
                'Tanggal Lahir',
                'Email',
                'Divisi',
                'Jabatan',
                'Tanggal Bergabung',
                'Status',
                'SIP-1',
                'SIP-2',
                'SIP-3',
                'Alamat',
                'Catatan',
            ],
            [
                'Jawa Barat',
                'Purwakarta',
                '6355',
                'HAERUDIN',
                'Umum',
                '628128784409',
                'Pria',
                'Bandung',
                '09-05-1962',
                'haerudinpurwakarta@example.test',
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
        ]);

        app(MemberImportService::class)->import($file, $user->id);

        $this->assertDatabaseHas('members', [
            'npa' => '6355',
            'full_name' => 'HAERUDIN',
            'education' => 'Umum',
            'phone' => '628128784409',
            'gender' => 'M',
            'birth_place' => 'Bandung',
            'email' => 'haerudinpurwakarta@example.test',
        ]);

        $this->assertSame('1962-05-09', \App\Models\Member::first()->birth_date->format('Y-m-d'));

        $this->assertDatabaseMissing('members', [
            'npa' => 'Jawa Barat',
            'full_name' => 'Purwakarta',
            'email' => 'Bandung',
        ]);
    }

    private function xlsx(array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        foreach ($rows as $rowIndex => $row) {
            foreach ($row as $columnIndex => $value) {
                $sheet->setCellValue([$columnIndex + 1, $rowIndex + 1], $value);
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'member-import-').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile(
            $path,
            'members.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );
    }
}
