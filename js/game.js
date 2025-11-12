// La variable window.game se usa para exponer funciones al HTML
window.game = {};

// --- VARIABLES GLOBALES Y ESTADO DEL JUEGO --
let allCampaignScenarios = {};
let allQuizQuestions = [];
let gameConfig = {}; // Configuración cargada desde index.html

// Copia mezclada de preguntas usada por el quiz de 1 jugador
let singleQuizQuestions = [];

// Estado de Campaña
let currentRole = "";
let currentIndex = 0;
let score = 0;
let totalDecisions = 0;

// Estado Multijugador
let p1Score = 0;
let p2Score = 0;
let p1UsedQuestions = [];
let p2UsedQuestions = [];
let keydownListener = null;

// Estado para la navegación por teclado
let p1SelectedIndex = 0;
let p2SelectedIndex = 0;

// Estado Contrarreloj
let timerInterval = null;
let timeLeft = 0;

// Estado de pausa y listeners específicos
let escListener = null;
let timerCallback = null; // callback actual cuando el timer termine

// --- ELEMENTOS DE MÚSICA --
let gameMusic = null;


// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar la música del juego
    setupGameMusic();

    // 1.1. Adjuntar controles de juego (botones y tecla ESC)
    attachGameControls();

    // Escuchar eventos disparados por partials.js para pausar/reanudar
    window.addEventListener('game:pause', () => {
        try { if (!(window.game && window.game.isPaused)) pauseGame(); } catch(e){}
    });
    window.addEventListener('game:resume', () => {
        try { if (window.game && window.game.isPaused) resumeGame(); } catch(e){}
    });
    // Escuchar reinicio pedido desde el overlay (partials.js)
    window.addEventListener('game:restart', () => {
        try { restartGame(); } catch(e) { console.error('Error al manejar game:restart', e); }
    });

    // 2. Cargar datos y configuración
    loadData().then(() => {
        loadGameConfig();
    });
});

// --- UTILIDADES ---
/** Mezcla un array in-place (Fisher-Yates) y devuelve la misma referencia */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Carga los archivos JSON
async function loadData() {
    try {
        const campaignResponse = await fetch('escenarios_campaña.json');
        allCampaignScenarios = await campaignResponse.json();

        const quizResponse = await fetch('preguntas_quiz.json');
        allQuizQuestions = await quizResponse.json();
        // Preparar una copia mezclada para el quiz de 1 jugador (no modificamos el original)
        singleQuizQuestions = shuffleArray([...allQuizQuestions]);
    } catch (e) {
        console.error("Error al cargar datos JSON:", e);
    }
}

// 3. Carga la configuración de la sesión
function loadGameConfig() {
    try {
        const configString = sessionStorage.getItem('gameConfig');
        if (configString) {
            gameConfig = JSON.parse(configString);
        } else {
            // Si no hay config (ej: acceso directo a game.html), usar configuración por defecto
            console.warn("No se encontró gameConfig en sessionStorage. Usando configuración por defecto.");
            gameConfig = {
                mode: 'single_quiz',
                isTimed: false,
                role: 'hacker',
                timeLimit: 30
            };
        }
        
        // Normalizar nombres de modo entre index.js y game.js
        // index.js usa "multi_quiz" pero aquí esperamos "multiplayer_quiz".
        const modeMap = {
            'multi_quiz': 'multiplayer_quiz',
            'multi': 'multiplayer_quiz'
        };
        if (gameConfig.mode && modeMap[gameConfig.mode]) {
            gameConfig.mode = modeMap[gameConfig.mode];
        }
        // Normalizar nombres de rol entre index.js y los keys del JSON
        // index.html puede usar 'defender' (inglés), el JSON usa 'defensor' (español)
        const roleMap = {
            'defender': 'defensor',
            'defensor': 'defensor',
            'user': 'usuario',
            'usuario': 'usuario',
            'hacker': 'hacker'
        };
        if (gameConfig.role && roleMap[gameConfig.role]) {
            gameConfig.role = roleMap[gameConfig.role];
        }
        console.log("Configuración de juego cargada:", gameConfig);
        initGameView(gameConfig.mode);
    } catch (e) {
        console.error("Error al cargar o parsear gameConfig:", e);
        // Fallback final: usar single_quiz por defecto
        gameConfig = {
            mode: 'single_quiz',
            isTimed: false,
            role: 'hacker',
            timeLimit: 30
        };
        initGameView(gameConfig.mode);
    }
}

/**
 * Inicializa la vista y el estado del juego basado en el modo seleccionado.
 * @param {string} mode - El modo de juego ('single_quiz', 'campaign', 'multiplayer_quiz').
 */
