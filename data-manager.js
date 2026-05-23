import { tournaments, activeTournamentId, isFirebaseInitialized, dbRef, sanitizeData, generateUUID } from './firebase-init.js';
import { set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { renderTournamentList, renderTabContent } from './render.js';

export function saveData() {
    sanitizeData();
    const indicator = document.getElementById('sync-indicator');

    if (isFirebaseInitialized && dbRef) {
        const tournamentsObj = {};
        tournaments.forEach(t => { if (t && t.id) tournamentsObj[t.id] = t; });
        set(dbRef, tournamentsObj)
            .then(() => {
                if (indicator) {
                    indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Syncing`;
                }
                const warningBox = document.getElementById('rules-warning-box');
                if (warningBox) warningBox.classList.add('hidden');
            })
            .catch(err => {
                if (indicator) {
                    indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Sync Failed`;
                }
                console.error("Firebase write failed: ", err);
                localStorage.setItem('ewar_tournaments', JSON.stringify(tournaments));
            });
    } else {
        localStorage.setItem('ewar_tournaments', JSON.stringify(tournaments));
        if (indicator) {
            indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Local Only`;
        }
        if (activeTournamentId === null) renderTournamentList();
        else renderTabContent();
    }
}

export function createTournament() {
    const nameInput = document.getElementById('arena-name');
    const formatSelect = document.getElementById('arena-format');
    const passInput = document.getElementById('arena-pin');

    const name = nameInput ? nameInput.value.trim() : '';
    const format = formatSelect ? formatSelect.value : "Groups + Knockout";
    const password = passInput ? passInput.value.trim() : "";

    if (!name) {
        alert("Please enter an Arena Name.");
        return;
    }

    const newTournament = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
        name: name,
        format: format,
        password: password,
        teams: [],
        matches: [],
        groupAssignments: null,
        createdAt: Date.now()
    };

    tournaments.push(newTournament);
    saveData();
    
    if (window.toggleModal) window.toggleModal('create-modal', false);
    if (nameInput) nameInput.value = '';
    if (passInput) passInput.value = '';
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
    if (window.renderTabContent) window.renderTabContent();
}

export function removeTeam(teamId) {
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    t.teams = (t.teams || []).filter(x => x.id !== teamId);
    saveData();
    if (window.renderTabContent) window.renderTabContent();
}

export function setScore(matchIdx, s1, s2) {
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t || !t.matches || matchIdx >= t.matches.length) return;
    
    const match = t.matches[matchIdx];
    if (s1 !== null && s1 !== undefined) match.s1 = (s1 === '') ? null : Number(s1);
    if (s2 !== null && s2 !== undefined) match.s2 = (s2 === '') ? null : Number(s2);
    
    saveData();
    if (window.renderTabContent) window.renderTabContent();
}

export function resetCurrentTournament() {
    if (confirm("Reset current bracket/groups match data? Teams will stay enrolled.")) {
        const t = tournaments.find(x => x.id === activeTournamentId);
        if (!t) return;
        t.matches = [];
        t.groupAssignments = null;
        saveData();
        if (window.switchTab) window.switchTab('teams');
    }
}