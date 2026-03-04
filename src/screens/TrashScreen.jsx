import React, { useState } from 'react';
import { BottomSheet } from '../components/Shared';

export default function TrashScreen({ state, actions }) {
    const [confirmPurge, setConfirmPurge] = useState(null); // item to purge

    const formatDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const getDaysLeft = (deletedAt) => {
        const expiresAt = new Date(deletedAt).getTime() + 14 * 24 * 60 * 60 * 1000;
        const diff = expiresAt - Date.now();
        return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
    };

    const getIcon = (type) => type === 'class' ? '🏫' : '👤';
    const getName = (item) => item.data.name;
    const getSubtext = (item) => {
        if (item.type === 'class') {
            const count = item.data.students?.length || 0;
            return `Class · ${count} student${count !== 1 ? 's' : ''} included`;
        }
        return 'Student';
    };

    const handlePurge = () => {
        if (!confirmPurge) return;
        actions.purgeTrash(confirmPurge.id);
        setConfirmPurge(null);
    };

    return (
        <div className="screen-pad page-enter">
            <div className="hero-banner" style={{ background: 'linear-gradient(135deg, rgba(247,106,124,0.12), rgba(247,106,124,0.05))' }}>
                <div className="hero-banner__label" style={{ color: 'var(--accent-rose)' }}>Recovery</div>
                <div className="hero-banner__title">🗑 Trash</div>
                <div className="hero-banner__subtitle">Items are permanently deleted after 14 days</div>
            </div>

            {state.trash.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">✨</div>
                    <div className="empty-state__title">Trash is empty</div>
                    <p className="empty-state__desc">Deleted classes and students will appear here.</p>
                </div>
            ) : (
                <>
                    <div className="section-title mb-16">Deleted Items ({state.trash.length})</div>
                    {state.trash.slice().reverse().map(item => {
                        const daysLeft = getDaysLeft(item.deletedAt);
                        return (
                            <div key={item.id} className="trash-item">
                                <span className="trash-item__icon">{getIcon(item.type)}</span>
                                <div className="trash-item__info">
                                    <div className="trash-item__name">{getName(item)}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{getSubtext(item)}</div>
                                    <div className="trash-item__expires">
                                        {daysLeft > 0 ? `⏱ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : '⚠️ Expires today'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => actions.restoreTrash(item.id)}>↩ Restore</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmPurge(item)}>× Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Purge Confirmation */}
            {confirmPurge && (
                <BottomSheet title="Kalıcı Olarak Sil?" onClose={() => setConfirmPurge(null)}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{getName(confirmPurge)}</strong> kalıcı olarak silinecek.
                        Bu işlem geri alınamaz.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setConfirmPurge(null)}>Hayır</button>
                        <button className="btn btn-danger btn-full" onClick={handlePurge}>Evet, Sil</button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
