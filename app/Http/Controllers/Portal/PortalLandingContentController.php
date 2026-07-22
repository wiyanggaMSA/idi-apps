<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\PortalLandingContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PortalLandingContentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Portal/Content', [
            'contents' => PortalLandingContent::query()
                ->orderBy('section')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (PortalLandingContent $content) => $this->payload($content)),
            'sections' => PortalLandingContent::SECTIONS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('portal', 'public');
        }

        PortalLandingContent::create($data);

        return back()->with('success', 'Konten portal berhasil ditambahkan.');
    }

    public function update(Request $request, PortalLandingContent $content): RedirectResponse
    {
        $data = $this->validated($request);

        if ($request->hasFile('image')) {
            if ($content->image_path) {
                Storage::disk('public')->delete($content->image_path);
            }

            $data['image_path'] = $request->file('image')->store('portal', 'public');
        }

        $content->update($data);

        return back()->with('success', 'Konten portal berhasil diperbarui.');
    }

    public function destroy(PortalLandingContent $content): RedirectResponse
    {
        $content->delete();

        return back()->with('success', 'Konten portal berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'section' => ['required', Rule::in(PortalLandingContent::SECTIONS)],
            'title' => ['nullable', 'string', 'max:180'],
            'subtitle' => ['nullable', 'string', 'max:180'],
            'content' => ['nullable', 'string'],
            'items_text' => ['nullable', 'string'],
            'button_label' => ['nullable', 'string', 'max:80'],
            'button_url' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:80'],
            'whatsapp' => ['nullable', 'string', 'max:80'],
            'email' => ['nullable', 'email', 'max:180'],
            'service_hours' => ['nullable', 'string', 'max:180'],
            'map_url' => ['nullable', 'string', 'max:255'],
            'instagram_url' => ['nullable', 'string', 'max:255'],
            'facebook_url' => ['nullable', 'string', 'max:255'],
            'youtube_url' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        $items = collect(preg_split('/\R/', (string) ($validated['items_text'] ?? '')))
            ->map(fn ($item) => trim($item))
            ->filter()
            ->values()
            ->all();

        return [
            'section' => $validated['section'],
            'title' => $validated['title'] ?? null,
            'subtitle' => $validated['subtitle'] ?? null,
            'content' => $validated['content'] ?? null,
            'items' => $items,
            'meta' => [
                'button_label' => $validated['button_label'] ?? null,
                'button_url' => $validated['button_url'] ?? null,
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'whatsapp' => $validated['whatsapp'] ?? null,
                'email' => $validated['email'] ?? null,
                'service_hours' => $validated['service_hours'] ?? null,
                'map_url' => $validated['map_url'] ?? null,
                'instagram_url' => $validated['instagram_url'] ?? null,
                'facebook_url' => $validated['facebook_url'] ?? null,
                'youtube_url' => $validated['youtube_url'] ?? null,
            ],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    private function payload(PortalLandingContent $content): array
    {
        return [
            'id' => $content->id,
            'section' => $content->section,
            'title' => $content->title,
            'subtitle' => $content->subtitle,
            'content' => $content->content,
            'items' => $content->items ?: [],
            'items_text' => implode("\n", $content->items ?: []),
            'button_label' => data_get($content->meta, 'button_label'),
            'button_url' => data_get($content->meta, 'button_url'),
            'address' => data_get($content->meta, 'address'),
            'phone' => data_get($content->meta, 'phone'),
            'whatsapp' => data_get($content->meta, 'whatsapp'),
            'email' => data_get($content->meta, 'email'),
            'service_hours' => data_get($content->meta, 'service_hours'),
            'map_url' => data_get($content->meta, 'map_url'),
            'instagram_url' => data_get($content->meta, 'instagram_url'),
            'facebook_url' => data_get($content->meta, 'facebook_url'),
            'youtube_url' => data_get($content->meta, 'youtube_url'),
            'sort_order' => $content->sort_order,
            'is_active' => $content->is_active,
            'image_url' => $content->image_path ? Storage::url($content->image_path) : null,
            'updated_at' => $content->updated_at?->toDateTimeString(),
        ];
    }
}
