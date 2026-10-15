# Divisas Posadas

Landing de cotizaciones con conversor, ofertas, respuestas automáticas y administración. Versión preparada para **Hostinger Premium Web Hosting**, con PHP 8.3 o superior y frontend compilado. No requiere Node.js en el hosting ni contratar otro plan.

## Instalar

1. Descargá [`deploy/divisas-posadas-hostinger.zip`](deploy/divisas-posadas-hostinger.zip).
2. Creá un sitio **PHP/HTML** nuevo en Hostinger y subí el ZIP a su `public_html`.
3. Extraé el ZIP allí y seguí [INSTALAR_HOSTINGER.md](INSTALAR_HOSTINGER.md) para activar el administrador. Para nuevas versiones, verificá que el ZIP corresponda al commit actual o descargá el paquete generado por la acción de pruebas de GitHub.

La landing funciona con valores de ejemplo desde la primera carga. No hay contraseñas predeterminadas: el propietario habilita la instalación y crea su cuenta.

## Incluye

- Dólar Azul, Dólar Verde, Euro, Reales, Guaraní y PayPal.
- Compra y venta en ARS, conversión con decimales y ofertas con monto fijo y vencimiento.
- Edición de cotizaciones de compra y venta independientes, ofertas, colores, logo, textos, horarios, contacto y respuestas del chat.
- Acceso administrativo con múltiples cuentas por correo y contraseña; creación y revocación de usuarios, cierre de sesión y respaldo descargable.
- Datos compartidos guardados en el servidor, fuera de la carpeta pública.

El asistente responde con reglas y el contenido configurado; no usa una API de IA ni requiere suscripciones. El conversor no procesa pagos, transferencias ni reservas.

## Desarrollo

Requisitos locales: Node.js 22.13+ (24 recomendado), PHP 8.3+ y Python 3 para las pruebas de la API.

```sh
npm install
npm run test:logic
npm run build
npm run test:api
```

`src/` contiene React y los cálculos; `server/` contiene PHP; `public_html/` se genera al compilar. El ZIP de `deploy/` incluye solamente los archivos publicables. El script `scripts/make-zip.py` actualiza ese ZIP tras la compilación.

Los datos persistentes se guardan en archivos JSON privados con bloqueo exclusivo y reemplazo atómico. Esto evita configurar una base MySQL para este sitio de un administrador. Se conserva una copia de la revisión anterior. Para respaldar también el logo y la cuenta, descargá la carpeta privada completa desde Hostinger; el botón del panel exporta únicamente el contenido.

No subas `config.local.php`, la carpeta privada, contraseñas ni respaldos de producción a este repositorio. Los valores iniciales del código son ejemplos.

## Estado de la migración

La versión de ChatGPT Sites se conserva por separado. Esta versión reemplaza Cloudflare D1/R2 y el acceso de ChatGPT por almacenamiento privado del hosting y una cuenta administradora local. El paquete contiene el contenido de ejemplo original; no se importan cambios posteriores de la instancia de Sites automáticamente.
