import React, { useState, useRef } from 'react';
import { BottomSheet } from '../components/Shared';

const CATEGORIES = [
    { id: 'guides', title: 'Guides', icon: '📚' },
    { id: 'quizzes', title: 'Quizzes', icon: '📝' },
    { id: 'writing', title: 'Writing', icon: '✍️' },
];

export default function DocumentsScreen({ state, actions }) {
    const [activeCategory, setActiveCategory] = useState('guides');
    const [uploadingCategory, setUploadingCategory] = useState(null);
    const [viewDoc, setViewDoc] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

    const handleUploadClick = (categoryId) => {
        setUploadingCategory(categoryId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !uploadingCategory) return;

        // Check if they are all PDFs
        const invalidFiles = files.filter(f => f.type !== 'application/pdf');
        if (invalidFiles.length > 0) {
            alert('Please select only PDF files.');
            return;
        }

        // Process all files concurrently
        await Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const dataUrl = event.target.result;
                    if (dataUrl) {
                        await actions.uploadDocument({
                            category: uploadingCategory,
                            name: file.name,
                            dataUrl: dataUrl
                        });
                    }
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }));

        setUploadingCategory(null);
        // Reset input
        e.target.value = null;
    };

    const handleDelete = (docId) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            actions.deleteDocument(docId);
        }
    };

    let docsForCategory = state.documents?.filter(d => d.category === activeCategory) || [];

    // Sort alphabetically by default
    docsForCategory.sort((a, b) => a.name.localeCompare(b.name));

    // Filter by search term
    if (searchTerm) {
        docsForCategory = docsForCategory.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return (
        <div style={{ padding: 20 }}>
            {/* Hidden file input */}
            <input
                type="file"
                accept="application/pdf"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 5 }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: 12,
                            border: 'none',
                            background: activeCategory === cat.id ? 'var(--bg-primary)' : 'rgba(255,255,255,0.05)',
                            color: activeCategory === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: activeCategory === cat.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: 18 }}>{cat.icon}</span>
                        {cat.title}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {CATEGORIES.find(c => c.id === activeCategory)?.title}
                </h2>
                <button
                    className="btn btn-primary"
                    onClick={() => handleUploadClick(activeCategory)}
                    disabled={!!uploadingCategory}
                    style={{ padding: '8px 16px', fontSize: 14 }}
                >
                    {uploadingCategory === activeCategory ? 'Uploading...' : 'Upload PDF'}
                </button>
            </div>

            {/* Filter / Search Bar */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    placeholder="Search documents by name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        outline: 'none'
                    }}
                />
            </div>

            {docsForCategory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 16 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No documents found.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {docsForCategory.map(doc => (
                        <div
                            key={doc.id}
                            style={{
                                background: 'var(--bg-card)',
                                padding: 16,
                                borderRadius: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1, minWidth: 0, paddingRight: 10 }}
                                onClick={() => setViewDoc(doc)}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ef4444', fontSize: 20, flexShrink: 0
                                }}>
                                    📄
                                </div>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {doc.name}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.id)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: 'none',
                                    width: 36, height: 36, borderRadius: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: 'var(--accent-rose)'
                                }}
                            >
                                🗑
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* PDF Viewer Modal */}
            {viewDoc && (
                <BottomSheet title={viewDoc.name} onClose={() => setViewDoc(null)}>
                    <div style={{ height: '70vh', marginTop: 10, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                        {/* If we have a local base64 we can use it, if it's external URL we use that */}
                        {viewDoc.dataUrl ? (
                            <iframe
                                src={`${viewDoc.dataUrl}#toolbar=0`}
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                                title={viewDoc.name}
                            />
                        ) : (
                            <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading document...</div>
                        )}
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
