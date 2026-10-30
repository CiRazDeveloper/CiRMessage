import { useCallback, useEffect, useRef, useState } from 'react';

import "./../../styles/components/view/scrollbar.css";

const MIN_THUMB = 32;

export default function Scrollbar({ children, className = '', style }) {
    const viewportRef = useRef(null);
    const contentRef = useRef(null);
    const trackRef = useRef(null);
    const dragRef = useRef({ startY: 0, startScroll: 0 });

    const [thumb, setThumb] = useState({ size: 0, offset: 0, visible: false });
    const [dragging, setDragging] = useState(false);

    const [scrolling, setScrolling] = useState(false);
    const hideTimer = useRef(null);

    // Measure everything and position the thumb
    const update = useCallback(() => {
        const el = viewportRef.current;
        const track = trackRef.current;
        if (!el || !track) return;

        const { scrollTop, scrollHeight, clientHeight } = el;
        const trackHeight = track.clientHeight;
        const maxScroll = scrollHeight - clientHeight;

        if (maxScroll <= 1) {
            setThumb((t) => (t.visible ? { ...t, visible: false } : t));
            return;
        }

        const size = Math.max((clientHeight / scrollHeight) * trackHeight, MIN_THUMB);
        const offset = (scrollTop / maxScroll) * (trackHeight - size);
        setThumb({ size, offset, visible: true });
    }, []);

    useEffect(() => {
        const el = viewportRef.current;
        update();

        const onScroll = () => {
            update();
            setScrolling(true);
            clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setScrolling(false), 800);
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        ro.observe(contentRef.current);

        return () => {
            el.removeEventListener('scroll', onScroll);
            ro.disconnect();
            clearTimeout(hideTimer.current);
        };
    }, [update]);

    // Dragging the thumb
    const onThumbPointerDown = (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
            startY: e.clientY,
            startScroll: viewportRef.current.scrollTop,
        };
        setDragging(true);
    };

    const onThumbPointerMove = (e) => {
        if (!dragging) return;
        const el = viewportRef.current;
        const trackHeight = trackRef.current.clientHeight;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const scrollPerPixel = maxScroll / (trackHeight - thumb.size);
        el.scrollTop =
            dragRef.current.startScroll + (e.clientY - dragRef.current.startY) * scrollPerPixel;
    };

    const onThumbPointerUp = (e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setDragging(false);
    };

    // Clicking the empty track jumps there
    const onTrackPointerDown = (e) => {
        if (e.target !== trackRef.current) return;
        const el = viewportRef.current;
        const rect = trackRef.current.getBoundingClientRect();
        const trackHeight = rect.height;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const wanted = e.clientY - rect.top - thumb.size / 2;
        el.scrollTop = (wanted / (trackHeight - thumb.size)) * maxScroll;
    };

    return (
        <div
            className={`scrollbar-root ${dragging ? 'scrollbar-dragging' : ''} ${scrolling ? 'scrollbar-scrolling' : ''} ${className}`}
            style={style}
        >
            <div className="scrollbar-viewport" ref={viewportRef}>
                <div className="scrollbar-content" ref={contentRef}>
                    {children}
                </div>
            </div>

            <div
                className="scrollbar-track"
                ref={trackRef}
                onPointerDown={onTrackPointerDown}
                style={{ display: thumb.visible ? 'block' : 'none' }}
            >
                <div
                    className="scrollbar-thumb"
                    onPointerDown={onThumbPointerDown}
                    onPointerMove={onThumbPointerMove}
                    onPointerUp={onThumbPointerUp}
                    onPointerCancel={onThumbPointerUp}
                    style={{
                        height: thumb.size,
                        transform: `translateY(${thumb.offset}px)`,
                    }}
                />
            </div>
        </div>
    );
}