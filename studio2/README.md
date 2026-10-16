# Ruidos Molestos Studio 2.0

Prototipo independiente para macOS y Windows, en rama studio-2-desktop. La rama main y Studio 1.0 no se modifican.

Estado: base Electron que abre el HTML actual dentro de una ventana de escritorio. No se ha probado ni empaquetado; las funciones que dependen del servidor web pueden no funcionar con file://. Todavia NO existe automatizacion de radio ni motor de audio local.

Desarrollo: instalar Node.js; ejecutar npm install y npm start dentro de studio2.

Plan: (1) copiar interfaz visual sin alterar Studio 1.0; (2) crear motor local independiente para audio 24/7; (3) importar grandes bibliotecas de musica; (4) programar tandas por fecha, dia y hora, con modalidad exacta o al terminar cancion; (5) emitir anuncios y jingles en orden, registrar reproduccion y volver automaticamente a musica; (6) soportar vivo/manual, deteccion de silencio, recuperacion ante cortes y logs auditables; (7) empaquetar y probar en macOS y Windows.

No modificar main ni el despliegue existente. No afirmar que el prototipo funciona 24/7 sin pruebas.
