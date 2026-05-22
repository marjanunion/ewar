import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from './config.js';

// --- Core Unified Variables ---
export let tournaments = [];
export let activeTournamentId = null;
export let currentTab = 'teams';
export let targetedLockedId = null;
export let db = null;
export let dbRef = null;
export let auth = null;
export let isFirebaseInitialized = false;

// --- Setter functions for safe state mutation across modules ---
export function setActiveTournamentId(val) { 
    activeTournamentId = val; 
}

export function setTargetedLockedId(val) { 
    targetedLockedId = val; 
}

export function setCurrentTab(val) { 
    currentTab = val; 
}

// UUID fallback for older browsers
export function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Establish Cloud synchronization & authentication
export async function initializeFirebase() {
    try {
        if (firebaseConfig.apiKey) {
            const app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getDatabase(app);
            dbRef = ref(db, 'tournaments');
            
            // Sign in anonymously first to satisfy security rules on write operations
            await signInAnonymously(auth);
            isFirebaseInitialized = true;
            
            // Connection indicator update
            const statusEl = document.getElementById('connection-status');
            const iconEl = document.getElementById('connection-icon');
            if (statusEl) statusEl.innerText = "LIVE CLOUD CONNECTED";
            if (iconEl) iconEl.className = "w-3.5 h-3.5 text-emerald-500 animate-pulse";
            return true;
        }
    } catch (e) {
        console.warn("Firebase initialization/auth offline fallback active.", e);
    }

    // Clean-up fallback from LocalStorage if firebase is offline
    if (!isFirebaseInitialized) {
        tournaments = JSON.parse(localStorage.getItem('ewar_tournaments') || '[]');
        sanitizeData();
    }
    return false;
}

export function sanitizeData() {
    if (!Array.isArray(tournaments)) {
        tournaments = [];
    }
    tournaments.forEach(t => {
        if (!t.teams || !Array.isArray(t.teams)) t.teams = [];
        if (!t.matches || !Array.isArray(t.matches)) t.matches = [];
    });
}

export function setupFirebaseListener() {
    if (isFirebaseInitialized) {
        onValue(dbRef, (snapshot) => {
            // Succeeded reading: Hide warning box
            const warningBox = document.getElementById('rules-warning-box');
            if (warningBox) warningBox.classList.add('hidden');

            const data = snapshot.val();
            if (data) {
                if (Array.isArray(data)) {
                    tournaments.length = 0;
                    tournaments.push(...data.filter(Boolean));
                } else if (typeof data === 'object') {
                    tournaments.length = 0;
                    const newTournaments = Object.keys(data).map(key => {
                        const item = data[key];
                        if (item && typeof item === 'object') {
                            if (!item.id) item.id = key;
                            return item;
                        }
                        return null;
                    }).filter(Boolean);
                    tournaments.push(...newTournaments);
                } else {
                    tournaments.length = 0;
                }
            } else {
                tournaments.length = 0;
            }

            sanitizeData();

            if (activeTournamentId === null) {
                if (window.renderTournamentList) window.renderTournamentList();
            } else {
                if (window.renderTabContent) window.renderTabContent();
            }
        }, (error) => {
            console.error("Firebase Read Error:", error);
            if (error.message && error.message.includes("PERMISSION_DENIED")) {
                const warningBox = document.getElementById('rules-warning-box');
                if (warningBox) {
                    warningBox.classList.remove('hidden');
                    warningBox.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                alert("Database read access denied. Verify Realtime Database permissions/rules.");
            }
        });
    }
}