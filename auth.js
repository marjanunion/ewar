import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let auth = null;
let db = null;
let appRef = null;

export function setApp(app) {
    appRef = app;
    auth = getAuth(app);
    db = getDatabase(app);
}

export function onAuthStateChange(callback) {
    if (!auth) {
        callback(null, null);
        return;
    }
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            let userData;
            if (snapshot.exists()) {
                userData = snapshot.val();
            } else {
                userData = { 
                    uid: user.uid, 
                    email: user.email, 
                    username: user.email.split('@')[0], 
                    displayName: user.email.split('@')[0], 
                    stats: { wins: 0, matchesPlayed: 0, totalPoints: 0 }, 
                    createdAt: Date.now(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=10b981`
                };
                await set(userRef, userData);
            }
            callback(user, userData);
        } else {
            callback(null, null);
        }
    });
}

export async function loginUser(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function registerUser(email, password, username, displayName) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const userData = {
            uid: result.user.uid,
            email: email,
            username: username || email.split('@')[0],
            displayName: displayName || username || email.split('@')[0],
            stats: { wins: 0, matchesPlayed: 0, totalPoints: 0 },
            createdAt: Date.now(),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || username || email)}&background=10b981`
        };
        await set(ref(db, `users/${result.user.uid}`), userData);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function createPost(title, content, category) {
    if (!auth?.currentUser) return null;
    const userRef = ref(db, `users/${auth.currentUser.uid}`);
    const userSnap = await get(userRef);
    const userData = userSnap.exists() ? userSnap.val() : null;
    if (!userData) return null;
    
    const postRef = push(ref(db, 'posts'));
    const postData = {
        id: postRef.key,
        title: title.substring(0, 100),
        content: content,
        category: category || 'general',
        authorId: auth.currentUser.uid,
        authorName: userData.displayName || userData.username,
        authorAvatar: userData.avatar,
        likes: 0,
        comments: 0,
        timestamp: Date.now()
    };
    await set(postRef, postData);
    return postData;
}

export async function getPosts(limit = 30) {
    if (!db) return [];
    const postsRef = ref(db, 'posts');
    const snapshot = await get(postsRef);
    if (!snapshot.exists()) return [];
    const posts = Object.values(snapshot.val());
    return posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);
}

export async function likePost(postId) {
    if (!auth?.currentUser) return false;
    const postRef = ref(db, `posts/${postId}`);
    const postSnap = await get(postRef);
    if (!postSnap.exists()) return false;
    const post = postSnap.val();
    await set(postRef, { ...post, likes: (post.likes || 0) + 1 });
    return true;
}

export async function getUserActivityLogs(userId, limit = 50) {
    if (!db) return [];
    const logsRef = ref(db, `activityLogs/${userId}`);
    const snapshot = await get(logsRef);
    if (!snapshot.exists()) return [];
    const logs = Object.values(snapshot.val());
    return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);
}