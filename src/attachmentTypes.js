// What the activity page can do with an attached file, by its stored MIME type
// (the server detects the type from the file's content, never from its name).
// Only these are ever previewed: HTML, SVG and anything executable are not.

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const PDF_TYPE = 'application/pdf';
export const TEXT_TYPE = 'text/plain';

const LABELS = {
    'image/png': 'PNG image',
    'image/jpeg': 'JPG image',
    'image/webp': 'WebP image',
    'image/gif': 'GIF image',
    'application/pdf': 'PDF document',
    'text/plain': 'Text file',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint presentation',
};

export const typeLabel = (type) => LABELS[type] || 'File';

// 'image' | 'pdf' | 'text' for previewable files, null for download-only ones.
export const previewKind = (type) => {
    if (IMAGE_TYPES.includes(type)) {
        return 'image';
    }

    if (type === PDF_TYPE) {
        return 'pdf';
    }

    if (type === TEXT_TYPE) {
        return 'text';
    }

    return null;
};
