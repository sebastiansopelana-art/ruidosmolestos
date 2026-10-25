# MEGAHERTZ — ESTADO GUARDADO / CONTINUIDAD
Fecha: 25 de octubre de 2026 (Argentina).

## Fuente de verdad y recuperación
- Repositorio: `sebastiansopelana-art/ruidosmolestos`.
- Rama de trabajo / despliegue: `taller-megahertz`. **No confundir con `main`**.
- Web: https://megahertz.com.ar/
- Consola: https://megahertz.com.ar/aire/rmr-tecnology.html
- Demostración: https://megahertz.com.ar/demo.html
- La rama contiene el código comprometido en GitHub; la publicación efectiva en Cloudflare se debe comprobar aparte.

## Estado comprobado en GitHub al preparar este registro
- `aire/megahertz-neon-animado.svg` — blob SHA `60e4326c5f5cc5ac16c16fdacbdf21fd173494d4`, 84.002 caracteres.
- `aire/rmr-tecnology.html` — blob SHA `3289a1c66211d4dc7a9edaf4ba93c53f60bf8ca1`, 212.853 caracteres.
- `demo.html` — blob SHA `33e721b27c84c452626b75abf96223e73c1b9570`, 207.672 caracteres.

Estos hashes identifican versiones exactas y permiten comparar cambios futuros. No son commits ni prueban que Cloudflare haya desplegado.

## Decisiones de identidad visual aprobadas
- Marca: MEGAHERTZ.
- Descriptor: **AUTOMATIC RADIO SYSTEM** (no «RADIO AUTOMATION»).
- Firma: **Powered by Sebastián Sopelana** (escritura correcta, con acento).
- Ubicación: firma debajo del logo, alineada a la derecha.
- Un solo pulso eléctrico desde la **M** hasta la **Z** y, sin interrupción visual, hacia la firma.
- La firma debe aparecer como escrita por una **punta luminosa**, no como placa rectangular ni simple aparición de texto.
- Misma calidad, velocidad, color y comportamiento eléctrico en todo el recorrido.
- Legibilidad elevada: firma reconocible incluso al tamaño real en consola; mantener visible la firma terminada por un momento.
- Respetar dimensiones y geometría existentes de la consola y reproductores.

## Estado actual del logo
El archivo SVG verificado al guardar contiene `#electricRoute`, `#pulseMask`, `#autographInk` y una `animateMotion` vinculada al mismo recorrido. Esto reemplaza implementaciones anteriores con animaciones independientes. **Conservar esta versión como punto de partida**; revisar en navegador si el recorrido y la firma se ven bien antes de nuevos cambios.

## Alcance funcional existente del proyecto
- MegaHertz es un software de automatización radial con reproductores, playlists, programación de tandas, controles de operación manual/automática, paneles informativos y meteorología.
- Mantener drag & drop, controles de reproducción, tandas, ajustes, y simetría visual. No rehacer el diseño general para corregir detalles.
- El usuario quiere modificaciones en el repositorio real y su publicación, con enlace de comprobación; no maquetas ni imágenes cuando pide cambiar el software.
- Para respaldar nuevas versiones, crear commits pequeños y documentar archivos afectados.

## Pendientes de validación
1. Abrir la consola y demo publicadas y comparar el SVG mostrado con el guardado.
2. Confirmar que el rayo empieza en M, pasa por Z y continúa hasta la firma en **una sola animación**.
3. Confirmar que la firma y el texto superior son legibles y que el brillo no se ve borroso.
4. Confirmar que las dimensiones originales no se alteraron.
5. Verificar publicación efectiva en Cloudflare y que la caché sirva la última versión.
6. Antes de una nueva intervención, conservar una referencia exacta al commit/base y evitar sobrescribir la versión unificada actual.

## Criterio de trabajo
Los avances **ya guardados** viven en el historial de GitHub de `taller-megahertz`. Este archivo es una bitácora de continuidad, **no un ZIP ni un respaldo completo de los datos externos o de Cloudflare**. Para recuperación del proyecto, usar la rama y su historial de commits. No declarar un despliegue verificado sin probarlo.
