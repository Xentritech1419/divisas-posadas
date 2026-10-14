# Verificación de la versión para Hostinger

Verificada localmente antes de la subida a GitHub:

- TypeScript y compilación de producción con Vite.
- Compra y venta, guaraní con decimales, divisas pausadas, ofertas vencidas y respuestas del asistente.
- API ejecutada con PHP 8.3: creación de cuenta con código privado, login, logout y cookies HttpOnly/SameSite.
- Rechazo de solicitudes sin sesión, sin token CSRF o desde un origen ajeno.
- Validación de cotizaciones, logo, WhatsApp y conflicto de revisiones simultáneas.
- Guardado compartido, respaldo anterior y conservación de contenido y logo tras reiniciar PHP.
- Subida y lectura de PNG; rechazo de SVG camuflado como PNG.
- Contraseña guardada mediante hash y limitación de intentos de acceso.

La prueba de API usa una instalación temporal y elimina sus datos al terminar.

Pendiente en el hosting real: extracción del ZIP, configuración del administrador, comprobación de HTTPS, permisos de la carpeta privada, reglas Apache/LiteSpeed y revisión visual en navegador.
