import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCNzQxoRz6r4qdGLkeqgyIaM-iJdJw_xUQ",
    authDomain: "el-tracker-ys.firebaseapp.com",
    projectId: "el-tracker-ys",
    storageBucket: "el-tracker-ys.firebasestorage.app",
    messagingSenderId: "26536363365",
    appId: "1:26536363365:web:73feb4311afd4fa3d90d8c",
};

const app = initializeApp(firebaseConfig);

// Firestore with offline persistence — supports multiple tabs simultaneously.
// Data works offline and syncs when connection is restored.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
});

export const storage = getStorage(app);
