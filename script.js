/**
 * Higher or Lower: Sports Edition - Unified Final Version
 */

// --- CONFIGURATION ---
// We use a public CORS proxy to avoid needing a local server.
const proxy = "";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let cachedTeams = null;
let cachedRosters = {};

// Stat mapping for ESPN API
const statMapping = {
    mlb: { home_runs: 'homeRuns', batting_avg: 'avg', rbi: 'RBIs', hits: 'hits', era: 'ERA', strikeouts: 'strikeouts', saves: 'saves' },
    nba: { points: 'points', assists: 'assists', rebounds: 'rebounds', steals: 'steals', blocks: 'blocks', fg_pct: 'fieldGoalPct', three_pt_pct: 'threePointPct', ft_pct: 'freeThrowPct' },
    nfl: { passing_yards: 'passingYards', rushing_yards: 'rushingYards', receiving_yards: 'receivingYards', touchdowns: 'totalTouchdowns', interceptions: 'interceptions', sacks: 'sacks', tackles: 'tackles' },
    nhl: { goals: 'goals', assists: 'assists', points: 'points', plus_minus: 'plusMinus', penalty_minutes: 'penaltyMinutes', saves: 'saves', gaa: 'goalsAgainstAvg', shutouts: 'shutouts' }
};

const statOptions = {
    nba: [
        { value: 'points', label: 'Points' },
        { value: 'assists', label: 'Assists' },
        { value: 'rebounds', label: 'Rebounds' },
        { value: 'steals', label: 'Steals' },
        { value: 'blocks', label: 'Blocks' },
        { value: 'fg_pct', label: 'Field Goal %' },
        { value: 'three_pt_pct', label: '3PT %' },
        { value: 'ft_pct', label: 'Free Throw %' }
    ],
    nfl: [
        { value: 'passing_yards', label: 'Passing Yards (QB)' },
        { value: 'rushing_yards', label: 'Rushing Yards (RB)' },
        { value: 'receiving_yards', label: 'Receiving Yards (WR/TE)' },
        { value: 'touchdowns', label: 'Touchdowns' },
        { value: 'interceptions', label: 'Interceptions' },
        { value: 'sacks', label: 'Sacks' },
        { value: 'tackles', label: 'Tackles' }
    ],
    mlb: [
        { value: 'home_runs', label: 'Home Runs' },
        { value: 'batting_avg', label: 'Batting Average' },
        { value: 'rbi', label: 'RBIs' },
        { value: 'hits', label: 'Hits' },
        { value: 'stolen_bases', label: 'Stolen Bases' },
        { value: 'era', label: 'ERA (Pitchers)' },
        { value: 'strikeouts', label: 'Strikeouts (Pitchers)' },
        { value: 'saves', label: 'Saves (Pitchers)' }
    ],
    nhl: [
        { value: 'goals', label: 'Goals' },
        { value: 'assists', label: 'Assists' },
        { value: 'points', label: 'Points' },
        { value: 'plus_minus', label: '+/-' },
        { value: 'penalty_minutes', label: 'Penalty Minutes' },
        { value: 'saves', label: 'Saves (Goalie)' },
        { value: 'gaa', label: 'Goals Against Avg (Goalie)' },
        { value: 'shutouts', label: 'Shutouts (Goalie)' }
    ]
};

// --- GAME STATE ---
let gameState = {
    sportSlug: '', leagueSlug: '', statKey: '', statLabel: '',
    pool: 'current', score: 0, highScore: 0,
    player1: null, player2: null
};

// --- ESPN API HELPERS ---
async function secureFetch(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const fullUrl = proxy + url;
            const res = await fetch(fullUrl);
            if (res.status >= 500) { // Server error, worth retrying
                console.warn(`secureFetch attempt ${i + 1} for ${url} failed with status ${res.status}. Retrying...`);
                await sleep(delay * (i + 1)); // Exponential backoff
                continue;
            }
            if (!res.ok) { // Client error (4xx), don't retry
                throw new Error(`HTTP Error: ${res.status} for ${url}`);
            }
            return await res.json();
        } catch (error) { // Catches network errors (e.g., TypeError: Failed to fetch)
            console.warn(`secureFetch attempt ${i + 1} for ${url} failed with error: ${error.message}. Retrying...`);
            if (i === retries - 1) throw error; // Rethrow after last attempt
            await sleep(delay * (i + 1)); // Exponential backoff
        }
    }
}

