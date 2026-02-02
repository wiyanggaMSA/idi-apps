<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Models\LetterNumberingProfile;
use App\Models\LetterTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LetterTemplatesController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Secretariat/Templates/Index', [
            'templates' => LetterTemplate::query()->latest()->get(),
            'numberingProfiles' => LetterNumberingProfile::query()->where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:120'],
            'classification' => ['nullable', 'string', 'max:120'],
            'numbering_profile_id' => ['nullable', 'integer', 'exists:letter_numbering_profiles,id'],
            'content_text' => ['nullable', 'string'],
            'paper' => ['nullable', 'string', 'max:20'],
            'margin_json' => ['nullable', 'array'],
            'blocks_json' => ['nullable', 'array'],
            'placeholders_schema_json' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['code'] = $data['code'] ?? Str::upper(Str::slug($data['name'], '_'));
        $data['created_by'] = $request->user()->id;

        LetterTemplate::create($data);

        return redirect()->route('secretariat.templates.index')->with('success', 'Template disimpan.');
    }

    public function update(Request $request, LetterTemplate $template): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:120'],
            'classification' => ['nullable', 'string', 'max:120'],
            'numbering_profile_id' => ['nullable', 'integer', 'exists:letter_numbering_profiles,id'],
            'content_text' => ['nullable', 'string'],
            'paper' => ['nullable', 'string', 'max:20'],
            'margin_json' => ['nullable', 'array'],
            'blocks_json' => ['nullable', 'array'],
            'placeholders_schema_json' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (empty($data['code'])) {
            $data['code'] = $template->code;
        }

        $template->update($data);

        return redirect()->route('secretariat.templates.index')->with('success', 'Template diperbarui.');
    }

    public function builder(LetterTemplate $template): Response
    {
        return Inertia::render('Secretariat/Templates/Builder', [
            'template' => $template,
        ]);
    }

    public function saveLayout(Request $request, LetterTemplate $template): RedirectResponse
    {
        $data = $request->validate([
            'layout' => ['required', 'array'],
            'blocks' => ['required', 'array'],
        ]);

        $template->update([
            'layout_json' => $data['layout'],
            'blocks_json' => $data['blocks'],
        ]);

        return redirect()->back()->with('success', 'Layout template berhasil disimpan.');
    }

    public function destroy(LetterTemplate $template): RedirectResponse
    {
        $template->delete();

        return redirect()->route('secretariat.templates.index')->with('success', 'Template dihapus.');
    }
}