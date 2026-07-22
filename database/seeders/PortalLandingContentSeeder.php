<?php

namespace Database\Seeders;

use App\Models\PortalLandingContent;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class PortalLandingContentSeeder extends Seeder
{
    public function run(): void
    {
        $this->copySampleImages();

        $this->seedSection(PortalLandingContent::SECTION_SLIDER, [
            [
                'title' => "Ikatan Dokter Indonesia\nCabang Purwakarta",
                'subtitle' => 'Profesional, Berintegritas, Mengabdi',
                'content' => 'Membangun profesionalisme, solidaritas, dan pengabdian dokter untuk kesehatan masyarakat Purwakarta.',
                'image_path' => 'portal/hero-1.jpg',
                'meta' => [
                    'button_label' => 'Lihat Profil Organisasi',
                    'button_url' => '#tentang',
                ],
                'sort_order' => 1,
            ],
            [
                'title' => 'Layanan Organisasi Terpadu',
                'subtitle' => 'Administrasi Anggota',
                'content' => 'Portal informasi untuk anggota, sekretariat, dan tata kelola organisasi.',
                'image_path' => 'portal/hero-2.jpg',
                'meta' => [
                    'button_label' => 'Layanan Anggota',
                    'button_url' => '#layanan',
                ],
                'sort_order' => 2,
            ],
            [
                'title' => 'Kesejawatan dan Pengabdian',
                'subtitle' => 'IDI Purwakarta',
                'content' => 'Mendukung dokter dalam pelayanan kesehatan masyarakat yang profesional dan beretika.',
                'image_path' => 'portal/hero-3.jpg',
                'meta' => [
                    'button_label' => 'Hubungi Sekretariat',
                    'button_url' => '#kontak',
                ],
                'sort_order' => 3,
            ],
        ]);

        $this->seedSection(PortalLandingContent::SECTION_ABOUT, [
            [
                'title' => 'Tentang IDI Cabang Purwakarta',
                'subtitle' => 'Profil Organisasi',
                'content' => "Ikatan Dokter Indonesia Cabang Purwakarta merupakan organisasi profesi dokter yang menjadi wadah pembinaan, pengembangan profesionalisme, solidaritas, dan pengabdian kepada masyarakat.\n\nIDI Cabang Purwakarta berkomitmen mendukung anggotanya dalam menjalankan profesi secara kompeten, beretika, dan bertanggung jawab.",
                'image_path' => 'portal/about-idi.jpg',
                'sort_order' => 1,
            ],
        ]);

        $this->seedSection(PortalLandingContent::SECTION_VISION_MISSION, [
            [
                'title' => 'Visi & Misi',
                'subtitle' => 'Arah Organisasi',
                'content' => 'Menjadi organisasi profesi dokter yang profesional, berintegritas, solid, dan berperan aktif dalam meningkatkan derajat kesehatan masyarakat Purwakarta.',
                'items' => [
                    'Meningkatkan kompetensi dan profesionalisme anggota.',
                    'Memperkuat solidaritas dan kesejawatan dokter.',
                    'Menjaga etika dan martabat profesi kedokteran.',
                    'Meningkatkan peran dokter dalam pelayanan dan pembangunan kesehatan.',
                    'Menjalin kemitraan dengan pemerintah serta pemangku kepentingan kesehatan.',
                ],
                'sort_order' => 1,
            ],
        ]);

        $this->seedSection(PortalLandingContent::SECTION_SERVICE, [
            [
                'title' => 'Pendaftaran Anggota',
                'content' => 'Informasi awal mengenai proses pendaftaran anggota IDI Cabang Purwakarta.',
                'sort_order' => 1,
            ],
            [
                'title' => 'Administrasi Keanggotaan',
                'content' => 'Pembaruan data anggota, mutasi keanggotaan, dan kebutuhan administrasi lainnya.',
                'sort_order' => 2,
            ],
            [
                'title' => 'Surat Rekomendasi',
                'content' => 'Informasi pengajuan surat rekomendasi organisasi sesuai ketentuan yang berlaku.',
                'sort_order' => 3,
            ],
            [
                'title' => 'Informasi Kegiatan Ilmiah',
                'content' => 'Informasi kegiatan ilmiah dan pengembangan profesional anggota.',
                'sort_order' => 4,
            ],
            [
                'title' => 'Informasi Organisasi',
                'content' => 'Pengumuman, agenda, dan ketentuan organisasi bagi anggota.',
                'sort_order' => 5,
            ],
            [
                'title' => 'Hubungi Sekretariat',
                'content' => 'Akses kontak sekretariat untuk memperoleh bantuan lebih lanjut.',
                'sort_order' => 6,
            ],
        ]);

        $this->seedSection(PortalLandingContent::SECTION_LEADER, [
            [
                'title' => 'dr. Nama Ketua',
                'subtitle' => 'Ketua',
                'content' => 'Pengurus Harian',
                'sort_order' => 1,
            ],
            [
                'title' => 'dr. Nama Sekretaris',
                'subtitle' => 'Sekretaris',
                'content' => 'Pengurus Harian',
                'sort_order' => 2,
            ],
            [
                'title' => 'dr. Nama Bendahara',
                'subtitle' => 'Bendahara',
                'content' => 'Pengurus Harian',
                'sort_order' => 3,
            ],
        ]);

        $this->seedSection(PortalLandingContent::SECTION_CONTACT, [
            [
                'title' => 'Kontak',
                'subtitle' => 'Sekretariat',
                'content' => 'Sekretariat IDI Cabang Purwakarta',
                'meta' => [
                    'address' => 'Jl. Contoh Alamat No. 00, Kabupaten Purwakarta, Jawa Barat',
                    'phone' => '(0264) 000000',
                    'whatsapp' => '+62 812-0000-0000',
                    'email' => 'sekretariat@idipurwakarta.org',
                    'service_hours' => 'Senin-Jumat, 08.00-16.00 WIB',
                    'map_url' => 'https://maps.google.com/?q=Purwakarta',
                    'instagram_url' => 'https://instagram.com/',
                    'facebook_url' => 'https://facebook.com/',
                    'youtube_url' => 'https://youtube.com/',
                ],
                'sort_order' => 1,
            ],
        ]);
    }

    private function seedSection(string $section, array $contents): void
    {
        if (PortalLandingContent::query()->where('section', $section)->exists()) {
            return;
        }

        foreach ($contents as $content) {
            PortalLandingContent::create([
                'section' => $section,
                'title' => $content['title'] ?? null,
                'subtitle' => $content['subtitle'] ?? null,
                'content' => $content['content'] ?? null,
                'image_path' => $content['image_path'] ?? null,
                'items' => $content['items'] ?? [],
                'meta' => $content['meta'] ?? [],
                'sort_order' => $content['sort_order'] ?? 0,
                'is_active' => true,
            ]);
        }
    }

    private function copySampleImages(): void
    {
        $images = [
            'hero-1.jpg',
            'hero-2.jpg',
            'hero-3.jpg',
            'about-idi.jpg',
        ];

        foreach ($images as $image) {
            $source = public_path("images/portal/{$image}");

            if (! File::exists($source)) {
                continue;
            }

            Storage::disk('public')->put("portal/{$image}", File::get($source));
        }
    }
}
