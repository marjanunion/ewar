import { tournaments, activeTournamentId, isFirebaseInitialized, dbRef, sanitizeData, generateUUID } from './firebase-init.js';
import { set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { renderTournamentList, renderTabContent } from './render.js';

// --- Unified Sync Operations ---
export function saveData() {
    sanitizeData();
    
    // Show saving indicator
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
        indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin"></span> Saving...`;
        indicator.classList.remove('opacity-40');
    }

    if (isFirebaseInitialized) {
        // Convert to object for Firebase to avoid array index gaps
        const tournamentsObj = {};
        tournaments.forEach((t, index) => {
            if (t && t.id) {
                tournamentsObj[t.id] = t;
            }
        });
        set(dbRef, tournamentsObj)
        .then(() => {
            // Restore clean idle state upon successful database return
            if (indicator) {
                indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Syncing`;
                indicator.classList.add('opacity-40');
            }
            // Hide any rules-warning visual since database write succeeded
            const warningBox = document.getElementById('rules-warning-box');
            if (warningBox) warningBox.classList.add('hidden');
        })
        .catch(err => {
            if (indicator) {
                indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Sync Failed`;
                indicator.classList.remove('opacity-40');
            }
            console.error("Firebase write failed: ", err);
            // Show friendly diagnostic rules block on permission denial error
            if (err.message && err.message.includes("PERMISSION_DENIED")) {
                const warningBox = document.getElementById('rules-warning-box');
                if (warningBox) {
                    warningBox.classList.remove('hidden');
                    warningBox.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                alert("Database write error: " + err.message);
            }
        });
    } else {
        localStorage.setItem('ewar_tournaments', JSON.stringify(tournaments));
        if (activeTournamentId === null) {
            renderTournamentList();
        } else {
            renderTabContent();
        }
        // Reset indicator for localStorage mode
        if (indicator) {
            indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Local Only`;
            indicator.classList.remove('opacity-40');
        }
    }
}

// --- Data Mutators ---
export function createTournament() {
    const nameEl = document.getElementById('new-name');
    const formatEl = document.getElementById('new-format');
    const pinEl = document.getElementById('new-pin');

    const name = nameEl ? nameEl.value.trim() : "";
    const format = formatEl ? formatEl.value : "Groups + Knockout";
    const pin = pinEl ? pinEl.value.trim() : "";

    if (!name) {
        alert("Please enter an Arena Name.");
        return;
    }

    const newT = {
        id: Date.now().toString(),
        name: name,
        format: format,
        password: pin,
        teams: [],
        matches: [],
        groupAssignments: null,
        createdAt: Date.now()
    };

    tournaments.push(newT);
    saveData();
    
    if (window.toggleModal) window.toggleModal('create-modal', false);
    if (nameEl) nameEl.value = '';
    if (pinEl) pinEl.value = '';
    renderTournamentList();
}

export function addTeam(name) {
    if (!name.trim()) return;
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    if (!t.teams) t.teams = [];
    if (t.teams.some(x => x.name.toLowerCase() === name.trim().toLowerCase())) {
        alert("This team name has already been registered.");
        return;
    }
    
    t.teams.push({ id: generateUUID(), name: name.trim() });
    saveData();
}

export function removeTeam(teamId) {
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    t.teams = (t.teams || []).filter(x => x.id !== teamId);
    saveData();
}

export function setScore(matchIdx, s1, s2) {
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    if (!t.matches) t.matches = [];
    
    if (matchIdx >= t.matches.length) {
        console.error("Match index out of bounds:", matchIdx);
        return;
    }
    
    const match = t.matches[matchIdx];

    // Safely transform completely cleared input text fields into null
    if (s1 !== null && s1 !== undefined) {
        match.s1 = (s1 === '') ? null : Number(s1);
    }
    if (s2 !== null && s2 !== undefined) {
        match.s2 = (s2 === '') ? null : Number(s2);
    }
    
    saveData();
}

export function resetCurrentTournament() {
    if (confirm("Reset current bracket/groups match data? teams will stay enrolled.")) {
        const t = tournaments.find(x => x.id === activeTournamentId);
        if (!t) return;
        t.matches = [];
        t.groupAssignments = null;
        saveData();
        if (window.switchTab) window.switchTab('teams');
    }
}

export function clearAllData() {
    if (confirm("⚠️ DESTRUCTIVE ACTION: This will delete ALL tournaments and data. This cannot be undone. Continue?")) {
        tournaments.length = 0;
        saveData();
        if (window.showDashboard) window.showDashboard();
        renderTournamentList();
    }
}