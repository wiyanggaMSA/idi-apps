<?php

namespace Tests\Unit;

use App\Services\Secretariat\LetterBodyHtmlFormatter;
use PHPUnit\Framework\TestCase;

class LetterBodyHtmlFormatterTest extends TestCase
{
    public function test_it_converts_consecutive_label_value_paragraphs_into_tables(): void
    {
        $formatter = new LetterBodyHtmlFormatter;
        $html = '<p>Pengantar: tetap paragraf karena berdiri sendiri.</p>'
            .'<p><br></p>'
            .'<p>Nama: Wisnu</p>'
            .'<p>NIK: 327882772828</p>'
            .'<p><br></p>'
            ."<p>Uraian\tKeterangan</p>"
            ."<p>Instansi\tUniversitas Padjadjaran</p>";

        $result = $formatter->formatLabelValueRows($html);

        $this->assertStringContainsString('<p>Pengantar: tetap paragraf karena berdiri sendiri.</p>', $result);
        $this->assertSame(2, substr_count($result, 'class="detail-table"'));
        $this->assertStringContainsString('<td class="detail-label" style="width: 8%;">Nama</td>', $result);
        $this->assertStringContainsString('<td class="detail-value" style="width: 90%;">327882772828</td>', $result);
        $this->assertStringContainsString('<td class="detail-label" style="width: 8%;">Instansi</td>', $result);
    }

    public function test_it_preserves_indent_for_label_value_groups(): void
    {
        $formatter = new LetterBodyHtmlFormatter;
        $html = '<p class="ql-indent-1">Nama: Wisnu</p>'
            .'<p class="ql-indent-1">Status: Dokter Umum</p>';

        $result = $formatter->formatLabelValueRows($html);

        $this->assertStringContainsString(
            '<table class="detail-table ql-indent-1" style="margin-left: 5%; width: 95%;">',
            $result
        );
    }
}
