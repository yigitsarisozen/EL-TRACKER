import React, { useState } from 'react';
import { BottomSheet, ClassAvatar, EmptyState, CLASS_COLORS } from '../components/Shared';

export default function ClassesScreen({ state, actions, onNavigate }) {
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState(CLASS_COLORS[0]);
    const [ageGroup, setAgeGroup] = useState('KIDS'); // Default to KIDS

    // Lists dialog state
    const [listType, setListType] = useState(null); // 'classes' | 'students' | null
    const [searchQuery, setSearchQuery] = useState('');

    const handleAdd = () => {
        if (!name.trim()) return;
        actions.addClass({ name: name.trim(), color, ageGroup });
        setName('');
        setColor(CLASS_COLORS[0]);
        setAgeGroup('KIDS');
        setShowAdd(false);
    };

    return (
        <div className="screen-pad page-enter">
            {/* Hero Banner */}
            <div className="hero-banner">
                <div className="hero-banner__label">Genç Akademi</div>
                <div className="hero-banner__title">English Curriculum Tracker</div>
                <div className="hero-banner__subtitle">Keep track of classes, students & progress</div>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-chip" onClick={() => { setListType('classes'); setSearchQuery(''); }} style={{ cursor: 'pointer' }}>
                    <div className="stat-chip__value">{state.classes.length}</div>
                    <div className="stat-chip__label">Classes</div>
                </div>
                <div className="stat-chip" onClick={() => { setListType('students'); setSearchQuery(''); }} style={{ cursor: 'pointer' }}>
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
                    <div className="form-group">
                        <label className="form-label">Age Group</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {['KIDS', 'MIDDLES', 'TEENS'].map(group => (
                                <button
                                    key={group}
                                    className={`btn ${ageGroup === group ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                                    onClick={() => setAgeGroup(group)}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleAdd}>Create</button>
                    </div>
                </BottomSheet>
            )}

            {/* Clickable Stats List Dialog */}
            {listType && (
                <BottomSheet title={`All ${listType === 'classes' ? 'Classes' : 'Students'}`} onClose={() => setListType(null)}>
                    <div className="form-group">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}
                        />
                    </div>

                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="no-scrollbar">
                        {listType === 'classes' && state.classes
                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(cls => (
                                <div key={cls.id} className="card" style={{ marginBottom: 10, padding: 12, cursor: 'pointer' }} onClick={() => { setListType(null); onNavigate('class-detail', { classId: cls.id }); }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <ClassAvatar cls={cls} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cls.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cls.ageGroup || 'KIDS'}</div>
                                        </div>
                                        <span style={{ color: 'var(--text-muted)' }}>›</span>
                                    </div>
                                </div>
                            ))
                        }

                        {listType === 'students' && state.students
                            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(student => {
                                const cls = state.classes.find(c => c.id === student.classId);
                                return (
                                    <div key={student.id} className="card" style={{ marginBottom: 10, padding: 12, cursor: 'pointer' }} onClick={() => { setListType(null); onNavigate('student-detail', { studentId: student.id, classId: student.classId }); }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                                {student.photo ? <img src={student.photo} style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover' }} /> : '👤'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{student.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cls?.name || 'No Class'}</div>
                                            </div>
                                            <span style={{ color: 'var(--text-muted)' }}>›</span>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
