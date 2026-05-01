


// Basic page switching logic
const homePage = document.getElementById('home-page');
const gamePage = document.getElementById('game-page');
const optionsForm = document.getElementById('options-form');
const statTitle = document.getElementById('stat-title');
const player1Name = document.getElementById('player1-name');
const player1Stat = document.getElementById('player1-stat');
const player2Name = document.getElementById('player2-name');
const higherBtn = document.getElementById('higher-btn');
const lowerBtn = document.getElementById('lower-btn');
const resultMessage = document.getElementById('result-message');
const playAgainBtn = document.getElementById('play-again-btn');
const sportSelect = document.getElementById('sport');
const statSelect = document.getElementById('stat');

// Stat options for each sport
const statOptions = {
	nba: [
		{ value: 'points', label: 'Points per Game' },
		{ value: 'assists', label: 'Assists per Game' },
		{ value: 'rebounds', label: 'Rebounds per Game' },
		{ value: 'steals', label: 'Steals per Game' },
		{ value: 'blocks', label: 'Blocks per Game' },
		{ value: 'fg_pct', label: 'Field Goal %' },
		{ value: 'three_pt_pct', label: '3PT %' },
		{ value: 'ft_pct', label: 'Free Throw %' }
	],
	nfl: [
		{ value: 'passing_yards', label: 'Passing Yards (QB)' },
		{ value: 'rushing_yards', label: 'Rushing Yards (RB)' },
		{ value: 'receiving_yards', label: 'Receiving Yards (WR/TE)' },
		{ value: 'touchdowns', label: 'Touchdowns' },
		{ value: 'interceptions', label: 'Interceptions (QB/DB)' },
		{ value: 'sacks', label: 'Sacks (Defense)' },
		{ value: 'tackles', label: 'Tackles (Defense)' }
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

function populateStatOptions(sport) {
	statSelect.innerHTML = '';
	statOptions[sport].forEach(opt => {
		const option = document.createElement('option');
		option.value = opt.value;
		option.textContent = opt.label;
		statSelect.appendChild(option);
	});
}

// Initial stat options
populateStatOptions(sportSelect.value);

sportSelect.addEventListener('change', function() {
	populateStatOptions(this.value);
});

// Show game page and hide home page on form submit
optionsForm.addEventListener('submit', function(e) {
	e.preventDefault();
	homePage.style.display = 'none';
	gamePage.style.display = 'block';
	// Set up game (stub)
	setupGame();
});

function setupGame() {
	// For now, just show placeholder data
	statTitle.textContent = 'Stat: ' + statSelect.options[statSelect.selectedIndex].text;
	player1Name.textContent = 'Player 1';
	player1Stat.textContent = '23.4';
	player2Name.textContent = 'Player 2';
	resultMessage.textContent = '';
	playAgainBtn.style.display = 'none';
}

higherBtn.addEventListener('click', function() {
	// Placeholder: always correct
	resultMessage.textContent = 'Correct!';
	playAgainBtn.style.display = 'inline-block';
});

lowerBtn.addEventListener('click', function() {
	// Placeholder: always incorrect
	resultMessage.textContent = 'Incorrect!';
	playAgainBtn.style.display = 'inline-block';
});

playAgainBtn.addEventListener('click', function() {
	setupGame();
});
