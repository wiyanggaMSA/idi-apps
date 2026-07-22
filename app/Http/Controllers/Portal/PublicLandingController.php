<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\PortalLandingContent;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicLandingController extends Controller
{
    public function __invoke(): Response
    {
        $profile = AppSetting::query()
            ->select(['org_name', 'address', 'phone', 'email', 'logo_path'])
            ->first();

        $contents = PortalLandingContent::query()
            ->select([
                'id',
                'section',
                'title',
                'subtitle',
                'content',
                'image_path',
                'items',
                'meta',
                'sort_order',
            ])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->limit(80)
            ->get()
            ->groupBy('section');

        return Inertia::render('Welcome', [
            'portal' => [
                'profile' => $this->profilePayload($profile),
                'slides' => $this->slides($contents),
                'about' => $this->singleContent($contents, PortalLandingContent::SECTION_ABOUT, [
                    'title' => 'Tentang IDI Cabang Purwakarta',
                    'subtitle' => 'Profil Organisasi',
                    'content' => 'Ikatan Dokter Indonesia Cabang Purwakarta merupakan organisasi profesi dokter yang menjadi wadah pembinaan, pengembangan profesionalisme, solidaritas, dan pengabdian kepada masyarakat.',
                    'image_url' => asset('images/portal/about-idi.jpg'),
                ]),
                'visionMission' => $this->singleContent($contents, PortalLandingContent::SECTION_VISION_MISSION, [
                    'title' => 'Visi & Misi',
                    'subtitle' => 'Arah Organisasi',
                    'content' => 'Menjadi organisasi profesi dokter yang profesional, berintegritas, solid, dan berperan aktif dalam meningkatkan derajat kesehatan masyarakat Purwakarta.',
                    'items' => [
                        'Meningkatkan kompetensi dan profesionalisme anggota.',
                        'Memperkuat solidaritas dan kesejawatan dokter.',
                        'Menjaga etika dan martabat profesi kedokteran.',
                        'Meningkatkan peran dokter dalam pelayanan dan pembangunan kesehatan.',
                    ],
                ]),
                'services' => $this->listContent($contents, PortalLandingContent::SECTION_SERVICE, [
                    ['title' => 'Pendaftaran Anggota', 'content' => 'Informasi awal mengenai proses pendaftaran anggota IDI Cabang Purwakarta.'],
                    ['title' => 'Administrasi Keanggotaan', 'content' => 'Pembaruan data anggota, mutasi keanggotaan, dan kebutuhan administrasi lainnya.'],
                    ['title' => 'Surat Rekomendasi', 'content' => 'Informasi pengajuan surat rekomendasi organisasi sesuai ketentuan yang berlaku.'],
                    ['title' => 'Informasi Kegiatan Ilmiah', 'content' => 'Informasi kegiatan ilmiah dan pengembangan profesional anggota.'],
                ]),
                'leaders' => $this->leaders($contents),
                'contact' => $this->singleContent($contents, PortalLandingContent::SECTION_CONTACT, $this->contactFallback($profile)),
            ],
        ]);
    }

    private function profilePayload(?AppSetting $profile): array
    {
        $fallbackLogoUrl = file_exists(public_path('images/idi-logo.png'))
            ? asset('images/idi-logo.png')
            : null;

        return [
            'org_name' => $profile?->org_name ?: 'IDI Cabang Purwakarta',
            'address' => $profile?->address,
            'phone' => $profile?->phone,
            'email' => $profile?->email,
            'logo_url' => $profile?->logo_path ? Storage::url($profile->logo_path) : $fallbackLogoUrl,
            'website' => config('app.url'),
        ];
    }

    private function slides($contents): array
    {
        $slides = $this->listContent($contents, PortalLandingContent::SECTION_SLIDER, []);

        if ($slides !== []) {
            $fallbackImages = [
                asset('images/portal/hero-1.jpg'),
                asset('images/portal/hero-2.jpg'),
                asset('images/portal/hero-3.jpg'),
            ];

            return collect($slides)
                ->map(function (array $slide, int $index) use ($fallbackImages) {
                    $slide['image_url'] = $slide['image_url'] ?: $fallbackImages[$index % count($fallbackImages)];

                    return $slide;
                })
                ->all();
        }

        return [
            [
                'title' => "Ikatan Dokter Indonesia\nCabang Purwakarta",
                'subtitle' => 'Profesional, Berintegritas, Mengabdi',
                'content' => 'Membangun profesionalisme, solidaritas, dan pengabdian dokter untuk kesehatan masyarakat Purwakarta.',
                'image_url' => asset('images/portal/hero-1.jpg'),
            ],
            [
                'title' => 'Layanan Organisasi Terpadu',
                'subtitle' => 'Administrasi Anggota',
                'content' => 'Portal informasi untuk anggota, sekretariat, dan tata kelola organisasi.',
                'image_url' => asset('images/portal/hero-2.jpg'),
            ],
            [
                'title' => 'Kesejawatan dan Pengabdian',
                'subtitle' => 'IDI Purwakarta',
                'content' => 'Mendukung dokter dalam pelayanan kesehatan masyarakat yang profesional dan beretika.',
                'image_url' => asset('images/portal/hero-3.jpg'),
            ],
        ];
    }

    private function singleContent($contents, string $section, array $fallback): array
    {
        $content = $contents->get($section)?->first();

        if (! $content) {
            return $fallback;
        }

        return $this->contentPayload($content);
    }

    private function listContent($contents, string $section, array $fallback): array
    {
        $items = $contents->get($section);

        if (! $items || $items->isEmpty()) {
            return $fallback;
        }

        return $items->map(fn (PortalLandingContent $content) => $this->contentPayload($content))->values()->all();
    }

    private function contentPayload(PortalLandingContent $content): array
    {
        return [
            'id' => $content->id,
            'section' => $content->section,
            'title' => $content->title,
            'subtitle' => $content->subtitle,
            'content' => $content->content,
            'items' => $content->items ?: [],
            'meta' => $content->meta ?: [],
            'sort_order' => $content->sort_order,
            'image_url' => $content->image_path ? Storage::url($content->image_path) : null,
        ];
    }

    private function contactFallback(?AppSetting $profile): array
    {
        return [
            'title' => 'Kontak',
            'subtitle' => 'Sekretariat',
            'content' => 'Sekretariat IDI Cabang Purwakarta',
            'items' => [],
            'meta' => [
                'address' => $profile?->address ?: 'Jl. Contoh Alamat No. 00, Kabupaten Purwakarta, Jawa Barat',
                'phone' => $profile?->phone ?: '(0264) 000000',
                'whatsapp' => '+62 812-0000-0000',
                'email' => $profile?->email ?: 'sekretariat@idipurwakarta.org',
                'service_hours' => 'Senin-Jumat, 08.00-16.00 WIB',
                'map_url' => 'https://maps.google.com/?q=Purwakarta',
                'instagram_url' => 'https://instagram.com/',
                'facebook_url' => 'https://facebook.com/',
                'youtube_url' => 'https://youtube.com/',
            ],
            'image_url' => null,
        ];
    }

    private function leaders($contents): array
    {
        $manual = $this->listContent($contents, PortalLandingContent::SECTION_LEADER, []);

        if ($manual !== []) {
            return $manual;
        }

        $activePeriod = OrganizationPeriod::query()
            ->select('id')
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->first();

        if (! $activePeriod) {
            return [];
        }

        return OrganizationAssignment::query()
            ->with([
                'member:id,full_name',
                'unitPosition:id,position_id,custom_title',
                'unitPosition.position:id,name',
                'organizationUnit:id,name',
            ])
            ->where('period_id', $activePeriod->id)
            ->active()
            ->limit(8)
            ->get()
            ->map(function (OrganizationAssignment $assignment) {
                return [
                    'title' => $assignment->member?->full_name,
                    'subtitle' => $assignment->unitPosition?->position?->name ?: $assignment->organizationUnit?->name,
                    'content' => $assignment->organizationUnit?->name,
                    'image_url' => null,
                ];
            })
            ->filter(fn (array $leader) => filled($leader['title']))
            ->values()
            ->all();
    }
}
