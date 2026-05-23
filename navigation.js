import { tournaments, activeTournamentId, targetedLockedId, setActiveTournamentId, setTargetedLockedId, setCurrentTab } from './firebase-init.js';
import { renderTabsNav, renderTabContent, renderTournamentList } from './render.js';

export function showDashboard() {
    const dashboardView = document.getElementById('dashboard-view');
    const detailView = document.getElementById('detail-view');
    const fab = document.getElementById('fab');
    const dashboardPanel = document.getElementById('dashboard-panel');
    
    // Always show the appropriate dashboard based on login state
    const isLoggedIn = dashboardPanel && !dashboardPanel.classList.contains('hidden');
    
    if (isLoggedIn) {
        if (dashboardPanel) dashboardPanel.classList.remove('hidden');
        if (dashboardView) dashboardView.classList.add('hidden');
    } else {
        if (dashboardView) dashboardView.classList.remove('hidden');
        if (dashboardPanel) dashboardPanel.classList.add('hidden');
    }
    
    if (detailView) detailView.classList.add('hidden');
    if (fab) fab.classList.remove('hidden');
    
    setActiveTournamentId(null);
    renderTournamentList();
}

export function showDetail(tournamentId) {
    const dashboardView = document.getElementById('dashboard-view');
    const detailView = document.getElementById('detail-view');
    const fab = document.getElementById('fab');
    const dashboardPanel = document.getElementById('dashboard-panel');
    
    if (dashboardView) dashboardView.classList.add('hidden');
    if (dashboardPanel) dashboardPanel.classList.add('hidden');
    if (detailView) detailView.classList.remove('hidden');
    if (fab) fab.classList.add('hidden');
    
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (tournament) {
        const titleEl = document.getElementById('active-title');
        const formatEl = document.getElementById('active-format');
        if (titleEl) titleEl.innerHTML = tournament.name;
        if (formatEl) formatEl.innerHTML = tournament.format;
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
    const enteredPin = pinInput?.value || '';
    const tournament = tournaments.find(t => t.id === targetedLockedId);
    
    if (tournament && tournament.password === enteredPin) {
        setActiveTournamentId(targetedLockedId);
        toggleModal('pin-modal', false);
        showDetail(targetedLockedId);
    } else if (tournament) {
        alert('Invalid PIN code. Access denied.');
    }
    
    if (pinInput) pinInput.value = '';
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
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }
}