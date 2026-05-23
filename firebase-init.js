// auth.js (FIXED - reCAPTCHA and initialization issues)
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let auth = null;
let db = null;
let appInstance = null;

export function setApp(app) {
    appInstance = app;
    auth = getAuth(app);
    db = getDatabase(app);
    
    // Set persistence to local storage
    auth.setPersistence(browserLocalPersistence).catch(console.warn);
}

export function onAuthStateChange(callback) {
    if (!auth) {
        callback(null, null);
        return;
    }
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = ref(db, `users/${user.uid}`);
                const snapshot = await get(userRef);
                let userData;
                if (snapshot.exists()) {
                    userData = snapshot.val();
                } else {
                    userData = { 
                        uid: user.uid, 
                        email: user.email, 
                        username: user.email ? user.email.split('@')[0] : 'user', 
                        displayName: user.email ? user.email.split('@')[0] : 'User', 
                        stats: { wins: 0, matchesPlayed: 0, totalPoints: 0 }, 
                        createdAt: Date.now(),
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'User')}&background=10b981`
                    };
                    await set(userRef, userData);
                }
                callback(user, userData);
            } catch (error) {
                console.error("Error loading user data:", error);
                callback(user, null);
            }
        } else {
            callback(null, null);
        }
    });
}

export async function loginUser(email, password) {
    if (!auth) {
        return { success: false, error: "Firebase not initialized" };
    }
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Login failed. ";
        if (error.code === 'auth/invalid-credential') {
            errorMessage += "Invalid email or password.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage += "Too many failed attempts. Try again later.";
        } else {
            errorMessage += error.message;
        }
        return { success: false, error: errorMessage };
    }
}

export async function registerUser(email, password, username, displayName) {
    if (!auth) {
        return { success: false, error: "Firebase not initialized" };
    }
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
        console.error("Registration error:", error);
        let errorMessage = "Registration failed. ";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage += "Email already registered.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage += "Password should be at least 6 characters.";
        } else {
            errorMessage += error.message;
        }
        return { success: false, error: errorMessage };
    }
}

export async function logoutUser() {
    if (!auth) {
        return { success: false, error: "Firebase not initialized" };
    }
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error.message };
    }
}

export async function createPost(title, content, category) {
    if (!auth || !auth.currentUser) return null;
    try {
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
    } catch (error) {
        console.error("Create post error:", error);
        return null;
    }
}

export async function getPosts(limit = 30) {
    if (!db) return [];
    try {
        const postsRef = ref(db, 'posts');
        const snapshot = await get(postsRef);
        if (!snapshot.exists()) return [];
        const posts = Object.values(snapshot.val());
        return posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);
    } catch (error) {
        console.error("Get posts error:", error);
        return [];
    }
}

export async function likePost(postId) {
    if (!auth || !auth.currentUser) return false;
    try {
        const postRef = ref(db, `posts/${postId}`);
        const postSnap = await get(postRef);
        if (!postSnap.exists()) return false;
        const post = postSnap.val();
        await set(postRef, { ...post, likes: (post.likes || 0) + 1 });
        return true;
    } catch (error) {
        console.error("Like post error:", error);
        return false;
    }
}

export async function getUserActivityLogs(userId, limit = 50) {
    if (!db) return [];
    try {
        const logsRef = ref(db, `activityLogs/${userId}`);
        const snapshot = await get(logsRef);
        if (!snapshot.exists()) return [];
        const logs = Object.values(snapshot.val());
        return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);
    } catch (error) {
        console.error("Get activity logs error:", error);
        return [];
    }
}
