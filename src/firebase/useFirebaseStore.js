/**
 * useFirebaseStore — drop-in replacement for useStore.
 *
 * Architecture:
 *  • Local state via useReducer → instant UI, always responsive
 *  • Firestore onSnapshot listeners → real-time sync across all devices
 *  • Firebase Storage → all binary files (photos, audio, PDFs)
 *  • Offline persistence → works without internet, auto-syncs on reconnect
 */
import { useReducer, useEffect, useCallback } from 'react';
import {
    collection, doc, setDoc, deleteDoc, updateDoc,
    onSnapshot, writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { uploadIfBase64 } from './uploads';

export { calcPerformance, PERF_LABELS } from '../store/useStore';

// ─── Helpers ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();

// ─── Reducer ────────────────────────────────────────────────────────────────────
const INITIAL_STATE = {
    classes: [],
    students: [],
    classComments: [],
    curriculum: [],
    trash: [],
    generalCurriculum: null,
    _synced: false,
};

function reducer(state, action) {
    switch (action.type) {
        // Firestore snapshots replace collection data wholesale
        case 'SNAP_CLASSES': return { ...state, classes: action.payload, _synced: true };
        case 'SNAP_STUDENTS': return { ...state, students: action.payload };
        case 'SNAP_CLASS_COMMENTS': return { ...state, classComments: action.payload };
        case 'SNAP_CURRICULUM': return { ...state, curriculum: action.payload };
        case 'SNAP_TRASH': return { ...state, trash: action.payload };
        case 'SNAP_SETTINGS': return { ...state, generalCurriculum: action.payload };

        // Optimistic local updates for instant UI feedback
        case 'OPT_ADD_CLASS':
            return { ...state, classes: [...state.classes, action.payload] };
        case 'OPT_UPDATE_CLASS':
            return { ...state, classes: state.classes.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
        case 'OPT_DELETE_CLASS':
            return {
                ...state,
                classes: state.classes.filter(c => c.id !== action.payload),
                students: state.students.filter(s => s.classId !== action.payload),
                classComments: state.classComments.filter(c => c.classId !== action.payload),
                curriculum: state.curriculum.filter(c => c.classId !== action.payload),
            };
        case 'OPT_ADD_STUDENT':
            return { ...state, students: [...state.students, action.payload] };
        case 'OPT_UPDATE_STUDENT':
            return { ...state, students: state.students.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
        case 'OPT_DELETE_STUDENT':
            return { ...state, students: state.students.filter(s => s.id !== action.payload) };
        case 'OPT_ADD_CLASS_COMMENT':
            return { ...state, classComments: [...state.classComments, action.payload] };
        case 'OPT_DELETE_CLASS_COMMENT':
            return { ...state, classComments: state.classComments.filter(c => c.id !== action.payload) };
        case 'OPT_ADD_STUDENT_COMMENT':
            return {
                ...state,
                students: state.students.map(s =>
                    s.id !== action.payload.studentId ? s
                        : { ...s, comments: [...(s.comments || []), action.payload.comment] }
                ),
            };
        case 'OPT_DELETE_STUDENT_COMMENT':
            return {
                ...state,
                students: state.students.map(s =>
                    s.id !== action.payload.studentId ? s
                        : { ...s, comments: (s.comments || []).filter(c => c.id !== action.payload.commentId) }
                ),
            };
        case 'OPT_ADD_RATING':
            return {
                ...state,
                students: state.students.map(s =>
                    s.id !== action.payload.studentId ? s
                        : { ...s, ratings: [...(s.ratings || []), action.payload.rating] }
                ),
            };
        case 'OPT_UPDATE_CURRICULUM':
            return {
                ...state,
                curriculum: state.curriculum.some(c => c.classId === action.payload.classId)
                    ? state.curriculum.map(c => c.classId === action.payload.classId ? { ...c, ...action.payload } : c)
                    : [...state.curriculum, action.payload],
            };
        case 'OPT_SET_GENERAL_CURRICULUM':
            return { ...state, generalCurriculum: action.payload };
        case 'OPT_ADD_TRASH':
            return { ...state, trash: [...state.trash, action.payload] };
        case 'OPT_RESTORE_TRASH': {
            const item = state.trash.find(t => t.id === action.payload);
            if (!item) return state;
            let ns = { ...state, trash: state.trash.filter(t => t.id !== action.payload) };
            if (item.type === 'student') ns.students = [...ns.students, item.data];
            if (item.type === 'class') {
                const { students: ts, ...cls } = item.data;
                ns.classes = [...ns.classes, cls];
                ns.students = [...ns.students, ...(ts || [])];
            }
            return ns;
        }
        case 'OPT_PURGE_TRASH':
            return { ...state, trash: state.trash.filter(t => t.id !== action.payload) };
        case 'OPT_UPDATE_HW_STATUS':
            return {
                ...state,
                students: state.students.map(s =>
                    s.id !== action.payload.studentId ? s : {
                        ...s,
                        homework: s.homework.map(hw =>
                            hw.id === action.payload.hwId ? { ...hw, status: action.payload.status } : hw
                        ),
                    }
                ),
            };
        case 'OPT_ADD_HOMEWORK':
            return {
                ...state,
                students: state.students.map(s =>
                    s.classId !== action.payload.classId ? s
                        : { ...s, homework: [...(s.homework || []), action.payload.hw] }
                ),
            };
        default:
            return state;
    }
}

// ─── Firestore collection names ──────────────────────────────────────────────────
const C = {
    classes: 'classes',
    students: 'students',
    classComments: 'classComments',
    curriculum: 'curriculum',
    trash: 'trash',
};

// ─── Hook ────────────────────────────────────────────────────────────────────────
export function useFirebaseStore() {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

    // ── Real-time Firestore listeners ───────────────────────────────────────────
    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, C.classes), snap => dispatch({ type: 'SNAP_CLASSES', payload: snap.docs.map(d => ({ id: d.id, ...d.data() })) })),
            onSnapshot(collection(db, C.students), snap => dispatch({ type: 'SNAP_STUDENTS', payload: snap.docs.map(d => ({ id: d.id, ...d.data() })) })),
            onSnapshot(collection(db, C.classComments), snap => dispatch({ type: 'SNAP_CLASS_COMMENTS', payload: snap.docs.map(d => ({ id: d.id, ...d.data() })) })),
            onSnapshot(collection(db, C.curriculum), snap => dispatch({ type: 'SNAP_CURRICULUM', payload: snap.docs.map(d => ({ id: d.id, ...d.data() })) })),
            onSnapshot(collection(db, C.trash), snap => dispatch({ type: 'SNAP_TRASH', payload: snap.docs.map(d => ({ id: d.id, ...d.data() })) })),
            onSnapshot(doc(db, 'settings', 'app'), snap => dispatch({ type: 'SNAP_SETTINGS', payload: snap.exists() ? (snap.data().generalCurriculum || null) : null })),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    // ── Actions ──────────────────────────────────────────────────────────────────
    const actions = useCallback(() => ({

        // ── Classes ──────────────────────────────────────────────────────────
        addClass: (payload) => {
            const id = uid();
            const data = { id, name: payload.name, color: payload.color || '#7c6af7', ageGroup: payload.ageGroup || 'KIDS', createdAt: now() };
            dispatch({ type: 'OPT_ADD_CLASS', payload: data });
            setDoc(doc(db, C.classes, id), data).catch(console.error);
        },

        updateClass: (payload) => {
            dispatch({ type: 'OPT_UPDATE_CLASS', payload });
            const { id, ...fields } = payload;
            updateDoc(doc(db, C.classes, id), fields).catch(console.error);
        },

        deleteClass: (classId) => {
            const cls = state.classes.find(c => c.id === classId);
            const students = state.students.filter(s => s.classId === classId);
            if (!cls) return;

            const trashEntry = { id: uid(), type: 'class', data: { ...cls, students }, deletedAt: now() };
            dispatch({ type: 'OPT_DELETE_CLASS', payload: classId });
            dispatch({ type: 'OPT_ADD_TRASH', payload: trashEntry });

            const batch = writeBatch(db);
            batch.delete(doc(db, C.classes, classId));
            students.forEach(s => batch.delete(doc(db, C.students, s.id)));
            state.classComments.filter(c => c.classId === classId).forEach(c => batch.delete(doc(db, C.classComments, c.id)));
            state.curriculum.filter(c => c.classId === classId).forEach(c => batch.delete(doc(db, C.curriculum, c.id)));
            batch.set(doc(db, C.trash, trashEntry.id), trashEntry);
            batch.commit().catch(console.error);
        },

        // ── Students ─────────────────────────────────────────────────────────
        addStudent: (payload) => {
            const id = uid();
            const data = { id, classId: payload.classId, name: payload.name, photo: null, ratings: [], homework: [], comments: [], createdAt: now() };
            dispatch({ type: 'OPT_ADD_STUDENT', payload: data });
            setDoc(doc(db, C.students, id), data).catch(console.error);
        },

        updateStudent: async (payload) => {
            let data = { ...payload };
            // Upload base64 photo to Storage before saving to Firestore
            if (data.photo && data.photo.startsWith('data:')) {
                dispatch({ type: 'OPT_UPDATE_STUDENT', payload: data }); // show instantly
                data.photo = await uploadIfBase64(data.photo, `student-photos/${data.id}`);
            }
            dispatch({ type: 'OPT_UPDATE_STUDENT', payload: data });
            const { id, ...fields } = data;
            updateDoc(doc(db, C.students, id), fields).catch(console.error);
        },

        deleteStudent: (studentId) => {
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            const trashEntry = { id: uid(), type: 'student', data: student, deletedAt: now() };
            dispatch({ type: 'OPT_DELETE_STUDENT', payload: studentId });
            dispatch({ type: 'OPT_ADD_TRASH', payload: trashEntry });
            const batch = writeBatch(db);
            batch.delete(doc(db, C.students, studentId));
            batch.set(doc(db, C.trash, trashEntry.id), trashEntry);
            batch.commit().catch(console.error);
        },

        // ── Comments ─────────────────────────────────────────────────────────
        addClassComment: async ({ classId, text, commentType, mediaPath, addedBy }) => {
            const id = uid();
            let mediaUrl = null;
            if (mediaPath && mediaPath.startsWith('data:')) {
                const ext = commentType === 'voice' ? 'webm' : 'jpg';
                mediaUrl = await uploadIfBase64(mediaPath, `class-comments/${id}.${ext}`);
            } else {
                mediaUrl = mediaPath || null;
            }
            const comment = { id, classId, text: text || '', type: commentType || 'text', mediaPath: mediaUrl, addedBy: addedBy || null, createdAt: now() };
            dispatch({ type: 'OPT_ADD_CLASS_COMMENT', payload: comment });
            setDoc(doc(db, C.classComments, id), comment).catch(console.error);
        },

        deleteClassComment: (commentId) => {
            dispatch({ type: 'OPT_DELETE_CLASS_COMMENT', payload: commentId });
            deleteDoc(doc(db, C.classComments, commentId)).catch(console.error);
        },

        addStudentComment: async ({ studentId, text, commentType, mediaPath, addedBy }) => {
            const id = uid();
            let mediaUrl = null;
            if (mediaPath && mediaPath.startsWith('data:')) {
                const ext = commentType === 'voice' ? 'webm' : 'jpg';
                mediaUrl = await uploadIfBase64(mediaPath, `student-comments/${id}.${ext}`);
            } else {
                mediaUrl = mediaPath || null;
            }
            const comment = { id, text: text || '', type: commentType || 'text', mediaPath: mediaUrl, addedBy: addedBy || null, createdAt: now() };
            dispatch({ type: 'OPT_ADD_STUDENT_COMMENT', payload: { studentId, comment } });
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            const updated = [...(student.comments || []), comment];
            updateDoc(doc(db, C.students, studentId), { comments: updated }).catch(console.error);
        },

        deleteStudentComment: ({ studentId, commentId }) => {
            dispatch({ type: 'OPT_DELETE_STUDENT_COMMENT', payload: { studentId, commentId } });
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            const updated = (student.comments || []).filter(c => c.id !== commentId);
            updateDoc(doc(db, C.students, studentId), { comments: updated }).catch(console.error);
        },

        // ── Homework ─────────────────────────────────────────────────────────
        addHomeworkAssignment: async ({ classId, title, pdfName, pdfDataUrl }) => {
            const hwId = uid();
            let pdfUrl = null;
            if (pdfDataUrl && pdfDataUrl.startsWith('data:')) {
                pdfUrl = await uploadIfBase64(pdfDataUrl, `homework/${hwId}.pdf`);
            }
            const hw = { id: hwId, title, pdfName: pdfName || null, pdfDataUrl: pdfUrl, status: 'none', assignedAt: now() };
            dispatch({ type: 'OPT_ADD_HOMEWORK', payload: { classId, hw } });

            const classStudents = state.students.filter(s => s.classId === classId);
            if (!classStudents.length) return;
            const batch = writeBatch(db);
            classStudents.forEach(s => {
                batch.update(doc(db, C.students, s.id), { homework: [...(s.homework || []), hw] });
            });
            batch.commit().catch(console.error);
        },

        // Per-student homework assignment
        addStudentHomework: async ({ studentId, title, pdfName, pdfDataUrl }) => {
            const hwId = uid();
            let pdfUrl = null;
            if (pdfDataUrl && pdfDataUrl.startsWith('data:')) {
                pdfUrl = await uploadIfBase64(pdfDataUrl, `homework/${hwId}.pdf`);
            }
            const hw = { id: hwId, title, pdfName: pdfName || null, pdfDataUrl: pdfUrl, status: 'none', assignedAt: now() };
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            dispatch({ type: 'OPT_ADD_STUDENT_COMMENT', payload: { studentId, comment: { id: 'hw_' + hwId, text: '', type: 'text', createdAt: now() } } });
            const updated = [...(student.homework || []), hw];
            dispatch({ type: 'OPT_UPDATE_STUDENT', payload: { id: studentId, homework: updated } });
            updateDoc(doc(db, C.students, studentId), { homework: updated }).catch(console.error);
        },

        // Delete a homework assignment from ALL students in a class
        deleteHomeworkAssignment: async ({ classId, hwId }) => {
            dispatch({ type: 'OPT_DELETE_HOMEWORK', payload: { classId, hwId } }); // Optimistic delete
            const classStudents = state.students.filter(s => s.classId === classId);
            if (!classStudents.length) return;
            const batch = writeBatch(db);
            classStudents.forEach(s => {
                const hwList = s.homework || [];
                if (hwList.some(hw => hw.id === hwId)) {
                    batch.update(doc(db, C.students, s.id), { homework: hwList.filter(hw => hw.id !== hwId) });
                }
            });
            batch.commit().catch(console.error);
        },

        // Delete a homework assignment from a single student
        deleteStudentHomework: async ({ studentId, hwId }) => {
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            const hwList = student.homework || [];
            const updated = hwList.filter(hw => hw.id !== hwId);
            dispatch({ type: 'OPT_UPDATE_STUDENT', payload: { id: studentId, homework: updated } });
            updateDoc(doc(db, C.students, studentId), { homework: updated }).catch(console.error);
        },

        updateHomeworkStatus: ({ studentId, hwId, status }) => {
            dispatch({ type: 'OPT_UPDATE_HW_STATUS', payload: { studentId, hwId, status } });
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            const updated = student.homework.map(hw => hw.id === hwId ? { ...hw, status } : hw);
            updateDoc(doc(db, C.students, studentId), { homework: updated }).catch(console.error);
        },

        // ── Ratings ──────────────────────────────────────────────────────────
        addRating: ({ studentId, stars, lessonNote }) => {
            const rating = { id: uid(), stars, note: lessonNote || '', createdAt: now() };
            dispatch({ type: 'OPT_ADD_RATING', payload: { studentId, rating } });
            const student = state.students.find(s => s.id === studentId);
            if (!student) return;
            const updated = [...(student.ratings || []), rating];
            updateDoc(doc(db, C.students, studentId), { ratings: updated }).catch(console.error);
        },

        // ── Curriculum ────────────────────────────────────────────────────────
        updateCurriculum: ({ classId, unit, topic }) => {
            const entry = { id: classId, classId, unit, topic, updatedAt: now() };
            dispatch({ type: 'OPT_UPDATE_CURRICULUM', payload: entry });
            setDoc(doc(db, C.curriculum, classId), entry, { merge: true }).catch(console.error);
        },

        // ── General Curriculum File ───────────────────────────────────────────
        setGeneralCurriculum: async ({ name, dataUrl, fileType, uploadedAt }) => {
            let url = dataUrl;
            if (dataUrl && dataUrl.startsWith('data:')) {
                const ext = name.split('.').pop();
                url = await uploadIfBase64(dataUrl, `general-curriculum/curriculum.${ext}`);
            }
            const payload = { name, dataUrl: url, fileType, uploadedAt };
            dispatch({ type: 'OPT_SET_GENERAL_CURRICULUM', payload });
            setDoc(doc(db, 'settings', 'app'), { generalCurriculum: payload }, { merge: true }).catch(console.error);
        },

        // ── Trash ─────────────────────────────────────────────────────────────
        restoreTrash: (trashId) => {
            const item = state.trash.find(t => t.id === trashId);
            if (!item) return;
            dispatch({ type: 'OPT_RESTORE_TRASH', payload: trashId });

            const batch = writeBatch(db);
            batch.delete(doc(db, C.trash, trashId));
            if (item.type === 'student') {
                batch.set(doc(db, C.students, item.data.id), item.data);
            } else if (item.type === 'class') {
                const { students: ts, ...cls } = item.data;
                batch.set(doc(db, C.classes, cls.id), cls);
                (ts || []).forEach(s => batch.set(doc(db, C.students, s.id), s));
            }
            batch.commit().catch(console.error);
        },

        purgeTrash: (trashId) => {
            dispatch({ type: 'OPT_PURGE_TRASH', payload: trashId });
            deleteDoc(doc(db, C.trash, trashId)).catch(console.error);
        },

    }), [state]);

    return { state, actions: actions() };
}
