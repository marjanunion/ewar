import { initializeFirebase, setupFirebaseListener, tournaments, activeTournamentId, setActiveTournamentId, setCurrentTab } from './firebase-init.js';
import { renderTournamentList, renderTabsNav, renderTabContent } from './render.js';
import { showDashboard, attemptJoinDetail, unlockRoom, showDetail, switchTab, toggleModal } from './navigation.js';
import { createTournament, addTeam, removeTeam, setScore, resetCurrentTournament } from './data-manager.js';
import { generateStage } from './tournament-logic.js';
import { onAuthStateChange, loginUser, registerUser, logoutUser, createPost, getPosts, likePost, getUserActivityLogs } from './auth.js';

// Expose to window for HTML onclick handlers
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
window.generateStage = generateStage;
window.renderTournamentList = renderTournamentList;

let currentUserData = null;
let firebaseListenerActive = false;

function updateUserProfileUI(userData) {
    const avatarImg = document.getElementById('user-avatar');
    const displayNameEl = document.getElementById('user-displayname');
    const usernameEl = document.getElementById('user-username');
    const winsEl = document.getElementById('user-wins');
    const matchesEl = document.getElementById('user-matches');
    const pointsEl = document.getElementById('user-points');
    
    if (avatarImg) avatarImg.src = userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.username || 'User'}&background=10b981`;
    if (displayNameEl) displayNameEl.innerHTML = userData?.displayName || userData?.username || 'Guest User';
    if (usernameEl) usernameEl.innerHTML = `@${userData?.username || 'guest'}`;
    if (winsEl) winsEl.innerHTML = userData?.stats?.wins || 0;
    if (matchesEl) matchesEl.innerHTML = userData?.stats?.matchesPlayed || 0;
    if (pointsEl) pointsEl.innerHTML = userData?.stats?.totalPoints || 0;
}

function initDashboard(userData) {
    currentUserData = userData;
    const panel = document.getElementById('dashboard-panel');
    const mainView = document.getElementById('dashboard-view');
    const fab = document.getElementById('fab');
    
    if (userData) {
        if (panel) panel.classList.remove('hidden');
        if (mainView) mainView.classList.add('hidden');
        if (fab) fab.classList.remove('hidden');
        updateUserProfileUI(userData);
        setupDashboardTabs();
        renderTournamentList(); // Render to both locations
        loadCommunityFeed();
        loadActivityLogs();
    } else {
        if (panel) panel.classList.add('hidden');
        if (mainView) mainView.classList.remove('hidden');
        if (fab) fab.classList.remove('hidden');
        renderTournamentList();
    }
}

function setupDashboardTabs() {
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-dash-tab');
            loadDashboardTab(tab);
            document.querySelectorAll('.dash-tab-btn').forEach(b => {
                b.classList.remove('border-emerald-500', 'text-emerald-400');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('border-emerald-500', 'text-emerald-400');
            btn.classList.remove('text-slate-500');
        });
    });
    
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await logoutUser();
        location.reload();
    });
    
    document.getElementById('create-arena-btn-header')?.addEventListener('click', () => {
        toggleModal('create-modal', true);
    });
}

function loadDashboardTab(tab) {
    document.querySelectorAll('.dash-tab-content').forEach(content => content.classList.add('hidden'));
    const tabContent = document.getElementById(`dash-${tab}`);
    if (tabContent) tabContent.classList.remove('hidden');
    if (tab === 'feed') loadCommunityFeed();
    else if (tab === 'activity') loadActivityLogs();
}

async function loadCommunityFeed() {
    const posts = await getPosts(30);
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }
    
    container.innerHTML = posts.map(post => `
        <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div class="flex items-center gap-3 mb-3">
                <img src="${post.authorAvatar || `https://ui-avatars.com/api/?name=${post.authorName}&background=10b981`}" class="w-10 h-10 rounded-full">
                <div>
                    <p class="font-bold">${escapeHtml(post.authorName)}</p>
                    <p class="text-[10px] text-slate-500">${new Date(post.timestamp || post.createdAt).toLocaleString()}</p>
                </div>
                <span class="ml-auto text-xs bg-slate-800 px-2 py-1 rounded">${escapeHtml(post.category)}</span>
            </div>
            <p class="text-slate-300 mb-4">${escapeHtml(post.content)}</p>
            <div class="flex gap-4">
                <button class="like-post text-xs flex items-center gap-1" data-post-id="${post.id}">❤️ ${post.likes || 0} Likes</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.like-post').forEach(btn => {
        btn.addEventListener('click', async () => {
            await likePost(btn.getAttribute('data-post-id'));
            loadCommunityFeed();
        });
    });
    
    const submitBtn = document.getElementById('submit-post-btn');
    if (submitBtn) {
        submitBtn.onclick = async () => {
            const content = document.getElementById('new-post-content')?.value;
            const category = document.getElementById('post-category')?.value;
            if (content?.trim()) {
                await createPost(content.substring(0, 100), content, category);
                document.getElementById('new-post-content').value = '';
                loadCommunityFeed();
            }
        };
    }
}

