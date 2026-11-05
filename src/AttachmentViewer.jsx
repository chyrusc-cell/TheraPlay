import { useEffect, useState } from 'react';
import { API_URL } from './api.js';
import Button from './Button.jsx';
import Modal from './Modal.jsx';
import { previewKind, typeLabel } from './attachmentTypes.js';

// Text previews show at most this many characters (the file can still be downloaded whole).
const MAX_TEXT_CHARS = 200000;

/*
 * Preview of one attached file in the shared Modal. The file is fetched from the
 * same download route the Download button uses (so the server's access rules for
 * published, non-archived activities apply) and shown from memory:
 *   - images in an <img> (aspect ratio kept, fitted to the screen),
 *   - PDFs in the browser's own viewer,
 *   - text as plain text in a <pre> (React escapes it; it is never parsed as HTML).
 * Only types in attachmentTypes.js are previewed. Download is always offered, as
 * the fallback when the browser cannot display the file.
 */
function AttachmentViewer({ activityId, resource, onClose, onDownload, downloading }) {
    const kind = resource ? previewKind(resource.file_type) : null;

    const [state, setState] = useState({ status: 'loading', url: null, text: '', truncated: false });

    useEffect(() => {
        if (!resource || !kind) {
            return undefined;
        }

        const controller = new AbortController();
        let objectUrl = null;

        const load = async () => {
            setState({ status: 'loading', url: null, text: '', truncated: false });

            try {
                const response = await fetch(
                    `${API_URL}/activities/${activityId}/resources/${resource.id}/download`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(response.status === 404 ? 'missing' : 'failed');
                }

                if (kind === 'text') {
                    const text = await response.text();
                    setState({
                        status: 'ready',
                        url: null,
                        text: text.slice(0, MAX_TEXT_CHARS),
                        truncated: text.length > MAX_TEXT_CHARS,
                    });
                    return;
                }

                // Re-wrap with the type we trust (the stored one), not a guessed one.
                const blob = new Blob([await response.blob()], { type: resource.file_type });
                objectUrl = URL.createObjectURL(blob);
                setState({ status: 'ready', url: objectUrl, text: '', truncated: false });
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }

                setState({
                    status: error.message === 'missing' ? 'missing' : 'error',
                    url: null,
                    text: '',
                    truncated: false,
                });
            }
        };

        load();

        return () => {
            controller.abort();

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [activityId, resource, kind]);

    return (
        <Modal open={resource !== null} onClose={onClose} title={resource?.file_name || 'Preview'} size="xl">
            {resource && (
                <div className="flex flex-col gap-3">
                    <p className="text-[13px] text-muted">{typeLabel(resource.file_type)}</p>

                    <div className="max-h-[65vh] min-h-[200px] overflow-auto rounded-lg border border-edge bg-white p-2">
                        {state.status === 'loading' && (
                            <p role="status" className="p-4 text-[14px] text-muted">Loading preview...</p>
                        )}

                        {state.status === 'missing' && (
                            <p role="alert" className="p-4 text-[14px] text-[#d93025]">This file is no longer available.</p>
                        )}

                        {state.status === 'error' && (
                            <p role="alert" className="p-4 text-[14px] text-[#d93025]">
                                The preview could not be loaded. You can still download the file.
                            </p>
                        )}

                        {state.status === 'ready' && kind === 'image' && (
                            <img
                                src={state.url}
                                alt={resource.file_name}
                                className="mx-auto block max-h-[60vh] max-w-full object-contain"
                            />
                        )}

                        {state.status === 'ready' && kind === 'pdf' && (
                            <iframe
                                src={state.url}
                                title={`Preview of ${resource.file_name}`}
                                className="h-[60vh] w-full rounded-md border-0"
                            />
                        )}

                        {state.status === 'ready' && kind === 'text' && (
                            <>
                                <pre
                                    tabIndex={0}
                                    aria-label={`Contents of ${resource.file_name}`}
                                    className="m-0 whitespace-pre-wrap p-3 text-[13px] leading-[1.6] text-body [overflow-wrap:anywhere]"
                                >
                                    {state.text}
                                </pre>
                                {state.truncated && (
                                    <p className="p-3 text-[12px] text-muted">
                                        Only the first part is shown. Download the file to read all of it.
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="secondary" onClick={() => onDownload(resource)} disabled={downloading}>
                            {downloading ? 'Downloading...' : 'Download'}
                        </Button>
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default AttachmentViewer;
