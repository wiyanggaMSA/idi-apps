<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pratinjau Surat</title>
        <script>
            window.__LETTER_RENDER_DATA__ = @json($renderData);
        </script>
        @vite('resources/js/letters-renderer.jsx')
    </head>
    <body class="letter-render-body">
        <div id="letter-render-root"></div>
    </body>
</html>
