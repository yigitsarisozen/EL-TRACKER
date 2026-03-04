import { useReducer, useEffect, useCallback } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();

// Performance calculation
export function calcPerformance(student) {
  const ratings = (student.ratings || []);
  const hw = (student.homework || []);

  const validRatings = ratings.filter(r => r.stars != null);
  const starAvg = validRatings.length
    ? validRatings.reduce((s, r) => s + r.stars, 0) / validRatings.length
    : null;

  const gradedHw = hw.filter(h => h.status && h.status !== 'none');
  const hwScore = gradedHw.length
    ? gradedHw.filter(h => h.status === 'done').length / gradedHw.length
    : null;

  if (starAvg === null && hwScore === null) return 'none';

  const starNorm = starAvg !== null ? starAvg / 5 : null;
  const parts = [starNorm, hwScore].filter(x => x !== null);
  const combined = parts.reduce((a, b) => a + b, 0) / parts.length;

  if (combined >= 0.75) return 'above';
  if (combined >= 0.45) return 'average';
  return 'poor';
}

export const PERF_LABELS = {
  above: '⭐ Above Average',
  average: '📊 Average',
  poor: '⚠️ Poor Performance',
  none: 'No data yet',
};

// ─── Initial State ─────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  classes: [],             // { id, name, color, curriculumUnit, curriculumTopic, createdAt }
  students: [],            // { id, classId, name, photo, ratings[], homework[], comments[], voiceNotes[] }
  classComments: [],       // { id, classId, text, type, createdAt } type: text|voice|photo
  curriculum: [],          // { id, classId, unit, topic, updatedAt }
  trash: [],               // { id, type: 'class'|'student', data, deletedAt }
  generalCurriculum: null, // { name, dataUrl, fileType, uploadedAt } — the master curriculum file
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    // ── Classes ──
    case 'ADD_CLASS': {
      const newClass = {
        id: uid(), name: action.payload.name,
        color: action.payload.color || '#7c6af7',
        curriculumUnit: '', curriculumTopic: '',
        createdAt: now(),
      };
      return { ...state, classes: [...state.classes, newClass] };
    }
    case 'UPDATE_CLASS': {
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload } : c
        ),
      };
    }
    case 'DELETE_CLASS': {
      const cls = state.classes.find(c => c.id === action.payload);
      if (!cls) return state;
      // Move class + its students to trash
      const classStudents = state.students.filter(s => s.classId === action.payload);
      const trashItems = [
        { id: uid(), type: 'class', data: { ...cls, students: classStudents }, deletedAt: now() },
      ];
      return {
        ...state,
        classes: state.classes.filter(c => c.id !== action.payload),
        students: state.students.filter(s => s.classId !== action.payload),
        classComments: state.classComments.filter(c => c.classId !== action.payload),
        curriculum: state.curriculum.filter(c => c.classId !== action.payload),
        trash: [...state.trash, ...trashItems],
      };
    }

    // ── Students ──
    case 'ADD_STUDENT': {
      const newStudent = {
        id: uid(), classId: action.payload.classId,
        name: action.payload.name, photo: null,
        ratings: [], homework: [], comments: [],
        createdAt: now(),
      };
      return { ...state, students: [...state.students, newStudent] };
    }
    case 'UPDATE_STUDENT': {
      return {
        ...state,
        students: state.students.map(s =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s
        ),
      };
    }
    case 'DELETE_STUDENT': {
      const student = state.students.find(s => s.id === action.payload);
      if (!student) return state;
      return {
        ...state,
        students: state.students.filter(s => s.id !== action.payload),
        trash: [...state.trash, { id: uid(), type: 'student', data: student, deletedAt: now() }],
      };
    }

    // ── Student Comments ──
    case 'ADD_STUDENT_COMMENT': {
      return {
        ...state,
        students: state.students.map(s => {
          if (s.id !== action.payload.studentId) return s;
          return {
            ...s,
            comments: [...(s.comments || []), {
              id: uid(),
              text: action.payload.text,
              type: action.payload.commentType || 'text',
              mediaPath: action.payload.mediaPath || null,
              createdAt: now(),
            }],
          };
        }),
      };
    }

    // ── Class Comments ──
    case 'ADD_CLASS_COMMENT': {
      return {
        ...state,
        classComments: [...state.classComments, {
          id: uid(), classId: action.payload.classId,
          text: action.payload.text,
          type: action.payload.commentType || 'text',
          mediaPath: action.payload.mediaPath || null,
          createdAt: now(),
        }],
      };
    }

    // ── Homework ──
    case 'ADD_HOMEWORK_ASSIGNMENT': {
      // Adds a hw assignment to all students in a class
      const { classId, title, pdfName, pdfDataUrl } = action.payload;
      const hwEntry = { id: uid(), title, pdfName: pdfName || null, pdfDataUrl: pdfDataUrl || null, status: 'none', assignedAt: now() };
      return {
        ...state,
        students: state.students.map(s =>
          s.classId === classId
            ? { ...s, homework: [...(s.homework || []), hwEntry] }
            : s
        ),
      };
    }
    case 'UPDATE_HOMEWORK_STATUS': {
      // { studentId, hwId, status }
      return {
        ...state,
        students: state.students.map(s => {
          if (s.id !== action.payload.studentId) return s;
          return {
            ...s,
            homework: s.homework.map(hw =>
              hw.id === action.payload.hwId
                ? { ...hw, status: action.payload.status }
                : hw
            ),
          };
        }),
      };
    }

    // ── Ratings ──
    case 'ADD_RATING': {
      // { studentId, stars, lessonNote }
      return {
        ...state,
        students: state.students.map(s => {
          if (s.id !== action.payload.studentId) return s;
          return {
            ...s,
            ratings: [...(s.ratings || []), {
              id: uid(), stars: action.payload.stars,
              note: action.payload.lessonNote || '',
              createdAt: now(),
            }],
          };
        }),
      };
    }

    // ── Curriculum ──
    case 'UPDATE_CURRICULUM': {
      // { classId, unit, topic }
      const existing = state.curriculum.find(c => c.classId === action.payload.classId);
      if (existing) {
        return {
          ...state,
          curriculum: state.curriculum.map(c =>
            c.classId === action.payload.classId
              ? { ...c, unit: action.payload.unit, topic: action.payload.topic, updatedAt: now() }
              : c
          ),
        };
      }
      return {
        ...state,
        curriculum: [...state.curriculum, {
          id: uid(), classId: action.payload.classId,
          unit: action.payload.unit, topic: action.payload.topic,
          updatedAt: now(),
        }],
      };
    }

    // ── General Curriculum File ──
    case 'SET_GENERAL_CURRICULUM': {
      return { ...state, generalCurriculum: action.payload };
    }

    // ── Trash ──
    case 'RESTORE_TRASH': {
      const item = state.trash.find(t => t.id === action.payload);
      if (!item) return state;

      let newState = { ...state, trash: state.trash.filter(t => t.id !== action.payload) };

      if (item.type === 'student') {
        newState.students = [...state.students, item.data];
      } else if (item.type === 'class') {
        const { students: trashedStudents, ...classData } = item.data;
        newState.classes = [...state.classes, classData];
        newState.students = [...state.students, ...(trashedStudents || [])];
      }
      return newState;
    }
    case 'PURGE_TRASH': {
      // Permanently delete item from trash
      return { ...state, trash: state.trash.filter(t => t.id !== action.payload) };
    }
    case 'PURGE_EXPIRED_TRASH': {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      return {
        ...state,
        trash: state.trash.filter(t => new Date(t.deletedAt).getTime() > twoWeeksAgo),
      };
    }

    default:
      return state;
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'el_tracker_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...INITIAL_STATE, ...JSON.parse(raw) } : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full or unavailable */ }
  }, [state]);

  // Purge expired trash on mount
  useEffect(() => {
    dispatch({ type: 'PURGE_EXPIRED_TRASH' });
  }, []);

  const actions = useCallback(() => ({
    addClass: (payload) => dispatch({ type: 'ADD_CLASS', payload }),
    updateClass: (payload) => dispatch({ type: 'UPDATE_CLASS', payload }),
    deleteClass: (id) => dispatch({ type: 'DELETE_CLASS', payload: id }),
    addStudent: (payload) => dispatch({ type: 'ADD_STUDENT', payload }),
    updateStudent: (payload) => dispatch({ type: 'UPDATE_STUDENT', payload }),
    deleteStudent: (id) => dispatch({ type: 'DELETE_STUDENT', payload: id }),
    addStudentComment: (payload) => dispatch({ type: 'ADD_STUDENT_COMMENT', payload }),
    addClassComment: (payload) => dispatch({ type: 'ADD_CLASS_COMMENT', payload }),
    addHomeworkAssignment: (payload) => dispatch({ type: 'ADD_HOMEWORK_ASSIGNMENT', payload }),
    updateHomeworkStatus: (payload) => dispatch({ type: 'UPDATE_HOMEWORK_STATUS', payload }),
    addRating: (payload) => dispatch({ type: 'ADD_RATING', payload }),
    updateCurriculum: (payload) => dispatch({ type: 'UPDATE_CURRICULUM', payload }),
    setGeneralCurriculum: (payload) => dispatch({ type: 'SET_GENERAL_CURRICULUM', payload }),
    restoreTrash: (id) => dispatch({ type: 'RESTORE_TRASH', payload: id }),
    purgeTrash: (id) => dispatch({ type: 'PURGE_TRASH', payload: id }),
  }), []);

  return { state, actions: actions() };
}
