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

El WhatsApp predeterminado es **+54 9 376 427-1559**; podés cambiarlo en **Contacto** con el código de país y solo números. Cargá tus horarios, cotizaciones y ofertas reales, y guardá. Después desactivá **Modo de ejemplo** y guardá nuevamente.

Para dar acceso a otras personas, abrí **Administradores** desde el panel, creá una cuenta con nombre, correo y contraseña temporal segura (mínimo 12 caracteres), y comunicá esos datos por un medio privado. Solo la cuenta propietaria puede dar o revocar accesos. Los usuarios creados pueden editar cotizaciones y contenido, pero no administrar otras cuentas. No se permite eliminar la propia cuenta mientras está iniciada.

El WhatsApp, el logo, las cotizaciones, las ofertas, los textos, los colores y las respuestas del asistente quedan editables en el panel.

### Atención por chat en vivo y WhatsApp

El sitio tiene un asistente automático que puede responder preguntas habituales
sobre cotizaciones y horarios. Además:

1. Un propietario o editor entra al panel **/admin → Mensajes** y presiona
   **Ponerme en línea**. Debe mantener esa sección abierta y visible mientras
   atiende clientes. Los mensajes se actualizan cada pocos segundos.
2. Cuando hay al menos un operador activo, los visitantes ven
   **Hablar con un asesor en esta web** dentro del chat. El bot transfiere la
   conversación existente y el operador puede responder desde **Mensajes**.
3. Cuando ningún operador está disponible, el cliente conserva el bot y ve
   **Hablar por WhatsApp**. Se abre WhatsApp con un resumen de la consulta
   para que el cliente elija si quiere enviarlo. No se envían mensajes
   automáticamente sin que el visitante confirme.
4. Los operadores pueden **Finalizar** conversaciones desde el panel.
   Todos los administradores con sesión válida pueden atender conversaciones.
5. El estado en línea se confirma primero desde el servidor. Una vez activado,
   el operador puede cambiar de sección del panel o abrir otra pestaña
   mientras su panel permanezca abierto. El estado se renueva cada 20 segundos.
   Si cierra el navegador, deja de tener conexión o el teléfono suspende el
   navegador, la disponibilidad caduca en unos 2 minutos. Puede desactivarla
   inmediatamente presionando **Ponerme fuera de línea**.

**Privacidad y funcionamiento:** las conversaciones en vivo se guardan en
`divisas-posadas-data/live-chat.json` y la disponibilidad en
`divisas-posadas-data/chat-presence.json`, **fuera de `public_html`**.
Los visitantes solo pueden leer el hilo asociado a su token privado y los
administradores deben iniciar sesión. Las conversaciones de más de siete días
se depuran al comenzar nuevas conversaciones, y el almacenamiento tiene un
límite de cantidad y mensajes por hilo. Los visitantes pueden recuperar su
conversación mientras conserven abierta la sesión de su navegador.
No solicites contraseñas, códigos de verificación, datos bancarios completos
ni documentos sensibles por el chat.

La atención es casi inmediata mediante consultas periódicas (polling), no
requiere Node.js, websockets ni servicios de chat externos y funciona sobre
el alojamiento PHP de Hostinger. **El botón para WhatsApp no guarda mensajes
en el chat**: abre WhatsApp en otra pestaña. Si no se abre, verificá el
número configurado en **Contacto**. No reemplaces ni elimines la carpeta
privada durante actualizaciones; allí también quedan las cuentas y
las cotizaciones.


### Cambiar la contraseña de administrador

Cada usuario con acceso al panel, tanto propietario como editor, puede abrir
**Administración → Seguridad → Cambiar mi contraseña**. Debe escribir su
contraseña actual, la nueva y repetir la nueva para confirmarla. La contraseña
nueva debe tener entre **12 y 72 caracteres** y no puede ser igual a la anterior.
Al guardar, se mantiene abierta únicamente la sesión actual de esa cuenta;
las demás sesiones de ese usuario quedan revocadas.

La contraseña no se muestra ni se guarda en texto plano: el servidor conserva
solo un hash seguro. El cambio no modifica las contraseñas de otros
administradores ni las cotizaciones. Si el usuario olvidó la contraseña actual,
este formulario no permite cambiarla sin verificarla; consultá las instrucciones
de recuperación al final de este documento.



## Datos y actualizaciones

El servidor crea automáticamente **`divisas-posadas-data` al lado de `public_html`, fuera de la web pública**. Allí quedan las cuentas administradoras (contraseñas guardadas como hash), contenido, revisión anterior y logos. Si había una sola cuenta en `admin.json`, al instalar la actualización se migra automáticamente al nuevo archivo `admins.json`; la sesión antigua puede pedir iniciar sesión nuevamente. No borres esa carpeta al actualizar la landing.

