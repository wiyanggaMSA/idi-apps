<?php

namespace Tests\Feature\Secretariat;

use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\LetterSequence;
use App\Models\LetterTemplate;
use App\Models\Member;
use App\Models\User;
use App\Services\Secretariat\LetterPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Inertia\Testing\AssertableInertia as Assert;
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
        $this->assertNotNull($letter->public_hash);
        $this->assertCount(2, $letter->layout_json ?? []);
        $this->assertCount(2, $letter->blocks_json ?? []);

        $this->get(route('letters.verify', $letter->public_hash))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/VerifyLetter')
                ->where('payload.status', 'DRAFT'));
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

    public function test_finalize_keeps_letter_final_but_marks_barcode_pending_until_signature_complete(): void
    {
        $admin = User::factory()->create();
        $this->grantPermission($admin, 'letters.finalize');
        $signerUser = User::factory()->create();
        $member = Member::factory()->create([
            'user_id' => $signerUser->id,
            'full_name' => 'Dr Wisnu Agung',
        ]);

        $letter = $this->makeDraftLetter($admin);

        $pdfMock = Mockery::mock(LetterPdfService::class);
        $pdfMock->shouldReceive('generateFromHtml')->once()->andReturnNull();
        $this->app->instance(LetterPdfService::class, $pdfMock);

        $response = $this->actingAs($admin)->post(route('secretariat.letters.finalize', $letter), [
            'number' => '002/IDI-PWK/VI/2026',
            'classification' => 'A',
            'date' => '2026-06-11',
            'subject' => 'Rekomendasi PPDS',
            'recipient_text' => 'Yth Ketua PPDS',
            'signers' => [[
                'member_id' => $member->id,
                'name' => $member->full_name,
                'title' => 'Ketua IDI',
                'position' => 'right',
                'qr_enabled' => true,
            ]],
            'layout' => $letter->layout_json,
            'blocks' => $letter->blocks_json,
            'content_blocks_json' => $letter->blocks_json,
        ]);

        $response->assertRedirect();

        $letter->refresh();
        $this->assertSame('finalized', $letter->status);
        $this->assertDatabaseHas('letter_signatures', [
            'letter_id' => $letter->id,
            'signer_member_id' => $member->id,
            'signed_at' => null,
        ]);
        $this->assertSame('PENDING_SIGNATURES', $letter->qr_payload_json['signature_verification']['status']);

        $this->get(route('letters.verify', $letter->public_hash))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/VerifyLetter')
                ->where('payload.status', 'PENDING_SIGNATURES'));
    }

    public function test_linked_member_can_sign_and_complete_letter_barcode_metadata(): void
    {
        $admin = User::factory()->create();
        $this->grantPermission($admin, 'letters.finalize');
        $signerUser = User::factory()->create();
        $member = Member::factory()->create([
            'user_id' => $signerUser->id,
            'full_name' => 'Dr Ketua IDI',
        ]);

        $letter = $this->makeDraftLetter($admin);

        $pdfMock = Mockery::mock(LetterPdfService::class);
        $pdfMock->shouldReceive('generateFromHtml')->once()->andReturnNull();
        $this->app->instance(LetterPdfService::class, $pdfMock);

        $this->actingAs($admin)->post(route('secretariat.letters.finalize', $letter), [
            'number' => '003/IDI-PWK/VI/2026',
            'classification' => 'A',
            'date' => '2026-06-11',
            'subject' => 'Surat Tanda Tangan',
            'recipient_text' => 'Yth Penerima',
            'signers' => [[
                'member_id' => $member->id,
                'name' => $member->full_name,
                'title' => 'Ketua IDI',
                'position' => 'right',
                'qr_enabled' => true,
            ]],
            'layout' => $letter->layout_json,
            'blocks' => $letter->blocks_json,
            'content_blocks_json' => $letter->blocks_json,
        ])->assertRedirect();

        $signature = $letter->refresh()->signatures()->firstOrFail();

        $this->actingAs($signerUser)
            ->post(route('secretariat.signatures.sign', $signature))
            ->assertRedirect(route('secretariat.signatures.index'));

        $signature->refresh();
        $letter->refresh();
        $this->assertNotNull($signature->signed_at);
        $this->assertSame('SIGNED_COMPLETE', $letter->qr_payload_json['signature_verification']['status']);

        $this->get(route('letters.verify', $letter->public_hash))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/VerifyLetter')
                ->where('payload.status', 'VALID'));
    }

    public function test_refinalizing_with_one_signer_excludes_stale_signature_records(): void
    {
        $admin = User::factory()->create();
        $this->grantPermission($admin, 'letters.finalize');
        $activeMember = Member::factory()->create(['full_name' => 'Dr Aktif']);
        $staleMember = Member::factory()->create(['full_name' => 'Dr Lama']);
        $letter = $this->makeDraftLetter($admin);

        LetterSignature::create([
            'letter_id' => $letter->id,
            'signer_member_id' => $staleMember->id,
            'signer_name_snapshot' => $staleMember->full_name,
            'signer_role_snapshot' => 'Sekretaris',
            'verification_code' => 'stale-code',
            'signed_at' => null,
        ]);

        $pdfMock = Mockery::mock(LetterPdfService::class);
        $pdfMock->shouldReceive('generateFromHtml')->once()->andReturnNull();
        $this->app->instance(LetterPdfService::class, $pdfMock);

        $this->actingAs($admin)->post(route('secretariat.letters.finalize', $letter), [
            'number' => '004/IDI-PWK/VI/2026',
            'classification' => 'A',
            'date' => '2026-06-11',
            'subject' => 'Surat Satu Penandatangan',
            'recipient_text' => 'Yth Penerima',
            'signers' => [[
                'member_id' => $activeMember->id,
                'name' => $activeMember->full_name,
                'title' => 'Ketua IDI',
                'position' => 'right',
                'qr_enabled' => true,
            ]],
            'layout' => $letter->layout_json,
            'blocks' => $letter->blocks_json,
            'content_blocks_json' => $letter->blocks_json,
        ])->assertRedirect();

        $letter->refresh();
        $this->assertSame(1, $letter->qr_payload_json['signature_verification']['required_count']);
        $this->assertSame(0, $letter->qr_payload_json['signature_verification']['signed_count']);
        $this->assertNotNull(
            LetterSignature::query()
                ->where('letter_id', $letter->id)
                ->where('signer_member_id', $staleMember->id)
                ->value('revoked_at')
        );

        $this->get(route('letters.verify', $letter->public_hash))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/VerifyLetter')
                ->where('payload.signature_verification.required_count', 1)
                ->where('payload.signature_verification.signed_count', 0));
    }

    public function test_signature_inbox_uses_latest_letter_signer_setup_for_counts(): void
    {
        $signerUser = User::factory()->create();
        $member = Member::factory()->create([
            'user_id' => $signerUser->id,
            'full_name' => 'Anne Hediana Koesoemah',
        ]);
        $staleMember = Member::factory()->create(['full_name' => 'Penandatangan Lama']);

        $letter = Letter::create([
            'type' => 'out',
            'status' => 'finalized',
            'number' => '003/IDI-PWK/RK-PPDS/VI/2026',
            'date' => '2026-06-11',
            'subject' => 'Rekomendasi PPDS',
            'recipient_text' => 'Yth Penerima',
            'public_hash' => (string) \Illuminate\Support\Str::uuid(),
            'signer_name' => $member->full_name,
            'signer_title' => 'Ketua IDI',
            'signers_json' => [[
                'member_id' => $member->id,
                'name' => $member->full_name,
                'title' => 'Ketua IDI',
                'position' => 'right',
                'qr_enabled' => true,
            ]],
            'created_by' => $signerUser->id,
            'finalized_at' => now(),
        ]);

        LetterSignature::create([
            'letter_id' => $letter->id,
            'signer_member_id' => $member->id,
            'signer_name_snapshot' => $member->full_name,
            'signer_role_snapshot' => 'Ketua IDI',
            'verification_code' => 'active-code',
            'signed_at' => now(),
        ]);
        LetterSignature::create([
            'letter_id' => $letter->id,
            'signer_member_id' => $staleMember->id,
            'signer_name_snapshot' => $staleMember->full_name,
            'signer_role_snapshot' => 'Sekretaris',
            'verification_code' => 'stale-code',
            'signed_at' => null,
        ]);

        $this->actingAs($signerUser)
            ->get(route('secretariat.signatures.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Secretariat/Signatures/Index')
                ->where('signatures.0.letter.signature_summary.status', 'SIGNED_COMPLETE')
                ->where('signatures.0.letter.signature_summary.required_count', 1)
                ->where('signatures.0.letter.signature_summary.signed_count', 1));
    }

    public function test_generate_number_only_previews_without_advancing_sequence(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'letters.create');

        $template = LetterTemplate::create([
            'name' => 'Template Nomor',
            'code' => 'TPL-NO',
            'classification' => 'RK',
            'number_format' => '{number}/IDI-PWK/{type}/{roman_month}/{year}',
            'number_reset_policy' => 'monthly',
            'is_active' => true,
        ]);
        $letter = $this->makeDraftLetter($user);
        $letter->update(['template_id' => $template->id]);

        $payload = [
            'template_id' => $template->id,
            'date' => '2026-06-11',
            'classification' => 'RK-PPDS',
        ];

        $first = $this->actingAs($user)
            ->postJson(route('secretariat.letters.generate-number', $letter), $payload)
            ->assertOk()
            ->json('number');
        $second = $this->actingAs($user)
            ->postJson(route('secretariat.letters.generate-number', $letter), $payload)
            ->assertOk()
            ->json('number');

        $this->assertSame('001/IDI-PWK/RK-PPDS/VI/2026', $first);
        $this->assertSame($first, $second);
        $this->assertDatabaseMissing('letter_sequences', [
            'letter_template_id' => $template->id,
            'year' => 2026,
            'month' => 6,
        ]);
        $this->assertNull($letter->refresh()->number);
    }

    public function test_generate_number_continues_after_highest_existing_number_for_same_format(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'letters.create');

        $template = LetterTemplate::create([
            'name' => 'Rekom PPPDS',
            'code' => 'TPL-RK-PPDS',
            'classification' => 'RK-PPDS',
            'number_format' => '{number}/IDI-PWK/RK-PPDS/{roman_month}/{year}',
            'number_reset_policy' => 'monthly',
            'is_active' => true,
        ]);
        Letter::create([
            'type' => 'out',
            'template_id' => $template->id,
            'status' => 'finalized',
            'number' => '003/IDI-PWK/RK-PPDS/VI/2026',
            'date' => '2026-06-11',
            'subject' => 'Rekomendasi PPDS',
            'recipient_text' => 'Yth Penerima',
            'created_by' => $user->id,
        ]);
        $letter = $this->makeDraftLetter($user);
        $letter->update(['template_id' => $template->id]);

        $number = $this->actingAs($user)
            ->postJson(route('secretariat.letters.generate-number', $letter), [
                'template_id' => $template->id,
                'date' => '2026-06-20',
                'classification' => 'Rekomendasi',
            ])
            ->assertOk()
            ->json('number');

        $this->assertSame('004/IDI-PWK/RK-PPDS/VI/2026', $number);
    }

    public function test_finalize_uses_first_unused_number_even_when_sequence_was_advanced(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'letters.finalize');

        $template = LetterTemplate::create([
            'name' => 'Template Nomor Gap',
            'code' => 'TPL-GAP',
            'classification' => 'RK',
            'number_format' => '{number}/IDI-PWK/{type}/{roman_month}/{year}',
            'number_reset_policy' => 'monthly',
            'last_number' => 5,
            'is_active' => true,
        ]);
        LetterSequence::create([
            'letter_template_id' => $template->id,
            'year' => 2026,
            'month' => 6,
            'last_seq' => 5,
        ]);
        Letter::create([
            'type' => 'out',
            'template_id' => $template->id,
            'status' => 'finalized',
            'number' => '001/IDI-PWK/RK-PPDS/VI/2026',
            'date' => '2026-06-10',
            'subject' => 'Nomor Lama',
            'recipient_text' => 'Yth Penerima',
            'created_by' => $user->id,
        ]);
        $letter = $this->makeDraftLetter($user);
        $letter->update(['template_id' => $template->id]);

        $pdfMock = Mockery::mock(LetterPdfService::class);
        $pdfMock->shouldReceive('generateFromHtml')->once()->andReturnNull();
        $this->app->instance(LetterPdfService::class, $pdfMock);

        $this->actingAs($user)->post(route('secretariat.letters.finalize', $letter), [
            'template_id' => $template->id,
            'classification' => 'RK-PPDS',
            'date' => '2026-06-11',
            'subject' => 'Nomor Tidak Lompat',
            'recipient_text' => 'Yth Penerima',
            'signer_name' => 'Ketua',
            'signer_title' => 'Ketua IDI',
            'layout' => $letter->layout_json,
            'blocks' => $letter->blocks_json,
            'content_blocks_json' => $letter->blocks_json,
        ])->assertRedirect();

        $this->assertSame('002/IDI-PWK/RK-PPDS/VI/2026', $letter->refresh()->number);
        $this->assertSame(5, (int) LetterSequence::query()
            ->where('letter_template_id', $template->id)
            ->where('year', 2026)
            ->where('month', 6)
            ->value('last_seq'));
    }

    private function grantPermission(User $user, string $permission): void
    {
        Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        $user->givePermissionTo($permission);
    }

    private function makeDraftLetter(User $user): Letter
    {
        return Letter::create([
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
    }
}
