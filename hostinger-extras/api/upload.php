<?php
/**
 * Lighthouse Classes — lesson video upload endpoint (Hostinger).
 *
 * Receives a video file (multipart field "file") from the admin panel and
 * stores it in ../videos (i.e. public_html/videos), then returns a JSON
 * { "url": "https://<your-domain>/videos/<file>.mp4" } that the site saves on
 * the lesson and plays back in the student's video player.
 *
 * Security: gated by a shared token (X-Upload-Token) that must match
 * HOSTINGER_UPLOAD_TOKEN in src/lib/config.ts. Because the site is static the
 * token is visible in the site's JavaScript, so this is a basic gate against
 * casual abuse — not strong authentication. Rotate the token (config.ts +
 * rebuild) and watch the videos folder if you ever see misuse.
 *
 * This file is generated into the deploy zip by scripts/build-hostinger.sh,
 * which replaces __UPLOAD_TOKEN__ with the token from config.ts.
 */

// --- CORS: lets the admin panel upload from localhost during testing too ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

header('Content-Type: application/json');

$TOKEN = '__UPLOAD_TOKEN__';

function fail($code, $msg) {
  http_response_code($code);
  echo json_encode(['error' => $msg]);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'Method not allowed.');

if (!hash_equals($TOKEN, $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '')) fail(401, 'Unauthorized upload.');

if (!isset($_FILES['file'])) {
  // PHP drops $_FILES when the body exceeds post_max_size — surface that clearly.
  $len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
  if ($len > 0) fail(413, 'File is larger than the server upload limit. Raise the PHP limit in hPanel, or use a video link.');
  fail(400, 'No file received.');
}

$f = $_FILES['file'];
if ($f['error'] !== UPLOAD_ERR_OK) {
  $map = [
    UPLOAD_ERR_INI_SIZE => 'File exceeds the server upload_max_filesize.',
    UPLOAD_ERR_FORM_SIZE => 'File is too large.',
    UPLOAD_ERR_PARTIAL => 'Upload was interrupted — please try again.',
    UPLOAD_ERR_NO_TMP_DIR => 'Server is missing a temp folder.',
    UPLOAD_ERR_CANT_WRITE => 'Server could not write the file to disk.',
  ];
  fail(413, $map[$f['error']] ?? ('Upload error ' . $f['error']));
}

// Accept real video files and image files (course thumbnails)
$allowed = [
  'video/mp4' => 'mp4',
  'video/webm' => 'webm',
  'video/quicktime' => 'mov',
  'video/x-matroska' => 'mkv',
  'video/ogg' => 'ogv',
  'video/mpeg' => 'mpg',
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
  'image/webp' => 'webp',
  'image/gif' => 'gif',
  'image/avif' => 'avif',
];
$mime = '';
if (function_exists('finfo_open')) {
  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($finfo, $f['tmp_name']);
  finfo_close($finfo);
}
if (!isset($allowed[$mime])) fail(415, 'Only video and image files are allowed (detected "' . $mime . '").');
$ext = $allowed[$mime];

$dir = __DIR__ . '/../videos';
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) fail(500, 'Could not create the videos folder.');

$name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest = $dir . '/' . $name;
if (!move_uploaded_file($f['tmp_name'], $dest)) fail(500, 'Could not save the uploaded file.');
@chmod($dest, 0644);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
echo json_encode(['url' => $scheme . '://' . $host . '/videos/' . $name]);
