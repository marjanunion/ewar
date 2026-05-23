// main.js
import { initializeFirebase, setupFirebaseListener, tournaments, activeTournamentId, setActiveTournamentId, setCurrentTab } from './firebase-init.js';
import { renderTournamentList, renderTabsNav, renderTabContent } from './render.js';
import { showDashboard, attemptJoinDetail, unlockRoom, showDetail, switchTab, toggleModal } from './navigation.js';
import { createTournament, addTeam, removeTeam, setScore, resetCurrentTournament, clearAllData } from './data-manager.js';
import { generateStage } from './tournament-logic.js';

// Expose only what's needed globally (avoid duplicates)
window.showDashboard = showDashboard;
window.attemptJoinDetail = attemptJoinDetail;
window.unlockRoom = unlockRoom;
window.showDetail = showDetail;
window.switchTab = switchTab;
window.toggleModal = toggleModal;
window.createTournament = createTournament;
window.addTeam = addTeam;
window.removeTeam = removeTeam;
window.setScore = setScore;
window.resetCurrentTournament = resetCurrentTournament;
window.clearAllData = clearAllData;
window.generateStage = generateStage;

// Also expose render functions for callbacks
window.renderTournamentList = renderTournamentList;
window.renderTabsNav = renderTabsNav;
window.renderTabContent = renderTabContent;

// Make core variables available globally for debugging
window.tournaments = tournaments;
window.activeTournamentId = activeTournamentId;

// Set up event listeners after DOM is ready
function setupEventListeners() {
    // Dashboard navigation
    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', () => showDashboard());
    }
    
    // Back to dashboard button
    const backButton = document.getElementById('back-to-dashboard');
    if (backButton) {
        backButton.addEventListener('click', () => showDashboard());
    }
    
    // Reset tournament button
    const resetBtn = document.getElementById('reset-tournament-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetCurrentTournament());
    }
    
   
    
    // FAB button
    const fab = document.getElementById('fab');
    if (fab) {
        fab.addEventListener('click', () => toggleModal('create-modal', true));
    }
    
    // Create tournament modal buttons
    const createBtn = document.getElementById('create-tournament-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => createTournament());
    }
    
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => toggleModal('create-modal', false));
    }
    
    // PIN modal buttons
    const unlockBtn = document.getElementById('unlock-room-btn');
    if (unlockBtn) {
        unlockBtn.addEventListener('click', () => unlockRoom());
    }
    
    const cancelPinBtn = document.getElementById('cancel-pin-btn');
    if (cancelPinBtn) {
        cancelPinBtn.addEventListener('click', () => toggleModal('pin-modal', false));
    }
    
    // Allow Enter key in PIN input
    const pinInput = document.getElementById('entered-pin');
    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') unlockRoom();
        });
    }
}

// Initialize Firebase and setup listeners
async function init() {
    console.log("Initializing eWAR...");
    await initializeFirebase();
    setupFirebaseListener();
    setupEventListeners();
    
    // Small delay to allow Firebase data to load first
    setTimeout(() => {
        renderTournamentList();
        console.log("Tournament list rendered");
    }, 100);
}

// Start the app
init();