import React, { useState } from 'react';
import { calcPerformance, PERF_LABELS } from '../store/useStore';

// ─── Class Avatar color palette ─────────────────────────────────────────────
const CLASS_COLORS = [
    '#7c6af7', '#4facfe', '#43e8c8', '#f6a832',
    '#f76a7c', '#43c98f', '#b07cfa', '#fe9a4f',
];

// ─── Reusable Components ────────────────────────────────────────────────────

export function BottomSheet({ title, onClose, children }) {
    // Intercept hardware back button to close the sheet
    React.useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            onClose();
        };
        window.addEventListener('hardwareBackPress', handler);
        return () => window.removeEventListener('hardwareBackPress', handler);
    }, [onClose]);

    return (
        <div className="overlay" onClick={e => { if (e.target.classList.contains('overlay')) onClose(); }}>
            <div className="bottom-sheet">
                <div className="sheet-handle" />
                <div style={{ position: 'relative', minHeight: 40, marginBottom: 16 }}>
                    {title && <h2 className="sheet-title" style={{ margin: 0, paddingRight: 40, paddingTop: 6 }}>{title}</h2>}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 0, right: 0,
                            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1
                        }}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function StarRating({ value = 0, onChange, readonly = false }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map(n => (
                <span
                    key={n}
                    className={`star ${(hover || value) >= n ? 'filled' : ''}`}
                    onClick={() => !readonly && onChange && onChange(n)}
                    onMouseEnter={() => !readonly && setHover(n)}
                    onMouseLeave={() => !readonly && setHover(0)}
                >★</span>
            ))}
        </div>
    );
}

export function PerfBadge({ student }) {
    const perf = calcPerformance(student);
    return (
        <span className={`student-card__perf ${perf}`}>{PERF_LABELS[perf]}</span>
    );
}

function getInitials(name) {
    return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
}

export function StudentAvatar({ student, size = 46 }) {
    if (student.photo) {
        return (
            <div className="student-avatar" style={{ width: size, height: size }}>
                <img src={student.photo} alt={student.name} />
            </div>
        );
    }
    return (
        <div className="student-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
            {getInitials(student.name)}
        </div>
    );
}

export function ClassAvatar({ cls }) {
    const bg = cls.color || CLASS_COLORS[0];
    const label = cls.ageGroup || 'KIDS';

    // Adjust font size based on text length to fit in the box
    const fontSize = label.length > 5 ? 10 : 12;

    return (
        <div className="class-card__avatar" style={{
            background: `linear-gradient(135deg, ${bg}cc, ${bg}77)`,
            fontSize: fontSize,
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        }}>
            {label}
        </div>
    );
}

export function HwBadge({ status, onClick }) {
    const map = {
        done: { label: '✓ Done', cls: 'done' },
        absent: { label: '— Absent', cls: 'absent' },
        failed: { label: '✗ Failed', cls: 'failed' },
        none: { label: '· Pending', cls: 'none' },
    };
    const s = map[status] || map.none;
    return (
        <button className={`hw-badge ${s.cls}`} onClick={onClick}>{s.label}</button>
    );
}

export function EmptyState({ icon, title, desc }) {
    return (
        <div className="empty-state">
            <div className="empty-state__icon">{icon}</div>
            <div className="empty-state__title">{title}</div>
            <p className="empty-state__desc">{desc}</p>
        </div>
    );
}

// re-export for other screens that need the palette
export { CLASS_COLORS };

