(function(){
  const STORAGE_KEY = 'initialVolume';
  window.AudioManager = {
    audio: null,
    slider: null,
    playBtn: null,
    volumeToggleBtn: null,
    volumeIconUnmuted: null,
    volumeIconMuted: null,
    previousVolume: 0.5, // Guardar el volumen anterior al mutear
    init(opts = {}){
      const { audioId = 'backgroundMusic', sliderId = 'volumeSlider', playBtnId = 'music-toggle-btn', unblockId, unblockBtnId, src } = opts;
      let audio = document.getElementById(audioId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = audioId;
        audio.loop = true;
        if (src) audio.src = src;
        document.body.appendChild(audio);
      }
      this.audio = audio;

      // Volumen desde sessionStorage
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this.audio.volume = parseFloat(stored);
      } else if (typeof opts.defaultVolume !== 'undefined') {
        this.audio.volume = opts.defaultVolume;
      } else if (typeof this.audio.volume === 'undefined') {
        this.audio.volume = 0.5;
      }

      // Guardar volumen anterior
      this.previousVolume = this.audio.volume;

      // Slider
      const slider = document.getElementById(sliderId);
      this.slider = slider;
      if (slider) {
        slider.value = String(this.audio.volume);
        slider.addEventListener('input', (e) => {
          const v = parseFloat(e.target.value);
          this.audio.volume = v;
          this.previousVolume = v; // Actualizar volumen anterior cuando el usuario ajusta manualmente
          try { sessionStorage.setItem(STORAGE_KEY, String(v)); } catch(e){}
          this.updateVolumeIcon(); // Actualizar icono
        });
      }

      // Iconos de volumen
      this.volumeIconUnmuted = document.getElementById('volume-icon-unmuted');
      this.volumeIconMuted = document.getElementById('volume-icon-muted');

      // Botón de toggle de volumen (mute/unmute)
      const volumeToggleBtn = document.getElementById('volume-toggle-btn');
      this.volumeToggleBtn = volumeToggleBtn;
      if (volumeToggleBtn) {
        volumeToggleBtn.addEventListener('click', () => {
          if (this.audio.volume > 0) {
            // Mutear: guardar volumen actual y establecer a 0
            this.previousVolume = this.audio.volume;
            this.audio.volume = 0;
          } else {
            // Desmutear: volver al volumen anterior
            this.audio.volume = this.previousVolume;
          }
          
          // Actualizar slider y storage
          if (this.slider) {
            this.slider.value = String(this.audio.volume);
          }
          try { sessionStorage.setItem(STORAGE_KEY, String(this.audio.volume)); } catch(e){}
          this.updateVolumeIcon(); // Actualizar icono
        });
      }

      // Play/Pause button (si existe, para compatibilidad hacia atrás)
      const playBtn = document.getElementById(playBtnId);
      this.playBtn = playBtn;
      if (playBtn) {
        // initialize text
        playBtn.textContent = this.audio.paused ? 'Reanudar música' : 'Pausar música';
        playBtn.addEventListener('click', () => {
          if (this.audio.paused) {
            this.audio.play().catch(()=>{});
          } else {
            this.audio.pause();
          }
          playBtn.textContent = this.audio.paused ? 'Reanudar música' : 'Pausar música';
        });
      }

      // Attempt autoplay
      this.audio.play().then(()=>{}).catch(()=>{
        if (unblockId) {
          const unblock = document.getElementById(unblockId);
          if (unblock) unblock.style.display = 'block';
        }
        if (unblockBtnId) {
          const btn = document.getElementById(unblockBtnId);
          if (btn) {
            btn.addEventListener('click', () => {
              this.audio.play().then(()=>{
                const unblock = document.getElementById(unblockId);
                if (unblock) unblock.style.display = 'none';
                if (this.playBtn) this.playBtn.textContent = 'Pausar música';
              }).catch(()=>{});
            });
          }
        }
      });

      // sync button text on events
      this.audio.addEventListener('play', ()=>{ if (this.playBtn) this.playBtn.textContent = 'Pausar música'; });
      this.audio.addEventListener('pause', ()=>{ if (this.playBtn) this.playBtn.textContent = 'Reanudar música'; });

      // Actualizar icono inicial
      this.updateVolumeIcon();

      return this;
    },
    updateVolumeIcon(){
      if (this.audio.volume > 0) {
        if (this.volumeIconUnmuted) this.volumeIconUnmuted.style.display = 'block';
        if (this.volumeIconMuted) this.volumeIconMuted.style.display = 'none';
      } else {
        if (this.volumeIconUnmuted) this.volumeIconUnmuted.style.display = 'none';
        if (this.volumeIconMuted) this.volumeIconMuted.style.display = 'block';
      }
    },
    toggle(){ if (!this.audio) return; if (this.audio.paused) this.audio.play().catch(()=>{}); else this.audio.pause(); },
    setVolume(v){ if (!this.audio) return; this.audio.volume = v; this.previousVolume = v; try{ sessionStorage.setItem(STORAGE_KEY, String(v)); }catch(e){} this.updateVolumeIcon(); },
    getVolume(){ return this.audio ? this.audio.volume : 0; }
  };
})();