Si aparece un error de permisos, verificá que PHP pueda crear esa carpeta. También podés crearla desde el administrador de archivos y asignar en `data_dir` su ruta absoluta. La ruta debe estar **fuera de `public_html`**; el código rechaza carpetas dentro de la web pública. No uses permisos 777.

Para actualizar, reemplazá los archivos de la landing con el nuevo ZIP, conservando `config.local.php` y `divisas-posadas-data`.

### Actualización PayPal → USDT e íconos

Este paquete reemplaza PayPal por **USDT (Tether)** y añade tres íconos SVG de monedas:
**dólar dorado**, **euro azul** y **USDT turquesa**.

Al abrir el sitio por primera vez después de la actualización, el backend convierte los
identificadores anteriores `paypal` a `usdt` dentro de las cotizaciones, ofertas y
textos guardados. Se conserva una copia de la revisión anterior en
`divisas-posadas-data/content-backup.json`, además del respaldo completo que
tenés que descargar antes de instalar.

**Importante:** los valores anteriores de PayPal no son cotizaciones de USDT.
Por seguridad, la cotización USDT y las ofertas que estaban asociadas a PayPal
quedan **desactivadas**, sin borrar sus importes. Entrá al panel `/admin` →
**Cotizaciones**, cargá los precios reales de USDT, activá su visibilidad y guardá.
Revisá las ofertas migradas en **Ofertas**, actualizá sus importes y activalas solo
cuando correspondan. Si la web todavía utiliza valores ilustrativos, mantené
el modo de ejemplo hasta cargar y verificar todas las cotizaciones.

La carpeta `public_html/icons/` debe aparecer después de extraer el ZIP.
No publiques manualmente los valores archivados en `content-backup.json`,
porque pueden pertenecer a la cotización PayPal anterior. No subas el ZIP fuente completo descargado desde **Code → Download ZIP** como si fuera la web compilada.

Podés exportar el contenido desde **Descargar respaldo** en el panel. El respaldo completo se obtiene descargando también la carpeta privada desde Hostinger.

Si perdés la contraseña, primero pedile a otro administrador activo que cree una cuenta para vos. Si nadie tiene acceso, desde el administrador de archivos del hosting hacé un respaldo de **toda la carpeta privada**. Fuera de la raíz pública, apartá tanto `admins.json` como el antiguo `admin.json` (si todavía existe). Configurá un código de instalación nuevo en `config.local.php` y creá una cuenta principal nueva en `/admin`. Esta recuperación restablece los accesos anteriores y requiere volver a crear las otras cuentas. Conservá `content.json` y `media/` para mantener las cotizaciones, textos y logos.

## Referencias de Hostinger

- https://www.hostinger.com/support/1583289-how-to-manually-transfer-a-website-to-hostinger/
- https://www.hostinger.com/support/1583214-how-to-add-a-website-in-hostinger/
- https://www.hostinger.com/support/4548688-basic-actions-in-the-file-manager-in-hostinger/


#### Si el chat no aparece en línea

1. Verificá que hayas extraído **todo** el último paquete en `public_html`,
   incluida la carpeta `api`. El paquete no instala el código automáticamente.
2. Abrí `https://TU_DOMINIO/api/chat/status`. Debe mostrar un JSON parecido
   a `{"online":false}`. Si aparece una página HTML, un error 404 o una
   redirección, revisá la publicación del backend PHP y las reglas de
   `.htaccess`.
3. Entrá a `/admin → Mensajes`, presioná **Ponerme en línea** y esperá el
   mensaje **Conexión confirmada con el servidor**. Si falla, vas a ver el
   error de la API en la misma sección.
4. Volvé a abrir `/api/chat/status` en otra pestaña: tiene que mostrar
   `{"online":true}`. En la web pública, al abrir el chat se vuelve a
   consultar la disponibilidad inmediatamente.
5. No elimines `config.local.php` ni la carpeta privada
   `divisas-posadas-data`. Hostinger necesita permiso de escritura sobre esa
   carpeta para guardar `chat-presence.json` y las conversaciones.

### Visualización de guaraníes por peso

El sitio muestra el guaraní en cantidad de PYG equivalente a un peso argentino (ARS).
Las demás monedas se muestran en ARS por unidad.

En el panel de Cotizaciones, los campos de compra y venta de guaraníes
reciben directamente el número de guaraníes por 1 ARS, por ejemplo 6.45 y 5.88.
Usá punto decimal al ingresar los valores en el navegador.

