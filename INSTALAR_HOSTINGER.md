# Instalar Divisas Posadas en Hostinger Premium

## 1. Crear el sitio para probarlo

En Hostinger, abrí **Sitios web → Agregar/Crear sitio web → PHP/HTML personalizado**. Usá un dominio temporal si aparece esa opción; también sirve un subdominio disponible que elijas para este proyecto. Creá un sitio separado para no reemplazar Xentritech ni otro sitio existente.

En la configuración del sitio seleccioná **PHP 8.3 o superior** y verificá que el certificado SSL esté activo. Usá la dirección que empieza con `https://`.

## 2. Subir la landing

1. Descargá `deploy/divisas-posadas-hostinger.zip` desde este repositorio.
2. Entrá en **Archivos → Administrador de archivos → public_html** del sitio nuevo.
3. Subí el ZIP y extraelo directamente dentro de `public_html`.
4. En esa carpeta deben quedar `index.html`, `.htaccess`, `favicon.svg`, `assets/`, `api/` y `config.example.php`. No deben quedar dentro de otra carpeta llamada `public_html`.
5. Si el sitio nuevo tiene una página de bienvenida `index.php`, renombrala como respaldo o retirala de esa carpeta para que no reemplace la landing. No hagas esto en un sitio que ya esté en uso.
6. Eliminá el ZIP del servidor después de extraerlo.

Abrí el dominio temporal: ya podés ver la landing, el conversor y el chat con valores claramente marcados como ejemplos.

## 3. Activar el administrador

1. En el administrador de archivos, copiá `config.example.php` como **`config.local.php`**, en la misma carpeta.
2. Abrí `config.local.php`. En `'setup_key' => ''`, escribí entre las comillas un código privado y aleatorio de **al menos 24 caracteres**. Podés generarlo con tu administrador de contraseñas. No uses el ejemplo de un tutorial ni una contraseña reutilizada.
3. Guardá el archivo. Dejá `data_dir` vacío salvo que sea necesario configurar otra ruta privada.
4. Abrí la ruta **`/admin`** en el dominio de tu sitio.
5. Ingresá ese código de instalación, tu nombre, tu correo y una contraseña nueva de al menos 12 caracteres. Confirmala y elegí **Crear mi cuenta**.
6. Una vez dentro, podés volver a dejar vacío `setup_key` en `config.local.php`. La cuenta ya creada sigue funcionando y no puede ser reemplazada desde la instalación.

El código de instalación no es la contraseña del administrador. No se publica ninguna contraseña predeterminada. `config.local.php` es un archivo privado de tu instalación: no lo subas a GitHub ni lo compartas por chat.

## 4. Cargar información real

En el panel, cargá WhatsApp con código de país y solo números, horarios, cotizaciones y ofertas reales. Guardá los cambios. Después desactivá **Modo de ejemplo** y guardá nuevamente.

El WhatsApp, el logo, las cotizaciones, las ofertas, los textos, los colores y las respuestas del asistente quedan editables en el panel.

## Datos y actualizaciones

El servidor crea automáticamente **`divisas-posadas-data` al lado de `public_html`, fuera de la web pública**. Allí quedan la cuenta (contraseña guardada como hash), contenido, revisión anterior y logos. No borres esa carpeta al actualizar la landing.

Si aparece un error de permisos, verificá que PHP pueda crear esa carpeta. También podés crearla desde el administrador de archivos y asignar en `data_dir` su ruta absoluta. La ruta debe estar **fuera de `public_html`**; el código rechaza carpetas dentro de la web pública. No uses permisos 777.

Para actualizar, reemplazá los archivos de la landing con el nuevo ZIP, conservando `config.local.php` y `divisas-posadas-data`. No subas el ZIP fuente completo descargado desde **Code → Download ZIP** como si fuera la web compilada.

Podés exportar el contenido desde **Descargar respaldo** en el panel. El respaldo completo se obtiene descargando también la carpeta privada desde Hostinger.

Si perdés la contraseña, con acceso al administrador de archivos podés renombrar `admin.json` dentro de la carpeta privada, establecer un código de instalación nuevo en `config.local.php` y volver a crear tu cuenta. Conservá `content.json` y `media/` para mantener la información; las sesiones de la cuenta anterior dejarán de ser válidas.

## Referencias de Hostinger

- https://www.hostinger.com/support/1583289-how-to-manually-transfer-a-website-to-hostinger/
- https://www.hostinger.com/support/1583214-how-to-add-a-website-in-hostinger/
- https://www.hostinger.com/support/4548688-basic-actions-in-the-file-manager-in-hostinger/