async function fetchTeamsAndRosters() {
    // Only fetch once per game session
    if (cachedTeams) return;
    const league = gameState.leagueSlug;
    const sport = gameState.sportSlug;
    // Get all teams
    const teamsData = await secureFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams`);
    cachedTeams = teamsData.sports[0].leagues[0].teams;
    // Fetch all rosters in parallel
    for (const t of cachedTeams) {
        const teamId = t.team.id;
        const rosterData = await secureFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${teamId}/roster`);
        cachedRosters[teamId] = rosterData.athletes.map(a => a.athlete);
    }
}

async function fetchRandomPlayer() {
    let attempts = 0;
    while (attempts < 20) { // Try up to 20 times to find a valid player
        attempts++;
        try {
            let athlete;
            if (gameState.pool === 'current') {
                await fetchTeamsAndRosters();
                const randomTeam = cachedTeams[Math.floor(Math.random() * cachedTeams.length)].team;
                const roster = cachedRosters[randomTeam.id];
                if (!roster || roster.length === 0) continue;

                const filtered = roster.filter(p => p.status?.type === 'active');
                if (filtered.length === 0) continue;

                athlete = filtered[Math.floor(Math.random() * filtered.length)];
            } else {
                // All-time: Use byathlete endpoint. Note: This has limited stat categories.
                const { sportSlug, leagueSlug } = gameState;
                const data = await secureFetch(`https://site.web.api.espn.com/apis/common/v3/sports/${sportSlug}/${leagueSlug}/statistics/byathlete?limit=100`);
                if (!data.athletes || data.athletes.length === 0) return null;
                athlete = data.athletes[Math.floor(Math.random() * data.athletes.length)];
            }

            if (athlete) {
                const player = await getPlayerStats(athlete.id, athlete);
                // Ensure we got a valid player with a numeric stat before returning
                if (player && typeof player.stat === 'number' && !isNaN(player.stat)) {
                    return player; // Success!
                }
            }
        } catch (err) {
            console.error(`Attempt ${attempts} to fetch a random player failed:`, err);
            await sleep(500);
        }
    }
    console.error("Failed to fetch a valid random player after multiple attempts.");
    return null;
}

async function getPlayerStats(id, athleteData) {
    try {
        const { leagueSlug, sportSlug, statKey } = gameState;
        const apiKey = statMapping[leagueSlug]?.[statKey];
        if (!apiKey) {
            console.error(`Stat key "${statKey}" is not mapped for league "${leagueSlug}".`);
            return null;
        }

        const data = await secureFetch(`https://site.web.api.espn.com/apis/common/v3/sports/${sportSlug}/${leagueSlug}/athletes/${id}/stats`);
        let statValue;

        const categories = data?.splits?.categories || data?.categories;
        if (categories) {
            for (const cat of categories) {
                if (cat.totals && cat.labels) {
                    for (let i = 0; i < cat.labels.length; i++) {
                        if (cat.labels[i].toLowerCase().replace(/\s/g, '').includes(apiKey.toLowerCase().replace(/\s/g, ''))) {
                            statValue = parseFloat(cat.totals[i].replace(/,/g, '')) || 0;
                            break;
                        }
                    }
                }
                if (statValue !== undefined) break;
            }
        }

        if (statValue === undefined) {
            console.warn(`Could not find stat "${apiKey}" for player ${athleteData.displayName} (ID: ${id})`);
            return null;
        }

        return {
            id: id,
            name: athleteData.displayName || athleteData.fullName || 'Unknown Player',
            pos: athleteData.position?.abbreviation || 'N/A',
            img: athleteData.headshot?.href || `https://a.espncdn.com/i/headshots/${leagueSlug}/players/full/${id}.png`,
            stat: statValue
        };
    } catch (e) {
        console.error(`Failed to get stats for player ID ${id}:`, e);
        return null;
    }
}

