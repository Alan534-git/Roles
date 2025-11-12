// Carga fragmentos HTML (header/footer) y mejora la UI del control de volumen
document.addEventListener('DOMContentLoaded', async () => {
    // Helper para cargar un fragmento y ponerlo en el placeholder
    async function loadFragment(url, placeholderId) {
        try {
            const resp = await fetch(url);
            if (!resp.ok) return false;
            const html = await resp.text();
            const placeholder = document.getElementById(placeholderId);
            if (placeholder) {
                placeholder.outerHTML = html;
                return true;
            }
            return false;
        } catch (e) {
            console.warn('No se pudo cargar fragmento', url, e);
            return false;
        }
    }

    // Cargar header y footer (rutas relativas) y esperar a que existan en el DOM
    await loadFragment('partials/header.html', 'site-header-placeholder');
    await loadFragment('partials/footer.html', 'site-footer-placeholder');

    // Mejora del control de volumen: compact widget que expande el slider
    const volContainer = document.getElementById('volume-control-container');
    if (!volContainer) return;

    // Crear wrapper y panel si no existe
    volContainer.classList.add('volume-widget');

    const volToggle = document.getElementById('volume-toggle-btn');
    // Prefer the range input inside the container; fallbacks to known IDs on index/game
    const slider = volContainer.querySelector('input[type="range"]') || document.getElementById('volumeSliderGame') || document.getElementById('volumeSlider');

    // Envolver el slider en un panel desplegable para móvil/desktop
    const panel = document.createElement('div');
    panel.className = 'volume-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-hidden', 'true');
    panel.style.display = 'none';

    if (slider) {
        // Mover el slider dentro del panel
        slider.parentNode && panel.appendChild(slider);
    }
    // (no añadir texto visible; el panel es auto-descriptivo mediante aria-labels)

    volContainer.appendChild(panel);

    // Function to open/close
    function setExpanded(expanded) {
        if (!panel) return;
        if (expanded) {
            panel.style.display = '';
            panel.setAttribute('aria-hidden', 'false');
            volToggle.setAttribute('aria-expanded', 'true');
            // focus the slider for keyboard users
            const s = panel.querySelector('input[type=range]');
            if (s) s.focus();
        } else {
            panel.style.display = 'none';
            panel.setAttribute('aria-hidden', 'true');
            volToggle.setAttribute('aria-expanded', 'false');
        }
    }

    // Initialize state
    setExpanded(false);

    // Toggle on click / keyboard
    volToggle.addEventListener('click', (e) => {
        const expanded = volToggle.getAttribute('aria-expanded') === 'true';
        setExpanded(!expanded);
    });
    volToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            volToggle.click();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // increase volume
            if (slider) slider.value = Math.min(1, parseFloat(slider.value) + 0.05);
            slider && slider.dispatchEvent(new Event('input'));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (slider) slider.value = Math.max(0, parseFloat(slider.value) - 0.05);
            slider && slider.dispatchEvent(new Event('input'));
        }
    });

    // Click fuera to close
    document.addEventListener('click', (ev) => {
        if (!volContainer.contains(ev.target)) {
            setExpanded(false);
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') setExpanded(false);
    });

    // Persist volume value in sessionStorage so it's consistent across pages
    if (slider) {
        const saved = sessionStorage.getItem('initialVolume');
        if (saved !== null) slider.value = saved;
        slider.addEventListener('input', (e) => {
            try { sessionStorage.setItem('initialVolume', String(e.target.value)); } catch(e){}
        });
    }

    // Improve touch target for mobile by enlarging the toggle hit area
    volToggle.style.padding = '8px';

    // Accessibility tweak: ensure toggle has aria-label
    if (!volToggle.getAttribute('aria-label')) volToggle.setAttribute('aria-label', 'Silenciar o activar sonido y mostrar control de volumen');

    // Add a small hint tooltip for keyboard users
    volToggle.title = 'Silenciar/Activar - pulsa para mostrar control de volumen';

    // If the game uses AudioManager, keep icons updated when volume/muted changes
    function refreshIconsFromAudio(audio) {
        const unmuted = document.getElementById('volume-icon-unmuted');
        const muted = document.getElementById('volume-icon-muted');
        if (!audio) return;
        const isMuted = !!audio.muted || audio.volume === 0;
        if (unmuted) unmuted.style.display = isMuted ? 'none' : 'block';
        if (muted) muted.style.display = isMuted ? 'block' : 'none';
    }

    // Observe global gameMusic if set later by game.js
    if (window.game && window.game._music) refreshIconsFromAudio(window.game._music);
    // Poll for the audio object (lightweight) in case it is created after partials
    let attempts = 0;
    const poll = setInterval(() => {
        attempts++;
        // support different audio element IDs: gameMusicAudio (game), backgroundMusic (index) or AudioManager
        const audio = document.getElementById('gameMusicAudio') || document.getElementById('backgroundMusic') || (window.AudioManager && AudioManager.audio);
        if (audio) {
            refreshIconsFromAudio(audio);
            // update when muted property changes
            audio.addEventListener('volumechange', () => refreshIconsFromAudio(audio));
            clearInterval(poll);
        }
        if (attempts > 50) clearInterval(poll);
    }, 120);

    // ===== Pause overlay (contiene Ayuda) =====
    // After header was loaded, wire up Stop button (help is only inside pause overlay)
    const stopBtn = document.getElementById('stop-game-btn');

    // Hide or show elements that are page-specific (data-show-on)
    const isGamePage = !!document.getElementById('game-container') || !!document.getElementById('campaign-game') || location.pathname.includes('game.html');
    document.querySelectorAll('[data-show-on]').forEach(el => {
        const target = el.dataset.showOn; // e.g. 'game' or 'index'
        if (target === 'game' && !isGamePage) el.style.display = 'none';
        if (target === 'index' && isGamePage) el.style.display = 'none';
    });

    // Create pause overlay if not present (this overlay will include a help section)
    function ensurePauseOverlay() {
        if (document.getElementById('game-pause-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'game-pause-overlay';
        overlay.className = 'site-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-hidden', 'true');
                overlay.innerHTML = `
                        <div class="modal-backdrop" data-modal="pause">
                            <div class="modal-card" role="document">
                                <h2>Partida en pausa</h2>
                                <div class="modal-body pause-main">
                                    <p>La partida está en pausa. Pulsa el mismo botón para reanudar, reiniciar o volver al menú principal.</p>
                                </div>
                                <div class="modal-body help-section" style="display:none;">
                                    <h3>Ayuda</h3>
                                    <p>Usa W/S (Jugador 1), Flechas (Jugador 2) para navegar. ESPACIO/ENTER para seleccionar. Pulsa F1 para abrir/cerrar esta pantalla de ayuda.</p>
                                </div>
                                                <div class="modal-actions">
                                                    <button id="resume-game" class="control-btn">Reanudar</button>
                                                    <button id="restart-game" class="control-btn">Reiniciar</button>
                                                    <button id="help-toggle" class="control-btn">Ayuda</button>
                                                    <button id="return-to-menu" class="control-btn">Volver al menú</button>
                                                </div>
                            </div>
                        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#resume-game').addEventListener('click', () => togglePause(false));
        overlay.querySelector('#restart-game').addEventListener('click', () => {
            // dispatch restart event for game logic
            window.dispatchEvent(new CustomEvent('game:restart'));
            togglePause(false);
        });
        // Mostrar Ayuda dentro del mismo overlay
        overlay.querySelector('#help-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            // Show help section
            const helpSec = overlay.querySelector('.help-section');
            const mainSec = overlay.querySelector('.pause-main');
            if (helpSec && helpSec.style.display === 'none') {
                helpSec.style.display = '';
                mainSec.style.display = 'none';
                // focus first focusable in help (if any)
                const first = helpSec.querySelector('button, a, [tabindex]');
                if (first) first.focus();
            } else {
                helpSec.style.display = 'none';
                mainSec.style.display = '';
            }
        });
        // Volver al menú principal (con confirmación)
        overlay.querySelector('#return-to-menu').addEventListener('click', (e) => {
            e.preventDefault();
            const leave = window.confirm('¿Quieres volver al menú principal? Se perderá el progreso actual de la partida.');
            if (leave) {
                window.location.href = 'index.html';
            } else {
                // Mantener overlay abierto y devolver foco a Reanudar
                const resume = overlay.querySelector('#resume-game');
                if (resume) resume.focus();
            }
        });

        // Keyboard navigation inside the pause overlay: arrow keys move between action buttons
        overlay.addEventListener('keydown', (ev) => {
            const isOpen = overlay.getAttribute('aria-hidden') === 'false';
            if (!isOpen) return;
            const actionButtons = Array.from(overlay.querySelectorAll('.modal-actions .control-btn'));
            if (!actionButtons.length) return;
            const current = document.activeElement;
            const idx = actionButtons.indexOf(current);
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
                ev.preventDefault();
                const next = actionButtons[(idx + 1) % actionButtons.length];
                if (next) next.focus();
            } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const prev = actionButtons[(idx - 1 + actionButtons.length) % actionButtons.length];
                if (prev) prev.focus();
            } else if (ev.key === 'Home') {
                ev.preventDefault();
                actionButtons[0].focus();
            } else if (ev.key === 'End') {
                ev.preventDefault();
                actionButtons[actionButtons.length - 1].focus();
            }
        });
        overlay.querySelector('.modal-backdrop').addEventListener('click', (ev) => {
            if (ev.target === overlay.querySelector('.modal-backdrop')) togglePause(false);
        });
    }

    // Toggle pause overlay; optional section: 'help' to show help content
    // Also installs a document-level handler while paused to prevent arrow keys from scrolling the page.
    let _pauseDocHandler = null;
    function togglePause(open, section) {
        ensurePauseOverlay();
        const overlay = document.getElementById('game-pause-overlay');
        const isOpen = overlay.getAttribute('aria-hidden') === 'false';
        const shouldOpen = (typeof open === 'boolean') ? open : !isOpen;
        overlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
        overlay.style.display = shouldOpen ? '' : 'none';
        if (stopBtn) stopBtn.setAttribute('aria-pressed', shouldOpen ? 'true' : 'false');

        // show requested section
        const helpSec = overlay.querySelector('.help-section');
        const mainSec = overlay.querySelector('.pause-main');
        if (shouldOpen && section === 'help') {
            if (helpSec) helpSec.style.display = '';
            if (mainSec) mainSec.style.display = 'none';
        } else {
            if (helpSec) helpSec.style.display = 'none';
            if (mainSec) mainSec.style.display = '';
        }

        // dispatch custom events so game logic can respond
        if (shouldOpen) {
            window.dispatchEvent(new CustomEvent('game:pause'));
            // Prevent arrow keys from scrolling the document while paused.
            if (!_pauseDocHandler) {
                _pauseDocHandler = function (ev) {
                    const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '];
                    if (keys.includes(ev.key)) {
                        // Allow if focus is on an actual input or editable element
                        const el = document.activeElement;
                        const editable = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
                        if (editable) return;
                        ev.preventDefault();
                        ev.stopPropagation();
                    }
                };
                document.addEventListener('keydown', _pauseDocHandler, true);
            }
        } else {
            window.dispatchEvent(new CustomEvent('game:resume'));
            if (_pauseDocHandler) {
                document.removeEventListener('keydown', _pauseDocHandler, true);
                _pauseDocHandler = null;
            }
        }
    }

    // Wire the stop button if it exists (help is accessed only via pause overlay)
    if (stopBtn) {
        stopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            togglePause();
        });
    }

    // Keyboard shortcuts: F1 opens pause with help; Escape toggles pause (close if open, open if closed)
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'F1') {
            if (!isGamePage) return; // F1 only opens help/pause inside the game
            ev.preventDefault();
            togglePause(true, 'help');
        } else if (ev.key === 'Escape') {
            // If pause overlay is open, close it. If closed and we're on the game page, open it.
            const pause = document.getElementById('game-pause-overlay');
            const isOpen = pause && pause.getAttribute('aria-hidden') === 'false';
            if (isOpen) {
                togglePause(false);
            } else if (isGamePage) {
                // prevent default to avoid interfering with browser behavior and other listeners
                ev.preventDefault();
                togglePause(true);
            }
        }
    });
});
