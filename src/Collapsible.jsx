/*
 * Smooth expand / collapse for content whose height is not known in advance.
 *
 * It animates a grid row between 0fr and 1fr (CSS cannot transition
 * "height: auto", but it can transition grid-template-rows), so it works for
 * any content size, text that wraps, and content that changes while open, with
 * no JavaScript measuring. Opening eases out and closing eases in.
 *
 * While closed the content is "invisible" (visibility: hidden, switched at the
 * END of the closing animation), so it can't be focused, clicked or read by a
 * screen reader. Reduced-motion users get no animation (the global rule in
 * css/ui.css). Put spacing INSIDE the children (padding), not as a margin on the
 * first child, so the closed height is really 0.
 *
 * Give it an id when a button controls it (aria-controls).
 */
function Collapsible({ open, id, children }) {
    return (
        <div
            id={id}
            className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ${
                open
                    ? 'visible grid-rows-[1fr] opacity-100 ease-out'
                    : 'invisible grid-rows-[0fr] opacity-0 ease-in'
            }`}
        >
            <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}

export default Collapsible;
