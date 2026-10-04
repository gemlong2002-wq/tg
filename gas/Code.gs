/**
 * tg(手寫黑板)後端 — Google Apps Script
 *
 * 網頁用 POST 傳 JSON 進來(身分由密碼決定,前端送來的任何身分欄位一律忽略):
 *   { action: 'saveDrawing', secret: '<自己的密碼>', image: '<PNG base64>' }
 *   { action: 'getLatest',   secret: '<自己的密碼>' }
 * 回傳 JSON:
 *   成功 { ok: true, identity, image, ts }   失敗 { ok: false, error }
 *
 * 需要的 Script Properties(專案設定 → 指令碼屬性,值由 Boss 自設,程式只讀 key):
 *   HUSBAND_SECRET  老公的密碼
 *   WIFE_SECRET     老婆的密碼
 * 程式自動維護的 Script Properties:
 *   FOLDER_ID              存圖的 Drive 資料夾 ID(第一次存圖時自動建立)
 *   TS_latest_to_husband   最新一張給老公的時間戳(毫秒)
 *   TS_latest_to_wife      最新一張給老婆的時間戳(毫秒)
 */

var FOLDER_NAME = 'tg_chalkboard';
var MAX_IMAGE_CHARS = 3 * 1024 * 1024; // base64 字元數上限,約 2.2MB 圖片

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var props = PropertiesService.getScriptProperties();

    var husbandSecret = props.getProperty('HUSBAND_SECRET');
    var wifeSecret = props.getProperty('WIFE_SECRET');
    if (!husbandSecret && !wifeSecret) return json_({ ok: false, error: '後端尚未設定密碼' });
    if (husbandSecret && husbandSecret === wifeSecret) {
      return json_({ ok: false, error: '後端兩組密碼相同,請改成不同' });
    }

    var identity = null;
    if (typeof req.secret === 'string' && req.secret !== '') {
      if (husbandSecret && req.secret === husbandSecret) identity = 'husband';
      else if (wifeSecret && req.secret === wifeSecret) identity = 'wife';
    }
    if (!identity) return json_({ ok: false, error: '密碼錯誤' });

    if (req.action === 'saveDrawing') return saveDrawing_(identity, req.image, props);
    if (req.action === 'getLatest') return getLatest_(identity, props);
    return json_({ ok: false, error: '未知的操作' });
  } catch (err) {
    return json_({ ok: false, error: '伺服器錯誤:' + err.message });
  }
}

// 直接用瀏覽器打開網址時顯示,方便確認部署成功
function doGet() {
  return json_({ ok: true, message: 'tg backend is running' });
}

function saveDrawing_(identity, image, props) {
  if (typeof image !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(image)) {
    return json_({ ok: false, error: '圖片資料錯誤' });
  }
  if (image.length > MAX_IMAGE_CHARS) return json_({ ok: false, error: '圖片太大' });

  var target = identity === 'husband' ? 'wife' : 'husband';
  var name = 'latest_to_' + target;

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var folder = getFolder_(props);
    var files = folder.getFilesByName(name);
    if (files.hasNext()) {
      files.next().setContent(image);
    } else {
      folder.createFile(name, image, MimeType.PLAIN_TEXT);
    }
    var ts = Date.now();
    props.setProperty('TS_' + name, String(ts));
    return json_({ ok: true, identity: identity, image: null, ts: ts });
  } finally {
    lock.releaseLock();
  }
}

function getLatest_(identity, props) {
  var name = 'latest_to_' + identity;
  var empty = { ok: true, identity: identity, image: null, ts: null };
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) return json_(empty);

  var folder;
  try { folder = DriveApp.getFolderById(folderId); } catch (err) {
    return json_(empty); // 資料夾已被永久刪除,下次送出會重建
  }
  var files = folder.getFilesByName(name);
  if (!files.hasNext()) return json_(empty);

  var image = files.next().getBlob().getDataAsString();
  var ts = Number(props.getProperty('TS_' + name)) || null;
  return json_({ ok: true, identity: identity, image: image, ts: ts });
}

function getFolder_(props) {
  var id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { /* 資料夾被刪了,重建 */ }
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