function initGameView(mode) {
    console.log(`Inicializando modo: ${mode}`);
    
    // --- SOLUCIÓN AL ERROR: main-container solo existe en index.html ---
    // NO intentamos ocultar main-container, ya que estamos en game.html.
    
    // Mostramos el contenedor de juego (por si acaso, aunque debería estar visible por defecto en game.html)
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.classList.remove('hidden');
    }

    const campaignGame = document.getElementById('campaign-game');
    const multiplayerGame = document.getElementById('multiplayer-game');

    if (mode === 'single_quiz' || mode === 'campaign') {
        if (campaignGame) {
            campaignGame.classList.remove('hidden');
        }
        if (multiplayerGame) {
            multiplayerGame.classList.add('hidden');
        }
        
        // Lógica de inicio de Campaña o Quiz 1 Jugador
        if (mode === 'campaign') {
            currentRole = gameConfig.role || 'hacker'; // Usar el rol de la configuración
            // Oculta el display de score/progreso del Quiz en Campaña
            if(document.getElementById('progress-display')) document.getElementById('progress-display').classList.add('hidden');
            if(document.getElementById('score-display')) document.getElementById('score-display').classList.add('hidden');
            if(document.getElementById('single-timer-display')) document.getElementById('single-timer-display').classList.add('hidden');
            
            // Inicia la campaña
            startCampaign();
        } else { // single_quiz
            // Oculta el display de score/progreso del Quiz en Campaña
            if(document.getElementById('campaign-title')) document.getElementById('campaign-title').classList.add('hidden');
            if(document.getElementById('scenario-text')) document.getElementById('scenario-text').classList.add('hidden');
            
            // Inicia el quiz de 1 jugador
            startSingleQuiz();
        }

    } else if (mode === 'multiplayer_quiz') {
        if (campaignGame) {
            campaignGame.classList.add('hidden');
        }
        if (multiplayerGame) {
            multiplayerGame.classList.remove('hidden');
        }
        
        // Inicia el quiz multijugador
        startMultiplayerQuiz();
    } else {
        console.error("Modo de juego no reconocido:", mode);
    }
}

// --- LÓGICA DE MÚSICA ---

/** Configura la música del juego */
function setupGameMusic() {
    // Preferir el AudioManager compartido si está disponible
    if (window.AudioManager) {
        AudioManager.init({
            audioId: 'gameMusicAudio',
            sliderId: 'volumeSliderGame',
            playBtnId: 'music-toggle-btn',
            unblockId: 'sound-unblock-game',
            unblockBtnId: 'enable-sound-btn-game',
            src: 'mp3/musica_preguntas.mp3',
            defaultVolume: parseFloat(sessionStorage.getItem('initialVolume') || 0.5)
        });
        gameMusic = AudioManager.audio;
        return;
    }

    // Fallback: crear audio local si no existe AudioManager
    let audio = document.getElementById('gameMusicAudio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'gameMusicAudio';
        audio.loop = true;
        audio.src = 'mp3/musica_preguntas.mp3';
        document.body.appendChild(audio);
    }
    gameMusic = audio;

    const initialVolume = sessionStorage.getItem('initialVolume');
    if (initialVolume !== null) gameMusic.volume = parseFloat(initialVolume);
    else gameMusic.volume = 0.5;

    gameMusic.play().catch(()=>{
        const unblock = document.getElementById('sound-unblock-game');
        const btn = document.getElementById('enable-sound-btn-game');
        if (unblock) unblock.style.display = 'block';
        if (btn) btn.addEventListener('click', () => { gameMusic.play().then(()=>{ if (unblock) unblock.style.display='none'; }).catch(()=>{}); });
    });

    const volumeSlider = document.getElementById('volumeSliderGame');
    if (volumeSlider) {
        volumeSlider.value = String(gameMusic.volume);
        volumeSlider.addEventListener('input', (e) => {
            gameMusic.volume = parseFloat(e.target.value);
            try { sessionStorage.setItem('initialVolume', String(gameMusic.volume)); } catch(e){}
        });
    }

    // Vincular el botón de toggle de volumen (iconos) para accesibilidad
    const volToggle = document.getElementById('volume-toggle-btn');
    function updateVolumeIcons() {
        const unmuted = document.getElementById('volume-icon-unmuted');
        const muted = document.getElementById('volume-icon-muted');
        if (!gameMusic) return;
        const isMuted = !!gameMusic.muted || gameMusic.volume === 0;
        if (unmuted) unmuted.style.display = isMuted ? 'none' : 'block';
        if (muted) muted.style.display = isMuted ? 'block' : 'none';
        if (volToggle) volToggle.setAttribute('aria-pressed', String(isMuted));
    }
    if (volToggle) {
        volToggle.addEventListener('click', () => {
            if (!gameMusic) return;
            gameMusic.muted = !gameMusic.muted;
            // If unmuting and volume is 0, set a sensible default
            if (!gameMusic.muted && gameMusic.volume === 0) gameMusic.volume = 0.5;
            try { sessionStorage.setItem('initialVolume', String(gameMusic.volume)); } catch(e){}
            updateVolumeIcons();
        });
        updateVolumeIcons();
    }
}

