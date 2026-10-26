# MEGAHERTZ — ESTADO GUARDADO / CONTINUIDAD

Actualizado el 25 de octubre de 2026 (Argentina). Este registro reemplaza el estado preliminar anterior; sus versiones quedan conservadas en GitHub.

## Fuente de verdad y punto de recuperación

- Repositorio: `sebastiansopelana-art/ruidosmolestos`.
- Rama de trabajo y publicación: **`taller-megahertz`**, no `main`.
- Último commit funcional y comprobado online antes de guardar esta bitácora: **`e27a4a2fbb813a0b6aa8771a8e406fd09638cbea`**.
- Consola pública comprobada: https://www.megahertz.com.ar/aire/rmr-tecnology?v=pisadores-e27a4a2
- Archivo principal: `aire/rmr-tecnology.html`.
- Mantener el origen con **www**: los audios, ajustes y registros del navegador se almacenan por origen. El repositorio no contiene los audios locales del usuario.
- El código está comprometido en GitHub y la última versión funcional se verificó en el sitio público. Las modificaciones futuras deben comprobar también el despliegue efectivo.

## Identidad y diseño aprobados

- MEGAHERTZ — **AUTOMATIC RADIO SYSTEM**.
- Firma: **Powered by Sebastián Sopelana**, respetando apellido y acento.
- Logo `aire/megahertz-neon-animado.svg`: un pulso eléctrico comienza en M, recorre MEGAHERTZ hasta Z, desciende y escribe la firma con punta luminosa. Firma cian intensa y legible; se esfuma al terminar. Conservar la animación unificada aprobada.
- Mantener geometría, colores y funciones aprobados; no rediseñar la consola para corregir detalles.
- Vúmetros digitales L/R de la salida real, retención de pico y aviso de clip.
- Visor profesional del reproductor: archivo actual, estado, posición, tiempo transcurrido, restante y siguiente audio.
- Meteorología con pronóstico semanal y Centro Informativo debajo de los controles publicitarios. Las noticias usan RSS directos y caché de servidor; se comprobaron 30 titulares en producción.

## Funciones de Studio incorporadas

Commit base de esta integración: `ece512fd23de425e481e3110767c05ea5e684855`.

1. **Aire y preescucha:** AIR usa una única salida Web Audio. CUE usa elementos separados y requiere otra salida física. Si falta la salida o corresponde al mismo dispositivo, la preescucha se bloquea, sin caer sobre AIR.
2. **Contabilización:** registros separados por aviso y tanda; distinguir completos, interrumpidos y fallidos. Un aviso saltado, silenciado o cortado no cuenta como completo. Las preescuchas no se contabilizan.
3. **Eventos e institucionales:** horarios, días, fechas de vigencia, prioridad, hora exacta/fin de audio y espera máxima. Pendientes persistentes; un evento que estaba ejecutándose al recargar se recupera como interrumpido. Los vencidos requieren reemisión explícita. Zona de emisión predeterminada: `America/Argentina/Buenos_Aires`.
4. **Registro e informes:** IndexedDB persistente, filtros y exportación CSV detallada y publicitaria, con completos, interrumpidos, fallidos y segundos registrados/completos.
5. **Audio:** fundidos, solapamiento musical, pisador manual, institucional sobre música con atenuación, ataque/recuperación, AGC RMS, ganancia general y compresión de picos. No es limitación true peak ni certificación de loudness.
6. **Configuración:** borrador común con Guardar/Cancelar para ajustes, tandas, institucionales, eventos, idioma y selección meteorológica. Los errores de escritura intentan restaurar bibliotecas y preferencias anteriores.
7. **Permisos locales:** administrador/operador con verificador PBKDF2 y sal. No hay contraseña predefinida. El dueño establece su clave en Configuración → Permisos. Esto protege controles de ese navegador, no constituye autenticación de usuarios en servidor.
8. **Respaldos completos `.mhbackup`:** configuración guardada, playlists, audios, tandas, institucionales, eventos, estado y registro. Deduplicación y SHA-256 para integridad. Restauración preparada hasta Guardar, con emisión detenida y reversión ante fallas; conserva la contraseña actual. Se admite importar JSON de configuración anterior.
9. Web Locks limita la emisión y programación a una pestaña por origen en navegadores compatibles. La consola debe permanecer abierta; no hay motor de eventos ejecutándose en servidor.

## Pisadores — última versión aprobada

Historial: `5664df2` → `307f10e` → **`e27a4a2`**.

