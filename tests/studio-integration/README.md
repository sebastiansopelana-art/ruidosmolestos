# Integración de MegaHertz

Probado con Node.js 24.

```sh
npm ci --prefix tests/studio-integration
npm test --prefix tests/studio-integration
node --test tests/*.test.cjs
```

67 escenarios de integración, 74 casos de límites, 6 salvaguardas y 11 pruebas del núcleo: 158 casos. Los resultados generados se ignoran en Git.

JSDOM, IndexedDB y audio simulado permiten comprobar estados, permisos, persistencia, planificación y registro. Los accesos internos se inyectan únicamente en la copia de prueba; no se publican en la consola. No certifica dos salidas físicas, calidad acústica ni funcionamiento nocturno prolongado.
