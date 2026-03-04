import React from 'react';

/**
 * PhotoViewer — fullscreen overlay to view a photo.
 * Props:
 *   src — image URL / data URL
 *   onClose — callback to close
 */
export default function PhotoViewer({ src, onClose }) {
    if (!src) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 400,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.12)', border: 'none',
                    borderRadius: 12, color: 'white',
                    fontSize: 20, padding: '8px 16px',
                    cursor: 'pointer', fontWeight: 700, zIndex: 401,
                }}
            >✕</button>

            {/* Image */}
            <img
                src={src}
                alt="Full view"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '95%', maxHeight: '85vh',
                    objectFit: 'contain', borderRadius: 8,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                }}
            />
        </div>
    );
}
