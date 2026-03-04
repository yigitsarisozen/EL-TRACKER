import React, { useState, useRef, useEffect } from 'react';

/**
 * CommentInput — supports text, photo attachment, and voice recording.
 * Props:
 *   onSubmit(text, type, mediaPath) — called when teacher submits a comment
 *   placeholder — textarea placeholder string
 */
export default function CommentInput({ onSubmit, placeholder = 'Write a note...' }) {
    const [text, setText] = useState('');
    const [photoPreview, setPhotoPreview] = useState(null); // base64
    const [photoName, setPhotoName] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [audioDataUrl, setAudioDataUrl] = useState(null);
    const [recordingSeconds, setRecordingSecs] = useState(0);

    const photoInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Clean up on unmount
    useEffect(() => () => {
        clearInterval(timerRef.current);
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    // ── Photo ────────────────────────────────────────────────────────────────
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
        // Reset voice if any
        setAudioDataUrl(null);
        e.target.value = '';
    };

    const clearPhoto = () => { setPhotoPreview(null); setPhotoName(''); };

    // ── Voice Recording ──────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = (ev) => setAudioDataUrl(ev.target.result);
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
                clearInterval(timerRef.current);
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingSecs(0);
            setPhotoPreview(null); // reset photo if any
            timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
        } catch {
            alert('Microphone access is required for voice notes. Please allow it in your browser settings.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const clearAudio = () => setAudioDataUrl(null);

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = () => {
        if (!text.trim() && !photoPreview && !audioDataUrl) return;

        if (audioDataUrl) {
            onSubmit(text.trim() || '🎙 Voice note', 'voice', audioDataUrl);
        } else if (photoPreview) {
            onSubmit(text.trim() || '📸 Photo note', 'photo', photoPreview);
        } else {
            onSubmit(text.trim(), 'text', null);
        }

        setText('');
        setPhotoPreview(null);
        setPhotoName('');
        setAudioDataUrl(null);
    };

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const canSubmit = text.trim() || photoPreview || audioDataUrl;

    return (
        <div style={{ marginTop: 16 }}>

            {/* Photo preview */}
            {photoPreview && (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                    <img
                        src={photoPreview}
                        alt="attachment"
                        style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border-color)' }}
                    />
                    <button
                        onClick={clearPhoto}
                        style={{
                            position: 'absolute', top: 8, right: 8,
                            background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 8,
                            color: 'white', fontSize: 14, padding: '4px 8px', cursor: 'pointer',
                        }}
                    >✕</button>
                    {photoName && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4 }}>{photoName}</div>
                    )}
                </div>
            )}

            {/* Voice recording status / playback */}
            {isRecording && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(247,106,124,0.12)', border: '1px solid rgba(247,106,124,0.3)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                }}>
                    <span style={{ fontSize: 18, animation: 'pulse 1s infinite' }}>🔴</span>
                    <span style={{ fontSize: 14, color: 'var(--accent-rose)', fontWeight: 600 }}>
                        Recording… {formatTime(recordingSeconds)}
                    </span>
                    <button
                        onClick={stopRecording}
                        className="btn btn-danger btn-sm"
                        style={{ marginLeft: 'auto' }}
                    >⏹ Stop</button>
                </div>
            )}

            {audioDataUrl && !isRecording && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(67,232,200,0.08)', border: '1px solid rgba(67,232,200,0.25)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                }}>
                    <span style={{ fontSize: 18 }}>🎙</span>
                    <audio src={audioDataUrl} controls style={{ flex: 1, height: 34, minWidth: 0 }} />
                    <button
                        onClick={clearAudio}
                        style={{
                            background: 'rgba(247,106,124,0.15)', border: 'none', borderRadius: 8,
                            color: 'var(--accent-rose)', fontSize: 13, padding: '4px 8px', cursor: 'pointer',
                        }}
                    >✕</button>
                </div>
            )}

            {/* Text + action buttons row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                    className="comment-textarea"
                    placeholder={placeholder}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{ flex: 1 }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Photo button */}
                    <label
                        title="Attach photo"
                        style={{
                            width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
                            background: photoPreview ? 'rgba(79,172,254,0.2)' : 'rgba(255,255,255,0.06)',
                            border: photoPreview ? '1px solid rgba(79,172,254,0.4)' : '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                            transition: 'all 0.15s',
                        }}
                    >
                        📸
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handlePhotoChange}
                        />
                    </label>

                    {/* Voice button */}
                    <button
                        title={isRecording ? 'Stop recording' : 'Record voice note'}
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{
                            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: isRecording ? 'rgba(247,106,124,0.25)' : 'rgba(255,255,255,0.06)',
                            color: isRecording ? 'var(--accent-rose)' : 'var(--text-secondary)',
                            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                        }}
                    >
                        {isRecording ? '⏹' : '🎙'}
                    </button>

                    {/* Send button */}
                    <button
                        className="btn btn-primary btn-icon"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        style={{ opacity: canSubmit ? 1 : 0.4 }}
                    >↑</button>
                </div>
            </div>

            {/* Hint */}
            {!photoPreview && !audioDataUrl && !isRecording && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 2 }}>
                    📸 Attach photo &nbsp;·&nbsp; 🎙 Record voice note
                </div>
            )}
        </div>
    );
}