async function loadActivityLogs() {
    if (!currentUserData) return;
    const logs = await getUserActivityLogs(currentUserData.uid, 50);
    const container = document.getElementById('activity-logs-container');
    if (!container) return;
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }
    
    container.innerHTML = logs.map(log => `
        <div class="bg-slate-900 rounded-xl p-3 border border-slate-800">
            <div class="flex justify-between text-xs">
                <span class="text-emerald-400 font-bold">${escapeHtml(log.action)}</span>
                <span class="text-slate-500">${new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">${escapeHtml(log.details)}</p>
        </div>
    `).join('');
}

function setupAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (!authModal) return;
    
    document.getElementById('close-auth-modal')?.addEventListener('click', () => toggleModal('auth-modal', false));
    document.getElementById('show-register')?.addEventListener('click', () => {
        document.getElementById('login-form')?.classList.add('hidden');
        document.getElementById('register-form')?.classList.remove('hidden');
        document.getElementById('auth-title').innerText = 'Create Account';
    });
    document.getElementById('show-login')?.addEventListener('click', () => {
        document.getElementById('login-form')?.classList.remove('hidden');
        document.getElementById('register-form')?.classList.add('hidden');
        document.getElementById('auth-title').innerText = 'Welcome Back';
    });
    
    document.getElementById('login-btn')?.addEventListener('click', async () => {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        const result = await loginUser(email, password);
        if (result.success) {
            toggleModal('auth-modal', false);
            location.reload();
        } else {
            const msgDiv = document.getElementById('auth-message');
            if (msgDiv) {
                msgDiv.innerHTML = result.error;
                msgDiv.classList.remove('hidden');
                setTimeout(() => msgDiv.classList.add('hidden'), 3000);
            }
        }
    });
    
    document.getElementById('register-btn')?.addEventListener('click', async () => {
        const username = document.getElementById('reg-username')?.value;
        const email = document.getElementById('reg-email')?.value;
        const displayName = document.getElementById('reg-displayname')?.value;
        const password = document.getElementById('reg-password')?.value;
        const confirm = document.getElementById('reg-confirm')?.value;
        
        if (password !== confirm) {
            const msgDiv = document.getElementById('auth-message');
            if (msgDiv) {
                msgDiv.innerHTML = 'Passwords do not match';
                msgDiv.classList.remove('hidden');
                setTimeout(() => msgDiv.classList.add('hidden'), 3000);
            }
            return;
        }
        if (password.length < 6) {
            const msgDiv = document.getElementById('auth-message');
            if (msgDiv) {
                msgDiv.innerHTML = 'Password must be at least 6 characters';
                msgDiv.classList.remove('hidden');
                setTimeout(() => msgDiv.classList.add('hidden'), 3000);
            }
            return;
        }
        
        const result = await registerUser(email, password, username, displayName);
        if (result.success) {
            toggleModal('auth-modal', false);
            location.reload();
        } else {
            const msgDiv = document.getElementById('auth-message');
            if (msgDiv) {
                msgDiv.innerHTML = result.error;
                msgDiv.classList.remove('hidden');
                setTimeout(() => msgDiv.classList.add('hidden'), 3000);
            }
        }
    });
}

function setupEventListeners() {
    document.getElementById('dashboard-link')?.addEventListener('click', () => showDashboard());
    document.getElementById('back-to-dashboard')?.addEventListener('click', () => showDashboard());
    document.getElementById('reset-tournament-btn')?.addEventListener('click', () => resetCurrentTournament());
    document.getElementById('fab')?.addEventListener('click', () => toggleModal('create-modal', true));
    document.getElementById('create-tournament-btn')?.addEventListener('click', () => createTournament());
    document.getElementById('close-modal-btn')?.addEventListener('click', () => toggleModal('create-modal', false));
    document.getElementById('unlock-room-btn')?.addEventListener('click', () => unlockRoom());
    document.getElementById('cancel-pin-btn')?.addEventListener('click', () => toggleModal('pin-modal', false));
}

async function init() {
    console.log("Initializing eWAR...");
    await initializeFirebase();
    setupEventListeners();
    setupAuthModal();
    
    onAuthStateChange(async (user, userData) => {
        if (user && userData) {
            initDashboard(userData);
            if (!firebaseListenerActive) {
                setupFirebaseListener();
                firebaseListenerActive = true;
            }
            renderTournamentList();
        } else {
            if (firebaseListenerActive) {
                // Listener will be re-established on login
                firebaseListenerActive = false;
            }
            initDashboard(null);
            toggleModal('auth-modal', true);
        }
    });
    
    setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
    }, 100);
}

init();