import React, { useState, useCallback } from 'react';
import './index.css';
import { useFirebaseStore } from './firebase/useFirebaseStore';

import ClassesScreen from './screens/ClassesScreen';
import ClassDetailScreen from './screens/ClassDetailScreen';
import StudentDetailScreen from './screens/StudentDetailScreen';
import CurriculumScreen from './screens/CurriculumScreen';
import TrashScreen from './screens/TrashScreen';

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: 'classes', label: 'Classes', icon: '🏫' },
  { id: 'curriculum', label: 'Curriculum', icon: '📋' },
  { id: 'trash', label: 'Trash', icon: '🗑' },
];

// ─── Helper: screen title & back target ─────────────────────────────────────
function getNavConfig(screen, params, state) {
  switch (screen) {
    case 'classes': return { title: 'EL Tracker', showBack: false };
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
    default: return { title: 'EL Tracker', showBack: false };
  }
}

export default function App() {
  const { state, actions } = useFirebaseStore();

  // Navigation state: { screen, params }
  const [nav, setNav] = useState({ screen: 'classes', params: {} });
  const [activeTab, setActiveTab] = useState('classes');

  const navigate = useCallback((screen, params = {}) => {
    setNav({ screen, params });
    // If it's a root tab screen, update active tab
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

  const { title, subtitle, showBack, backTo, backParams } = getNavConfig(nav.screen, nav.params, state);

  // ── Render Screen ──────────────────────────────────────────────────────────
  const renderScreen = () => {
    const props = { state, actions, onNavigate: navigate, params: nav.params };
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
      {/* Syncing overlay — shown only on very first load until Firestore responds */}
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
          }}>EL</div>
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
          {/* Logo mark */}
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c6af7, #4facfe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: 'white', letterSpacing: -1,
          }}>EL</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content" key={`${nav.screen}-${JSON.stringify(nav.params)}`}>
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
    </div>
  );
}
