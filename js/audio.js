(function(){
  const STORAGE_KEY = 'initialVolume';
  window.AudioManager = {
    audio: null,
    slider: null,
    playBtn: null,
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

      // Slider
      const slider = document.getElementById(sliderId);
      this.slider = slider;
      if (slider) {
        slider.value = String(this.audio.volume);
        slider.addEventListener('input', (e) => {
          const v = parseFloat(e.target.value);
          this.audio.volume = v;
          try { sessionStorage.setItem(STORAGE_KEY, String(v)); } catch(e){}
        });
      }

      // Play/Pause button
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

      return this;
    },
    toggle(){ if (!this.audio) return; if (this.audio.paused) this.audio.play().catch(()=>{}); else this.audio.pause(); },
    setVolume(v){ if (!this.audio) return; this.audio.volume = v; try{ sessionStorage.setItem(STORAGE_KEY, String(v)); }catch(e){} },
    getVolume(){ return this.audio ? this.audio.volume : 0; }
  };
})();
