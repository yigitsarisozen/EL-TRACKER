import React, { useState, useCallback, useRef, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import './index.css';
import { useFirebaseStore } from './firebase/useFirebaseStore';

import LoginScreen from './screens/LoginScreen';
import ClassesScreen from './screens/ClassesScreen';
import ClassDetailScreen from './screens/ClassDetailScreen';
import StudentDetailScreen from './screens/StudentDetailScreen';
import CurriculumScreen from './screens/CurriculumScreen';
import TrashScreen from './screens/TrashScreen';
import { BottomSheet } from './components/Shared';

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: 'classes', label: 'Classes', icon: '🏫' },
  { id: 'curriculum', label: 'Curriculum', icon: '📋' },
  { id: 'trash', label: 'Trash', icon: '🗑' },
];

// ─── Helper: screen title & back target ─────────────────────────────────────
function getNavConfig(screen, params, state) {
  switch (screen) {
    case 'classes': return { title: 'Genç Akademi', showBack: false };
    case 'curriculum': return { title: 'Curriculum', showBack: false };
    case 'trash': return { title: 'Trash', showBack: false };
    case 'class-detail': {
      const cls = state.classes.find(c => c.id === params.classId);
      return { title: cls?.name || 'Class', subtitle: 'Class Detail', showBack: true, backTo: 'classes', backParams: {} };
    }
    case 'student-detail': {
      const student = state.students.find(s => s.id === params.studentId);
      const cls = state.classes.find(c => c.id === params.classId);
      return {
        title: student?.name || 'Student',
        subtitle: cls?.name,
        showBack: true,
        backTo: 'class-detail',
        backParams: { classId: params.classId },
      };
    }
    default: return { title: 'Genç Akademi', showBack: false };
  }
}

