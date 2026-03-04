import React, { useState, useRef } from 'react';
import { BottomSheet, StudentAvatar, StarRating, HwBadge, PerfBadge, EmptyState } from '../components/Shared';
import { Browser } from '@capacitor/browser';
import { calcPerformance, PERF_LABELS } from '../store/useStore';
import CommentInput from '../components/CommentInput';
import PhotoViewer from '../components/PhotoViewer';

export default function StudentDetailScreen({ state, actions, onNavigate, params, currentUser }) {
    const { studentId, classId } = params;
    const student = state.students.find(s => s.id === studentId);
    const cls = state.classes.find(c => c.id === (classId || student?.classId));

    const [activeTab, setActiveTab] = useState('overview');
    const [showRating, setShowRating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRename, setShowRename] = useState(false);
    const [newName, setNewName] = useState('');
    const [showHwViewer, setShowHwViewer] = useState(null);
    const [ratingStars, setRatingStars] = useState(3);
    const [ratingNote, setRatingNote] = useState('');
    const [comment, setComment] = useState('');
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [showDeleteHwId, setShowDeleteHwId] = useState(null);
    const [viewPhoto, setViewPhoto] = useState(null);
    const [showAssignHw, setShowAssignHw] = useState(false);
    const [hwTitle, setHwTitle] = useState('');
    const [hwPdfFile, setHwPdfFile] = useState(null);
    const [hwPdfDataUrl, setHwPdfDataUrl] = useState(null);
    const photoInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const hwFileInputRef = useRef(null);

    if (!student) return <div className="screen-pad"><p className="text-muted">Student not found.</p></div>;

    const perf = calcPerformance(student);
    const perfLabel = PERF_LABELS[perf];
    const perfColors = { above: '#43c98f', average: '#4facfe', poor: '#f76a7c', none: '#55556a' };
    const perfColor = perfColors[perf];

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleAddComment = (text, type, mediaPath) => {
        if (!text && !mediaPath) return;
        actions.addStudentComment({ studentId, text, commentType: type, mediaPath, addedBy: currentUser?.displayName || 'Unknown' });
    };

    const handleDeleteComment = (commentId) => {
        if (!confirm('Delete this note?')) return;
        actions.deleteStudentComment({ studentId, commentId });
    };

    const handleAddRating = () => {
        actions.addRating({ studentId, stars: ratingStars, lessonNote: ratingNote });
        setShowRating(false);
        setRatingStars(3);
        setRatingNote('');
    };

    const handleDeleteStudent = () => {
        actions.deleteStudent(studentId);
        onNavigate('class-detail', { classId: student.classId });
    };

    const handleRenameStudent = () => {
        if (!newName.trim()) return;
        actions.updateStudent({ id: studentId, name: newName.trim() });
        setShowRename(false);
    };

    const handleCycleHwStatus = (hwId, currentStatus) => {
        const cycle = { none: 'done', done: 'absent', absent: 'failed', failed: 'none' };
        actions.updateHomeworkStatus({ studentId, hwId, status: cycle[currentStatus] || 'none' });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            actions.updateStudent({ id: studentId, photo: ev.target.result });
            setShowPhotoUpload(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDeletePhoto = () => {
        actions.updateStudent({ id: studentId, photo: null });
        setShowPhotoUpload(false);
    };

    const handleHwPdfChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setHwPdfFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setHwPdfDataUrl(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleAssignHwToStudent = () => {
        if (!hwTitle.trim()) return;
        // Use the same addHomeworkAssignment but for a single student
        actions.addStudentHomework({ studentId, title: hwTitle.trim(), pdfName: hwPdfFile?.name || null, pdfDataUrl: hwPdfDataUrl });
        setShowAssignHw(false);
        setHwTitle('');
        setHwPdfFile(null);
        setHwPdfDataUrl(null);
    };

    const handleOpenPdf = async (dataUrl, fileName) => {
        if (!dataUrl) return;
        if (dataUrl.startsWith('https://')) {
            await Browser.open({ url: dataUrl, presentationStyle: 'fullscreen', windowName: '_blank' });
        } else {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = fileName || 'homework.pdf';
            a.click();
        }
    };

    const avgStars = student.ratings?.length
        ? (student.ratings.reduce((s, r) => s + r.stars, 0) / student.ratings.length).toFixed(1)
        : '—';
    const hwDone = student.homework?.filter(h => h.status === 'done').length || 0;
    const hwTotal = student.homework?.length || 0;

    const TABS = ['overview', 'homework', 'comments', 'ratings'];

    const swipeRef = useRef({ startX: 0, startY: 0 });
    const handleTouchStart = (e) => {
        swipeRef.current.startX = e.touches[0].clientX;
        swipeRef.current.startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e) => {
        const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
        const dy = e.changedTouches[0].clientY - swipeRef.current.startY;

        // Less strict check: allows some vertical drift while swiping
        if (Math.abs(dx) < 40 || Math.abs(dy) > 50) return;

        const idx = TABS.indexOf(activeTab);
        if (dx < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]); // swipe left
        else if (dx > 0 && idx > 0) setActiveTab(TABS[idx - 1]); // swipe right
    };

    return (
        <div className="page-enter" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ touchAction: 'pan-y' }}>
            {/* Student Header */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Photo */}
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowPhotoUpload(true)}>
                        <StudentAvatar student={student} size={64} />
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 22, height: 22, background: 'var(--accent-purple)',
                            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, color: 'white', border: '2px solid var(--bg-secondary)',
                        }}>+</div>
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
                    {showPhotoUpload && (
                        <div style={{
                            position: 'absolute', top: 80, left: 90, background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', borderRadius: 10, padding: 10, zIndex: 10,
                            display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140,
                        }}>
                            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => photoInputRef.current?.click()}>📁 Gallery</button>
                            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => cameraInputRef.current?.click()}>📷 Camera</button>
                            {student.photo && (
                                <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleDeletePhoto}>🗑 Remove</button>
                            )}
                        </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{student.name}</div>
                            <button
                                onClick={() => { setNewName(student.name); setShowRename(true); }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7,
                                    color: 'var(--text-secondary)', fontSize: 13, padding: '3px 8px',
                                    cursor: 'pointer', fontWeight: 600, lineHeight: 1.4,
                                }}
                                title="Rename student"
                            >✏️</button>
                        </div>
                        {cls && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{cls.name}</div>}
                        <div style={{ marginTop: 6 }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                background: `${perfColor}22`, color: perfColor,
                            }}>{perfLabel}</span>
                        </div>
                    </div>

                    <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>🗑</button>
                </div>

                {/* Mini-stats */}
                <div className="stats-row" style={{ marginTop: 16, marginBottom: 0 }}>
                    <div className="stat-chip">
                        <div className="stat-chip__value">{avgStars}</div>
                        <div className="stat-chip__label">Avg Stars</div>
                    </div>
                    <div className="stat-chip">
                        <div className="stat-chip__value">{hwDone}/{hwTotal}</div>
                        <div className="stat-chip__label">HW Done</div>
                    </div>
                    <div className="stat-chip">
                        <div className="stat-chip__value">{student.comments?.length || 0}</div>
                        <div className="stat-chip__label">Notes</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', overflowX: 'auto' }}
                className="no-scrollbar">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        flex: '0 0 auto', padding: '13px 16px', border: 'none', background: 'transparent',
                        color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        borderBottom: activeTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
                        textTransform: 'capitalize', transition: 'all 0.15s', letterSpacing: '0.4px',
                    }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
                ))}
            </div>

            <div className="screen-pad" style={{ paddingTop: 20 }}>

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <>
                        <div className="section-title mb-16">Quick Actions</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button className="card" style={{ textAlign: 'left' }} onClick={() => setActiveTab('homework')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 28 }}>📚</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>Homework Tracker</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{hwDone} of {hwTotal} completed</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>›</span>
                                </div>
                            </button>
                            <button className="card" style={{ textAlign: 'left' }} onClick={() => setActiveTab('comments')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 28 }}>💬</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>Progress Notes</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{student.comments?.length || 0} notes added</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>›</span>
                                </div>
                            </button>
                            <button className="card" style={{ textAlign: 'left' }} onClick={() => setShowRating(true)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 28 }}>⭐</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>Rate This Lesson</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Average: {avgStars} / 5 stars</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>›</span>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* HOMEWORK */}
                {activeTab === 'homework' && (
                    <>
                        <div className="section-header">
                            <span className="section-title">Homework Assignments</span>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAssignHw(true)}>+ Assign</button>
                        </div>
                        {(!student.homework || student.homework.length === 0) ? (
                            <EmptyState icon="📚" title="No homework assigned" desc="Tap '+ Assign' to add homework for this student." />
                        ) : (
                            student.homework.slice().reverse().map(hw => (
                                <div key={hw.id} style={{
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius)', padding: '16px', marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{hw.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned: {formatDate(hw.assignedAt)}</div>
                                            {hw.pdfName && (
                                                <div
                                                    onClick={() => handleOpenPdf(hw.pdfDataUrl, hw.pdfName)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                                                        background: 'rgba(79,172,254,0.08)', padding: '8px 12px', borderRadius: 8,
                                                        border: '1px solid rgba(79,172,254,0.2)', cursor: 'pointer'
                                                    }}
                                                >
                                                    <span style={{ fontSize: 18 }}>📄</span>
                                                    <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600, flex: 1 }}>{hw.pdfName}</span>
                                                    <span style={{ fontSize: 12, color: 'var(--accent-blue)' }}>⬇ View</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                            <HwBadge status={hw.status} onClick={() => handleCycleHwStatus(hw.id, hw.status)} />
                                            <button
                                                onClick={() => setShowDeleteHwId(hw.id)}
                                                style={{
                                                    background: 'rgba(247,106,124,0.12)', border: 'none', borderRadius: 6,
                                                    color: 'var(--accent-rose)', fontSize: 13, padding: '4px 8px', cursor: 'pointer'
                                                }}
                                            >🗑 Sil</button>
                                        </div>
                                    </div>
                                    {/* Tap to cycle help text */}
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Tap status badge to cycle: Pending → Done → Absent → Failed</div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* COMMENTS */}
                {activeTab === 'comments' && (
                    <>
                        <div className="section-title mb-16">Progress Notes</div>
                        {(!student.comments || student.comments.length === 0) && (
                            <EmptyState icon="💬" title="No notes yet" desc="Add your first note about this student's progress." />
                        )}
                        {(student.comments || []).slice().reverse().map(c => (
                            <div key={c.id} className="comment-card">
                                <div className="comment-card__header">
                                    <div>
                                        <span className="comment-card__date">{formatTime(c.createdAt)}</span>
                                        {c.addedBy && <span style={{ fontSize: 11, color: 'var(--accent-purple-light)', marginLeft: 8 }}>by {c.addedBy}</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className={`comment-card__type ${c.type}`}>
                                            {c.type === 'voice' ? '🎙 Voice' : c.type === 'photo' ? '📸 Photo' : '💬 Note'}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteComment(c.id)}
                                            title="Delete note"
                                            style={{
                                                background: 'rgba(247,106,124,0.12)', border: 'none', borderRadius: 6,
                                                color: 'var(--accent-rose)', fontSize: 12, padding: '3px 7px',
                                                cursor: 'pointer', lineHeight: 1,
                                            }}
                                        >🗑</button>
                                    </div>
                                </div>
                                {c.mediaPath && c.type === 'photo' && (
                                    <img
                                        src={c.mediaPath} alt="attachment"
                                        style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 200, objectFit: 'cover', cursor: 'pointer' }}
                                        onClick={() => setViewPhoto(c.mediaPath)}
                                    />
                                )}
                                {c.mediaPath && c.type === 'voice' && (
                                    <audio src={c.mediaPath} controls style={{ width: '100%', marginBottom: 8, height: 36 }} />
                                )}
                                <div className="comment-card__body">{c.text}</div>
                            </div>
                        ))}
                        <CommentInput
                            onSubmit={handleAddComment}
                            placeholder="Write a note, attach a photo, or record a voice note…"
                        />
                    </>
                )}

                {/* RATINGS */}
                {activeTab === 'ratings' && (
                    <>
                        <div className="section-header">
                            <span className="section-title">Lesson Ratings</span>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowRating(true)}>+ Rate</button>
                        </div>
                        {(!student.ratings || student.ratings.length === 0) ? (
                            <EmptyState icon="⭐" title="No ratings yet" desc="Tap '+ Rate' to add a lesson performance rating." />
                        ) : (
                            student.ratings.slice().reverse().map(r => (
                                <div key={r.id} style={{
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius-sm)', padding: 14, marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: 2 }}>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <span key={n} style={{ fontSize: 20, color: r.stars >= n ? 'var(--accent-amber)' : 'var(--text-muted)' }}>★</span>
                                            ))}
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</span>
                                    </div>
                                    {r.note && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{r.note}</div>}
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {/* Rename Sheet */}
            {showRename && (
                <BottomSheet title="Rename Student" onClose={() => setShowRename(false)}>
                    <div className="form-group">
                        <label className="form-label">New Name</label>
                        <input
                            className="form-input"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameStudent()}
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowRename(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleRenameStudent}>Save</button>
                    </div>
                </BottomSheet>
            )}

            {/* Rate Sheet */}
            {showRating && (
                <BottomSheet title="Rate This Lesson" onClose={() => setShowRating(false)}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                        <StarRating value={ratingStars} onChange={setRatingStars} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Note (optional)</label>
                        <input
                            className="form-input"
                            placeholder="e.g. great participation today..."
                            value={ratingNote}
                            onChange={e => setRatingNote(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowRating(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleAddRating}>Save Rating</button>
                    </div>
                </BottomSheet>
            )}

            {/* Delete Confirm */}
            {showDeleteConfirm && (
                <BottomSheet title="Remove Student?" onClose={() => setShowDeleteConfirm(false)}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{student.name}</strong> will be moved to the Trash.
                        You can restore them within 14 days.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                        <button className="btn btn-danger btn-full" onClick={handleDeleteStudent}>Move to Trash</button>
                    </div>
                </BottomSheet>
            )}

            {viewPhoto && <PhotoViewer src={viewPhoto} onClose={() => setViewPhoto(null)} />}

            {/* Assign Homework to Student */}
            {showAssignHw && (
                <BottomSheet title="Assign Homework" onClose={() => setShowAssignHw(false)}>
                    <div className="form-group">
                        <label className="form-label">Homework Title</label>
                        <input
                            className="form-input"
                            placeholder="e.g. Unit 3 Worksheet"
                            value={hwTitle}
                            onChange={e => setHwTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">PDF Attachment (optional)</label>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border-color)',
                            borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                        }}>
                            <span style={{ fontSize: 22 }}>{hwPdfFile ? '✅' : '📄'}</span>
                            <span style={{ fontSize: 14, color: hwPdfFile ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                {hwPdfFile ? hwPdfFile.name : 'Tap to choose a PDF file'}
                            </span>
                            <input
                                ref={hwFileInputRef}
                                type="file"
                                accept="application/pdf"
                                style={{ display: 'none' }}
                                onChange={handleHwPdfChange}
                            />
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowAssignHw(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleAssignHwToStudent} disabled={!hwTitle.trim()}>
                            Assign
                        </button>
                    </div>
                </BottomSheet>
            )}

            {/* ── Delete Homework Sheet ───────── */}
            {showDeleteHwId && (
                <BottomSheet title="Delete Homework" onClose={() => setShowDeleteHwId(null)}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                        This homework might be assigned to the whole class. Do you want to remove it for <strong style={{ color: 'var(--text-primary)' }}>this student only</strong>, or for <strong style={{ color: 'var(--accent-rose)' }}>all students in the class</strong>?
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="btn btn-secondary" onClick={() => {
                            actions.deleteStudentHomework({ studentId, hwId: showDeleteHwId });
                            setShowDeleteHwId(null);
                        }}>🗑 Only this student</button>
                        <button className="btn btn-danger" onClick={() => {
                            actions.deleteHomeworkAssignment({ classId: student.classId, hwId: showDeleteHwId });
                            setShowDeleteHwId(null);
                        }}>⚠️ Entire Class</button>
                        <button className="btn" style={{ background: 'transparent', color: 'var(--text-muted)', marginTop: 8 }} onClick={() => setShowDeleteHwId(null)}>Cancel</button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