/** Adjunta los controles visibles (botones) y el manejador de tecla ESC para detener la partida */
function attachGameControls() {
    const stopBtn = document.getElementById('stop-game-btn');
    if (stopBtn) stopBtn.addEventListener('click', () => stopGame());

    // Registrar la tecla ESC para pausar/reanudar la partida (listener separado)
    if (!escListener) {
        escListener = function (e) {
            // If another handler already called preventDefault(), we consider the event handled
            if (e.defaultPrevented) return;
            if (e.key === 'Escape' || e.key === 'Esc') {
                // Mark as handled to avoid other listeners from also reacting
                e.preventDefault(); // Evitar que ESC haga otras cosas
                // Verificar si ya hay modal abierto usando window.game.isPaused en lugar de buscar el elemento
                try {
                    if (window.game && window.game.isPaused) {
                        // Si está pausado, reanudar
                        window.dispatchEvent(new CustomEvent('game:resume'));
                    } else {
                        // Si no está pausado, pausar
                        window.dispatchEvent(new CustomEvent('game:pause'));
                    }
                } catch (e2) {}
            }
        };
        document.addEventListener('keydown', escListener);
    }
}

/** Alterna reproducir/pausar la música de fondo del juego */
function toggleGameMusic() {
    if (!gameMusic) return;
    if (gameMusic.paused) {
        gameMusic.play().catch(() => {});
    } else {
        gameMusic.pause();
    }
}

/** Detiene la partida: pausa música, limpia timers y muestra overlay con opción para volver al menú */
function stopGame() {
    // Si ya está detenida, no hacer nada
    if (window.game && window.game.isStopped) return;
    window.game = window.game || {};
    window.game.isStopped = true;

    // Pausar música
    try { if (gameMusic && !gameMusic.paused) gameMusic.pause(); } catch (e) {}

    // Limpiar timers
    try { clearInterval(timerInterval); } catch (e) {}

    // Remover listeners de teclado relacionados con el juego
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
        keydownListener = null;
    }

    // Mostrar overlay de parada
    showStopOverlay();
}

/** Alterna pausa/resume de la partida (usada por ESC) */
function togglePause() {
    window.game = window.game || {};
    if (window.game.isStopped) return; // si la partida está detenida, no toggle
    if (window.game.isPaused) resumeGame(); else pauseGame();
}

/** Pausa el juego: congela timer y pausa música */
function pauseGame() {
    window.game = window.game || {};
    if (window.game.isPaused) return;
    window.game.isPaused = true;

    // Pausar música
    try { if (gameMusic && !gameMusic.paused) gameMusic.pause(); } catch (e) {}

    // Congelar temporizador
    try { clearInterval(timerInterval); } catch (e) {}

        // Nota: el DOM del modal lo crea/gestiona `partials.js` (el overlay con 'Ayuda').
        // Aquí solo nos encargamos del estado interno, música y timers.
}

/** Reanuda la partida: continua timer y música donde estaban */
function resumeGame() {
    window.game = window.game || {};
    if (!window.game.isPaused) return;
    window.game.isPaused = false;

    // Quitar overlay

    // No manipulamos el DOM del overlay aquí: partials.js lo oculta/gestiona.

    // Reanudar música si no está muteada
    try {
        if (gameMusic && gameMusic.paused) {
            gameMusic.play().catch(() => {});
        }
    } catch (e) {}

    // Reanudar temporizador si corresponde
    try {
        if (gameConfig && gameConfig.isTimed && typeof timeLeft === 'number' && timeLeft > 0 && timerCallback) {
            startTimer(timeLeft, timerCallback);
        }
    } catch (e) {}
}

