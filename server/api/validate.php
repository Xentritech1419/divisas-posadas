<?php
declare(strict_types=1);

function invalid(string $field): never { throw new InvalidArgumentException('Revisá el campo ' . $field . '.'); }
function object_value(mixed $value, string $field): array {
    if (!is_array($value) || array_is_list($value)) invalid($field);
    return $value;
}
function text_value(mixed $value, string $field, int $max, bool $empty = false): string {
    if (!is_string($value)) invalid($field);
    $value = trim($value);
    $length = preg_match_all('/./us', $value);
    if ($length === false || (!$empty && $length === 0) || $length > $max) invalid($field);
    return $value;
}
function bool_value(mixed $value, string $field): bool { if (!is_bool($value)) invalid($field); return $value; }
function number_value(mixed $value, string $field, float $max): int|float {
    if ((!is_int($value) && !is_float($value)) || !is_finite((float)$value) || $value <= 0 || $value > $max) invalid($field);
    return $value;
}
function color_value(mixed $value, string $field): string {
    if (!is_string($value) || !preg_match('/^#[0-9a-fA-F]{6}$/D', $value)) invalid($field);
    return $value;
}
function list_value(mixed $value, string $field, int $min, int $max): array {
    if (!is_array($value) || !array_is_list($value) || count($value) < $min || count($value) > $max) invalid($field);
    return $value;
}
function currency_value(mixed $value, string $field, bool $pesos = true): string {
    $allowed = ['azul', 'verde', 'euro', 'real', 'guarani', 'paypal'];
    if ($pesos) $allowed[] = 'ars';
    if (!is_string($value) || !in_array($value, $allowed, true)) invalid($field);
    return $value;
}
function validate_content(mixed $input): array {
    $v = object_value($input, 'contenido'); $out = [];
    $out['demo'] = bool_value($v['demo'] ?? null, 'modo de ejemplo');
    $b = object_value($v['brand'] ?? null, 'marca');
    $logo = text_value($b['logoUrl'] ?? null, 'logo', 200, true);
    if ($logo !== '' && $logo !== '/logo-divisas-posadas.svg' && !preg_match('~^/api/media/logo-[a-zA-Z0-9-]+\.(png|jpg|webp)$~D', $logo)) invalid('logo');
    $out['brand'] = ['name' => text_value($b['name'] ?? null, 'marca', 180), 'tagline' => text_value($b['tagline'] ?? null, 'bajada', 180), 'logoUrl' => $logo, 'primary' => color_value($b['primary'] ?? null, 'color principal'), 'dark' => color_value($b['dark'] ?? null, 'color oscuro')];
    $copy = object_value($v['copy'] ?? null, 'textos'); $out['copy'] = [];
    foreach (['eyebrow','heroTitle','heroAccent','heroDescription','ratesTitle','ratesDescription','offersTitle','offersDescription','howTitle','contactTitle','contactDescription','disclaimer'] as $key) {
        $max = str_ends_with($key, 'Description') || $key === 'disclaimer' ? 1600 : 180;
        $out['copy'][$key] = text_value($copy[$key] ?? null, $key, $max);
    }
    $c = object_value($v['contact'] ?? null, 'contacto');
    $whatsapp = text_value($c['whatsapp'] ?? null, 'WhatsApp', 15, true);
    if ($whatsapp !== '' && !preg_match('/^[1-9]\d{7,14}$/D', $whatsapp)) invalid('WhatsApp');
    $email = text_value($c['email'] ?? null, 'correo de contacto', 200, true);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) invalid('correo de contacto');
    $out['contact'] = ['whatsapp'=>$whatsapp, 'location'=>text_value($c['location'] ?? null, 'ubicación',180), 'address'=>text_value($c['address'] ?? null,'dirección',250,true), 'hours'=>text_value($c['hours'] ?? null,'horarios',180), 'email'=>$email];
    $out['currencies'] = []; $ids = [];
    foreach (list_value($v['currencies'] ?? null,'divisas',6,6) as $raw) {
        $c = object_value($raw,'divisa'); $id = currency_value($c['id'] ?? null,'divisa',false);
        if (in_array($id,$ids,true)) invalid('divisas repetidas'); $ids[]=$id;
        $buy=number_value($c['buy'] ?? null,'compra',1e9); $sell=number_value($c['sell'] ?? null,'venta',1e9);
        $out['currencies'][]=['id'=>$id,'name'=>text_value($c['name'] ?? null,'nombre de divisa',180),'code'=>text_value($c['code'] ?? null,'código',12),'symbol'=>text_value($c['symbol'] ?? null,'símbolo',5),'description'=>text_value($c['description'] ?? null,'descripción',180),'buy'=>$buy,'sell'=>$sell,'color'=>color_value($c['color'] ?? null,'color de divisa'),'active'=>bool_value($c['active'] ?? null,'visibilidad')];
    }
    $out['offers']=[]; $ids=[];
    foreach (list_value($v['offers'] ?? null,'ofertas',0,20) as $raw) {
        $o=object_value($raw,'oferta'); $id=text_value($o['id'] ?? null,'id de oferta',80);
        if (in_array($id,$ids,true)) invalid('ofertas repetidas'); $ids[]=$id;
        $from=currency_value($o['from'] ?? null,'moneda de entrega'); $to=currency_value($o['to'] ?? null,'moneda de recepción');
        if ($from===$to) invalid('monedas de la oferta');
        $date=text_value($o['expiresAt'] ?? null,'vencimiento',40,true);
        if ($date!=='' && (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/D',$date) || strtotime($date)===false)) invalid('vencimiento');
        $out['offers'][]=['id'=>$id,'title'=>text_value($o['title'] ?? null,'título de oferta',180),'description'=>text_value($o['description'] ?? null,'descripción de oferta',250,true),'from'=>$from,'to'=>$to,'amount'=>number_value($o['amount'] ?? null,'monto entregado',1e12),'receive'=>number_value($o['receive'] ?? null,'monto recibido',1e12),'active'=>bool_value($o['active'] ?? null,'oferta activa'),'expiresAt'=>$date];
    }
    $out['steps']=[];
    foreach (list_value($v['steps'] ?? null,'pasos',3,3) as $s) {
        $s=object_value($s,'paso'); $out['steps'][]=['title'=>text_value($s['title'] ?? null,'título de paso',180),'description'=>text_value($s['description'] ?? null,'descripción de paso',1600)];
    }
    $out['faqs']=[];
    foreach (list_value($v['faqs'] ?? null,'preguntas',1,20) as $f) {
        $f=object_value($f,'pregunta'); $out['faqs'][]=['id'=>text_value($f['id'] ?? null,'id de pregunta',80),'question'=>text_value($f['question'] ?? null,'pregunta',180),'answer'=>text_value($f['answer'] ?? null,'respuesta',1600),'keywords'=>text_value($f['keywords'] ?? null,'palabras clave',300,true)];
    }
    $b=object_value($v['bot'] ?? null,'asistente');
    $out['bot']=['name'=>text_value($b['name'] ?? null,'nombre del asistente',180),'welcome'=>text_value($b['welcome'] ?? null,'bienvenida',1600),'fallback'=>text_value($b['fallback'] ?? null,'respuesta general',1600)];
    return $out;
}
