/**
 * Firebase Storage upload helpers.
 * Converts base64 dataURLs → Firebase Storage URLs.
 * Returns the original value unchanged if already a URL (http/https).
 */
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload a base64 dataUrl to Firebase Storage.
 * If the value is already an http URL, return it as-is.
 * @param {string} dataUrl  - base64 data URL or existing http URL
 * @param {string} path     - Storage path e.g. "student-photos/abc123"
 * @returns {Promise<string>} download URL
 */
export async function uploadIfBase64(dataUrl, path) {
    if (!dataUrl) return null;
    if (dataUrl.startsWith('http')) return dataUrl; // already uploaded

    try {
        const storageRef = ref(storage, path);
        await uploadString(storageRef, dataUrl, 'data_url');
        return await getDownloadURL(storageRef);
    } catch (err) {
        console.error('Upload failed:', path, err);
        return dataUrl; // fallback: keep base64 locally
    }
}

/**
 * Delete a file from Storage by its URL (gracefully ignores errors).
 */
export async function deleteStorageFile(url) {
    if (!url || !url.startsWith('http')) return;
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch {
        // File may not exist — ignore
    }
}