export default function App() {
  const { state, actions } = useFirebaseStore();

  // ── Auth state (localStorage = persistent across app restarts) ─────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ga_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('ga_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ga_current_user');
    setShowLogoutConfirm(false);
  };

  // ── Navigation state ────────────────────────────────────────────────────────
  const [nav, setNav] = useState({ screen: 'classes', params: {} });
  const [activeTab, setActiveTab] = useState('classes');

  const navigate = useCallback((screen, params = {}) => {
    setNav({ screen, params });
    if (['classes', 'curriculum', 'trash'].includes(screen)) {
      setActiveTab(screen);
    }
  }, []);

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    setNav({ screen: tabId, params: {} });
  };

  const handleBack = (to, params = {}) => {
    navigate(to, params);
  };

  // ── Swipe between tabs ────────────────────────────────────────────────────
  const swipeRef = useRef({ startX: 0, startY: 0 });
  const TAB_IDS = TABS.map(t => t.id);

  const handleTouchStart = (e) => {
    swipeRef.current.startX = e.touches[0].clientX;
    swipeRef.current.startY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    // only for top-level tab screens
    if (!TAB_IDS.includes(nav.screen)) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
    const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
    // must be horizontal swipe (|dx| > 60 and |dx| > |dy|*1.5)
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const currentIdx = TAB_IDS.indexOf(activeTab);
    if (dx < 0 && currentIdx < TAB_IDS.length - 1) {
      // swipe left → next tab
      handleTabPress(TAB_IDS[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      // swipe right → prev tab
      handleTabPress(TAB_IDS[currentIdx - 1]);
    }
  };

  // ── Android Back Button ───────────────────────────────────────────────────
  const navRef = useRef(nav);
  const backPressCount = useRef(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    navRef.current = nav;
  }, [nav]);

  useEffect(() => {
    const listener = CapApp.addListener('backButton', () => {
      // 1. Give modals/popups a chance to intercept
      const event = new CustomEvent('hardwareBackPress', { cancelable: true });
      window.dispatchEvent(event);
      if (event.defaultPrevented) return; // A modal handled it!

      const currentNav = navRef.current;

      // 2. If NOT on a main tab, navigate back to 'classes' (main menu)
      if (!TAB_IDS.includes(currentNav.screen)) {
        handleBack('classes', {});
        backPressCount.current = 0;
      } else {
        // 3. If on main tab, press back again to exit
        if (backPressCount.current >= 1) {
          setShowExitConfirm(true);
        } else {
          backPressCount.current += 1;
          setTimeout(() => { backPressCount.current = 0; }, 2000);
        }
      }
    });
    return () => { listener.then(l => l.remove()); };
  }, [handleBack]);

  // ── If not logged in, show Login ────────────────────────────────────────────
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const { title, subtitle, showBack, backTo, backParams } = getNavConfig(nav.screen, nav.params, state);

  // ── Render Screen ──────────────────────────────────────────────────────────
  const renderScreen = () => {
    const props = { state, actions, onNavigate: navigate, params: nav.params, currentUser };
    switch (nav.screen) {
      case 'classes': return <ClassesScreen       {...props} />;
      case 'class-detail': return <ClassDetailScreen    {...props} />;
      case 'student-detail': return <StudentDetailScreen  {...props} />;
      case 'curriculum': return <CurriculumScreen     {...props} />;
      case 'trash': return <TrashScreen          {...props} />;
      default: return <ClassesScreen        {...props} />;
    }
  };

  const trashCount = state.trash.length;

  return (
    <div className="app-shell">
      {/* Syncing overlay */}
      {!state._synced && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          background: 'var(--bg-primary)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #7c6af7, #4facfe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: 'white',
          }}>GA</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>Connecting to server…</div>
          <div style={{
            width: 40, height: 3, borderRadius: 2,
            background: 'linear-gradient(90deg, #7c6af7, #4facfe)',
            animation: 'pulse 1s infinite',
          }} />
        </div>
      )}

      {/* Top Nav */}
      <nav className="top-nav">
        <div className="top-nav__left">
          {showBack && (
            <button className="top-nav__back-btn" onClick={() => handleBack(backTo, backParams)}>‹</button>
          )}
          <div>
            <div className="top-nav__title">{title}</div>
            {subtitle && <div className="top-nav__subtitle">{subtitle}</div>}
          </div>
        </div>
        <div className="top-nav__actions">
          {/* Tap name → show logout confirm */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: 8,
              background: 'linear-gradient(135deg, #7c6af7, #4facfe)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: 'white',
            }}>{currentUser.displayName.charAt(0)}</span>
            {currentUser.displayName}
          </button>
        </div>
      </nav>

      {/* Main Content — swipe enabled */}
      <main
        className="main-content"
        key={`${nav.screen}-${JSON.stringify(nav.params)}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {renderScreen()}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabPress(tab.id)}
          >
            <div className="tab-item__dot" />
            <span className="tab-item__icon">
              {tab.id === 'trash' && trashCount > 0
                ? <span style={{ position: 'relative' }}>
                  {tab.icon}
                  <span style={{
                    position: 'absolute', top: -6, right: -8,
                    background: 'var(--accent-rose)', color: 'white',
                    fontSize: 9, fontWeight: 800, borderRadius: 8,
                    padding: '1px 4px', lineHeight: 1.4,
                  }}>{trashCount}</span>
                </span>
                : tab.icon
              }
            </span>
            <span className="tab-item__label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <BottomSheet title="Çıkış Yap" onClose={() => setShowLogoutConfirm(false)}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{currentUser.displayName}</strong> olarak çıkış yapmak istiyor musunuz?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-full" onClick={() => setShowLogoutConfirm(false)}>Hayır</button>
            <button className="btn btn-danger btn-full" onClick={handleLogout}>Evet, Çıkış Yap</button>
          </div>
        </BottomSheet>
      )}

      {/* Exit App confirm */}
      {showExitConfirm && (
        <BottomSheet title="Uygulamadan Çık" onClose={() => setShowExitConfirm(false)}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Uygulamadan çıkmak istediğinize emin misiniz?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-full" onClick={() => setShowExitConfirm(false)}>Hayır</button>
            <button className="btn btn-danger btn-full" onClick={() => CapApp.exitApp()}>Evet, Çık</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
