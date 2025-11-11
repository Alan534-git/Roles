# Guía de Errores en la Consola del Navegador

Si ves estos errores en la consola (F12), es **normal y esperado**. Aquí está qué significan:

## 1. "Música de juego no pudo reproducirse automáticamente"
```
game.js:201 Música de juego no pudo reproducirse automáticamente: play() failed because the user didn't interact with the document first.
```

**¿Por qué ocurre?**
- Los navegadores modernos requieren interacción del usuario (clic, tecla) para reproducir audio automáticamente por razones de privacidad.

**¿Qué hacer?**
- ✅ Verás un aviso amarillo/verde en la esquina inferior derecha: **"🔊 Activa el sonido"**
- Haz clic en el botón "Activar música"
- La música se reproducirá normalmente

**Alternativa:**
- Haz clic en cualquier parte del juego o presiona una tecla → la música también se puede activar así.

---

## 2. "No se encontró gameConfig en sessionStorage"
```
game.js:95 No se encontró gameConfig en sessionStorage. Volviendo al menú.
```

**¿Por qué ocurre?**
- Abriste `game.html` **directamente** sin pasar por el menú de `index.html`
- La configuración de la partida se pasa entre páginas usando `sessionStorage`

**¿Qué hacer?**
- ✅ **Acceso Normal**: Ve a `index.html`, haz clic en "INICIAR PARTIDA", configura el modo → se abre `game.html` correctamente
- ✅ **Acceso Directo**: Si abre `game.html` directamente, usará configuración por defecto (Quiz 1 Jugador, sin tiempo)
- El juego **funciona igual**, solo con valores predeterminados

---

## 3. "Failed to load resource: the server responded with a status of 404 (Not Found) /favicon.ico"
```
/favicon.ico:1  Failed to load resource: the server responded with a status of 404 (Not Found)
```

**¿Por qué ocurre?**
- El navegador intenta cargar un icono (`favicon.ico`) que no existe en el proyecto

**¿Qué hacer?**
- ✅ **Ignorar**: Este error es completamente inofensivo, no afecta al juego
- Opcional: crear un archivo `favicon.ico` en la raíz del proyecto si lo deseas

---

## Resumen
| Error | Gravedad | Acción |
|-------|----------|--------|
| Música bloqueada | 🟡 Menor | Haz clic en "Activar música" |
| gameConfig no existe | 🟢 Muy Menor | Funciona con config por defecto |
| favicon.ico no existe | 🟢 Insignificante | Ignorar |

---

## Cómo acceder correctamente

### ✅ CORRECTO: Desde el menú
1. Abre `http://localhost/Escuela/6\ c/Seguridad\ informática/Roles/index.html`
2. Haz clic en "INICIAR PARTIDA"
3. Configura el modo y opciones
4. Haz clic en "Confirmar e Iniciar"
5. Se abre `game.html` con la configuración guardada

### ⚠️ ACCESO DIRECTO: Funciona pero con valores por defecto
- Abre `http://localhost/Escuela/6\ c/Seguridad\ informática/Roles/game.html`
- Usa configuración por defecto (single_quiz, sin tiempo)
- No verás errores críticos, solo avisos

---

## Si quieres desactivar los avisos (desarrollo avanzado)
- En `game.js`, cambiar `console.log()` a `console.debug()` para mensajes menos visibles
- En `game.html`, comentar la sección `#sound-unblock-game` si quieres ocultar el aviso
