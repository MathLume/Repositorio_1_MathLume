// 1. Selecionar todas as Telas
const startScreen = document.getElementById('start-screen');
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('gameover-screen');
const victoryScreen = document.getElementById('victory-screen');

// 2. Selecionar Botões de Transição
const btnIniciar = document.getElementById('btn-iniciar');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnJogarMenu = document.getElementById('btn-jogar-menu');
const btnLogout = document.getElementById('btn-logout');
const btnVoltarMenu = document.getElementById('btn-voltar-menu');

// 3. Função Genérica para Alternar Telas
function showScreen(screenToShow) {
    // Esconde todas as telas e modais
    startScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainScreen.style.display = 'none';
    gameScreen.style.display = 'none';
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');

    // Mostra apenas a desejada definindo display como 'flex'
    screenToShow.style.display = 'flex';
}

// 4. Configuração dos Eventos de Navegação

// Tela Inicial -> Tela de Login
if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        showScreen(loginScreen);
    });
}

// Tela de Login -> Menu Principal (Tela 3)
if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', () => {
        showScreen(mainScreen);
    });
}

// Menu Principal -> Inicia o Jogo (Tela 3.2) ao clicar em "JOGAR"
if (btnJogarMenu) {
    btnJogarMenu.addEventListener('click', () => {
        showScreen(gameScreen);
        startGame(); // Inicializa o loop e os elementos do jogo matemático
    });
}

// Botão Voltar do Jogo para o Menu Principal
if (btnVoltarMenu) {
    btnVoltarMenu.addEventListener('click', () => {
        gameState = "paused";
        if (spawnInterval) clearInterval(spawnInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        showScreen(mainScreen);
    });
}

// Menu Principal -> Logout (Volta para a Tela Inicial)
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        showScreen(startScreen);
    });
}

// 5. Lógica do Jogo Matemático
let gameState = "playing";
let lives = 3;
let score = 0;
let questionsAnswered = 0;
let debrisList = [];
let debrisIdCounter = 0;
let animationFrameId = null;
let spawnInterval = null;

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// Background stars do jogo
const starsContainer = document.getElementById("stars-container");
if (starsContainer) {
    for (let i = 0; i < 50; i++) {
        const star = document.createElement("div");
        star.className = "absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse";
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDuration = `${2 + Math.random() * 2}s`;
        starsContainer.appendChild(star);
    }
}

const gameAreaContent = document.getElementById("game-area-content");
const fireflyEl = document.getElementById("firefly");
const livesContainer = document.getElementById("lives-container");
const scoreDisplay = document.getElementById("score-display");
const questionsDisplay = document.getElementById("questions-display");
const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");

function generateEquation() {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const isAddition = Math.random() > 0.5;

    if (isAddition) {
        return { equation: `${num1} + ${num2}`, answer: num1 + num2 };
    } else {
        const larger = Math.max(num1, num2);
        const smaller = Math.min(num1, num2);
        return { equation: `${larger} - ${smaller}`, answer: larger - smaller };
    }
}

function startGame() {
    gameState = "playing";
    lives = 3;
    score = 0;
    questionsAnswered = 0;
    debrisList = [];
    debrisIdCounter = 0;

    gameOverScreen.classList.add("hidden");
    victoryScreen.classList.add("hidden");

    spawnDebris();

    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(() => {
        if (gameState === "playing" && debrisList.length < 3 && questionsAnswered < 15) {
            spawnDebris();
        }
    }, 3000);

    setTimeout(() => {
        if (answerInput) answerInput.focus();
    }, 100);

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function spawnDebris() {
    const { equation, answer } = generateEquation();
    debrisList.push({
        id: debrisIdCounter++,
        equation,
        answer,
        x: Math.random() * 800 + 200,
        y: 50
    });
}

function gameLoop() {
    if (gameState !== "playing") return;

    for (let i = debrisList.length - 1; i >= 0; i--) {
        let debris = debrisList[i];
        debris.y += 1.5;

        if (debris.y >= window.innerHeight - 150) {
            lives = Math.max(0, lives - 1);
            debrisList.splice(i, 1);
        }
    }

    if (lives <= 0) {
        triggerGameOver();
        return;
    } else if (questionsAnswered >= 15) {
        triggerVictory();
        return;
    }

    updateUI();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateUI() {
    if (!livesContainer) return;
    livesContainer.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement("div");
        heart.innerHTML = `<svg class="w-8 h-8 ${i < lives ? "text-red-500 fill-red-500" : "text-gray-600 fill-gray-600"}" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        livesContainer.appendChild(heart);
    }

    scoreDisplay.innerText = score;
    questionsDisplay.innerText = `${questionsAnswered}/15`;

    if (gameAreaContent && fireflyEl) {
        const rect = gameAreaContent.getBoundingClientRect();
        fireflyEl.style.transform = `translate(${rect.width / 2 - 24}px, ${rect.height / 3 - 24}px)`;
    }

    const existingDebris = gameAreaContent.querySelectorAll(".debris-item");
    existingDebris.forEach(el => el.remove());

    debrisList.forEach(debris => {
        const el = document.createElement("div");
        el.className = "debris-item absolute pointer-events-none";
        el.style.left = `${debris.x - 60}px`;
        el.style.top = `${debris.y - 60}px`;
        el.style.transition = "transform 0.1s linear";
        el.innerHTML = `
            <div class="relative">
                <div class="w-28 h-28 bg-gradient-to-br from-orange-600 via-red-600 to-orange-800 rounded-2xl flex items-center justify-center border-4 border-orange-400/50 shadow-2xl animate-pulse">
                    <p class="text-3xl font-bold text-white drop-shadow-lg">${debris.equation}</p>
                </div>
            </div>
        `;
        gameAreaContent.appendChild(el);
    });
}

if (answerForm) {
    answerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (answerInput.value.trim() === "" || gameState !== "playing") return;

        const numAnswer = parseInt(answerInput.value);
        const matchingDebrisIndex = debrisList.findIndex(d => d.answer === numAnswer);

        if (matchingDebrisIndex !== -1) {
            score += 10;
            questionsAnswered += 1;
            debrisList.splice(matchingDebrisIndex, 1);
        } else {
            lives = Math.max(0, lives - 1);
        }

        answerInput.value = "";
        setTimeout(() => answerInput.focus(), 0);
    });
}

function triggerGameOver() {
    gameState = "gameOver";
    if (spawnInterval) clearInterval(spawnInterval);
    document.getElementById("final-score-go").innerText = `Pontuação Final: ${score}`;
    document.getElementById("final-q-go").innerText = `Questões Respondidas: ${questionsAnswered}/15`;
    gameOverScreen.classList.remove("hidden");
}

function triggerVictory() {
    gameState = "victory";
    if (spawnInterval) clearInterval(spawnInterval);
    document.getElementById("final-score-vic").innerText = `Pontuação Final: ${score}`;
    document.getElementById("final-lives-vic").innerText = `Vidas Restantes: ${lives} ❤️`;
    victoryScreen.classList.remove("hidden");
}

// Inicialização: Garante que o aplicativo comece na Tela Inicial
showScreen(startScreen);
