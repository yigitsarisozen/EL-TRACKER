import React, { useState } from 'react';
import { BottomSheet, StudentAvatar, PerfBadge, EmptyState, CLASS_COLORS } from '../components/Shared';
import CommentInput from '../components/CommentInput';

export default function ClassDetailScreen({ state, actions, onNavigate, params }) {
    const { classId } = params;
    const cls = state.classes.find(c => c.id === classId);
    const students = state.students.filter(s => s.classId === classId);

    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRenameClass, setShowRenameClass] = useState(false);
    const [showRenameStudent, setShowRenameStudent] = useState(null); // student id
    const [studentName, setStudentName] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const [newStudentName, setNewStudentName] = useState('');
    const [activeTab, setActiveTab] = useState('students');
    const [comment, setComment] = useState('');

    if (!cls) return <div className="screen-pad"><p className="text-muted">Class not found.</p></div>;

    const classComments = state.classComments.filter(c => c.classId === classId);

    const handleAddStudent = () => {
        if (!studentName.trim()) return;
        actions.addStudent({ classId, name: studentName.trim() });
        setStudentName('');
        setShowAddStudent(false);
    };

    const handleRenameClass = () => {
        if (!newClassName.trim()) return;
        actions.updateClass({ id: classId, name: newClassName.trim() });
        setShowRenameClass(false);
    };

    const openRenameStudent = (student) => {
        setShowRenameStudent(student.id);
        setNewStudentName(student.name);
    };

    const handleRenameStudent = () => {
        if (!newStudentName.trim()) return;
        actions.updateStudent({ id: showRenameStudent, name: newStudentName.trim() });
        setShowRenameStudent(null);
    };

    const handleAddComment = (text, type, mediaPath) => {
        if (!text && !mediaPath) return;
        actions.addClassComment({ classId, text, commentType: type, mediaPath });
    };

    const handleDeleteClass = () => {
        actions.deleteClass(classId);
        onNavigate('classes');
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="page-enter">
            {/* Class Header */}
            <div style={{
                background: `linear-gradient(135deg, ${cls.color}22, ${cls.color}11)`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '20px 16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: `linear-gradient(135deg, ${cls.color}cc, ${cls.color}77)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, fontWeight: 800, color: 'white',
                    }}>
                        {cls.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{cls.name}</div>
                            {/* Rename class button */}
                            <button
                                onClick={() => { setNewClassName(cls.name); setShowRenameClass(true); }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7,
                                    color: 'var(--text-secondary)', fontSize: 13, padding: '3px 8px',
                                    cursor: 'pointer', fontWeight: 600, lineHeight: 1.4,
                                }}
                                title="Rename class"
                            >✏️</button>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{students.length} students</div>
                    </div>
                    <button
                        className="btn btn-danger btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => setShowDeleteConfirm(true)}
                    >🗑</button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                {['students', 'comments'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: '14px', border: 'none', background: 'transparent',
                            color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '0.5px',
                            borderBottom: activeTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
                            textTransform: 'capitalize', transition: 'all 0.15s',
                        }}
                    >{tab === 'students' ? '👥 Students' : '💬 Class Notes'}</button>
                ))}
            </div>

            <div className="screen-pad" style={{ paddingTop: 20 }}>
                {/* Students Tab */}
                {activeTab === 'students' && (
                    <>
                        <div className="section-header">
                            <span className="section-title">Students ({students.length})</span>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddStudent(true)}>+ Add</button>
                        </div>
                        {students.length === 0 ? (
                            <EmptyState icon="👤" title="No students yet" desc="Add your first student to this class." />
                        ) : (
                            <div className="card-list">
                                {students.map(student => (
                                    <div key={student.id} className="card"
                                        onClick={() => onNavigate('student-detail', { studentId: student.id, classId })}>
                                        <div className="student-card">
                                            <StudentAvatar student={student} />
                                            <div className="student-card__info">
                                                <div className="student-card__name">{student.name}</div>
                                                <PerfBadge student={student} />
                                            </div>
                                            {/* Rename student button — stop propagation so it doesn't navigate */}
                                            <button
                                                onClick={e => { e.stopPropagation(); openRenameStudent(student); }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                                                    color: 'var(--text-secondary)', fontSize: 14, padding: '6px 10px',
                                                    cursor: 'pointer', flexShrink: 0,
                                                }}
                                                title="Rename student"
                                            >✏️</button>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>›</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Comments Tab */}
                {activeTab === 'comments' && (
                    <>
                        <div className="section-title mb-16">Class Notes & Progress</div>
                        {classComments.length === 0 && (
                            <EmptyState icon="📝" title="No notes yet" desc="Add your first observation about this class." />
                        )}
                        {classComments.slice().reverse().map(c => (
                            <div key={c.id} className="comment-card">
                                <div className="comment-card__header">
                                    <span className="comment-card__date">{formatDate(c.createdAt)}</span>
                                    <span className={`comment-card__type ${c.type}`}>
                                        {c.type === 'voice' ? '🎙 Voice' : c.type === 'photo' ? '📸 Photo' : '💬 Note'}
                                    </span>
                                </div>
                                {c.mediaPath && c.type === 'photo' && (
                                    <img src={c.mediaPath} alt="attachment" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 200, objectFit: 'cover' }} />
                                )}
                                {c.mediaPath && c.type === 'voice' && (
                                    <audio src={c.mediaPath} controls style={{ width: '100%', marginBottom: 8, height: 36 }} />
                                )}
                                <div className="comment-card__body">{c.text}</div>
                            </div>
                        ))}
                        <CommentInput
                            onSubmit={handleAddComment}
                            placeholder="Write a class note, attach a photo, or record a voice note…"
                        />
                    </>
                )}
            </div>

            {/* ── Add Student Sheet ─────────── */}
            {showAddStudent && (
                <BottomSheet title="Add Student" onClose={() => setShowAddStudent(false)}>
                    <div className="form-group">
                        <label className="form-label">Student Name</label>
                        <input
                            className="form-input"
                            placeholder="Full name..."
                            value={studentName}
                            onChange={e => setStudentName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowAddStudent(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleAddStudent}>Add Student</button>
                    </div>
                </BottomSheet>
            )}

            {/* ── Rename Class Sheet ────────── */}
            {showRenameClass && (
                <BottomSheet title="Rename Class" onClose={() => setShowRenameClass(false)}>
                    <div className="form-group">
                        <label className="form-label">New Class Name</label>
                        <input
                            className="form-input"
                            value={newClassName}
                            onChange={e => setNewClassName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameClass()}
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowRenameClass(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleRenameClass}>Save</button>
                    </div>
                </BottomSheet>
            )}

            {/* ── Rename Student Sheet ──────── */}
            {showRenameStudent && (
                <BottomSheet title="Rename Student" onClose={() => setShowRenameStudent(null)}>
                    <div className="form-group">
                        <label className="form-label">New Name</label>
                        <input
                            className="form-input"
                            value={newStudentName}
                            onChange={e => setNewStudentName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameStudent()}
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowRenameStudent(null)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleRenameStudent}>Save</button>
                    </div>
                </BottomSheet>
            )}

            {/* ── Delete Confirm Sheet ──────── */}
            {showDeleteConfirm && (
                <BottomSheet title="Delete Class?" onClose={() => setShowDeleteConfirm(false)}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{cls.name}</strong> and all its students will be moved to the Trash.
                        You can restore them within 14 days.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                        <button className="btn btn-danger btn-full" onClick={handleDeleteClass}>Move to Trash</button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
