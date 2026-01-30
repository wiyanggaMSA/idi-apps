<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Models\LetterNumberingProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LetterNumberingProfilesController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Secretariat/Settings/Numbering', [
            'profiles' => LetterNumberingProfile::query()->latest()->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'pattern' => ['required', 'string', 'max:255'],
            'reset_policy' => ['required', 'in:yearly,monthly,never'],
            'prefix' => ['nullable', 'string', 'max:50'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        LetterNumberingProfile::create($data);

        return redirect()->route('secretariat.numbering.index')->with('success', 'Profil penomoran disimpan.');
    }

    public function update(Request $request, LetterNumberingProfile $profile): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'pattern' => ['required', 'string', 'max:255'],
            'reset_policy' => ['required', 'in:yearly,monthly,never'],
            'prefix' => ['nullable', 'string', 'max:50'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $profile->update($data);

        return redirect()->route('secretariat.numbering.index')->with('success', 'Profil penomoran diperbarui.');
    }

    public function destroy(LetterNumberingProfile $profile): RedirectResponse
    {
        $profile->delete();

        return redirect()->route('secretariat.numbering.index')->with('success', 'Profil penomoran dihapus.');
    }
}
