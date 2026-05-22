import { tournaments, activeTournamentId, currentTab, targetedLockedId, setActiveTournamentId, setTargetedLockedId, setCurrentTab } from './firebase-init.js';
import { renderTabsNav, renderTabContent, renderTournamentList } from './render.js';

// Navigation Functions
export function showDashboard() {
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('fab').classList.remove('hidden');
    setActiveTournamentId(null);
    renderTournamentList();
}

export function showDetail(tournamentId) {
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (tournament) {
        document.getElementById('active-title').innerHTML = tournament.name;
        document.getElementById('active-format').innerHTML = tournament.format;
    }
    
    renderTabsNav();
    renderTabContent();
}

export function attemptJoinDetail(tournamentId) {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    if (tournament.password && tournament.password.trim() !== '') {
        setTargetedLockedId(tournamentId);
        toggleModal('pin-modal', true);
    } else {
        setActiveTournamentId(tournamentId);
        showDetail(tournamentId);
    }
}

export function unlockRoom() {
    const pinInput = document.getElementById('entered-pin');
    const enteredPin = pinInput ? pinInput.value : '';
    const tournament = tournaments.find(t => t.id === targetedLockedId);
    
    if (tournament && tournament.password === enteredPin) {
        setActiveTournamentId(targetedLockedId);
        toggleModal('pin-modal', false);
        showDetail(targetedLockedId);
        if (pinInput) pinInput.value = '';
    } else {
        alert('Invalid PIN code. Access denied.');
    }
    setTargetedLockedId(null);
}

export function switchTab(tab) {
    setCurrentTab(tab);
    renderTabsNav();
    renderTabContent();
}

export function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }
}