<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

$name = trim((string)($_POST['name'] ?? ''));
$phone = trim((string)($_POST['phone'] ?? ''));
$need = trim((string)($_POST['need'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));

if ($name === '' || $phone === '' || $need === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'required']);
  exit;
}

$to = '9952530109@mail.ru';
$subject = 'Заявка ВЕКСНАБ';
$body = "Имя: {$name}\nТелефон: {$phone}\nEmail: {$email}\nАдрес: " . ($_POST['address'] ?? '') .
  "\nКатегория: " . ($_POST['category'] ?? '') .
  "\nОбъём: " . ($_POST['volume'] ?? '') .
  "\nСрок: " . ($_POST['deadline'] ?? '') .
  "\nДоставка: " . (isset($_POST['delivery']) ? 'да' : 'нет') .
  "\nПотребность:\n{$need}\n";

$headers = 'Content-Type: text/plain; charset=UTF-8';
$ok = @mail($to, $subject, $body, $headers);
echo json_encode(['ok' => (bool)$ok]);