Los datos existentes se conservan: internamente las cotizaciones continúan
almacenadas en ARS por PYG. La conversión visual no modifica los valores
persistidos hasta que el administrador los edite y guarde.


### Verificar que Hostinger usa la última versión del ZIP

Si después de actualizar no ves **guaraníes por $1 ARS** o los
**textos agrandados**, no alcanza con comprobar que GitHub tenga el código:
hay que comprobar que **la web publicada** use el ZIP compilado vigente.

1. Descargá `deploy/divisas-posadas-hostinger.zip` desde la rama principal
   `main` después de que termine la verificación automática de GitHub.
2. En Hostinger hacé copia de seguridad de `public_html` y de la carpeta
   privada `divisas-posadas-data`. Extraé **todo el contenido interno** del
   ZIP en `public_html` (que `index.html`, `assets/` y `api/` queden en
   esa carpeta, no dentro de otra `public_html` anidada).
3. Reemplazá los archivos anteriores cuando el administrador de archivos lo
   pregunte, incluidos los de `assets/` y `api/`. **No borres** tu
   `config.local.php` ni `divisas-posadas-data`.
4. Abrí `https://TU-DOMINIO/build-info.json`. Si devuelve un archivo JSON
   que contiene `buildId` y estas tres funciones:
   `guaranies-por-peso`, `textos-movil-ampliados` y
   `chat-en-vivo-confirmado`, la versión nueva está instalada. Si da
   404 o abre el HTML de la portada, revisá dónde extrajiste el ZIP.
5. Volvé a abrir el sitio en una pestaña de incógnito o vaciá la caché.
   Compará el resultado de **Guaraní** con **₲ por $1 ARS** y los botones
   más legibles en celulares. Revisá además `/admin → Cotizaciones`.

La verificación automática del repositorio ahora inspecciona **el ZIP real**
y contrasta su identificador `buildId` con el código fuente. Si el paquete
queda desactualizado o pierde estas mejoras, la compilación se marca como
fallida y no se publica el ZIP como válido.


### Ofertas destacadas como productos de tienda

La sección **Ofertas** se muestra **antes de Cotizaciones**, inmediatamente
después de la tira de monedas. Cada oferta activa del panel conserva su
título, descripción, moneda de origen, importe entregado, moneda de destino,
importe recibido y fecha de vencimiento, cuando existe.

Cada tarjeta muestra las dos monedas con su ícono, los importes y el botón
**Quiero esta oferta**, que lleva al conversor con la oferta seleccionada
y el monto fijo. Si la cantidad recibida realmente supera el cambio
habitual estimado para esas monedas, se muestra el porcentaje de mejora;
**no** se inventan porcentajes ni descuentos.

El carrusel muestra tres tarjetas por vista en escritorio, dos en tablet
y **una por vista en celulares**. Los controles sirven para avanzar y
retroceder; también permite deslizar con el dedo.

**Administración:** las ofertas siguen editándose desde la pestaña
**Ofertas** del panel. Se conservan todos los valores guardados en
`divisas-posadas-data`. No hay migraciones ni cambios en las cotizaciones
o en el chat.

El ZIP verificado ahora comprueba que la sección tipo tienda esté presente
junto con guaraníes por peso, tipografías ampliadas y chat en línea.


### Mejoras de portada y del chat (diseño y legibilidad)

- En la portada, **Tu próximo cambio, comienza acá.** reemplaza el
  texto anterior. Los sitios que todavía tengan guardado el mensaje
  original «empieza acá.» lo muestran actualizado sin sobrescribir
  otros títulos personalizados del administrador.
- El bloque principal se eleva ligeramente, incorpora un gradiente
  turquesa/azul tenue y la calculadora tiene sombra y mayor presencia.
- Los textos secundarios se muestran con mayor contraste y tamaño,
  especialmente los importes, etiquetas, notas y descripciones.
- En el chat, los accesos rápidos tienen colores e íconos distintos:
  cotizaciones (azul), cómo operar (turquesa), horarios (violeta) y
  ofertas (ámbar). La atención dentro de la web utiliza azul oscuro
  y WhatsApp verde.
- El diseño sigue adaptándose a celulares y conserva las cotizaciones
  en guaraníes por $1 ARS, las tarjetas de oferta y el chat en vivo.

Para publicar: extraer **todo el contenido** del ZIP dentro de
`public_html` y conservar la configuración y la carpeta de datos
privados. Comprobar la versión desde `/build-info.json` después de
actualizar y abrir la web en incógnito si Chrome conserva los estilos antiguos.
