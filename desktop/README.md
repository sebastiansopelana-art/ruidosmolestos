# MegaHertz Beta 5 escritorio

Base: rama taller-megahertz, commit 4dab797. Mantiene la consola sin cambios.

Compilación: `npm ci --ignore-scripts`, `node prepare.cjs`, `npm run package:win` y `npm run package:mac`. El empaquetador descarga los binarios de Electron. Para Mac usar preferentemente un runner macOS; preservar enlaces simbólicos y permisos al crear el ZIP. Los paquetes de prueba están sin firma ni notarización.

Verificación del lanzador: `node smoke.cjs`. Núcleo y pruebas de integración se ejecutan desde la raíz según tests/MEGAHERTZ-STUDIO.md. El smoke usa un adaptador Electron simulado y un servidor HTTP real; no sustituye la prueba nativa.

Perfil independiente: MegaHertz-Beta5, origen fijo http://127.0.0.1:18765. Nunca cambiar sin migrar IndexedDB. No hay migración automática desde el navegador; importar .mhbackup. Noticias y clima se envían exclusivamente al servicio original de www.megahertz.com.ar. Node desactivado en el renderer, sandbox y aislamiento activos. Cerrar la ventana cierra el proceso; no ejecuta eventos en segundo plano después de salir.
