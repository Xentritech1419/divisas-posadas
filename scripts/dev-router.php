<?php
// Router exclusivamente para pruebas locales con `php -S`.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$root=$_SERVER['DOCUMENT_ROOT'];
if (str_starts_with($path,'/api/')) { require $root.'/api/index.php'; return true; }
if (str_starts_with($path,'/config') || str_starts_with($path,'/.')) { http_response_code(403); return true; }
$file=realpath($root.$path);
if ($file && str_starts_with($file,realpath($root).DIRECTORY_SEPARATOR) && is_file($file)) return false;
header('Content-Type: text/html; charset=utf-8');
readfile($root.'/index.html');
return true;
