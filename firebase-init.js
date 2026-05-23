import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from './config.js';
import { renderTournamentList, renderTabsNav, renderTabContent } from './render.js';

export let tournaments = [];
export let activeTournamentId = null;
export let currentTab = 'teams';
export let targetedLockedId = null;
export let db = null;
export let dbRef = null;
export let auth = null;
export let isFirebaseInitialized = false;
export let app = null;

export function setActiveTournamentId(val) { activeTournamentId = val; }
export function setTargetedLockedId(val) { targetedLockedId = val; }
export function setCurrentTab(val) { currentTab = val; }

export function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export async function initializeFirebase() {
    try {
        if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getDatabase(app);
            dbRef = ref(db, 'tournaments');
            
            await signInAnonymously(auth);
            isFirebaseInitialized = true;
            
            const statusEl = document.getElementById('connection-status');
            const iconEl = document.getElementById('connection-icon');
            if (statusEl) statusEl.innerText = "LIVE CLOUD CONNECTED";
            if (iconEl) iconEl.className = "w-3.5 h-3.5 text-emerald-500";
            return true;
        }
    } catch (e) {
        console.warn("Firebase fallback mode", e);
        isFirebaseInitialized = false;
    }

    const saved = localStorage.getItem('ewar_tournaments');
    tournaments = saved ? JSON.parse(saved) : [];
    sanitizeData();
    return false;
}

export function sanitizeData() {
    if (!Array.isArray(tournaments)) tournaments = [];
    tournaments.forEach(t => {
        if (!t.teams || !Array.isArray(t.teams)) t.teams = [];
        if (!t.matches || !Array.isArray(t.matches)) t.matches = [];
        if (!t.id) t.id = generateUUID();
    });
}

export function setupFirebaseListener() {
    if (isFirebaseInitialized && dbRef) {
        onValue(dbRef, (snapshot) => {
            const warningBox = document.getElementById('rules-warning-box');
            if (warningBox) warningBox.classList.add('hidden');

            const data = snapshot.val();
            if (data && typeof data === 'object') {
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
            } else if (Array.isArray(data)) {
                tournaments.length = 0;
                tournaments.push(...data.filter(Boolean));
            } else {
                tournaments.length = 0;
            }
            sanitizeData();

            if (activeTournamentId === null) {
                renderTournamentList();
            } else {
                renderTabsNav();
                renderTabContent();
            }
        }, (error) => {
            console.error("Firebase Read Error:", error);
            if (error.message?.includes("PERMISSION_DENIED")) {
                const warningBox = document.getElementById('rules-warning-box');
                if (warningBox) warningBox.classList.remove('hidden');
            }
        });
    }
}