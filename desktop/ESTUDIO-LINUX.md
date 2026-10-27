# MEGAHERTZ Estudio: preparación de paquetes
La base actual sigue siendo Beta 5 (0.5.0-beta.5); no está certificada como versión final 1.0.

Para Linux x64: desde desktop ejecutar npm ci --ignore-scripts, node prepare.cjs y npm run package:linux. Se genera una carpeta ejecutable para distribuciones Linux de 64 bits; no es un .deb ni un AppImage. Requiere probar dependencias, audio y funcionamiento en cada distribución.

El perfil continúa siendo MegaHertz-Beta5: cambiar el nombre de marca o la ruta de datos requiere migración. La consola debe permanecer abierta y el equipo despierto.

El retorno por inactividad usa la posición global del puntero en X11, Windows y macOS cuando el sistema la proporciona. En una sesión Linux Wayland se desactiva y se informa, porque no se puede garantizar la posición global. Las tres plataformas requieren pruebas físicas, y en macOS hay que comprobar los permisos de seguridad. La distribución de prueba aún no está firmada ni notarizada.

El flujo Paquetes de prueba produce archivos temporales en GitHub Actions. Los artefactos requieren acceso al repositorio y no son enlaces públicos permanentes. Antes de ofrecer descargas públicas hay que verificar los paquetes, publicarlos en un alojamiento de descargas y enlazarlos desde la web.
