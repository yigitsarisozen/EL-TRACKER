import React, { useState, useRef, useEffect } from 'react';
import { BottomSheet, EmptyState } from '../components/Shared';
import { Browser } from '@capacitor/browser';

const CLASS_COLOR_ACCENTS = ['#7c6af7', '#4facfe', '#43e8c8', '#f6a832', '#f76a7c', '#43c98f', '#b07cfa', '#fe9a4f'];

// Determine if a file is a PDF or Excel
function getFileCategory(name = '') {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
    return 'other';
}

export default function CurriculumScreen({ state, actions, onNavigate, currentUser }) {
    const [showEdit, setShowEdit] = useState(false);
    const [editClassId, setEditClassId] = useState(null);
    const [unit, setUnit] = useState('');
    const [topic, setTopic] = useState('');
    const [showAssignHw, setShowAssignHw] = useState(false);
    const [hwClassId, setHwClassId] = useState(null);
    const [hwTitle, setHwTitle] = useState('');
    const [hwPdfFile, setHwPdfFile] = useState(null);
    const [hwPdfDataUrl, setHwPdfDataUrl] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const currFileInputRef = useRef(null);
    const hwFileInputRef = useRef(null);

    const gc = state.generalCurriculum; // shorthand
    const gcCategory = getFileCategory(gc?.name);

    // ── Curriculum file upload ──────────────────────────────────────────────
    const handleCurriculumFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            actions.setGeneralCurriculum({
                name: file.name,
                dataUrl: ev.target.result,
                fileType: file.type,
                uploadedAt: new Date().toISOString(),
            });
        };
        reader.readAsDataURL(file);
        // reset input so same file can be re-uploaded
        e.target.value = '';
    };

    const handleOpenCurriculum = async () => {
        if (!gc) return;
        // If URL is a Firebase Storage URL (https://...), use native Capacitor Browser
        if (gc.dataUrl && gc.dataUrl.startsWith('https://')) {
            await Browser.open({ url: gc.dataUrl, presentationStyle: 'fullscreen', windowName: '_blank' });
        } else {
            // Fallback: trigger download for data: URLs
            const a = document.createElement('a');
            a.href = gc.dataUrl;
            a.download = gc.name;
            a.click();
        }
    };

    // ── Class curriculum editing ────────────────────────────────────────────
    const getCurriculum = (classId) => state.curriculum.find(c => c.classId === classId);

    const openEdit = (classId) => {
        const curr = getCurriculum(classId);
        setEditClassId(classId);
        setUnit(curr?.unit || '');
        setTopic(curr?.topic || '');
        setShowEdit(true);
    };

    const handleSave = () => {
        if (!editClassId) return;
        actions.updateCurriculum({ classId: editClassId, unit, topic });
        setShowEdit(false);
        setEditClassId(null);
    };

    // ── Homework assignment ─────────────────────────────────────────────────
    const openAssignHw = (classId) => {
        setHwClassId(classId);
        setHwTitle('');
        setHwPdfFile(null);
        setHwPdfDataUrl(null);
        setShowAssignHw(true);
    };

    const handleHwPdfChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setHwPdfFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setHwPdfDataUrl(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleAssignHw = () => {
        if (!hwTitle.trim() || !hwClassId) return;
        actions.addHomeworkAssignment({
            classId: hwClassId,
            title: hwTitle.trim(),
            pdfName: hwPdfFile?.name || null,
            pdfDataUrl: hwPdfDataUrl || null,
        });
        setShowAssignHw(false);
        setHwClassId(null);
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="screen-pad page-enter">

            {/* ── GENERAL CURRICULUM CARD ─────────────────────────────────── */}
            <div style={{
                background: gc
                    ? 'linear-gradient(135deg, rgba(124,106,247,0.18), rgba(79,172,254,0.12))'
                    : 'rgba(255,255,255,0.03)',
                border: gc
                    ? '1px solid rgba(124,106,247,0.35)'
                    : '2px dashed rgba(255,255,255,0.12)',
                borderRadius: 20,
                padding: '24px 20px',
                marginBottom: 24,
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center', // Center content for better aesthetics
            }}>
                {/* Decorative glow */}
                {gc && (
                    <div style={{
                        position: 'absolute', top: -30, right: -30,
                        width: 120, height: 120,
                        background: 'radial-gradient(circle, rgba(124,106,247,0.25) 0%, transparent 70%)',
                        borderRadius: '50%', pointerEvents: 'none',
                    }} />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    {/* File type icon */}
                    <div style={{
                        width: 64, height: 64, borderRadius: 18,
                        background: gc
                            ? (gcCategory === 'pdf'
                                ? 'linear-gradient(135deg, #f76a7c, #f6a832)'
                                : 'linear-gradient(135deg, #43c98f, #4facfe)')
                            : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 32,
                        boxShadow: gc ? '0 8px 20px rgba(0,0,0,0.2)' : 'none',
                    }}>
                        {gc
                            ? (gcCategory === 'pdf' ? '📄' : '📊')
                            : '📋'
                        }
                    </div>

                    <div style={{ width: '100%', minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                            General Curriculum
                        </div>
                        {gc ? (
                            <>
                                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {gc.name}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Updated {formatDate(gc.uploadedAt)}
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
                                No curriculum file uploaded yet
                            </div>
                        )}
                    </div>

                    {/* Action area */}
                    <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center' }}>
                        {gc && (
                            <button
                                className="btn btn-primary"
                                onClick={handleOpenCurriculum}
                                style={{ flex: 1 }}
                            >
                                📄 General Curriculum
                            </button>
                        )}
                        {currentUser?.isAdmin && (
                            <>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => currFileInputRef.current?.click()}
                                    style={{ flex: gc ? 0 : 1, minWidth: gc ? 'auto' : undefined }}
                                >
                                    {gc ? '🔄 Change' : '⬆ Upload Curriculum'}
                                </button>
                                <input
                                    ref={currFileInputRef}
                                    type="file"
                                    accept=".pdf,.xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                    onChange={handleCurriculumFileChange}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Format hint */}
                {!gc && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.6 }}>
                        Upload your school's master curriculum document.<br />
                        Supports <strong style={{ color: 'var(--text-secondary)' }}>PDF</strong> or <strong style={{ color: 'var(--text-secondary)' }}>Excel / CSV</strong>.
                    </p>
                )}
            </div>

            {/* ── CLASS PROGRESS BOARD ────────────────────────────────────── */}
            {state.classes.length === 0 ? (
                <EmptyState icon="📋" title="No classes yet" desc="Create classes first to track their curriculum." />
            ) : (
                <>
                    <div className="section-title mb-16">Class Progresses</div>

                    {/* Filter Input */}
                    <div className="form-group">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Search classes..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}
                        />
                    </div>

                    <div className="curriculum-board">
                        {state.classes
                            .filter(cls => cls.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((cls, idx) => {
                                const curr = getCurriculum(cls.id);
                                const color = cls.color || CLASS_COLOR_ACCENTS[idx % CLASS_COLOR_ACCENTS.length];

                                return (
                                    <div key={cls.id} className="curriculum-row" onClick={() => onNavigate('class-detail', { classId: cls.id })} style={{ cursor: 'pointer' }}>
                                        <div className="curriculum-row__class-color" style={{ background: color }} />
                                        <div className="curriculum-row__info">
                                            <div className="curriculum-row__class-name">{cls.name}</div>
                                            <div className="curriculum-row__topic">
                                                {curr?.topic
                                                    ? `📖 ${curr.topic}`
                                                    : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No topic set yet</span>
                                                }
                                            </div>
                                            {curr?.updatedAt && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                                    Updated: {formatDate(curr.updatedAt)}
                                                </div>
                                            )}
                                        </div>
                                        {curr?.unit && (
                                            <div className="curriculum-row__unit">{curr.unit}</div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(cls.id); }} title="Set curriculum topic">✏️</button>
                                            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openAssignHw(cls.id); }} title="Assign homework">📚</button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* How-to Guide */}
                    <div style={{ marginTop: 24 }}>
                        <div className="section-title mb-16">How to use this screen</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="card" style={{ background: 'rgba(124,106,247,0.07)', cursor: 'default' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 24, flexShrink: 0 }}>✏️</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>Set Curriculum Position</div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            Tap ✏️ on a class row to update which unit and topic it's currently on.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="card" style={{ background: 'rgba(79,172,254,0.07)', cursor: 'default' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 24, flexShrink: 0 }}>📚</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>Assign Homework</div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            Tap 📚 to assign homework (with optional PDF) to all students in that class at once.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}



            {/* ══ Edit Curriculum Sheet ══════════════════════════════════════ */}
            {showEdit && (
                <BottomSheet title="Update Curriculum" onClose={() => setShowEdit(false)}>
                    <div className="form-group">
                        <label className="form-label">Unit / Chapter</label>
                        <input
                            className="form-input"
                            placeholder="e.g. Unit 3, Chapter 7..."
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Current Topic</label>
                        <input
                            className="form-input"
                            placeholder="e.g. Present Perfect Tense, Reading: Travel..."
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button className="btn btn-secondary btn-full" onClick={() => setShowEdit(false)}>Cancel</button>
                        <button className="btn btn-primary btn-full" onClick={handleSave}>Update</button>
                    </div>
                </BottomSheet>
            )}

            {/* ══ Assign Homework Sheet ══════════════════════════════════════ */}
            {showAssignHw && (
                <BottomSheet
                    title={`Assign Class Homework`}
                    onClose={() => setShowAssignHw(false)}
                >
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
                        <button className="btn btn-primary btn-full" onClick={handleAssignHw} disabled={!hwTitle.trim() || !hwClassId}>
                            Assign
                        </button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
