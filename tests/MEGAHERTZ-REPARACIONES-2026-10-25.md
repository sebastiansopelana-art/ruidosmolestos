# Reparaciones de la auditoría funcional

Fecha de la estación: 25/10/2026. Rama: taller-megahertz.

- F01: El volumen cancelado no afecta la contabilización de publicidad.
- F02: Las claves descartadas no quedan pendientes.
- F03: Los errores de audio cierran correctamente tanda, evento y pisador.
- F04: Los institucionales exclusivos bloquean todos los caminos de reproducción.
- F05: Los eventos exactos de mayor prioridad interrumpen el evento correspondiente.
- F06: Los registros identifican la ocurrencia del programa saliente.
- F07: La recuperación respeta la configuración confirmada.
- F08: Una segunda pestaña no puede guardar ni modificar bibliotecas.
- F09: HORA EXACTA y FIN DE TEMA guardan la política de la tanda seleccionada.
- F10: PROBAR TANDA no recibe el evento de clic como lista de archivos.
- F11: Cancelar funciona con la validación y restablece los campos.
- F12: Se rechazan vacíos y valores fuera de rango del detector.
- F13: Los cambios de fuente aplican el fundido configurado.
- F14: Vaciar una lista cierra su registro de emisión.
- F15: Un pisador solo aparece AL AIRE en el visor principal.
- F16: Las cargas simultáneas de pisadores se guardan en serie.
- F17: La recuperación de eventos se persiste únicamente desde la pestaña propietaria.
- F18: La importación antigua conserva los modos de programa.
- F19: El registro incluye la cola audible del fundido.
- F20: Se traducen las secciones nuevas a los cuatro idiomas adicionales.
- F21: Vaciar avisos sueltos no detiene una tanda o institucional ajeno.
- F22: Cancelar restaura los archivos del editor de tandas.

## Validación

158 casos automáticos aprobados, sin fallos: 67 de integración, 74 de límites, 6 salvaguardas y 11 del núcleo. Casos reproducibles en tests/studio-integration y tests/*.test.cjs.

Navegador: cierre superior Cancelar; PROBAR TANDA sin excepción; carga y emisión de WAV real de 8 segundos en pisador, título conservado e indicador AL AIRE con medidores activos.

Pendiente de validación en la estación: separación física de dos dispositivos de audio, escucha acústica de fundidos y niveles, y una emisión prolongada durante la noche. Las pruebas de contabilización y colas de fundido son automatizadas; no se presentan como mediciones acústicas.
