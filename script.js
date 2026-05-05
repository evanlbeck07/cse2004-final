const DEFAULT_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/0/03/Twitter_default_profile_400x400.png';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let playerData = null;

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

// GAME STATE
let gameState = {
    sportSlug: '', leagueSlug: '', statKey: '', statLabel: '',
    pool: 'current', score: 0, highScore: 0,
    player1: null, player2: null
};

// DATA HELPERS
async function fetchPlayerData() {
    if (playerData) return; // Already fetched
    try {
        const res = await fetch('players.json');
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        playerData = await res.json();
    } catch (e) {
        console.error("Failed to load player data from players.json", e);
        alert("Fatal Error: Could not load player data. Please check the console and refresh.");
    }
}

async function fetchRandomPlayer() {
    await fetchPlayerData();

    if (!playerData) {
        // Error is shown by fetchPlayerData, just exit.
        return null;
    }

    const { leagueSlug, statKey, pool } = gameState;
    const allPlayersForSport = playerData[leagueSlug];

    if (!allPlayersForSport) {
        console.error(`No data found for sport: ${leagueSlug}`);
        return null;
    }

    // Filter by player pool (current/all-time)
    let poolFilteredPlayers;
    if (pool === 'current') {
        poolFilteredPlayers = allPlayersForSport.filter(p => p.status === 'active');
    } else { // 'all-time' includes both active and retired players
        poolFilteredPlayers = allPlayersForSport;
    }

    // Filter by players who have the required stat
    const statFilteredPlayers = poolFilteredPlayers.filter(p => p.hasOwnProperty(statKey) && p[statKey] !== null);

    if (statFilteredPlayers.length === 0) {
        alert(`No players found for Sport: ${leagueSlug.toUpperCase()}, Pool: ${pool}, Stat: ${statKey}. Please try another combination.`);
        return null;
    }

    // Pick a random player
    const randomPlayer = statFilteredPlayers[Math.floor(Math.random() * statFilteredPlayers.length)];

    // Format the player object for the game
    return {
        id: randomPlayer.id,
        name: randomPlayer.name,
        pos: randomPlayer.pos || 'N/A',
        img: randomPlayer.img || DEFAULT_IMAGE_URL,
        stat: parseFloat(randomPlayer[statKey])
    };
}

// UI CONTROLS
function updateUI() {
    if (!gameState.player1 || !gameState.player2) return;
    // Player 1 (Left)
    document.getElementById('player1-bg').style.backgroundImage = `url(${gameState.player1.img})`;
    document.getElementById('player1-img').src = gameState.player1.img;
    document.getElementById('player1-name').innerText = gameState.player1.name;
    document.getElementById('player1-pos').innerText = gameState.player1.pos;
    document.getElementById('player1-stat').innerText = gameState.player1.stat.toLocaleString();
    // Player 2 (Right)
    document.getElementById('player2-bg').style.backgroundImage = `url(${gameState.player2.img})`;
    document.getElementById('player2-img').src = gameState.player2.img;
    document.getElementById('player2-name').innerText = gameState.player2.name;
    document.getElementById('player2-pos').innerText = gameState.player2.pos;
    document.getElementById('player2-stat').style.display = 'none';
    document.getElementById('guess-controls').style.display = 'flex';
    // Reset player2-stat text to '?' for the next round
    document.getElementById('player2-stat').innerText = '?';
    document.getElementById('current-score').innerText = gameState.score;
    document.getElementById('high-score').innerText = gameState.highScore;
    // Reset VS indicator
    const vs = document.getElementById('vs-indicator');
    vs.classList.remove('correct', 'incorrect');
}

function revealPlayer2Stat() {
    document.getElementById('player2-stat').innerText = gameState.player2.stat.toLocaleString();
    document.getElementById('player2-stat').style.display = 'block';
    document.getElementById('guess-controls').style.display = 'none';
}

function showGameOver() {
    document.getElementById('final-score').innerText = gameState.score;
    document.getElementById('overlay-high-score').innerText = gameState.highScore;
    document.getElementById('overlay-stat').innerText = gameState.statLabel;
    document.getElementById('game-over-overlay').style.display = 'flex';
}

// GAME LOGIC
async function handleGuess(guess) {
    const p1 = gameState.player1.stat;
    const p2 = gameState.player2.stat;
    revealPlayer2Stat();
    const vsIndicator = document.getElementById('vs-indicator');
    const correct = (guess === 'higher' && p2 >= p1) || (guess === 'lower' && p2 <= p1);
    if (correct) {
        vsIndicator.classList.add('correct');
        gameState.score++;
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem(`highScore_${gameState.leagueSlug}_${gameState.statKey}`, gameState.highScore);
        }
        document.getElementById('current-score').classList.add('score-animation');
        setTimeout(() => document.getElementById('current-score').classList.remove('score-animation'), 500);
        await sleep(1200);
        // Move right player to left, get new right player
        gameState.player1 = gameState.player2;
        gameState.player2 = await fetchRandomPlayer();
        updateUI();
    } else {
        vsIndicator.classList.add('incorrect');
        await sleep(1000);
        showGameOver();
    }
}

// EVENT LISTENERS & INIT
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

function highlightSportBackground(selectedSport) {
    document.querySelectorAll('.sport-bg-quadrant').forEach(quadrant => {
        quadrant.classList.remove('highlighted');
    });
    if (selectedSport) {
        document.getElementById(`${selectedSport}-bg`).classList.add('highlighted');
    }
}

sportSelect.addEventListener('change', (e) => {
    initStatOptions(e.target.value);
    checkStartEnabled();
    highlightSportBackground(e.target.value);
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
    highlightSportBackground(null); // Clear highlight when starting game
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

    // If fetching failed (e.g., no players for stat), go back to menu
    if (!gameState.player1 || !gameState.player2) {
        document.getElementById('game-page').style.display = 'none';
        document.getElementById('home-page').style.display = 'block';
        return;
    }
    updateUI();
});

document.getElementById('higher-btn').addEventListener('click', () => handleGuess('higher'));
document.getElementById('lower-btn').addEventListener('click', () => handleGuess('lower'));
document.getElementById('restart-btn').addEventListener('click', async () => {
    document.getElementById('game-over-overlay').style.display = 'none';
    gameState.score = 0;
    highlightSportBackground(null); // Clear highlight when restarting
    gameState.player1 = await fetchRandomPlayer();
    gameState.player2 = await fetchRandomPlayer();
    updateUI();
    document.getElementById('game-page').style.display = 'block';
});
document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('game-page').style.display = 'none';
    highlightSportBackground(gameState.leagueSlug); // Re-highlight the selected sport
    document.getElementById('home-page').style.display = 'block';
});
