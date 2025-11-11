// --- LÓGICA DE NAVEGACIÓN Y CONFIGURACIÓN EN INDEX.HTML ---

document.addEventListener("DOMContentLoaded", () => {
    
    // Elementos del DOM
    const startButton = document.getElementById('startButton');
    const mainMenu = document.getElementById('main-menu');
    const configSetup = document.getElementById('config-setup');
    const confirmStartButton = document.getElementById('confirmStartButton');
    const modeButtons = document.querySelectorAll('.mode-select-btn');
    const campaignRoleSelect = document.getElementById('campaign-role-select');
    const campaignRoleButtons = document.querySelectorAll('#campaign-role-select .role-select-btn');
    const isTimedCheckbox = document.getElementById('isTimed');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const volumeSlider = document.getElementById('volumeSlider');
    
    let selectedMode = 'single_quiz'; // Default mode
    let selectedRole = 'hacker'; // Default role for campaign

    // --- LÓGICA DE MÚSICA ---
    // Inicializar AudioManager para esta página
    if (window.AudioManager) {
        AudioManager.init({
            audioId: 'backgroundMusic',
            sliderId: 'volumeSlider',
            playBtnId: 'music-toggle-btn',
            unblockId: 'sound-unblock',
            unblockBtnId: 'enable-sound-btn',
            defaultVolume: parseFloat(volumeSlider.value)
        });
    }

    // Iniciar música en la primera interacción (clic en Iniciar Partida) usando AudioManager
    startButton.addEventListener('click', () => {
        // Mostrar menú de configuración y ocultar menú principal
        mainMenu.classList.add('hidden');
        configSetup.classList.remove('hidden');

        // Intentar reproducir aprovechando la interacción del usuario
        if (window.AudioManager && AudioManager.audio && AudioManager.audio.paused) {
            AudioManager.audio.play().catch(()=>{});
        }

        // Configurar la interfaz inicial
        updateConfigDisplay(selectedMode);
    });

    // --- LÓGICA DE SELECCIÓN DE MODO ---
    
    modeButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const newMode = event.target.dataset.mode;
            
            // Deseleccionar todos
            modeButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Seleccionar el nuevo
            event.target.classList.add('selected');
            selectedMode = newMode;
            
            updateConfigDisplay(newMode);
        });
    });
    
    // Lógica para seleccionar el rol en Campaña
    campaignRoleButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            selectedRole = event.target.dataset.role;
            campaignRoleButtons.forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
        });
    });

    /**
     * Actualiza la visibilidad de las opciones basadas en el modo.
     * @param {string} mode - Modo seleccionado.
     */
    function updateConfigDisplay(mode) {
        // Ocultar todas las opciones condicionales
        campaignRoleSelect.classList.add('hidden');
        isTimedCheckbox.closest('.checkbox-label').classList.remove('hidden');
        
        // Mostrar opciones específicas
        if (mode === 'campaign') {
            campaignRoleSelect.classList.remove('hidden');
            // La campaña es por diseño "sin tiempo", se oculta el checkbox
            isTimedCheckbox.closest('.checkbox-label').classList.add('hidden'); 
        } else if (mode === 'single_quiz' || mode === 'multi_quiz') {
            // El modo quiz puede ser contrarreloj
            isTimedCheckbox.closest('.checkbox-label').classList.remove('hidden');
        }
    }
    
    // Inicializar la selección de rol por defecto
    document.getElementById('singleQuizBtn').click();
    document.querySelector('#campaign-role-select button[data-role="hacker"]').classList.add('selected');


    // --- CONFIRMAR E INICIAR JUEGO ---

    confirmStartButton.addEventListener('click', () => {
        const config = {
            mode: selectedMode,
            isTimed: false,
            role: null,
            timeLimit: 30 // 30 segundos por pregunta para Contrarreloj
        };

        if (selectedMode === 'campaign') {
            config.role = selectedRole;
        } else if (isTimedCheckbox.checked) {
            config.isTimed = true;
        }
        
    // Guardar el volumen de la música para usarlo en la siguiente página
    try { sessionStorage.setItem('initialVolume', String(window.AudioManager ? AudioManager.getVolume() : 0.5)); } catch(e){}
        
        startGame(config);
    });
});

/**
 * Almacena la configuración en sessionStorage y navega a la página del juego.
 * @param {object} config - Objeto de configuración de la partida.
 */
function startGame(config) {
    try {
        sessionStorage.setItem('gameConfig', JSON.stringify(config));
        window.location.href = 'game.html';
    } catch (e) {
        console.error("Error al guardar la configuración o navegar:", e);
        document.getElementById('error-message').innerText = "Error interno al iniciar el juego.";
    }
}