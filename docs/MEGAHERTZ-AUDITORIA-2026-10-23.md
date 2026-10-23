# MEGAHERTZ — AUDITORÍA DE ESTABILIDAD
Fecha: 2026-10-23. Estado: Fase 1 — inventario y respaldos.

## Política inmediata
- No fusionar `taller-megahertz` en `main` sin revisar las diferencias y comprobar las funciones.
- No confundir código guardado, despliegue realizado y sitio comprobado.
- No alterar el motor de emisión para cambiar solamente colores.
- No eliminar ramas históricas. Conservar respaldos inmutables.
- Registrar para cada cambio: alcance, archivos, pruebas, resultado, commit y URL de despliegue.

## Referencias y respaldo
Repositorio: `sebastiansopelana-art/ruidosmolestos`.
- Producción de código de referencia: `main`; respaldo creado: `respaldo-auditoria-main-20261023`.
- Desarrollo actual: `taller-megahertz`; respaldo creado: `respaldo-auditoria-taller-20261023`.
Estos respaldos son ramas de GitHub; no son copias verificadas de la configuración de Cloudflare ni de datos almacenados en el navegador.

## Divergencia confirmada
`taller-megahertz` está 98 commits delante y 1 detrás de `main`; estado `diverged`.
Nueve archivos presentan diferencias:
1. `index.html`: portada comercial.
2. `aire/rmr-tecnology.html`: interfaz, estilos y lógica de la consola (riesgo alto).
3. `aire/megahertz-i18n.js`: traducciones.
4. `aire/megahertz-track-info.js`: información de temas.
5. `aire/megahertz-weather.js`: clima.
6. `aire/estetica/megahertz-meteo-v2.css`: estilos meteorológicos.
7. `functions/api/megahertz-news.js`: servicio de noticias.
8. `functions/api/megahertz-track.js`: servicio de metadatos.
9. `functions/api/megahertz-weather.js`: servicio meteorológico.

## Hallazgos técnicos iniciales
`aire/rmr-tecnology.html` mide 129136 caracteres en main y 203820 en taller, con múltiples capas de estilos acumuladas dentro del mismo archivo; no trasladar el archivo completo sin pruebas.
`index.html` mide 3865 caracteres en main y 20761 en taller.
La skin comercial identificada con `MEGAHERTZ COMMERCIAL IDENTITY — SKIN ONLY` figura tanto en `main` como en `taller-megahertz`; su sola presencia no prueba que esté desplegada.
Cloudflare, rutas de publicación, DNS, estado de sesión y comportamiento al aire todavía no están verificados.

## Lista mínima de pruebas antes de publicar
- Música: cargar, reproducir, pausar, detener, próximo, arrastrar, buscar y guardar listas.
- Publicidad: hora exacta vs. fin de tema, forzar/detener tanda, pendientes y retorno a nueva pista.
- Programas: playlists independientes, carga, reproducción, reordenamiento y transferencia.
- Pisadores/separadores: persistencia, reproducción y cambios de solapa.
- Centro informativo: reloj, clima, previsión semanal y noticias; fallos externos deben ser visibles y controlados.
- Simetría y tamaños de reproductores, botones y playlists en monitores habituales.
- Estados ON/OFF, Manual/Automático y alertas con contraste legible.
- Acceso privado y rutas principales.

## Siguiente fase
1. Identificar qué rama y commit sirve exactamente Cloudflare (requiere sesión operativa).
2. Registrar una matriz de pruebas funcionales sobre una URL de preview aislada.
3. Extraer gradualmente los estilos a CSS independiente sin cambiar el JS; comparar visualmente.
4. Fusionar únicamente modificaciones aprobadas; publicar; comprobar la URL final; registrar rollback.

## Definición de terminado
Un cambio sólo puede marcarse PUBLICADO Y COMPROBADO cuando exista despliegue exitoso identificado por commit y las pruebas visuales y funcionales se hayan realizado en la URL desplegada.
