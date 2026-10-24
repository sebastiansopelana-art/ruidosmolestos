# MegaHertz — presentación comercial

Base conservada: 09b1944d794abd45fe1932ea88e07b71335fc9df.
Respaldo remoto: respaldo-comercial-20261024.
Rama de revisión: megahertz-comercial-20261024.

## Alcance
- Portada comercial con paleta grafito, petróleo, lima y cian, galería de cuatro capturas reales ampliables, 21 funciones y tres videos H.264 de 15 segundos con subtítulos.
- Videos: recorridos visuales con zoom sobre capturas reales, sin locución. No son grabaciones continuas de interacción.
- Demo separada en /demo.html con seis entradas musicales, cuatro de programas y tres tandas de tres avisos cada una. Todos usan un audio instrumental original de muestra de 18 segundos. Los nombres y el clima son ejemplos.
- Cada base IndexedDB y clave de configuración de la demo usa un prefijo propio. La demo inicia en manual y no carga el módulo de idioma de producción.
- La consola de producción añade exclusivamente una referencia CSS. Sus scripts integrados y externos son idénticos a la base; no se modificaron transporte, automatización, almacenamiento ni APIs.
- Sin cambios a DNS, main, Studio 1.0, autenticación o configuración de Cloudflare.

## Verificación en preview local
- Sintaxis de JavaScript de portada, demo y producción: PASS.
- Existencia de todos los archivos enlazados por la portada: PASS.
- Scripts de producción idénticos a la base: PASS.
- Galería: cambio de pestaña y apertura/cierre de ampliación: PASS.
- Configuración: apertura/cierre sin guardar: PASS.
- Demo: reproducción musical y programas independientes: PASS.
- Demo: lanzamiento manual de tanda con avisos: PASS.
- Video musical: navegador decodifica H.264, duración 15 segundos y reproduce: PASS.
- Tres videos: inspección de contenedor H.264 y duración con ffprobe.
- Vista móvil 390px: revisada visualmente; ajuste de resplandor decorativo para evitar desborde.

No se certifican en esta entrega la precisión horaria de tandas durante horas de emisión, la calidad de una salida física de sonido ni el detector de silencio con hardware real.

## Reversión
Restaurar producción al commit base o al despliegue anterior 982889e2-ff12-4062-bdbe-c047587aed2e. No promover main ni una versión antigua del taller para revertir un cambio exclusivo de portada.
