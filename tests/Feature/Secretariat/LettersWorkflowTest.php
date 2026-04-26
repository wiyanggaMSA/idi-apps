<?php

namespace Tests\Feature\Secretariat;

use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use App\Services\Secretariat\LetterPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class LettersWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_draft_uses_template_structure_when_layout_not_sent(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'letters.create');

        $template = LetterTemplate::create([
            'name' => 'Template Rekomendasi',
            'code' => 'TPL_REKOM',
            'classification' => 'A',
            'is_active' => true,
            'layout_json' => [
                ['i' => 'kop_surat', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 4],
                ['i' => 'isi_surat', 'x' => 0, 'y' => 4, 'w' => 12, 'h' => 10],
            ],
            'blocks_json' => [
                ['id' => 'kop_surat', 'type' => 'kop_surat', 'label' => 'Kop Surat', 'content' => 'Kop'],
                ['id' => 'isi_surat', 'type' => 'isi_surat', 'label' => 'Isi Surat', 'content' => 'Isi default'],
            ],
        ]);

        $response = $this->actingAs($user)->post(route('secretariat.letters.store'), [
            'template_id' => $template->id,
            'subject' => 'Surat Uji Draft',
            'recipient_text' => 'Yth. Penerima',
            'signer_name' => 'Wisnu Agung Wiyangga',
            'signer_title' => 'Ketua IDI',
            'date' => '2026-03-10',
        ]);

        $response->assertRedirect();

        $letter = Letter::query()->first();
        $this->assertNotNull($letter);
        $this->assertSame($template->id, $letter->template_id);
        $this->assertSame('draft', $letter->status);
        $this->assertCount(2, $letter->layout_json ?? []);
        $this->assertCount(2, $letter->blocks_json ?? []);
    }

    public function test_finalize_marks_letter_finalized_and_creates_version(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'letters.finalize');

        $letter = Letter::create([
            'type' => 'out',
            'status' => 'draft',
            'subject' => 'Rekom PPDS',
            'recipient_text' => 'Yth Dekan FK Unpad',
            'content_plaintext' => 'isi',
            'layout_json' => [
                ['i' => 'kop_surat', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 4],
                ['i' => 'isi_surat', 'x' => 0, 'y' => 4, 'w' => 12, 'h' => 10],
            ],
            'blocks_json' => [
                ['id' => 'kop_surat', 'type' => 'kop_surat', 'label' => 'Kop Surat', 'content' => 'Kop'],
                ['id' => 'isi_surat', 'type' => 'isi_surat', 'label' => 'Isi Surat', 'content' => 'Isi Surat'],
            ],
            'content_blocks_json' => [
                ['id' => 'kop_surat', 'type' => 'kop_surat', 'label' => 'Kop Surat', 'content' => 'Kop'],
                ['id' => 'isi_surat', 'type' => 'isi_surat', 'label' => 'Isi Surat', 'content' => 'Isi Surat'],
            ],
            'created_by' => $user->id,
        ]);

        $pdfMock = Mockery::mock(LetterPdfService::class);
        $pdfMock->shouldReceive('generateFromHtml')->once()->andReturnNull();
        $this->app->instance(LetterPdfService::class, $pdfMock);

        $response = $this->actingAs($user)->post(route('secretariat.letters.finalize', $letter), [
            'number' => '001/-/IDI/III/2026',
            'classification' => 'A',
            'date' => '2026-03-10',
            'subject' => 'Rekom PPDS',
            'recipient_text' => 'Yth Dekan FK Unpad',
            'cc_text' => 'Tembusan',
            'signer_name' => 'Wisnu Agung Wiyangga',
            'signer_title' => 'Ketua IDI',
            'layout' => $letter->layout_json,
            'blocks' => $letter->blocks_json,
            'content_blocks_json' => $letter->blocks_json,
        ]);

        $response->assertRedirect();

        $letter->refresh();
        $this->assertSame('finalized', $letter->status);
        $this->assertSame('001/-/IDI/III/2026', $letter->number);
        $this->assertNotNull($letter->pdf_path);
        $this->assertFalse((bool) $letter->is_revoked);
        $this->assertDatabaseCount('letter_versions', 1);
    }

    public function test_pdf_download_generates_fallback_when_file_not_exist(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'letters.export_pdf');

        $letter = Letter::create([
            'type' => 'out',
            'status' => 'draft',
            'subject' => 'Surat Uji PDF',
            'recipient_text' => 'Yth Penerima',
            'layout_json' => [
                ['i' => 'kop_surat', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 4],
                ['i' => 'isi_surat', 'x' => 0, 'y' => 4, 'w' => 12, 'h' => 10],
            ],
            'blocks_json' => [
                ['id' => 'kop_surat', 'type' => 'kop_surat', 'label' => 'Kop Surat', 'content' => 'Kop'],
                ['id' => 'isi_surat', 'type' => 'isi_surat', 'label' => 'Isi Surat', 'content' => 'Isi Surat'],
            ],
            'created_by' => $user->id,
        ]);

        $pdfBytes = '%PDF-1.4 test bytes';
        $pdfMock = Mockery::mock(LetterPdfService::class);
        $pdfMock->shouldReceive('generateFromHtmlContent')->once()->andReturn($pdfBytes);
        $this->app->instance(LetterPdfService::class, $pdfMock);

        $response = $this->actingAs($user)->get(route('secretariat.letters.pdf', $letter));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame($pdfBytes, $response->getContent());
    }

    private function grantPermission(User $user, string $permission): void
    {
        Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        $user->givePermissionTo($permission);
    }
}