function showStopOverlay() {
    if (document.getElementById('game-stop-overlay')) return; // ya mostrado
    const overlay = document.createElement('div');
    overlay.id = 'game-stop-overlay';
    overlay.innerHTML = `
        <div class="overlay-card" role="dialog" aria-modal="true">
            <h3>Partida detenida</h3>
            <p>Has detenido la partida. Puedes volver al menú principal o cerrar esta pantalla para reiniciar la sesión de juego.</p>
            <div class="overlay-actions">
                <button id="overlay-return-btn" class="control-btn">Volver al menú</button>
                <button id="overlay-restart-btn" class="control-btn">Reiniciar partida</button>
                <button id="overlay-close-btn" class="control-btn">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('overlay-return-btn').addEventListener('click', () => {
        // Navegar al menú principal
        window.location.href = 'index.html';
    });
    document.getElementById('overlay-close-btn').addEventListener('click', () => {
        // Quitar overlay y marcar como no detenido (NOTA: esto NO restaura el estado interno automáticamente)
        const ov = document.getElementById('game-stop-overlay');
        if (ov) ov.remove();
        if (window.game) window.game.isStopped = false;
        // Asegurar que el listener de ESC para pausar/reanudar esté activo
        if (!escListener) {
            escListener = function (e) { if (e.key === 'Escape' || e.key === 'Esc') togglePause(); };
            document.addEventListener('keydown', escListener);
        }
    });

    // Reiniciar partida desde el overlay
    document.getElementById('overlay-restart-btn')?.addEventListener('click', () => {
        const ov = document.getElementById('game-stop-overlay');
        if (ov) ov.remove();
        if (window.game) window.game.isStopped = false;
        restartGame();
    });
}

/** Reinicia la partida actual según la configuración guardada. */
function restartGame() {
    // Limpiar timers y flags
    try { clearInterval(timerInterval); } catch(e){}
    window.game = window.game || {};
    window.game.isStopped = false;

    // Resetear estados principales
    currentIndex = 0; score = 0; totalDecisions = 0;
    p1Score = 0; p2Score = 0; p1CurrentQuestionIndex = 0; p2CurrentQuestionIndex = 0;

    // Re-inicializar la vista según el modo
    initGameView(gameConfig.mode);
}


// --- LÓGICA DE QUIZ DE 1 JUGADOR (SINGLE QUIZ) ---

function startSingleQuiz() {
    console.log("Iniciando Quiz de 1 Jugador.");
    currentIndex = 0;
    score = 0;
    // Usar la lista mezclada para el quiz de 1 jugador
    if (!singleQuizQuestions || singleQuizQuestions.length === 0) {
        // No hay preguntas: mostrar mensaje amigable
        const gameContainer = document.getElementById('campaign-game');
        if (gameContainer) {
            gameContainer.innerHTML = `\n                <h2>Error</h2>\n                <p>No se encontraron preguntas para el quiz. Asegúrate de que 'preguntas_quiz.json' exista y tenga contenido.</p>\n                <button onclick="window.location.href='index.html'">Volver</button>\n            `;
        }
        return;
    }
    totalDecisions = singleQuizQuestions.length; // Usar el número total de preguntas
    updateScoreDisplay();
    displaySingleQuizQuestion();
    
    if (gameConfig.isTimed) {
        // Inicializar y mostrar el timer
        const timerDisplay = document.getElementById('single-timer-display');
        if(timerDisplay) timerDisplay.classList.remove('hidden');
        startTimer(gameConfig.timeLimit, handleSingleQuizTimeout);
    }
}

function updateScoreDisplay() {
    const progressDisplay = document.getElementById('progress-display');
    const scoreDisplay = document.getElementById('score-display');
    
    if (progressDisplay) {
        progressDisplay.textContent = `Pregunta ${currentIndex + 1} / ${totalDecisions}`;
    }
    if (scoreDisplay) {
        scoreDisplay.textContent = `Puntuación: ${score}`;
    }
}

/**
 * Muestra la pregunta actual en el modo Quiz de 1 Jugador.
 */
function displaySingleQuizQuestion() {
    if (currentIndex >= singleQuizQuestions.length) {
        handleSingleQuizEnd();
        return;
    }

    const currentQuestion = singleQuizQuestions[currentIndex];
    const questionText = document.getElementById('question-text');
    const choicesDiv = document.getElementById('choices');

    if (questionText) questionText.textContent = currentQuestion.pregunta;
    if (choicesDiv) choicesDiv.innerHTML = '';
    
    // Detener el timer antes de mostrar una nueva pregunta
    if (gameConfig.isTimed) {
        clearInterval(timerInterval);
    }

    // Mezclar las opciones para evitar respuestas por posición
    const shuffledOptions = shuffleArray([...currentQuestion.opciones]);
    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option;
        button.className = 'choice-button';
        button.type = 'button';
        // Accessibility: make focusable and keyboard-selectable
        button.setAttribute('tabindex', '0');
        button.setAttribute('role', 'button');
        button.setAttribute('aria-pressed', 'false');
        // Click handler
        button.onclick = () => handleSingleQuizAnswer(option);
        // Support keyboard activation (Enter / Space)
        button.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                button.click();
            }
        });
        if (choicesDiv) choicesDiv.appendChild(button);
    });
    
    // Reiniciar y empezar el timer si es modo contrarreloj
    if (gameConfig.isTimed) {
        startTimer(gameConfig.timeLimit, handleSingleQuizTimeout);
    }
}

/**
 * Maneja la respuesta del Quiz de 1 Jugador.
 * @param {string} selectedOption - La opción seleccionada por el usuario.
 */
function handleSingleQuizAnswer(selectedOption) {
    if (window.game && window.game.isPaused) return;
    clearInterval(timerInterval); // Detener el tiempo inmediatamente
    
    const currentQuestion = singleQuizQuestions[currentIndex];
    const isCorrect = selectedOption === currentQuestion.respuesta_correcta;
    const choicesDiv = document.getElementById('choices');
    const outcomeText = document.getElementById('outcome-text');
    
    // Deshabilitar botones
    if (choicesDiv) {
        Array.from(choicesDiv.children).forEach(button => {
            button.disabled = true;
            if (button.textContent === currentQuestion.respuesta_correcta) {
                button.classList.add('correct-answer');
            } else if (button.textContent === selectedOption) {
                button.classList.add('incorrect-answer');
            }
        });
    }

    if (isCorrect) {
        score++;
        if (outcomeText) outcomeText.textContent = "✅ ¡Correcto! +1 punto.";
    } else {
        if (outcomeText) outcomeText.textContent = `❌ Incorrecto. La respuesta correcta era: ${currentQuestion.respuesta_correcta}`;
    }
    
    updateScoreDisplay();

    // Pasar a la siguiente pregunta después de un breve retraso
    setTimeout(() => {
        currentIndex++;
        if (outcomeText) outcomeText.textContent = '';
        displaySingleQuizQuestion();
    }, 2000);
}

/**
 * Maneja el fin del tiempo en el modo Quiz de 1 Jugador.
 */
function handleSingleQuizTimeout() {
    clearInterval(timerInterval);
    const currentQuestion = singleQuizQuestions[currentIndex];
    const choicesDiv = document.getElementById('choices');
    const outcomeText = document.getElementById('outcome-text');
    
    // Deshabilitar botones y mostrar la respuesta correcta
    if (choicesDiv) {
        Array.from(choicesDiv.children).forEach(button => {
            button.disabled = true;
            if (button.textContent === currentQuestion.respuesta_correcta) {
                button.classList.add('correct-answer');
            }
        });
    }
    
    if (outcomeText) outcomeText.textContent = `⏰ ¡Tiempo agotado! La respuesta correcta era: ${currentQuestion.respuesta_correcta}`;

    // Pasar a la siguiente pregunta
    setTimeout(() => {
        currentIndex++;
        if (outcomeText) outcomeText.textContent = '';
        displaySingleQuizQuestion();
    }, 2000);
}


function handleSingleQuizEnd() {
    clearInterval(timerInterval);
    const gameContainer = document.getElementById('campaign-game');
    if (gameContainer) {
        gameContainer.innerHTML = `
            <h2>🎉 Fin del Quiz</h2>
            <p class="final-score">Tu Puntuación Final es: ${score} / ${singleQuizQuestions.length}</p>
            <p>¡Gracias por participar en CiberSeguridad: El Quiz!</p>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:18px;">
              <button id="restart-btn-single" class="cta-button">Repetir partida</button>
              <button onclick="window.location.href='index.html'" class="cta-button">Volver al Menú Principal</button>
            </div>
        `;
        document.getElementById('restart-btn-single').addEventListener('click', () => restartGame());
    }
}


// --- LÓGICA DE CAMPAÑA (ROLE PLAY) ---

function startCampaign() {
    console.log(`Iniciando Campaña como: ${currentRole}`);
    currentIndex = 0;
    score = 0;
    const scenarios = allCampaignScenarios[currentRole];
    totalDecisions = scenarios ? scenarios.length : 0;
    
    // Actualizar título
    const campaignTitle = document.getElementById('campaign-title');
    if (campaignTitle) {
        campaignTitle.textContent = `Modo Campaña: ${currentRole === 'hacker' ? '💻 Hacker' : '🛡️ Defensor'}`;
    }

    if (totalDecisions > 0) {
        displayScenario(currentIndex);
    } else {
        const gameContainer = document.getElementById('campaign-game');
        if (gameContainer) {
             gameContainer.innerHTML = `
                <h2>Error</h2>
                <p>No se encontraron escenarios para el rol de ${currentRole}.</p>
                <button onclick="window.location.href='index.html'">Volver</button>
            `;
        }
        
    }
}

/**
 * Muestra el escenario de campaña actual.
 * @param {number} index - Índice del escenario a mostrar.
 */
function displayScenario(index) {
    const scenarios = allCampaignScenarios[currentRole];
    if (index >= scenarios.length) {
        handleCampaignEnd();
        return;
    }

    const currentScenario = scenarios[index];
    const campaignTitle = document.getElementById('campaign-title');
    const scenarioText = document.getElementById('scenario-text');
    const choicesDiv = document.getElementById('choices');
    const outcomeText = document.getElementById('outcome-text');
    
    // Actualizar título y texto del escenario
    if (campaignTitle) campaignTitle.textContent = `${currentScenario.title} - ${currentRole === 'hacker' ? '💻' : '🛡️'}`;
    if (scenarioText) scenarioText.textContent = currentScenario.text;
    
    // Limpiar opciones y resultado anterior
    if (choicesDiv) choicesDiv.innerHTML = '';
    if (outcomeText) outcomeText.textContent = '';


    currentScenario.choices.forEach((choice, choiceIndex) => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.className = 'choice-button';
        button.onclick = () => handleCampaignChoice(choiceIndex);
        if (choicesDiv) choicesDiv.appendChild(button);
    });
}

/**
 * Maneja la elección del usuario en el modo Campaña.
 * @param {number} choiceIndex - Índice de la opción seleccionada.
 */
function handleCampaignChoice(choiceIndex) {
    if (window.game && window.game.isPaused) return;
    const scenarios = allCampaignScenarios[currentRole];
    const currentScenario = scenarios[currentIndex];
    const selectedChoice = currentScenario.choices[choiceIndex];

    const choicesDiv = document.getElementById('choices');
    const outcomeText = document.getElementById('outcome-text');
    
    // Deshabilitar botones
    if (choicesDiv) {
        Array.from(choicesDiv.children).forEach((button, index) => {
            button.disabled = true;
            if (index === choiceIndex) {
                // Resaltar la elección del usuario
                button.classList.add(selectedChoice.success ? 'correct-answer' : 'incorrect-answer');
            } else {
                // Desvanecer las otras opciones
                button.style.opacity = '0.5';
            }
        });
    }

    // Mostrar resultado
    if (outcomeText) {
        outcomeText.textContent = selectedChoice.result;
    }
    
    // Actualizar puntuación
    if (selectedChoice.success) {
        score++;
    }

    // Avanzar al siguiente escenario después de un breve retraso
    setTimeout(() => {
        currentIndex++;
        displayScenario(currentIndex);
    }, 3000);
}


function handleCampaignEnd() {
    const gameContainer = document.getElementById('campaign-game');
    const successRate = totalDecisions > 0 ? ((score / totalDecisions) * 100).toFixed(1) : 0;
    
    if (gameContainer) {
        gameContainer.innerHTML = `
            <h2>🎉 Campaña Finalizada: ${currentRole === 'hacker' ? '💻 Hacker' : '🛡️ Defensor'}</h2>
            <p class="final-score">Decisiones Exitosas: ${score} / ${totalDecisions}</p>
            <p class="final-score">Tasa de Éxito: ${successRate}%</p>
            <p>¡Gracias por participar!</p>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:18px;">
              <button id="restart-btn-campaign" class="cta-button">Repetir campaña</button>
              <button onclick="window.location.href='index.html'" class="cta-button">Volver al Menú Principal</button>
            </div>
        `;
        document.getElementById('restart-btn-campaign').addEventListener('click', () => restartGame());
    }
}


// --- LÓGICA DE QUIZ MULTIJUGADOR (MULTI QUIZ) ---

// Solo funciones vacías por ahora, para prevenir errores si se llama a este modo.
// La lógica de multijugador es más compleja (teclado, sincronización),
// pero las funciones básicas están definidas para evitar fallos.

function startMultiplayerQuiz() {
    console.log("Iniciando Quiz Multijugador. (Lógica de preguntas y control de teclado por implementar)");
    // Aquí iría la lógica para inicializar p1Score, p2Score,
    // inicializarMultiplayerQuestions(), displayMultiplayerQuestions(), y attachKeydownListener().
    
    // Inicialización básica para evitar errores
    p1Score = 0;
    p2Score = 0;
    p1UsedQuestions = [];
    p2UsedQuestions = [];
    p1SelectedIndex = 0;
    p2SelectedIndex = 0;
    
    // Simular el inicio de la primera ronda
    initializeMultiplayerQuestions();
    // Renderizar preguntas independientes para cada jugador
    renderP1Question();
    renderP2Question();
    attachKeydownListener();
    
    if (gameConfig.isTimed) {
        const timerDisplay = document.getElementById('multi-timer-display');
        if(timerDisplay) timerDisplay.classList.remove('hidden');
        startTimer(60, handleMultiplayerQuizEnd); // 60s global para el duelo
    }
}

function initializeMultiplayerQuestions() {
    // Para simplificar, usamos todas las preguntas del quiz para ambos jugadores.
    // En un juego real, se mezclarían o seleccionarían al azar.
    p1UsedQuestions = [...allQuizQuestions].sort(() => 0.5 - Math.random());
    p2UsedQuestions = [...allQuizQuestions].sort(() => 0.5 - Math.random());
}

let p1CurrentQuestionIndex = 0;
let p2CurrentQuestionIndex = 0;
// currentMultiQuestion was used in the old shared-multi implementation and is no longer needed

function displayMultiplayerQuestions() {
    // Deprecated: use renderP1Question() and renderP2Question() which render each player's question independently.
}

/** Renderiza la pregunta actual para el Jugador 1. */
function renderP1Question() {
    const qText1 = document.getElementById('p1-question');
    const choicesDiv1 = document.getElementById('p1-choices');
    const outcome1 = document.getElementById('p1-outcome');
    const score1 = document.getElementById('p1-score');

    if (p1CurrentQuestionIndex >= p1UsedQuestions.length) {
        // Si se acabaron las preguntas para P1, comprobar fin
        if (p2CurrentQuestionIndex >= p2UsedQuestions.length) handleMultiplayerQuizEnd();
        return;
    }

    const q = p1UsedQuestions[p1CurrentQuestionIndex];
    if (score1) score1.textContent = `Puntuación: ${p1Score}`;
    if (qText1) qText1.textContent = q.pregunta;
    if (choicesDiv1) choicesDiv1.innerHTML = '';
    if (outcome1) outcome1.textContent = '';

    q.opciones.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.textContent = option;
        btn.dataset.index = index;
        btn.className = 'choice-button';
        btn.type = 'button';
        btn.addEventListener('click', () => handleP1Answer(index));
        choicesDiv1.appendChild(btn);
    });
    p1SelectedIndex = 0;
    highlightSelection('p1');
}

/** Renderiza la pregunta actual para el Jugador 2. */
function renderP2Question() {
    const qText2 = document.getElementById('p2-question');
    const choicesDiv2 = document.getElementById('p2-choices');
    const outcome2 = document.getElementById('p2-outcome');
    const score2 = document.getElementById('p2-score');

    if (p2CurrentQuestionIndex >= p2UsedQuestions.length) {
        if (p1CurrentQuestionIndex >= p1UsedQuestions.length) handleMultiplayerQuizEnd();
        return;
    }

    const q = p2UsedQuestions[p2CurrentQuestionIndex];
    if (score2) score2.textContent = `Puntuación: ${p2Score}`;
    if (qText2) qText2.textContent = q.pregunta;
    if (choicesDiv2) choicesDiv2.innerHTML = '';
    if (outcome2) outcome2.textContent = '';

    q.opciones.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.textContent = option;
        btn.dataset.index = index;
        btn.className = 'choice-button';
        btn.type = 'button';
        btn.addEventListener('click', () => handleP2Answer(index));
        choicesDiv2.appendChild(btn);
    });
    p2SelectedIndex = 0;
    highlightSelection('p2');
}

/** Maneja la respuesta del Jugador 1 (independiente). */
function handleP1Answer(selectedIndex) {
    if (window.game && window.game.isPaused) return;
    if (p1CurrentQuestionIndex >= p1UsedQuestions.length) return;
    const q = p1UsedQuestions[p1CurrentQuestionIndex];
    const choicesDiv = document.getElementById('p1-choices');
    const outcome = document.getElementById('p1-outcome');
    const selectedOption = q.opciones[selectedIndex];
    const isCorrect = selectedOption === q.respuesta_correcta;

    // Disable P1 buttons
    if (choicesDiv) {
        Array.from(choicesDiv.children).forEach(button => {
            button.disabled = true;
            if (parseInt(button.dataset.index) === selectedIndex) {
                button.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
            }
        });
    }

    if (isCorrect) { p1Score++; if (outcome) outcome.textContent = '✅ ¡Correcto!'; }
    else { if (outcome) outcome.textContent = `❌ Incorrecto. La correcta: ${q.respuesta_correcta}`; }
    const score1 = document.getElementById('p1-score'); if (score1) score1.textContent = `Puntuación: ${p1Score}`;

    // Avanzar a la siguiente pregunta de P1
    setTimeout(() => {
        p1CurrentQuestionIndex++;
        renderP1Question();
    }, 1200);
}

/** Maneja la respuesta del Jugador 2 (independiente). */
function handleP2Answer(selectedIndex) {
    if (window.game && window.game.isPaused) return;
    if (p2CurrentQuestionIndex >= p2UsedQuestions.length) return;
    const q = p2UsedQuestions[p2CurrentQuestionIndex];
    const choicesDiv = document.getElementById('p2-choices');
    const outcome = document.getElementById('p2-outcome');
    const selectedOption = q.opciones[selectedIndex];
    const isCorrect = selectedOption === q.respuesta_correcta;

    if (choicesDiv) {
        Array.from(choicesDiv.children).forEach(button => {
            button.disabled = true;
            if (parseInt(button.dataset.index) === selectedIndex) {
                button.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
            }
        });
    }

    if (isCorrect) { p2Score++; if (outcome) outcome.textContent = '✅ ¡Correcto!'; }
    else { if (outcome) outcome.textContent = `❌ Incorrecto. La correcta: ${q.respuesta_correcta}`; }
    const score2 = document.getElementById('p2-score'); if (score2) score2.textContent = `Puntuación: ${p2Score}`;

    setTimeout(() => {
        p2CurrentQuestionIndex++;
        renderP2Question();
    }, 1200);
}

/**
 * Maneja la lógica de respuesta para el modo multijugador.
 * @param {string} player - 'p1' o 'p2'.
 * @param {number} selectedIndex - Índice de la opción seleccionada.
 */
// Deprecated: handleMultiplayerAnswer replaced by independent handlers handleP1Answer/handleP2Answer
// Deprecated: handleMultiplayerAnswer replaced by independent handlers handleP1Answer/handleP2Answer

/**
 * Adjunta el listener de teclado para el modo multijugador.
 */
function attachKeydownListener() {
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
    }
    
    // Esta función anónima será el listener, y la guardamos en la variable
    // para poder removerla después.
    keydownListener = handleKeydown;
    document.addEventListener('keydown', keydownListener);
}

/**
 * Maneja el control por teclado para ambos jugadores.
 * @param {KeyboardEvent} event - Evento de teclado.
 */
function handleKeydown(event) {
    if (window.game && window.game.isPaused) return; // Ignorar controles mientras está en pausa
    if (gameConfig.mode !== 'multiplayer_quiz') {
        return; // Solo activo en multi quiz
    }
    
    // Para cada jugador calculamos sus opciones actuales por separado
    const p1Q = p1UsedQuestions[p1CurrentQuestionIndex];
    const p2Q = p2UsedQuestions[p2CurrentQuestionIndex];
    const p1Options = p1Q ? p1Q.opciones.length : 0;
    const p2Options = p2Q ? p2Q.opciones.length : 0;

    switch (event.code) {
        // --- Jugador 1 (W, S, ESPACIO) ---
        case 'KeyW': // Arriba
            if (p1Options > 0) {
                p1SelectedIndex = (p1SelectedIndex - 1 + p1Options) % p1Options;
                highlightSelection('p1');
            }
            break;
        case 'KeyS': // Abajo
            if (p1Options > 0) {
                p1SelectedIndex = (p1SelectedIndex + 1) % p1Options;
                highlightSelection('p1');
            }
            break;
        case 'Space': // Seleccionar (Prevenir scroll de página)
            event.preventDefault(); 
            if (p1Options > 0) {
                handleP1Answer(p1SelectedIndex);
            }
            break;

        // --- Jugador 2 (FLECHAS, ENTER) ---
        case 'ArrowUp': // Arriba
            if (p2Options > 0) {
                p2SelectedIndex = (p2SelectedIndex - 1 + p2Options) % p2Options;
                highlightSelection('p2');
            }
            break;
        case 'ArrowDown': // Abajo
            if (p2Options > 0) {
                p2SelectedIndex = (p2SelectedIndex + 1) % p2Options;
                highlightSelection('p2');
            }
            break;
        case 'Enter': // Seleccionar
            if (p2Options > 0) {
                handleP2Answer(p2SelectedIndex);
            }
            break;
    }
}

/**
 * Resalta la opción seleccionada actualmente por teclado.
 * @param {string} player - 'p1' o 'p2'.
 */
function highlightSelection(player) {
    const isP1 = player === 'p1';
    const choicesDiv = document.getElementById(isP1 ? 'p1-choices' : 'p2-choices');
    const selectedIndex = isP1 ? p1SelectedIndex : p2SelectedIndex;

    if (!choicesDiv) return;

    // Obtener la lista de botones y resetear clases
    const buttons = Array.from(choicesDiv.children);
    buttons.forEach(button => {
        button.classList.remove('selected');
    });

    // Aplicar clase 'selected' al botón actual
    const currentButton = buttons.find(btn => parseInt(btn.dataset.index) === selectedIndex);
    if (currentButton) {
        currentButton.classList.add('selected');
    }
}

function handleMultiplayerQuizEnd() {
    clearInterval(timerInterval);
    document.removeEventListener('keydown', keydownListener);
    
    const multiContainer = document.getElementById('multiplayer-game');
    
    let resultMessage = '';
    if (p1Score > p2Score) {
        resultMessage = `🎉 ¡El Jugador 1 GANA con ${p1Score} puntos!`;
    } else if (p2Score > p1Score) {
        resultMessage = `🎉 ¡El Jugador 2 GANA con ${p2Score} puntos!`;
    } else {
        resultMessage = `🤝 ¡Es un EMPATE! Ambos con ${p1Score} puntos.`;
    }

    if (multiContainer) {
        multiContainer.innerHTML = `
            <h2>Fin del Duelo</h2>
            <p class="final-score">${resultMessage}</p>
            <p>Jugador 1: ${p1Score} puntos | Jugador 2: ${p2Score} puntos</p>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:18px;">
              <button id="restart-btn-multi" class="cta-button">Repetir duelo</button>
              <button onclick="window.location.href='index.html'" class="cta-button">Volver al Menú Principal</button>
            </div>
        `;
        document.getElementById('restart-btn-multi')?.addEventListener('click', () => restartGame());
    }
}


// --- LÓGICA DEL TEMPORIZADOR ---

/**
 * Inicia el temporizador de cuenta regresiva.
 * @param {number} duration - Duración en segundos.
 * @param {function} onTimeout - Función a ejecutar al finalizar el tiempo.
 */
function startTimer(duration, onTimeout) {
    clearInterval(timerInterval);
    timeLeft = duration;
    // Guardar el callback actual para poder reanudar
    timerCallback = onTimeout;
    
    const timerElementId = gameConfig.mode === 'multiplayer_quiz' ? 'multi-timer-display' : 'single-timer-display';
    const timerDisplay = document.getElementById(timerElementId);

    if (timerDisplay) {
        timerDisplay.textContent = `Tiempo: ${timeLeft}s`;
    }

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timerDisplay) {
            timerDisplay.textContent = `Tiempo: ${timeLeft}s`;
            // Alerta visual de poco tiempo
            if (timeLeft <= 5 && timerDisplay.classList.contains('hidden') === false) {
                 timerDisplay.style.color = '#ff3333'; // Rojo
            } else {
                 timerDisplay.style.color = '#00ffff'; // Color normal
            }
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Ejecutar el callback guardado
            if (typeof onTimeout === 'function') onTimeout();
        }
    }, 1000);
}


// --- EXPOSICIÓN GLOBAL (Si el HTML llama a funciones directamente) ---
window.game.handleSingleQuizAnswer = handleSingleQuizAnswer;
window.game.handleCampaignChoice = handleCampaignChoice;
window.game.handleP1Answer = handleP1Answer;
window.game.handleP2Answer = handleP2Answer;
window.game.restartGame = restartGame;

// La lógica de Campaña (Role Play)
// Las funciones displayScenario, handleCampaignChoice, nextScenario están ahora dentro de la lógica de Campaign.

// La lógica del Quiz de 1 Jugador
// Las funciones displaySingleQuizQuestion, handleSingleQuizAnswer están ahora dentro de la lógica de Single Quiz.

// La lógica de Multijugador
// Las funciones initializeMultiplayerQuestions, displayMultiplayerQuestions, handleMultiplayerAnswer, attachKeydownListener, 
// handleKeydown, highlightSelection, handleMultiplayerQuizEnd
// Deben permanecer aquí.