// --- UI CONTROLS ---
function updateUI() {
    if (!gameState.player1 || !gameState.player2) return;
    // Player 1 (Left)
    const p1img = document.getElementById('player1-img');
    if (p1img) p1img.src = gameState.player1.img;
    document.getElementById('player1-name').innerText = gameState.player1.name;
    document.getElementById('player1-pos').innerText = gameState.player1.pos;
    document.getElementById('player1-stat').innerText = gameState.player1.stat.toLocaleString();
    // Player 2 (Right)
    const p2img = document.getElementById('player2-img');
    if (p2img) p2img.src = gameState.player2.img;
    document.getElementById('player2-name').innerText = gameState.player2.name;
    document.getElementById('player2-pos').innerText = gameState.player2.pos;
    document.getElementById('player2-stat').style.display = 'none';
    document.getElementById('player2-stat').innerText = '?';
    document.getElementById('guess-controls').style.display = 'block';
    document.getElementById('current-score').innerText = gameState.score;
    document.getElementById('high-score').innerText = gameState.highScore;
}

function revealPlayer2Stat() {
    document.getElementById('player2-stat').innerText = gameState.player2.stat.toLocaleString();
    document.getElementById('player2-stat').style.display = 'block';
    document.getElementById('guess-controls').style.display = 'none';
}

function showGameOver() {
    document.getElementById('final-score').innerText = gameState.score;
    document.getElementById('modal-high-score').innerText = gameState.highScore;
    document.getElementById('modal-stat').innerText = gameState.statLabel;
    document.getElementById('game-over-modal').style.display = 'flex';
}

// --- GAME LOGIC ---
async function handleGuess(guess) {
    const p1 = gameState.player1.stat;
    const p2 = gameState.player2.stat;
    revealPlayer2Stat();
    const correct = (guess === 'higher' && p2 >= p1) || (guess === 'lower' && p2 <= p1);
    if (correct) {
        gameState.score++;
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem(`highScore_${gameState.leagueSlug}_${gameState.statKey}`, gameState.highScore);
        }
        await sleep(1200);
        // Move right player to left, get new right player
        gameState.player1 = gameState.player2;
        gameState.player2 = await fetchRandomPlayer();
        updateUI();
    } else {
        await sleep(1000);
        showGameOver();
    }
}

// --- EVENT LISTENERS & INIT ---
const optionsForm = document.getElementById('options-form');
const sportSelect = document.getElementById('sport');
const statSelect = document.getElementById('stat');
const startBtn = document.getElementById('start-btn');

function resetStatDropdown() {
    statSelect.innerHTML = '<option value="" selected disabled>Please select</option>';
    statSelect.disabled = true;
}

function initStatOptions(league) {
    resetStatDropdown();
    if (!league || !statOptions[league]) return;
    statSelect.disabled = false;
    statOptions[league].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        statSelect.appendChild(option);
    });
}

function checkStartEnabled() {
    if (sportSelect.value && statSelect.value) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}

sportSelect.addEventListener('change', (e) => {
    initStatOptions(e.target.value);
    checkStartEnabled();
});

statSelect.addEventListener('change', checkStartEnabled);

optionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(optionsForm);
    gameState.leagueSlug = formData.get('sport');
    gameState.sportSlug = { mlb:'baseball', nba:'basketball', nfl:'football', nhl:'hockey' }[gameState.leagueSlug];
    gameState.statKey = formData.get('stat');
    gameState.statLabel = statSelect.options[statSelect.selectedIndex].text;
    gameState.pool = formData.get('player-pool');
    gameState.score = 0;
    cachedTeams = null;
    cachedRosters = {};
    // High score
    const storageKey = `highScore_${gameState.leagueSlug}_${gameState.statKey}`;
    gameState.highScore = parseInt(localStorage.getItem(storageKey)) || 0;
    document.getElementById('high-score').innerText = gameState.highScore;
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    document.getElementById('stat-title').innerText = `Stat: ${gameState.statLabel}`;
    // Fetch two players
    gameState.player1 = await fetchRandomPlayer();
    gameState.player2 = await fetchRandomPlayer();
    updateUI();
});

document.getElementById('higher-btn').addEventListener('click', () => handleGuess('higher'));
document.getElementById('lower-btn').addEventListener('click', () => handleGuess('lower'));
document.getElementById('restart-btn').addEventListener('click', async () => {
    document.getElementById('game-over-modal').style.display = 'none';
    gameState.score = 0;
    cachedTeams = null;
    cachedRosters = {};
    gameState.player1 = await fetchRandomPlayer();
    gameState.player2 = await fetchRandomPlayer();
    updateUI();
    document.getElementById('game-page').style.display = 'block';
});
document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').style.display = 'none';
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('home-page').style.display = 'block';
});
