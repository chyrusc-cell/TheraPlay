import { Component } from 'react';

/*
 * Keeps one part of a page from taking the whole page down: if the section
 * throws while rendering, a short message with a retry is shown instead of a
 * blank screen (the error is still logged to the console for diagnosis).
 */
class SectionErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        console.error(`${this.props.label || 'This section'} failed to render:`, error);
    }

    render() {
        if (!this.state.failed) {
            return this.props.children;
        }

        return (
            <div
                role="alert"
                className="mb-6 rounded-2xl border border-edge bg-white card-soft p-[30px] text-[14px] text-[#d93025]"
            >
                <p className="mb-3">
                    {this.props.label || 'This section'} could not be displayed. Please try again.
                </p>
                <button
                    type="button"
                    className="cursor-pointer rounded-full border border-edge-strong btn-glass px-4 py-1.5 [font-family:inherit] text-[13px] font-bold text-ink"
                    onClick={() => this.setState({ failed: false })}
                >
                    Try again
                </button>
            </div>
        );
    }
}

export default SectionErrorBoundary;
