<?php

namespace Tests\Feature\Secretariat;

use App\Models\LetterTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class TemplateSaveLayoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_template_layout_endpoint_persists_blocks_and_settings(): void
    {
        $user = User::factory()->create();
        Permission::firstOrCreate(['name' => 'templates.manage', 'guard_name' => 'web']);
        $user->givePermissionTo('templates.manage');

        $template = LetterTemplate::create([
            'name' => 'Template Uji',
            'code' => 'TEMPLATE_UJI',
            'is_active' => true,
        ]);

        $payload = [
            'layout' => [
                ['i' => 'kop_surat', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 4],
                ['i' => 'isi_surat', 'x' => 0, 'y' => 4, 'w' => 12, 'h' => 10],
            ],
            'blocks' => [
                ['id' => 'kop_surat', 'type' => 'kop_surat', 'label' => 'Kop Surat', 'content' => 'Kop'],
                ['id' => 'isi_surat', 'type' => 'isi_surat', 'label' => 'Isi Surat', 'content' => 'Isi Baru'],
            ],
            'settings' => [
                'font_family' => 'Times New Roman',
                'font_size' => 16,
                'line_height' => 1.45,
                'paragraph_spacing' => 8,
                'repeat_header' => true,
                'paper_format' => 'Letter',
                'orientation' => 'L',
                'margin_top_mm' => 15,
                'margin_right_mm' => 16,
                'margin_bottom_mm' => 17,
                'margin_left_mm' => 18,
                'content_top_gap_mm' => 7,
            ],
        ];

        $response = $this->actingAs($user)->put(route('secretariat.templates.layout', $template), $payload);
        $response->assertRedirect();

        $template->refresh();
        $this->assertCount(2, $template->layout_json ?? []);
        $this->assertCount(2, $template->blocks_json ?? []);
        $this->assertSame('Times New Roman', $template->margin_json['font_family'] ?? null);
        $this->assertSame(16.0, (float) ($template->margin_json['font_size'] ?? 0));
        $this->assertTrue((bool) ($template->margin_json['repeat_header'] ?? false));
        $this->assertSame('Letter', $template->paper);
        $this->assertSame('L', $template->margin_json['orientation'] ?? null);
        $this->assertSame(15.0, (float) ($template->margin_json['margin_top_mm'] ?? 0));
        $this->assertSame(18.0, (float) ($template->margin_json['margin_left_mm'] ?? 0));
        $this->assertSame(7.0, (float) ($template->margin_json['content_top_gap_mm'] ?? 0));
    }
}
