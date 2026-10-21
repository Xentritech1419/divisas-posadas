<?php
declare(strict_types=1);

// Chat híbrido: los mensajes y el estado de los operadores viven fuera de public_html.
// Un visitante solamente puede leer su conversación con un token aleatorio de 256 bits.
const CHAT_OPERATOR_TTL=120;
const CHAT_RETENTION=604800; // 7 días
const CHAT_MAX_THREADS=120;
const CHAT_MAX_MESSAGES=100;

function chat_origin_check(): void {
    $expected=(local_request()?'http':'https').'://'.($_SERVER['HTTP_HOST'] ?? '');
    $received=$_SERVER['HTTP_ORIGIN'] ?? '';
    if (!is_string($received) || !hash_equals($expected,$received)) respond(['error'=>'Origen no permitido.'],403);
}

function chat_token_hash(mixed $value): string {
    if (!is_string($value) || !preg_match('/^[a-f0-9]{64}$/D',$value)) invalid('identificador de conversación');
    return hash('sha256',$value);
}

function chat_message_text(mixed $text,int $limit=1200): string {
    if (!is_string($text) || strlen($text)>$limit) invalid('mensaje: excede el límite permitido');
    $text=trim($text);
    if ($text==='' || !preg_match('//u',$text) || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$text)) invalid('mensaje: usá texto válido');
    return $text;
}

function chat_entries(): array {
    $stored=read_json('live-chat') ?? ['threads'=>[]];
    return (isset($stored['threads']) && is_array($stored['threads'])) ? $stored : ['threads'=>[]];
}
function chat_clean(array &$stored): void {
    $min=time()-CHAT_RETENTION;
    $stored['threads']=array_values(array_filter($stored['threads'],fn($t)=>is_array($t) && ($t['updatedAt'] ?? 0)>=$min));
    if (count($stored['threads'])>CHAT_MAX_THREADS) {
        usort($stored['threads'],fn($a,$b)=>($b['updatedAt'] ?? 0)<=>($a['updatedAt'] ?? 0));
        $stored['threads']=array_slice($stored['threads'],0,CHAT_MAX_THREADS);
    }
}
function chat_public_thread(array $thread): array {
    return ['id'=>$thread['id'],'closed'=>$thread['closed'] ?? false,'messages'=>$thread['messages'] ?? []];
}
function chat_new_message(string $role,string $text,?string $by=null): array {
    $entry=['id'=>bin2hex(random_bytes(8)),'role'=>$role,'text'=>$text,'time'=>time()];
    if ($by!==null) $entry['by']=$by;
    return $entry;
}
function chat_append(array &$thread,array $message): void {
    $thread['messages'][]=$message;
    if (count($thread['messages'])>CHAT_MAX_MESSAGES) $thread['messages']=array_slice($thread['messages'],-CHAT_MAX_MESSAGES);
    $thread['updatedAt']=time();
}

