import { tournaments, activeTournamentId, currentTab } from './firebase-init.js';
import { calculateStats } from './tournament-logic.js';

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function refreshIcons() {
    if (window.lucide) setTimeout(() => window.lucide.createIcons(), 10);
}

export function renderTournamentList() {
    // Render to both dashboard locations
    const listLocations = ['tournament-list', 'loggedin-tournament-list'];
    
    listLocations.forEach(locationId => {
        const list = document.getElementById(locationId);
        if (!list) return;
        
        list.innerHTML = '';
        
        if (!tournaments || tournaments.length === 0) {
            list.innerHTML = `
                <div class="py-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                    <i data-lucide="shield-alert" class="w-8 h-8 text-slate-700 mx-auto mb-3"></i>
                    <p class="text-slate-600 text-xs font-black uppercase tracking-widest">No Arenas Created</p>
                    <p class="text-slate-700 text-[10px] mt-2">Click the + button to create one</p>
                </div>
            `;
            refreshIcons();
            return;
        }

        tournaments.slice().reverse().forEach(t => {
            const isLocked = t.password && t.password.trim() !== '';
            const card = document.createElement('div');
            card.className = "group bg-slate-900/50 border border-slate-800/80 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-slate-800 hover:border-emerald-500/30 transition-all active:scale-[0.98]";
            card.onclick = () => {
                if (window.attemptJoinDetail) window.attemptJoinDetail(t.id);
            };
            card.innerHTML = `
                <div class="flex gap-4 items-center">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center ${isLocked ? 'bg-amber-500/10' : 'bg-blue-500/10'} border border-slate-800">
                        <i data-lucide="${isLocked ? 'lock' : 'users'}" class="w-5 h-5 ${isLocked ? 'text-amber-500' : 'text-blue-500'}"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-base group-hover:text-emerald-400 transition-colors">${escapeHtml(t.name)}</h4>
                        <div class="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <span class="text-emerald-500/70">${escapeHtml(t.format)}</span>
                            <span>•</span>
                            <span>${(t.teams || []).length} Teams</span>
                        </div>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-700 group-hover:text-emerald-500 transition-colors"></i>
            `;
            list.appendChild(card);
        });
    });
    refreshIcons();
}

export function renderTabsNav() {
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    const isGroupedT = t.format && t.format.includes('Group');
    const hasGroupsGenerated = t.groupAssignments && Object.keys(t.groupAssignments).length > 0;
    const bar = document.getElementById('tab-bar');
    if (!bar) return;
    
    const tabs = ['teams'];
    if (isGroupedT && hasGroupsGenerated) tabs.push('groups');
    tabs.push('matches', 'standings');

    bar.innerHTML = tabs.map(tab => {
        const isActive = currentTab === tab;
        return `
            <button onclick="window.switchTab && window.switchTab('${tab}')" class="flex-1 min-w-[100px] py-5 text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500'}">
                ${tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
        `;
    }).join('');
    refreshIcons();
}

