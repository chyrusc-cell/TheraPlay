// Renders the FIRST page of a PDF to a JPEG thumbnail.
//
//   node tools/pdf-thumbnail.mjs <input.pdf> <output.jpg> [width=600]
//
// Used by App\Support\PdfThumbnail (Laravel calls it with absolute paths it built
// itself, never with user input). Exit code 0 = the JPEG was written; anything
// else = nothing was written and a short reason is printed to stderr.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const [input, output, widthArg] = process.argv.slice(2);
const targetWidth = Math.min(Math.max(parseInt(widthArg || '600', 10) || 600, 100), 1600);

function fail(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}

if (!input || !output) {
    fail('usage: pdf-thumbnail.mjs <input.pdf> <output.jpg> [width]');
}

try {
    const bytes = new Uint8Array(fs.readFileSync(input));

    if (bytes.length < 8 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
        fail('not a PDF file');
    }

    const here = path.dirname(fileURLToPath(import.meta.url));
    const fontDir = path.join(here, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts') + path.sep;

    const doc = await pdfjs.getDocument({
        data: bytes,
        standardFontDataUrl: fontDir,
        isEvalSupported: false,
        useSystemFonts: false,
        disableFontFace: true,
        verbosity: 0,
    }).promise;

    const page = await doc.getPage(1); // only the first page is ever rendered
    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.min(Math.max(1, Math.round(viewport.height)), 2400);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    fs.writeFileSync(output, canvas.toBuffer('image/jpeg', 82));
    await doc.destroy();
    process.exit(0);
} catch (error) {
    fail(`render failed: ${String(error && error.message ? error.message : error).slice(0, 200)}`);
}
