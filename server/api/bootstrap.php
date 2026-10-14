<?php
declare(strict_types=1);

function respond(array $data, int $status=200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    exit;
}
function settings(): array {
    static $config;
    if ($config === null) {
        $file = dirname(__DIR__).'/config.local.php';
        $config = is_file($file) ? require $file : [];
        if (!is_array($config)) throw new RuntimeException('Invalid server configuration');
    }
    return $config;
}
function private_dir(): string {
    static $dir;
    if ($dir !== null) return $dir;
    $configured = settings()['data_dir'] ?? '';
    $target = $configured !== '' ? $configured : dirname(__DIR__,2).'/divisas-posadas-data';
    if (!is_dir($target) && !mkdir($target,0700,true) && !is_dir($target)) throw new RuntimeException('Cannot create private storage');
    $resolved=realpath($target); $public=realpath(dirname(__DIR__));
    if ($resolved===false || $public===false || $resolved===$public || str_starts_with($resolved,$public.DIRECTORY_SEPARATOR)) throw new RuntimeException('Storage must be outside the public directory');
    if (!is_writable($resolved)) throw new RuntimeException('Private storage is not writable');
    $dir=$resolved;
    return $dir;
}
function locked(callable $callback, bool $exclusive=true): mixed {
    $lock=fopen(private_dir().'/.lock','c');
    if ($lock===false || !flock($lock,$exclusive?LOCK_EX:LOCK_SH)) throw new RuntimeException('Storage lock unavailable');
    try { return $callback(); } finally { flock($lock,LOCK_UN); fclose($lock); }
}
function read_json(string $name): ?array {
    $path=private_dir().'/'.$name.'.json';
    if (!is_file($path)) return null;
    $raw=file_get_contents($path);
    if ($raw===false) throw new RuntimeException('Could not read stored data');
    $value=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    if (!is_array($value)) throw new RuntimeException('Stored data is invalid');
    return $value;
}
function write_json(string $name,array $value): void {
    $directory=private_dir(); $path=$directory.'/'.$name.'.json';
    $temp=tempnam($directory,'.pending-');
    if ($temp===false) throw new RuntimeException('Cannot allocate storage');
    try {
        $encoded=json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if (file_put_contents($temp,$encoded)===false || !chmod($temp,0600) || !rename($temp,$path)) throw new RuntimeException('Could not save data');
    } finally { if (is_file($temp)) unlink($temp); }
}
function initial_state(): array {
    return ['content'=>json_decode(file_get_contents(__DIR__.'/default-content.json'),true,64,JSON_THROW_ON_ERROR),'revision'=>0,'updatedAt'=>null];
}
function read_state(): array { return locked(fn()=>read_json('content') ?? initial_state(),false); }
function accounts(): array {
    return locked(function() {
        $stored=read_json('admins');
        if (is_array($stored) && isset($stored['users']) && is_array($stored['users'])) return $stored;
        $legacy=read_json('admin');
        if ($legacy) {
            $user=[
                'id'=>bin2hex(random_bytes(12)),
                'email'=>$legacy['email'],
                'displayName'=>$legacy['displayName'],
                'passwordHash'=>$legacy['passwordHash'],
                'version'=>$legacy['version'],
                'createdAt'=>gmdate('Y-m-d\\TH:i:s\\Z')
            ];
            $stored=['version'=>1,'users'=>[$user]];
            write_json('admins',$stored);
            return $stored;
        }
        return ['version'=>1,'users'=>[]];
    });
}
function public_user(array $user): array {
    return ['id'=>$user['id'],'email'=>$user['email'],'displayName'=>$user['displayName'],'createdAt'=>$user['createdAt'] ?? null];
}
function find_user_by_email(array $accounts,string $email): ?array {
    foreach ($accounts['users'] as $user) if (($user['email'] ?? '')===$email) return $user;
    return null;
}
function local_request(): bool {
    $host=$_SERVER['HTTP_HOST'] ?? '';
    return in_array($_SERVER['REMOTE_ADDR'] ?? '',['127.0.0.1','::1'],true) && (bool)preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/D',$host);
}
function session_start_safe(): void {
    if (session_status()===PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1');
    session_name('dp_admin');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>!local_request(),'httponly'=>true,'samesite'=>'Strict']);
    if (!session_start()) throw new RuntimeException('Session unavailable');
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));
}
function current_user(): ?array {
    session_start_safe();
    $accounts=accounts(); $auth=$_SESSION['auth'] ?? null;
    if (!is_array($auth) || !isset($auth['id'],$auth['version'],$auth['time']) || time()-$auth['time']>28800) return null;
    foreach ($accounts['users'] as $user) {
        if (($user['id'] ?? '')===$auth['id'] && isset($user['version']) && hash_equals($user['version'],$auth['version'])) return public_user($user);
    }
    return null;
}
function require_user(): array {
    $user=current_user();
    if (!$user) respond(['error'=>'Ingresá al panel para realizar esta acción.'],401);
    return $user;
}
function csrf_check(): void {
    session_start_safe();
    $host=$_SERVER['HTTP_HOST'] ?? '';
    $origin=(local_request()?'http':'https').'://'.$host;
    $given=$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (($_SERVER['HTTP_ORIGIN'] ?? '')!==$origin || !is_string($given) || !hash_equals($_SESSION['csrf'],$given)) respond(['error'=>'La sesión de seguridad venció. Recargá la página.'],403);
}
function json_body(int $limit=100000): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>$limit) respond(['error'=>'El contenido es demasiado grande.'],413);
    $stream=fopen('php://input','rb');
    if (!$stream) throw new RuntimeException('Cannot read request');
    $raw=stream_get_contents($stream,$limit+1); fclose($stream);
    if ($raw===false || strlen($raw)>$limit) respond(['error'=>'El contenido es demasiado grande.'],413);
    try { $value=json_decode($raw,true,64,JSON_THROW_ON_ERROR); }
    catch (JsonException) { respond(['error'=>'El formato de los datos no es válido.'],400); }
    if (!is_array($value) || array_is_list($value)) respond(['error'=>'El formato de los datos no es válido.'],400);
    return $value;
}
function rate_check(string $kind): void {
    $ip=hash('sha256',($_SERVER['REMOTE_ADDR'] ?? 'unknown').'|'.$kind);
    $limited=locked(function() use($ip,$kind) {
        $state=read_json('attempts') ?? []; $now=time();
        foreach ($state as $key=>$entry) if (($entry['until'] ?? 0)<=$now) unset($state[$key]);
        $global='total-'.$kind;
        $entry=$state[$ip] ?? ['count'=>0,'until'=>$now+900];
        $total=$state[$global] ?? ['count'=>0,'until'=>$now+900];
        if ($entry['count']>=10 || $total['count']>=100) return true;
        $entry['count']++; $total['count']++; $state[$ip]=$entry; $state[$global]=$total;
        write_json('attempts',$state); return false;
    });
    if ($limited) { header('Retry-After: 900'); respond(['error'=>'Hubo demasiados intentos. Esperá 15 minutos antes de volver a intentar.'],429); }
}
function signed_in(array $admin): void {
    session_regenerate_id(true);
    $_SESSION=['csrf'=>bin2hex(random_bytes(32)),'auth'=>['id'=>$admin['id'],'version'=>$admin['version'],'time'=>time()]];
}
