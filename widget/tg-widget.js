// 手寫黑板 桌面小工具(Scriptable 腳本)
// 安裝方式見 widget/SETUP.md。支援中、大尺寸小工具。

// ===== 設定(只需要改 SECRET) =====
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxAenuVguPrxFWWusOww7FUeMslEiSQy33xhSA2bu5p3QHHBYxK8JVrQzgxApZ8Prbu/exec';
const SECRET = '';   // ← 在兩個單引號中間填入你自己的 4 位數身份碼

const SITE_URL = 'https://gemlong2002-wq.github.io/tg/';
const REFRESH_MINUTES = 5;   // 建議更新間隔;實際由 iOS 決定
const BOARD = new Color('#1f3d2b');
const CHALK = new Color('#f4f1e8');
const MUTED = new Color('#f4f1e8', 0.65);

// 後端錯誤字串 → 畫面用語
const USER_TEXT = {
  '密碼錯誤': '身份碼錯誤',
  '後端尚未設定密碼': '後端尚未設定身份碼',
  '後端兩組密碼相同,請改成不同': '後端兩組身份碼相同',
};

// ===== 向後端讀取「對方傳給我的最新一張」 =====
async function fetchLatest() {
  if (!SECRET) throw new Error('請先在腳本裡填入身份碼');
  const req = new Request(GAS_URL);
  req.method = 'POST';
  // 與 index.html 相同的送法
  req.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  req.body = JSON.stringify({ action: 'getLatest', secret: SECRET });
  req.timeoutInterval = 20;
  let text;
  try {
    text = await req.loadString();
  } catch (err) {
    throw new Error('連線失敗');
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('伺服器回應格式錯誤');
  }
  if (!data || !data.ok) {
    const msg = data && data.error;
    throw new Error(USER_TEXT[msg] || msg || '伺服器錯誤');
  }
  return data;
}

// ===== 把圖畫在黑板底色上,依小工具比例置中(整張看得到,不裁切) =====
function canvasSize(family) {
  // 以 iPhone 常見尺寸的比例 ×2 當畫布大小;iOS 會再縮放到實際小工具大小
  if (family === 'large') return new Size(676, 708);
  if (family === 'small') return new Size(338, 338);
  return new Size(676, 316);   // medium(預設)
}

function composeBackground(image, family) {
  const size = canvasSize(family);
  const ctx = new DrawContext();
  ctx.size = size;
  ctx.opaque = true;
  ctx.respectScreenScale = false;
  ctx.setFillColor(BOARD);
  ctx.fillRect(new Rect(0, 0, size.width, size.height));

  const pad = 12;
  const maxW = size.width - pad * 2;
  const maxH = size.height - pad * 2;
  const scale = Math.min(maxW / image.size.width, maxH / image.size.height);
  const w = image.size.width * scale;
  const h = image.size.height * scale;
  ctx.drawImageInRect(image, new Rect((size.width - w) / 2, (size.height - h) / 2, w, h));
  return ctx.getImage();
}

function formatTs(ts) {
  const df = new DateFormatter();
  df.dateFormat = 'M/d HH:mm';
  return df.string(new Date(Number(ts)));
}

// ===== 文字型畫面(還沒有訊息 / 錯誤) =====
function addCenteredText(widget, title, subtitle) {
  widget.addSpacer();
  const t = widget.addText(title);
  t.font = Font.semiboldSystemFont(16);
  t.textColor = CHALK;
  t.centerAlignText();
  if (subtitle) {
    widget.addSpacer(4);
    const s = widget.addText(subtitle);
    s.font = Font.systemFont(11);
    s.textColor = MUTED;
    s.centerAlignText();
  }
  widget.addSpacer();
}

// ===== 組出小工具 =====
async function buildWidget(family) {
  const widget = new ListWidget();
  widget.backgroundColor = BOARD;
  widget.url = SITE_URL;   // 點小工具打開網頁
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  try {
    const data = await fetchLatest();
    if (!data.image) {
      addCenteredText(widget, '還沒有訊息', '點一下打開黑板');
      return widget;
    }
    const image = Image.fromData(Data.fromBase64String(data.image));
    if (!image) throw new Error('圖片讀取失敗');
    widget.backgroundImage = composeBackground(image, family);

    // 右下角小字:送出時間
    widget.addSpacer();
    const row = widget.addStack();
    row.addSpacer();
    if (data.ts) {
      const label = row.addText(formatTs(data.ts));
      label.font = Font.systemFont(10);
      label.textColor = MUTED;
      label.shadowColor = new Color('#000000', 0.6);
      label.shadowRadius = 2;
    }
  } catch (err) {
    addCenteredText(widget, '⚠︎ ' + err.message, '點一下打開黑板');
  }
  return widget;
}

const family = config.widgetFamily || 'medium';
const widget = await buildWidget(family);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (family === 'large') {
  await widget.presentLarge();
} else {
  await widget.presentMedium();   // 在 Scriptable 裡按 ▶ 執行時預覽
}
Script.complete();
