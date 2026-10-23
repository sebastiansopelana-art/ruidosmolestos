# MEGAHERTZ — ETAPA 2: PREPUBLICACIÓN Y PRUEBAS
Fecha 2026-10-23. Estado: PREPARADO / PENDIENTE DE EJECUCIÓN EN NAVEGADOR.

## Resultado de la verificación
- Las solicitudes externas a https://www.megahertz.com.ar/ y /aire/rmr-tecnology.html no fueron accesibles. No se puede inferir que el sitio esté caído.
- Perfil de navegador "Cloudflare MEGAHERTZ" detectado pero sin sitio autenticado. Sin acceso no es posible verificar el commit de producción.
- main: aire/rmr-tecnology.html, blob f9605777183a9370040ebb6e0b45706feb23d5d4, 129136 caracteres, no contiene la skin comercial ni la referencia meteorológica.
- taller-megahertz: blob 7bd4b24ab3a7a69ca79d8e129cc3043653440bcc, 203820 caracteres, contiene la skin comercial, referencias de clima y módulo de noticias.
- No fusionar ramas completas para hacer una simple actualización visual.

## Matriz de aceptación (todas pendientes de prueba interactiva)
| ID | Subsistema | Caso de prueba | Resultado |
|---|---|---|---|
| M01 | Música | Carga local y reproducción de la primera pista | PENDIENTE |
| M02 | Música | Avanzar, pausar y detener sin saltos inesperados | PENDIENTE |
| M03 | Música | Buscar parcialmente y reordenar drag & drop | PENDIENTE |
| A01 | Publicidad | Hora exacta: interrumpir según configuración | PENDIENTE |
| A02 | Publicidad | Fin de tema: esperar y lanzar tanda | PENDIENTE |
| A03 | Publicidad | Retomar desde una pista nueva tras la tanda | PENDIENTE |
| A04 | Publicidad | Manual -> Automático: recuperar tandas pendientes | PENDIENTE |
| P01 | Programas | Cargar, reproducir y reordenar playlist independiente | PENDIENTE |
| S01 | Separadores | Disparadores y almacenamiento persistente | PENDIENTE |
| C01 | Consola | Estados Manual/Automático, alarmas y vúmetros | PENDIENTE |
| I01 | Información | Reloj sin texto HORA LOCAL, clima y pronóstico | PENDIENTE |
| I02 | Información | Noticias nacionales actualizan y buscan región | PENDIENTE |
| V01 | Visual | Misma paleta que la landing y botones legibles | PENDIENTE |
| V02 | Visual | Simetría en resolución de pantallas de trabajo | PENDIENTE |
| W01 | Web | Página comercial, acceso privado y rutas | PENDIENTE |

## Protocolo de publicación
1. Verificar la rama, el commit y la configuración del proyecto de Cloudflare Pages autenticado.
2. Crear preview desde el commit elegido y obtener URL verificable.
3. Ejecutar matriz en preview (para audio, utilizar archivos de prueba con autorización).
4. Tomar capturas comparativas de página comercial y consola.
5. Confirmar que el JS de emisión no cambió en una actualización puramente estética.
6. Publicar solo con resultados aprobados y conservar URL/commit para reversión.
7. Verificar la URL definitiva. Registrar fecha, versión, URL y pruebas.

El código de esta etapa documenta el proceso; no se han ejecutado pruebas funcionales ni publicaciones.
