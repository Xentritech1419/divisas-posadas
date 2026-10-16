<?php
declare(strict_types=1);
ini_set('display_errors','0');
require __DIR__.'/bootstrap.php';
require __DIR__.'/validate.php';
require __DIR__.'/live-chat.php';

try {
    $path=parse_url($_SERVER['REQUEST_URI'] ?? '/',PHP_URL_PATH);
    $method=$_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($path==='/api/content' && $method==='GET') respond(read_state());
    if ($path==='/api/chat/status' && $method==='GET') respond(['online'=>chat_is_online()]);
    if ($path==='/api/chat/guest' && $method==='POST') chat_guest_request(json_body(18000));
    if ($path==='/api/chat/operator/heartbeat' && $method==='POST') {
        $current=require_user(); csrf_check(); chat_operator_heartbeat($current,json_body(1500));
    }
    if ($path==='/api/chat/operator/threads' && $method==='GET') chat_operator_threads();
    if ($path==='/api/chat/operator/thread' && $method==='GET') chat_operator_thread((string)($_GET['id'] ?? ''));
    if ($path==='/api/chat/operator/action' && $method==='POST') chat_operator_action(require_user(),json_body(3000));

    if (is_string($path) && preg_match('~^/api/media/(logo-[a-zA-Z0-9-]+\.(png|jpg|webp))$~D',$path,$match) && $method==='GET') {
        $file=private_dir().'/media/'.$match[1];
        if (!is_file($file)) respond(['error'=>'Imagen no encontrada.'],404);
        header('Content-Type: '.(['png'=>'image/png','jpg'=>'image/jpeg','webp'=>'image/webp'][$match[2]]));
        header('Content-Length: '.filesize($file)); header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: default-src 'none'"); header('Cache-Control: public, max-age=31536000, immutable');
        readfile($file); exit;
    }
    if ($path==='/api/session' && $method==='GET') {
        $user=current_user(); $accounts=accounts(); $configured=count($accounts['users'])>0; $key=settings()['setup_key'] ?? '';
        respond(['configured'=>$configured,'setupEnabled'=>!$configured && is_string($key) && strlen($key)>=24,'csrf'=>$_SESSION['csrf'],'user'=>$user]);
    }
    if ($path==='/api/login' && $method==='POST') {
        csrf_check(); rate_check('login'); $input=json_body(4096); $accounts=accounts();
        $email=$input['email'] ?? ''; $password=$input['password'] ?? '';
        $normalized=is_string($email)?strtolower(trim($email)):'';
        $admin=find_user_by_email($accounts,$normalized);
        if (!$admin || !is_string($password) || strlen($password)>72 || !password_verify($password,$admin['passwordHash'])) respond(['error'=>'El correo o la contraseña no son correctos.'],401);
        signed_in($admin); respond(['ok'=>true]);
    }
    if ($path==='/api/setup' && $method==='POST') {
        csrf_check(); rate_check('setup'); $input=json_body(4096); $key=settings()['setup_key'] ?? '';
        $given=$input['setupKey'] ?? '';
        if (!is_string($key) || strlen($key)<24 || !is_string($given) || !hash_equals($key,$given)) respond(['error'=>'El código de instalación no es válido o la instalación no está habilitada.'],403);
        $email=strtolower(text_value($input['email'] ?? null,'correo',200));
        $name=text_value($input['displayName'] ?? null,'nombre',80); $password=$input['password'] ?? null;
        if (!filter_var($email,FILTER_VALIDATE_EMAIL)) invalid('correo');
        if (!is_string($password) || strlen($password)<12 || strlen($password)>72 || str_contains($password,"\0")) invalid('contraseña: usá entre 12 y 72 caracteres');
        $admin=['id'=>bin2hex(random_bytes(12)),'email'=>$email,'displayName'=>$name,'passwordHash'=>password_hash($password,PASSWORD_DEFAULT),'role'=>'owner','version'=>bin2hex(random_bytes(24)),'createdAt'=>gmdate('Y-m-d\\TH:i:s\\Z')];
        $created=locked(function() use($admin) {
            $stored=read_json('admins'); $legacy=read_json('admin');
            if (($stored && !empty($stored['users'])) || $legacy!==null) return false;
            write_json('admins',['version'=>1,'users'=>[$admin]]); return true;
        });
        if (!$created) respond(['error'=>'La cuenta administradora ya está creada.'],409);
        signed_in($admin); respond(['ok'=>true],201);
    }
    if ($path==='/api/change-password' && $method==='POST') {
        $current=require_user(); csrf_check(); rate_check('change-password');
        $input=json_body(4096);
        $old=$input['currentPassword'] ?? null;
        $new=$input['newPassword'] ?? null;
        $confirm=$input['confirmPassword'] ?? null;
        if (!is_string($old) || strlen($old)<1 || strlen($old)>72 || str_contains($old,"\\0")) invalid('contraseña actual');
        if (!is_string($new) || strlen($new)<12 || strlen($new)>72 || str_contains($new,"\\0")) invalid('contraseña nueva: usá entre 12 y 72 caracteres');
        if (!is_string($confirm) || !hash_equals($new,$confirm)) invalid('confirmación de contraseña');
        if (hash_equals($old,$new)) invalid('contraseña nueva: debe ser distinta de la anterior');
        $updated=locked(function() use($current,$old,$new) {
            $stored=read_json('admins') ?? ['version'=>1,'users'=>[]];
            foreach ($stored['users'] as &$user) {
                if (($user['id'] ?? '')!==$current['id']) continue;
                if (!password_verify($old,$user['passwordHash'])) return null;
                $user['passwordHash']=password_hash($new,PASSWORD_DEFAULT);
                $user['version']=bin2hex(random_bytes(24));
                $updated=$user;
                write_json('admins',$stored);
                return $updated;
            }
            unset($user);
            return null;
        });
        if ($updated===null) respond(['error'=>'La contraseña actual no es correcta.'],401);
        // Invalidar las demás sesiones y renovar la sesión actual con un token CSRF nuevo.
        signed_in($updated);
        respond(['ok'=>true]);
    }
    if ($path==='/api/users' && $method==='GET') {
        require_owner(); $accounts=accounts();
        respond(['users'=>array_map('public_user',$accounts['users'])]);
    }
    if ($path==='/api/users' && $method==='POST') {
        require_owner(); csrf_check(); $input=json_body(4096);
        $email=strtolower(text_value($input['email'] ?? null,'correo',200));
        $name=text_value($input['displayName'] ?? null,'nombre',80); $password=$input['password'] ?? null;
        if (!filter_var($email,FILTER_VALIDATE_EMAIL)) invalid('correo');
        if (!is_string($password) || strlen($password)<12 || strlen($password)>72 || str_contains($password,"\0")) invalid('contraseña: usá entre 12 y 72 caracteres');
        $created=locked(function() use($email,$name,$password) {
            $stored=read_json('admins') ?? ['version'=>1,'users'=>[]];
            foreach ($stored['users'] as $user) if (($user['email'] ?? '')===$email) return null;
            $user=['id'=>bin2hex(random_bytes(12)),'email'=>$email,'displayName'=>$name,'passwordHash'=>password_hash($password,PASSWORD_DEFAULT),'role'=>'editor','version'=>bin2hex(random_bytes(24)),'createdAt'=>gmdate('Y-m-d\\TH:i:s\\Z')];
            $stored['users'][]=$user; write_json('admins',$stored); return public_user($user);
        });
        if ($created===null) respond(['error'=>'Ya existe un administrador con ese correo.'],409);
        respond(['user'=>$created],201);
    }
    if (is_string($path) && preg_match('~^/api/users/([a-f0-9]{24})$~D',$path,$match) && $method==='DELETE') {
        $current=require_owner(); csrf_check(); $id=$match[1];
        if ($current['id']===$id) respond(['error'=>'No podés eliminar tu propia cuenta mientras está iniciada.'],400);
        $deleted=locked(function() use($id) {
            $stored=read_json('admins') ?? ['version'=>1,'users'=>[]];
            if (count($stored['users'])<=1) return false;
            $before=count($stored['users']);
            $stored['users']=array_values(array_filter($stored['users'],fn($u)=>($u['id'] ?? '')!==$id));
            if (count($stored['users'])===$before) return null;
            write_json('admins',$stored); return true;
        });
        if ($deleted===null) respond(['error'=>'Administrador no encontrado.'],404);
        if ($deleted===false) respond(['error'=>'Debe quedar al menos un administrador activo.'],400);
        respond(['ok'=>true]);
    }
    if ($path==='/api/logout' && $method==='POST') {
        csrf_check(); $_SESSION=[]; session_destroy();
        setcookie('dp_admin','',['expires'=>time()-3600,'path'=>'/','secure'=>!local_request(),'httponly'=>true,'samesite'=>'Strict']);
        respond(['ok'=>true]);
    }
    if ($path==='/api/content' && $method==='PUT') {
        require_user(); csrf_check(); $input=json_body();
        $revision=$input['revision'] ?? null;
        if (!is_int($revision) || $revision<0) invalid('revisión');
        $content=validate_content($input['content'] ?? null);
        $saved=locked(function() use($revision,$content) {
            $old=read_json('content') ?? initial_state();
            if ($old['revision']!==$revision) return null;
            $next=['content'=>$content,'revision'=>$revision+1,'updatedAt'=>gmdate('Y-m-d\TH:i:s\Z')];
            write_json('content-backup',$old); write_json('content',$next); return $next;
        });
        if ($saved===null) respond(['error'=>'Se guardaron cambios desde otra ventana. Recargá el panel antes de volver a guardar.'],409);
        respond($saved);
    }
    if ($path==='/api/upload' && $method==='POST') {
        require_user(); csrf_check();
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>2200000) respond(['error'=>'El logo no debe superar los 2 MB.'],413);
        $file=$_FILES['file'] ?? null;
        if (!$file || !is_array($file) || ($file['error'] ?? 1)!==UPLOAD_ERR_OK || !is_string($file['tmp_name']) || !is_uploaded_file($file['tmp_name']) || $file['size']<1 || $file['size']>2097152) respond(['error'=>'Seleccioná una imagen de hasta 2 MB.'],400);
        $info=@getimagesize($file['tmp_name']);
        $types=[IMAGETYPE_PNG=>'png',IMAGETYPE_JPEG=>'jpg',IMAGETYPE_WEBP=>'webp'];
        if (!$info || !isset($types[$info[2]]) || $info[0]>4096 || $info[1]>4096 || $info[0]*$info[1]>16000000) respond(['error'=>'Usá un logo PNG, JPG o WebP de hasta 4096 píxeles por lado.'],400);
        $directory=private_dir().'/media';
        if (!is_dir($directory) && !mkdir($directory,0700) && !is_dir($directory)) throw new RuntimeException('Cannot create media directory');
        $key='logo-'.bin2hex(random_bytes(16)).'.'.$types[$info[2]];
        if (!move_uploaded_file($file['tmp_name'],$directory.'/'.$key) || !chmod($directory.'/'.$key,0600)) throw new RuntimeException('Could not store logo');
        respond(['url'=>'/api/media/'.$key],201);
    }
    if ($path==='/api/backup' && $method==='GET') {
        require_user(); header('Content-Disposition: attachment; filename="divisas-posadas-'.gmdate('Y-m-d').'.json"'); respond(read_state());
    }
    respond(['error'=>'Ruta no encontrada.'],404);
} catch (InvalidArgumentException $error) {
    respond(['error'=>$error->getMessage()],400);
} catch (Throwable $error) {
    error_log('Divisas Posadas: '.$error->getMessage());
    respond(['error'=>'El servidor no pudo completar la solicitud. Revisá la configuración y los permisos de la carpeta privada.'],503);
}