export function renderTabContent() {
    const container = document.getElementById('tab-content');
    if (!container) return;
    
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    const isGroupedT = t.format && t.format.includes('Group');
    container.innerHTML = '';

    if (currentTab === 'teams') {
        const enrolledHtml = (t.teams || []).map(team => `
            <div class="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex justify-between items-center group">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black text-emerald-500">
                        ${escapeHtml(team.name.slice(0, 2).toUpperCase())}
                    </div>
                    <p class="font-bold text-base">${escapeHtml(team.name)}</p>
                </div>
                ${(t.matches || []).length === 0 ? `<button onclick="window.removeTeam && window.removeTeam('${team.id}')" class="p-2 text-slate-600 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-6">
                ${(t.matches || []).length === 0 ? `
                    <div class="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-5">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="plus" class="w-4 h-4 text-emerald-500"></i>
                            <h3 class="text-xs font-black uppercase text-slate-400">Enroll Team</h3>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <input id="team-input" placeholder="Enter team name..." class="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none" />
                            <button id="add-team-btn" class="bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl font-black text-[11px] uppercase transition-transform active:scale-95">Add Team</button>
                        </div>
                    </div>
                ` : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${enrolledHtml || '<p class="col-span-full py-12 text-center text-slate-600 text-xs font-bold uppercase">No teams enrolled</p>'}
                </div>
            </div>
        `;

        const addBtn = document.getElementById('add-team-btn');
        const teamInput = document.getElementById('team-input');
        if (addBtn && teamInput) {
            addBtn.onclick = () => {
                if (teamInput.value.trim()) window.addTeam(teamInput.value.trim());
                teamInput.value = '';
            };
            teamInput.onkeypress = (e) => {
                if (e.key === 'Enter' && teamInput.value.trim()) window.addTeam(teamInput.value.trim());
                teamInput.value = '';
            };
        }
    }

    if (currentTab === 'groups' && isGroupedT && t.groupAssignments) {
        const groupedMap = {};
        (t.teams || []).forEach(team => {
            const gId = t.groupAssignments[team.name] || 'Unassigned';
            if (!groupedMap[gId]) groupedMap[gId] = [];
            groupedMap[gId].push(team);
        });

        container.innerHTML = Object.entries(groupedMap).sort(([a], [b]) => String(a).localeCompare(String(b))).map(([gId, gTeams]) => `
            <div class="bg-slate-900/30 border border-slate-800 p-6 rounded-[2.5rem]">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                        <i data-lucide="layers" class="w-4 h-4 text-emerald-500"></i>
                    </div>
                    <h3 class="text-sm font-black uppercase tracking-widest">Group ${gId}</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${gTeams.map(gt => `
                        <div class="bg-slate-950/50 p-4 rounded-2xl flex items-center gap-3 border border-slate-800/50">
                            <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span class="font-bold text-sm">${escapeHtml(gt.name)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    if (currentTab === 'matches') {
        if ((t.matches || []).length === 0) {
            container.innerHTML = `
                <div class="text-center space-y-4 py-8">
                    <button onclick="window.generateStage && window.generateStage()" class="w-full bg-emerald-500 text-slate-950 py-6 rounded-[2.5rem] font-black text-[12px] uppercase shadow-2xl shadow-emerald-500/20 active:scale-[0.98] transition-all">
                        Initialize Brackets
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `<div class="grid gap-4">${(t.matches || []).map((m, idx) => `
                <div class="bg-slate-900 border border-slate-800/50 p-6 sm:p-8 rounded-[2.5rem]">
                    <div class="flex justify-between items-center mb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Match ${idx + 1}</span>
                        <span class="text-emerald-500">${m.stage || 'League'} ${m.grp ? `• GROUP ${m.grp}` : ''}</span>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex-1 text-center space-y-3">
                            <p class="text-xs font-black truncate">${escapeHtml(m.t1)}</p>
                            <input type="number" placeholder="-" value="${m.s1 !== null && m.s1 !== undefined ? m.s1 : ''}" data-match-idx="${idx}" data-team="1" class="match-score-input w-full bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center font-black text-xl outline-none" />
                        </div>
                        <div class="text-slate-800 font-black text-[10px] pt-8">VS</div>
                        <div class="flex-1 text-center space-y-3">
                            <p class="text-xs font-black truncate">${escapeHtml(m.t2)}</p>
                            <input type="number" placeholder="-" value="${m.s2 !== null && m.s2 !== undefined ? m.s2 : ''}" data-match-idx="${idx}" data-team="2" class="match-score-input w-full bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center font-black text-xl outline-none" />
                        </div>
                    </div>
                </div>
            `).join('')}</div>`;
            
            setTimeout(() => {
                document.querySelectorAll('.match-score-input').forEach(input => {
                    input.removeEventListener('change', handleScoreChange);
                    input.addEventListener('change', handleScoreChange);
                });
            }, 10);
        }
    }
    
    if (currentTab === 'standings') {
        if ((t.matches || []).length === 0) {
            container.innerHTML = `<div class="py-12 text-center text-slate-600"><p class="text-[10px] font-black uppercase">Standings will appear after bracket generation.</p></div>`;
        } else {
            const groupIds = t.groupAssignments ? Array.from(new Set(Object.values(t.groupAssignments))).sort((a,b)=>String(a).localeCompare(String(b))) : [null];
            
            container.innerHTML = groupIds.map(gid => {
                const stats = calculateStats(t.teams || [], t.matches || [], gid, t.groupAssignments);
                return `
                    <div class="mb-10">
                        ${gid ? `<h3 class="text-xs font-black uppercase text-emerald-500 tracking-widest mb-4 ml-4">Group ${gid}</h3>` : ''}
                        <div class="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl overflow-x-auto">
                            <table class="w-full text-left min-w-[450px]">
                                <thead><tr class="text-[9px] font-black text-slate-500 uppercase border-b border-slate-800">
                                    <th class="pb-4">Team</th><th class="pb-4 text-center">P</th><th class="pb-4 text-center">W</th>
                                    <th class="pb-4 text-center">D</th><th class="pb-4 text-center">L</th><th class="pb-4 text-center">GD</th><th class="pb-4 text-center">PTS</th>
                                </tr></thead>
                                <tbody>${stats.map(([name, s]) => `<tr class="border-b border-slate-800/30">
                                    <td class="py-4">${escapeHtml(name)}</td>
                                    <td class="py-4 text-center text-slate-500">${s.p}</td>
                                    <td class="py-4 text-center text-slate-500">${s.w}</td>
                                    <td class="py-4 text-center text-slate-500">${s.d}</td>
                                    <td class="py-4 text-center text-slate-500">${s.l}</td>
                                    <td class="py-4 text-center text-slate-500">${s.gd}</td>
                                    <td class="py-4 text-center text-emerald-400 font-black">${s.pts}</td>
                                </tr>`).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    refreshIcons();
}

function handleScoreChange(e) {
    const input = e.target;
    const matchIdx = parseInt(input.getAttribute('data-match-idx'));
    const team = input.getAttribute('data-team');
    const value = input.value === '' ? null : parseInt(input.value);
    
    if (window.setScore) {
        if (team === '1') window.setScore(matchIdx, value, null);
        else window.setScore(matchIdx, null, value);
    }
}