<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Akses Dibatasi | {{ config('app.name', 'Aplikasi Keuangan Organisasi') }}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #0f172a;
        --bg-accent: #1e293b;
        --card: rgba(15, 23, 42, 0.75);
        --primary: #3b82f6;
        --primary-dark: #2563eb;
        --text: #e2e8f0;
        --muted: #94a3b8;
        --border: rgba(148, 163, 184, 0.2);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at top, #1d4ed8 0%, var(--bg) 40%);
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
        color: var(--text);
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(6px);
      }

      .card {
        position: relative;
        z-index: 1;
        width: min(620px, 90vw);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.5);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(59, 130, 246, 0.15);
        color: #bfdbfe;
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 999px;
        padding: 6px 14px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 12px;
      }

      h1 {
        margin: 18px 0 8px;
        font-size: 28px;
        font-weight: 700;
      }

      p {
        margin: 0 0 16px;
        color: var(--muted);
        line-height: 1.6;
      }

      ul {
        margin: 0 0 24px;
        padding-left: 20px;
        color: var(--muted);
        line-height: 1.6;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .button {
        appearance: none;
        border: none;
        border-radius: 12px;
        padding: 12px 18px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .button.primary {
        background: var(--primary);
        color: #fff;
        box-shadow: 0 10px 20px rgba(59, 130, 246, 0.25);
      }

      .button.primary:hover {
        transform: translateY(-1px);
        background: var(--primary-dark);
      }

      .button.ghost {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
      }

      .button.ghost:hover {
        transform: translateY(-1px);
        border-color: rgba(148, 163, 184, 0.5);
      }

      .help {
        margin-top: 18px;
        font-size: 14px;
        color: var(--muted);
      }

      .help strong {
        color: var(--text);
      }

      @media (max-width: 480px) {
        .card {
          padding: 24px;
        }

        h1 {
          font-size: 24px;
        }
      }
    </style>
  </head>
  <body>
    <div class="overlay" aria-hidden="true"></div>
    <main class="card" role="alert">
      <span class="badge">403 · Akses Ditolak</span>
      <h1>Halaman ini hanya untuk pengguna tertentu</h1>
      <p>
        Maaf, akun Anda belum memiliki izin untuk membuka halaman ini. Silakan
        pilih salah satu opsi di bawah ini.
      </p>
      <ul>
        <li>Periksa kembali role/izin Anda dengan admin.</li>
        <li>Pastikan Anda masuk dengan akun yang benar.</li>
        <li>Coba buka halaman lain yang sesuai dengan akses Anda.</li>
      </ul>
      <div class="actions">
        <a class="button primary" href="{{ url('/dashboard') }}">Ke Dashboard</a>
        <button class="button ghost" type="button" onclick="window.history.back()">
          Kembali
        </button>
      </div>
      <p class="help">
        Butuh bantuan? Hubungi <strong>Admin Sistem</strong> untuk meminta
        akses.
      </p>
    </main>
  </body>
</html>