- Fila entre la consola superior y las playlists, desde el borde de Música Automática hasta el borde final de Meteorología.
- Mostrar tantos botones como entren en una sola fila. En el ancho verificado entran **11**; la cantidad se ajusta al espacio disponible.
- **Todos del mismo ancho y de punta a punta**: se reparten el ancho sobrante por igual, sin huecos en los extremos; quedan únicamente los bordes de 1 px. Separación uniforme de 6 px entre botones. No volver a usar `space-between` ni anchos fijos que dejen márgenes vacíos.
- Mantener siempre el rótulo visible **PISADOR 1, PISADOR 2, etc.**, incluso después de cargar un archivo.
- El nombre original completo del audio aparece al apoyar el mouse (`title`); no reemplaza el rótulo del botón.
- Arrastrar un audio sobre un botón **lo guarda automáticamente**. Soltar otro sobre el mismo botón **lo reemplaza y guarda**. Se recuperan al volver a abrir ese navegador.
- Un clic reproduce; otro clic en el mismo botón detiene. Disparar otro pisador detiene el anterior. Atajos numéricos 1–9, sin interceptar escritura ni diálogos.
- Mientras realmente suena, el botón usa la misma capa luminosa y LED que AUTOMÁTICO: `mh-mode-flash-compact` / `mh-mode-led-compact`, 1,35 s, `steps(1,end)`; movimiento reducido: 2,5 s.
- Los pisadores salen por AIR, con atenuación de la música y registro tipo `cart`. No son preescucha y no alteran las playlists.
- Cargar/reemplazar requiere administrador. Operadores pueden disparar audios ya cargados.
- Los archivos de los pisadores se guardan en `megahertz-studio-v3`, tabla `meta`, clave **`cart-pads-v1`**, como un arreglo de objetos `{name,file}`. Esta tabla ya forma parte del respaldo completo. Conservar las posiciones existentes al ampliar o modificar la fila.
- El conjunto conserva posiciones hasta 64; sólo se muestran las que caben en el ancho actual.

## Archivos relevantes

- `aire/rmr-tecnology.html`: consola, transporte e integración.
- `aire/megahertz-studio-core.js` y `aire/estetica/megahertz-studio-core.css`: servicios de Studio y configuración.
- `aire/megahertz-pisadores.js` y `aire/estetica/megahertz-pisadores.css`: carga, persistencia, emisión y presentación de los pisadores.
- `aire/megahertz-weather.js`, `aire/megahertz-i18n.js`: integración de zona horaria y configuración por borrador.
- `functions/api/megahertz-news.js`, `aire/estetica/megahertz-news-editorial.css`: noticias RSS/caché y presentación.
- `tests/megahertz-studio-core.test.cjs`, `tests/megahertz-pisadores.test.cjs`, `tests/MEGAHERTZ-STUDIO.md`: pruebas y notas técnicas.

## Validaciones realizadas

- Diez pruebas automatizadas del núcleo: zona horaria, recuperación, vencimiento, prioridades, CUE bloqueado ante alias de AIR, cómputo publicitario, contraseñas, integridad/corrupción de respaldos, grafo de audio y avisos saltados/silenciados.
- Prueba de pisadores mediante su manejador de drop: guardar, reemplazar, recuperar al reabrir, mantener etiqueta/título, rechazar cambios de operador y conservar audio anterior ante error de almacenamiento.
- Navegador con WAV de ensayo: reproducción, visor, pisador manual con **12 dB** de atenuación medidos, tanda completa y tanda interrumpida, CSV publicitario e institucional programado.
- Respaldo online descargado con audio incluido, SHA-256 verificado y restaurado desde la propia consola; audio restaurado reproducido.
- Pisador cargado y recuperado tras recarga; reproducción y detención comprobadas. Etiqueta fija y título de archivo verificados.
- Animación del pisador en emisión comprobada por estilo calculado: mismo nombre y duración de animación que AUTOMÁTICO.
- Última fila publicada medida: 11 botones de aproximadamente 115,45 px; hueco izquierdo y derecho de **1 px**, correspondiente al borde. Sin espacios laterales interiores.
- La separación física entre dos salidas requiere hardware con dos dispositivos y debe probarse en la estación real; el entorno remoto verificó el bloqueo seguro y las reglas de enrutamiento.

## Criterio para continuar

- Conservar lo aprobado; cambios concretos en la rama real, publicación y enlace directo al terminar.
- No presentar maquetas cuando se pide modificar el software.
- Antes de escribir, revisar el HEAD remoto para preservar cambios concurrentes.
- Verificar en navegador la versión desplegada, no sólo el commit de GitHub.
- El historial de Git guarda el código y esta bitácora. Los audios y datos locales del usuario se respaldan desde Configuración → Respaldos en su propio navegador; no confundir ambos respaldos.


## Reparaciones posteriores a la auditoría

Se corrigieron F01–F22. Detalle y límites de verificación en tests/MEGAHERTZ-REPARACIONES-2026-10-25.md. Batería reproducible de 158 casos aprobados. Se conserva el diseño y la disposición de pisadores.
