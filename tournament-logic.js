import { tournaments, activeTournamentId, generateUUID } from './firebase-init.js';
import { saveData } from './data-manager.js';
import { switchTab } from './navigation.js';

// --- Core Group & League Generator Logic ---
export function generateStage() {
    const t = tournaments.find(x => x.id === activeTournamentId);
    if (!t) return;
    const isGrouped = t.format.includes('Group');
    const teamList = t.teams || [];
    
    if (isGrouped && teamList.length < 4) {
        alert("Groups require at least 4 teams.");
        return;
    }

    const matches = [];
    const teams = [...teamList].sort(() => Math.random() - 0.5);
    const legs = t.format.includes('2 Legs') ? 2 : 1;
    const groupAssignments = {};

    if (isGrouped) {
        let remaining = [...teams];
        let groupIdx = 0;
        let groupCount = teams.length > 8 ? Math.floor(teams.length / 4) : 2;
        if (teams.length === 6) groupCount = 2;
        const teamsPerGroup = Math.ceil(teams.length / groupCount);

        while (remaining.length > 0) {
            groupIdx++;
            const group = remaining.splice(0, teamsPerGroup);
            group.forEach(team => groupAssignments[team.name] = groupIdx);

            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    for (let l = 0; l < legs; l++) {
                        matches.push({
                            id: generateUUID(),
                            t1: group[i].name, t2: group[j].name,
                            s1: null, s2: null, stage: 'Group Stage', grp: groupIdx
                        });
                    }
                }
            }
        }
        t.groupAssignments = groupAssignments;
    } else {
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                for (let l = 0; l < legs; l++) {
                    matches.push({
                        id: generateUUID(),
                        t1: teams[i].name, t2: teams[j].name,
                        s1: null, s2: null, stage: 'League'
                    });
                }
            }
        }
    }

    t.matches = matches;
    saveData();
    if (window.renderTabsNav) window.renderTabsNav();
    switchTab('teams');

    // Redirect to matches immediately
    switchTab('matches');
}

// --- Standing Calculators (FIXED) ---
export function calculateStats(teams, matches, filterGroup = null, groupAssignments = null) {
    const s = {};
    const relevantTeams = filterGroup 
        ? (teams || []).filter(t => groupAssignments?.[t.name] === filterGroup)
        : (teams || []);

    relevantTeams.forEach(t => s[t.name] = { pts: 0, gd: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    
    (matches || []).forEach(m => {
        if (s[m.t1] && s[m.t2] && m.s1 !== null && m.s2 !== null) {
            const s1 = Number(m.s1);
            const s2 = Number(m.s2);

            s[m.t1].p++; 
            s[m.t2].p++;
            s[m.t1].gf += s1; s[m.t1].ga += s2;
            s[m.t2].gf += s2; s[m.t2].ga += s1;

            if (s1 > s2) {
                s[m.t1].w++; s[m.t1].pts += 3;
                s[m.t2].l++;
            } else if (s1 < s2) {
                s[m.t2].w++; s[m.t2].pts += 3;
                s[m.t1].l++;
            } else {
                s[m.t1].d++; s[m.t1].pts += 1;
                s[m.t2].d++; s[m.t2].pts += 1;
            }
            
            // Recalculate goal difference after updating GF/GA
            s[m.t1].gd = s[m.t1].gf - s[m.t1].ga;
            s[m.t2].gd = s[m.t2].gf - s[m.t2].ga;
        }
    });
    
    // Sort by points, then goal difference, then goals for
    return Object.entries(s).sort((a, b) => {
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
        if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
        return b[1].gf - a[1].gf;
    });
}