// Estado online solo para operadores que abrieron Mensajes y activaron Disponibilidad.
// La presencia caduca incluso si el navegador se cierra sin avisar.
function chat_active_operators(): array {
    $stored=read_json('chat-presence') ?? [];
    $now=time();$names=[];
    foreach ($stored as $entry) {
        if (is_array($entry) && ($entry['until'] ?? 0)>$now) $names[]=(string)($entry['name'] ?? 'Operador');
    }
    return $names;
}
function chat_is_online(): bool { return count(chat_active_operators())>0; }
function chat_operator_is_available(array $current,mixed $client): bool {
    if (!is_string($client) || !preg_match('/^[a-zA-Z0-9-]{16,64}$/D',$client)) return false;
    session_start_safe();
    $key=hash('sha256',$current['id'].'|'.session_id().'|'.$client);
    $entry=(read_json('chat-presence') ?? [])[$key] ?? null;
    return is_array($entry) && ($entry['until'] ?? 0)>time();
}
function chat_operator_heartbeat(array $current,array $input): never {
    $available=$input['available'] ?? null;
    $client=$input['clientId'] ?? null;
    if (!is_bool($available) || !is_string($client) || !preg_match('/^[a-zA-Z0-9-]{16,64}$/D',$client)) invalid('estado del operador');
    session_start_safe();
    $key=hash('sha256',$current['id'].'|'.session_id().'|'.$client);
    $online=locked(function() use($key,$available,$current) {
        $stored=read_json('chat-presence') ?? [];$now=time();
        foreach ($stored as $k=>$v) if (!is_array($v) || ($v['until'] ?? 0)<=$now) unset($stored[$k]);
        if ($available) $stored[$key]=['name'=>$current['displayName'],'until'=>$now+CHAT_OPERATOR_TTL];
        else unset($stored[$key]);
        write_json('chat-presence',$stored);
        return count($stored);
    });
    respond(['ok'=>true,'online'=>$online>0,'operators'=>$online]);
}
function chat_send_limit(): void {
    $ip=hash('sha256',($_SERVER['REMOTE_ADDR'] ?? 'unknown').'|live-chat');
    $blocked=locked(function() use($ip){
        $now=time();$state=read_json('chat-limits') ?? [];
        foreach ($state as $key=>$value) if (!is_array($value) || ($value['until'] ?? 0)<=$now) unset($state[$key]);
        $entry=$state[$ip] ?? ['count'=>0,'until'=>$now+300];
        $global=$state['total'] ?? ['count'=>0,'until'=>$now+300];
        if ($entry['count']>=40 || $global['count']>=1000) return true;
        $entry['count']++;$global['count']++;$state[$ip]=$entry;$state['total']=$global;
        write_json('chat-limits',$state);return false;
    });
    if ($blocked){header('Retry-After: 300');respond(['error'=>'Demasiados mensajes. Intentá nuevamente en unos minutos o usá WhatsApp.'],429);}
}
function chat_guest_request(array $input): never {
    chat_origin_check();
    $action=$input['action'] ?? null;
    if (!in_array($action,['poll','start','send'],true)) invalid('acción del chat');
    $hash=chat_token_hash($input['token'] ?? null);
    if ($action==='poll') {
        $thread=locked(function() use($hash) {
            foreach (chat_entries()['threads'] as $t) if (($t['tokenHash'] ?? '')===$hash) return chat_public_thread($t);
            return null;
        },false);
        respond(['online'=>chat_is_online(),'thread'=>$thread]);
    }
    chat_send_limit();
    // Verificar disponibilidad nuevamente en el servidor para evitar falsas derivaciones.
    if (!chat_is_online()) respond(['error'=>'No hay operadores disponibles. Continuá por WhatsApp.','offline'=>true],409);
    if ($action==='start') {
        $history=$input['history'] ?? [];
        if (!is_array($history) || count($history)>18) invalid('historial del chat');
        $initial=[];
        foreach ($history as $message) {
            if (!is_array($message) || !in_array($message['role'] ?? null,['bot','user'],true)) invalid('historial del chat');
            $initial[]=chat_new_message($message['role']==='user'?'visitor':'bot',chat_message_text($message['text'] ?? null,700));
        }
        $thread=locked(function() use($hash,$initial) {
            $stored=chat_entries();chat_clean($stored);
            foreach ($stored['threads'] as &$t) {
                if (($t['tokenHash'] ?? '')===$hash) {
                    $t['closed']=false;$t['updatedAt']=time();$result=chat_public_thread($t);
                    write_json('live-chat',$stored);return $result;
                }
            }
            unset($t);
            $t=['id'=>bin2hex(random_bytes(12)),'tokenHash'=>$hash,'closed'=>false,
                'createdAt'=>time(),'updatedAt'=>time(),'messages'=>$initial];
            $stored['threads'][]=$t;chat_clean($stored);write_json('live-chat',$stored);
            return chat_public_thread($t);
        });
        respond(['online'=>true,'thread'=>$thread],201);
    }
    $text=chat_message_text($input['text'] ?? null);
    $thread=locked(function() use($hash,$text) {
        $stored=chat_entries();
        foreach ($stored['threads'] as &$t) {
            if (($t['tokenHash'] ?? '')!==$hash) continue;
            if ($t['closed'] ?? false) return 'closed';
            chat_append($t,chat_new_message('visitor',$text));
            $result=chat_public_thread($t);
            write_json('live-chat',$stored);return $result;
        }
        unset($t);
        return null;
    });
    if ($thread==='closed') respond(['error'=>'Esta conversación fue cerrada. Solicitá una nueva atención.'],409);
    if ($thread===null) respond(['error'=>'La conversación no existe. Iniciá una nueva.'],404);
    respond(['online'=>true,'thread'=>$thread]);
}
function chat_operator_threads(): never {
    require_user();
    $threads=locked(function(){
        $stored=chat_entries();$result=[];
        foreach ($stored['threads'] as $t) {
            if (!is_array($t)) continue;
            $messages=$t['messages'] ?? []; $last=end($messages);
            $result[]=['id'=>$t['id'],'updatedAt'=>$t['updatedAt'] ?? 0,
                'closed'=>$t['closed'] ?? false,'count'=>count($messages),
                'preview'=>is_array($last)?(function_exists('mb_substr')?mb_substr((string)($last['text'] ?? ''),0,90):substr((string)($last['text'] ?? ''),0,90)):'Nueva conversación'];
        }
        usort($result,fn($a,$b)=>$b['updatedAt']<=>$a['updatedAt']);
        return array_slice($result,0,CHAT_MAX_THREADS);
    },false);
    respond(['threads'=>$threads,'online'=>chat_is_online()]);
}
function chat_operator_thread(string $id): never {
    require_user();
    if (!preg_match('/^[a-f0-9]{24}$/D',$id)) invalid('conversación');
    $thread=locked(function() use($id){
        foreach (chat_entries()['threads'] as $t) if (($t['id'] ?? '')===$id) return chat_public_thread($t);
        return null;
    },false);
    if (!$thread) respond(['error'=>'Conversación no encontrada.'],404);
    respond(['thread'=>$thread]);
}
function chat_operator_action(array $current,array $input): never {
    csrf_check();
    $id=$input['id'] ?? null;
    $action=$input['action'] ?? null;
    if (!is_string($id) || !preg_match('/^[a-f0-9]{24}$/D',$id) || !in_array($action,['send','close'],true)) invalid('conversación');
    $text='';
    if ($action==='send') {
        if (!chat_operator_is_available($current,$input['clientId'] ?? null)) respond(['error'=>'Activá tu disponibilidad para responder desde Mensajes.'],409);
        chat_send_limit();
        $text=chat_message_text($input['text'] ?? null);
    }
    $thread=locked(function() use($current,$id,$action,$text){
        $stored=chat_entries();
        foreach ($stored['threads'] as &$t) {
            if (($t['id'] ?? '')!==$id) continue;
            if ($action==='close') $t['closed']=true;
            elseif (!($t['closed'] ?? false)) chat_append($t,chat_new_message('operator',$text,$current['displayName']));
            else return 'closed';
            if ($action==='close') $t['updatedAt']=time();
            $result=chat_public_thread($t);
            write_json('live-chat',$stored);return $result;
        }
        unset($t);
        return null;
    });
    if ($thread==='closed') respond(['error'=>'La conversación está cerrada.'],409);
    if ($thread===null) respond(['error'=>'Conversación no encontrada.'],404);
    respond(['thread'=>$thread]);
}
