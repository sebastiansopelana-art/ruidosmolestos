# RMR TECHNOLOGY Studio 2.0 — Desktop Beta 0.1

Primera estructura instalable para **Windows y macOS** basada en la consola existente de RMR TECHNOLOGY. Se desarrolla **solo en la rama beta/rmr-technology-1**. No modifica la versión de emisión en main.

## Requisitos
- Node.js 20 o superior y npm.
- macOS o Windows.
- Para generar instaladores de macOS se recomienda una Mac; para Windows, una PC con Windows.

## Probar en escritorio
Desde la raíz del repositorio:

```bash
cd desktop
npm install
npm start
```

## Generar instaladores
```bash
npm run dist:mac
# o en Windows:
npm run dist:win
```

Los instaladores se generan en `desktop/dist/` (no se suben al repositorio).

## Estado de la Beta
- La ventana de escritorio usa la consola HTML existente y funciona localmente, sin cargar la interfaz desde el sitio web.
- Electron usa aislamiento de contexto, sandbox y Node.js deshabilitado en el contenido.
- **Pendiente de validar en Mac y Windows:** arranque, reproducción de audio, permisos de archivos, drag & drop, IndexedDB, vúmetros y automatización de tandas.
- **Todavía no es apta para salir al aire** sin pruebas de continuidad, precisión horaria y recuperación ante fallos.
- La Beta inicial no incluye autoactualización, firma/notarización ni un motor nativo de audio. Las funcionalidades que dependen de APIs web y del navegador deberán auditarse antes de producción.
