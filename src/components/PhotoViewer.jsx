import React, { useState, useRef } from 'react';

/**
 * PhotoViewer — fullscreen overlay with pinch-to-zoom.
 */
export default function PhotoViewer({ src, onClose }) {
    if (!src) return null;

    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const lastDist = useRef(null);
    const lastCenter = useRef(null);
    const dragStart = useRef(null);

    const getDistance = (t1, t2) =>
        Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const getCenter = (t1, t2) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e) => {
        e.stopPropagation();
        if (e.touches.length === 2) {
            lastDist.current = getDistance(e.touches[0], e.touches[1]);
            lastCenter.current = getCenter(e.touches[0], e.touches[1]);
        } else if (e.touches.length === 1 && scale > 1) {
            dragStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y };
        }
    };

    const handleTouchMove = (e) => {
        e.stopPropagation();
        if (e.touches.length === 2 && lastDist.current) {
            const newDist = getDistance(e.touches[0], e.touches[1]);
            const ratio = newDist / lastDist.current;
            setScale(prev => Math.max(1, Math.min(5, prev * ratio)));
            lastDist.current = newDist;
        } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
            setTranslate({
                x: e.touches[0].clientX - dragStart.current.x,
                y: e.touches[0].clientY - dragStart.current.y,
            });
        }
    };

    const handleTouchEnd = (e) => {
        e.stopPropagation();
        if (e.touches.length < 2) lastDist.current = null;
        if (e.touches.length === 0) dragStart.current = null;
        // snap back if scale <= 1
        if (scale <= 1.05) {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
        }
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (scale > 1) {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
        } else {
            setScale(2.5);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 400,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                touchAction: 'none',
            }}
            onClick={scale <= 1 ? onClose : undefined}
        >
            {/* Close button */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.12)', border: 'none',
                    borderRadius: 12, color: 'white',
                    fontSize: 20, padding: '8px 16px',
                    cursor: 'pointer', fontWeight: 700, zIndex: 401,
                }}
            >✕</button>

            {/* Zoom hint */}
            {scale <= 1 && (
                <div style={{
                    position: 'absolute', bottom: 30,
                    fontSize: 12, color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600, pointerEvents: 'none',
                }}>Pinch to zoom · Double tap to zoom</div>
            )}

            {/* Image with zoom */}
            <img
                src={src}
                alt="Full view"
                onClick={e => e.stopPropagation()}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    maxWidth: '95%', maxHeight: '85vh',
                    objectFit: 'contain', borderRadius: 8,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                    transition: scale <= 1 ? 'transform 0.2s ease' : 'none',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
                draggable={false}
            />
        </div>
    );
}
