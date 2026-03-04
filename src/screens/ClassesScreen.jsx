import React, { useState } from 'react';
import { BottomSheet, ClassAvatar, EmptyState, CLASS_COLORS } from '../components/Shared';

export default function ClassesScreen({ state, actions, onNavigate }) {
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState(CLASS_COLORS[0]);

    const handleAdd = () => {
        if (!name.trim()) return;
        actions.addClass({ name: name.trim(), color });
        setName('');
        setColor(CLASS_COLORS[0]);
        setShowAdd(false);
    };

    return (
        <div className="screen-pad page-enter">
            {/* Hero Banner */}
            <div className="hero-banner">
                <div className="hero-banner__label">EL Tracker</div>
                <div className="hero-banner__title">My Classes</div>
                <div className="hero-banner__subtitle">Manage your groups and students</div>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-chip">
                    <div className="stat-chip__value">{state.classes.length}</div>
                    <div className="stat-chip__label">Classes</div>
                </div>
                <div className="stat-chip">
                    <div className="stat-chip__value">{state.students.length}</div>
                    <div className="stat-chip__label">Students</div>
                </div>
                <div className="stat-chip">
                    <div className="stat-chip__value">{state.trash.length}</div>
                    <div className="stat-chip__label">In Trash</div>
                </div>
            </div>

            {/* Class List */}
            <div className="section-header">
                <span className="section-title">Groups</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Class</button>
            </div>

            {state.classes.length === 0 ? (
                <EmptyState icon="🏫" title="No classes yet" desc="Tap 'Add Class' to create your first group." />
            ) : (
                <div className="card-list">
                    {state.classes.map(cls => {
                        const count = state.students.filter(s => s.classId === cls.id).length;
                        return (
                            <div key={cls.id} className="card" onClick={() => onNavigate('class-detail', { classId: cls.id })}>
                                <div className="class-card">
                                    <ClassAvatar cls={cls} />
                                    <div className="class-card__info">
                                        <div className="class-card__name">{cls.name}</div>
                                        <div className="class-card__meta">{count} student{count !== 1 ? 's' : ''}</div>
                                    </div>
                                    <span className="class-card__chevron">›</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Class Sheet */}
            {showAdd && (
                <BottomSheet title="New Class" onClose={() => setShowAdd(false)}>
                    <div className="form-group">
                        <label className="form-label">Class Name</label>
                        <input
                            className="form-input"
                            placeholder="e.g. Beginner A, Level 2..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Color</label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {CLASS_COLORS.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        background: c, cursor: 'pointer',
                                        border: color === c ? '3px solid white' : '3px solid transparent',
                                        transition: 'all 0.15s',
                                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleAdd}>Create</button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
