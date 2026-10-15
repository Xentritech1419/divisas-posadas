# Identidad visual — Divisas Posadas

El sitio utiliza el nuevo logotipo de flechas circulares, vectorizado y optimizado para pantallas de cualquier tamaño.

## Paleta de marca

| Aplicación | Color |
| --- | --- |
| Turquesa principal | `#18E5C1` |
| Azul marino para títulos y textos | `#2C3768` |
| Verde oscuro para enlaces sobre fondo blanco | `#087D75` |
| Fondo claro | `#F7FBFD` |

Los botones principales tienen fondo turquesa y texto azul marino para mejorar la legibilidad. Los botones **Quiero comprar / Quiero vender** siguen usando el color de cada divisa.

## Archivos exactos

- `public/logo-divisas-posadas.svg`: logotipo vectorial de 762 bytes, fondo transparente.
- `public/favicon.svg`: versión del mismo símbolo para la pestaña del navegador.
- `src/ui/Brand.tsx`: componente de marca compartido por header, footer y panel.
- `src/ui/Landing.tsx`: footer con links públicos, contacto por WhatsApp y ubicación.
- `src/styles.css`: diseño turquesa/azul, header, footer, tarjetas y estilos móviles.
- `src/lib/content.ts`: colores y logo por defecto, validación del logo estático.
- `server/api/default-content.json`: valores iniciales consumidos por PHP.
- `server/api/validate.php`: permite la URL segura del SVG sin habilitar URLs arbitrarias.
- `server/api/bootstrap.php`: migración de colores por defecto y logo anterior.
- `index.html`: icono y color de pestaña, precarga del SVG.
- `src/ui/Admin.tsx`: opción para volver al logo oficial al quitar uno personalizado.
- `tests/api_test.py`: validaciones de API, archivos estáticos y migración de marca.

## Código del logo para copiar

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="58 51 1136 1136" role="img" aria-label="Divisas Posadas — dos flechas circulares">
<path fill="#18E5C1" d="M679,85 397,263 677,431 678,333 705,336 752,353 784,370 830,404 862,437 887,471 915,528 931,601 930,660 914,723 881,784 845,826 785,873 728,901 858,984 915,945 963,898 1005,843 1038,784 1059,728 1069,674 1070,611 1063,552 1045,486 1014,419 974,360 925,306 865,257 798,219 750,201 678,186Z"/>
<path fill="#2C3768" d="M395,263 333,309 290,351 246,409 219,459 197,519 185,578 182,644 189,706 210,777 240,836 281,893 325,939 385,987 445,1021 503,1042 574,1054 574,1153 857,985 572,806 571,911 566,913 510,896 454,865 399,816 371,780 339,720 323,656 323,593 339,524 367,468 410,416 450,383 524,340Z"/>
</svg>
```

## Actualización de una instalación existente

Si una instalación conserva el logo vacío y los dos colores predeterminados antiguos, la API los actualiza automáticamente al abrir el sitio con la nueva versión, guardando copia previa y aumentando la revisión. **No modifica cotizaciones, ofertas, contactos, cuentas ni imágenes personalizadas.**

Las configuraciones de color que ya fueron personalizadas y los logos subidos al panel se respetan.

## Edición posterior

Ingresá a `/admin` y seleccioná **Identidad**. Desde allí podés cambiar nombre, colores y cargar un logo personalizado de hasta 2 MB. Si habías subido un logo diferente, usá **Usar logo oficial** para volver al diseño circular. No cargues contraseñas ni datos privados en GitHub.

## Publicación segura

Primero verificá en GitHub Actions que termine correctamente el workflow **Verificar y empaquetar Divisas Posadas**. El paquete se genera como artefacto `divisas-posadas-hostinger`, que contiene el ZIP para instalar en Hostinger. Antes de actualizar el sitio público respaldá `config.local.php` y la carpeta privada `divisas-posadas-data`.
