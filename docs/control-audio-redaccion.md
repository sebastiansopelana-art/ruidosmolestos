# Control de audio en Redacción

Acceso: Redacción → REVISAR AUDIO. Conserva el libreto y los controles del teleprompter.

- Carga las pistas y versiones del manifiesto del programa seleccionado.
- Consulta títulos y canales con YouTube oEmbed. Un error de oEmbed queda como «sin comprobar», nunca como video eliminado.
- Vista previa mediante el reproductor oficial de YouTube, iniciada por el usuario. Registra avance superior a dos segundos, sin equipararlo con audibilidad o calidad.
- Enlace directo para abrir el video en la sesión de YouTube/Premium del navegador.
- Medición real de archivos locales con Web Audio y un worker: duración, canales, pico y RMS en dBFS, margen pico/RMS, silencios bajo −55 dBFS, muestras próximas al máximo, balance y correlación estéreo. Umbrales orientativos, sin LUFS, SNR, diagnóstico de distorsión ni bitrate original inventado.
- Las métricas nunca aprueban una pista. La decisión explícita «Aprobado por escucha» se guarda aparte. Una nueva medición vuelve la decisión a pendiente.
- Almacenamiento por programa y videoId en localStorage. No es almacenamiento compartido en servidor. Exportación/importación JSON para continuidad entre equipos. Informes importados marcados como evidencia no revalidada. Los archivos de audio permanecen en el dispositivo.
- Límite de archivos: 64 MB, 15 minutos y 8 canales. El muestreo indicado es el del audio decodificado por el navegador, no el original del archivo.

## Uso por el asistente

Con la página y el programa cargados, WebMCP registra `rm_audio_review_status` y `rm_audio_review_check_sources`, si el navegador lo admite. El segundo consulta y guarda metadatos, no analiza audio de YouTube ni otorga aprobaciones. El asistente debe distinguir evidencia propia, opinión manual y evidencia importada.

YouTube Premium es una condición de la cuenta del usuario. Esta integración no asegura un stream Premium ni puede extraer muestras del iframe. La resolución de imagen no certifica la fidelidad del audio. Para medir audio hacen falta archivos accesibles al analizador; para juicio perceptual hace falta escucha.

## Comprobación

`node --test tests/audio-quality.test.cjs`: 5 pruebas sobre señales de nivel conocido, silencio interno frente a bordes, antífase/canal mudo/picos, muestras inválidas y semántica de errores de oEmbed.

## Verificación publicada — 4 de noviembre de 2026

Cloudflare Pages megahertz completó el despliegue. En la sesión autenticada de Redacción se comprobó el botón, la carga de 16 temas del programa 54 y la vista previa oficial de YouTube. Se invocó WebMCP y las 16 consultas de oEmbed devolvieron título y canal. Se rechazaron parámetros inesperados. Ninguna pista se aprobó automáticamente.

Prueba de archivo local: el selector de archivos del navegador remoto no devolvió el evento necesario para adjuntar el WAV de referencia. No se completó la prueba de decodificación y worker de extremo a extremo; sólo se verificó el cálculo con las pruebas automatizadas. El juicio de calidad perceptual y el audio de YouTube siguen pendientes de escucha.

Sesión de YouTube Premium observada; el menú de Porch Swing Slidin’ ofrece resoluciones hasta 1080p, sin medida de fidelidad sonora. No confundir resolución con calidad de grabación.
