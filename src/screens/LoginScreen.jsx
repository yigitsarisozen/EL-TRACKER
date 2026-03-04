import React, { useState } from 'react';

// ── Hardcoded users ──────────────────────────────────────────────────────────
// Add/remove users here. Passwords are plain-text since this is a small team app.
const USERS = [
    { username: 'yiğit', password: '218687', displayName: 'Yiğit' },
    { username: 'eren', password: 'patlıcan', displayName: 'Eren' },
    { username: 'efe', password: 'gana', displayName: 'Efe' },
    { username: 'leyla', password: 'deniz', displayName: 'Leyla' },
    { username: 'tod', password: 'afrasiyab', displayName: 'Tod' },
    { username: 'emine', password: 'çilek', displayName: 'Emine' },
    { username: 'şems', password: 'kivi', displayName: 'Şems' },
    { username: 'nur', password: 'müdire', displayName: 'Nur' },
    { username: 'beyza', password: 'armutlu', displayName: 'Beyza' },
    { username: 'melike', password: 'kimyager', displayName: 'Melike' },
    { username: 'ekrem', password: 'hekimbey', displayName: 'Ekrem' },
    { username: 'owner', password: '12345', displayName: 'Owner' },
];

export { USERS };

export default function LoginScreen({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const user = USERS.find(
            u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
        );
        if (user) {
            onLogin(user);
        } else {
            setError('Invalid username or password');
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(160deg, #0f0f14 0%, #1a1a2e 40%, #16213e 100%)',
            padding: 24,
        }}>
            {/* Logo */}
            <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'linear-gradient(135deg, #7c6af7, #4facfe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 900, color: 'white',
                boxShadow: '0 8px 32px rgba(124,106,247,0.4)',
                marginBottom: 16,
            }}>GA</div>

            <div style={{
                fontSize: 22, fontWeight: 800, color: 'var(--text-primary)',
                textAlign: 'center', marginBottom: 4,
            }}>Genç Akademi</div>
            <div style={{
                fontSize: 13, color: 'var(--text-secondary)',
                textAlign: 'center', marginBottom: 32,
            }}>English Curriculum Tracker</div>

            {/* Login Card */}
            <form
                onSubmit={handleSubmit}
                style={{
                    width: '100%', maxWidth: 340,
                    background: 'rgba(30,30,42,0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: 28,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                    animation: shaking ? 'shake 0.4s ease' : undefined,
                }}
            >
                <div style={{ marginBottom: 20 }}>
                    <label style={{
                        display: 'block', fontSize: 12, fontWeight: 700,
                        color: 'var(--text-secondary)', marginBottom: 8,
                        textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setError(''); }}
                        placeholder="Enter username"
                        autoFocus
                        autoComplete="username"
                        style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(255,255,255,0.06)',
                            border: error ? '1px solid rgba(247,106,124,0.5)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, color: 'var(--text-primary)',
                            fontSize: 15, fontFamily: 'Inter, sans-serif',
                            outline: 'none', transition: 'border-color 0.2s',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{
                        display: 'block', fontSize: 12, fontWeight: 700,
                        color: 'var(--text-secondary)', marginBottom: 8,
                        textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        placeholder="Enter password"
                        autoComplete="current-password"
                        style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(255,255,255,0.06)',
                            border: error ? '1px solid rgba(247,106,124,0.5)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, color: 'var(--text-primary)',
                            fontSize: 15, fontFamily: 'Inter, sans-serif',
                            outline: 'none', transition: 'border-color 0.2s',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {error && (
                    <div style={{
                        fontSize: 13, color: 'var(--accent-rose)', fontWeight: 600,
                        textAlign: 'center', marginBottom: 16,
                    }}>⚠ {error}</div>
                )}

                <button
                    type="submit"
                    style={{
                        width: '100%', padding: '14px',
                        background: 'linear-gradient(135deg, #7c6af7, #4facfe)',
                        border: 'none', borderRadius: 12,
                        color: 'white', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 4px 20px rgba(124,106,247,0.4)',
                        transition: 'all 0.2s',
                    }}
                >Sign In</button>
            </form>

            <div style={{
                fontSize: 11, color: 'var(--text-muted)',
                marginTop: 24, textAlign: 'center',
            }}>
                © {new Date().getFullYear()} Genç Akademi
            </div>
        </div>
    );
}
