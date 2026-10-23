# MEGAHERTZ · estructura de carpetas en Windows

Para la futura **versión instalable**, el instalador ejecutará `Crear-Estructura-Megahertz.ps1` como parte de la instalación.

## Raíz visible de la aplicación

```text
C:\Program Files\MEGAHERTZ\
├── jingles\
├── separadores\
└── publicidad\
```

## Archivos de trabajo con escritura

```text
C:\ProgramData\MEGAHERTZ\
├── jingles\
├── separadores\
└── publicidad\
```

Windows protege **Program Files** contra modificaciones por operadores sin permisos de administrador. Por eso la aplicación instalable deberá usar la segunda ruta para almacenar y actualizar archivos cargados desde la consola. Las carpetas de Program Files se crean para que la estructura exista junto al programa, pero no se deben considerar destinos de guardado automáticos.

**Estado actual:** el HTML de Cloudflare todavía usa **IndexedDB** (almacenamiento del navegador). Este script no se ejecuta en Cloudflare ni puede mover archivos al disco desde una web normal. Falta desarrollar y conectar el instalador y el almacenamiento local, así como definir los permisos de acceso de cada operador. No concede permisos de escritura indiscriminados ni modifica archivos existentes.
