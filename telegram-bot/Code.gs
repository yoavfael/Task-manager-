/**
 * Telegram → Google Sheets task inbox.
 * Every text message from the allowed Telegram user becomes a new row in the tasks sheet.
 *
 * Script Properties (Project Settings → Script Properties):
 *   BOT_TOKEN        token from @BotFather              (secret)
 *   WEBHOOK_KEY      created by generateWebhookKey()     (secret)
 *   SHEET_ID         spreadsheet ID from its URL
 *   SHEET_NAME       tab name (optional, defaults to the first tab)
 *   ALLOWED_USER_ID  your Telegram numeric user id (from getMyId)
 *   WEB_APP_URL      the deployed /exec URL
 */

const P = PropertiesService.getScriptProperties();

// Column layout of the tasks sheet (1-based)
const COL = { DATE: 1, TASK: 2, WHEN: 3, AREA: 4, STATUS: 5, NOTES: 6 };
const DATE_FORMAT = 'd/m/yy';

function doPost(e) {
  // Apps Script cannot read request headers, so the shared secret travels in the URL
  if (!e || !e.parameter || e.parameter.key !== P.getProperty('WEBHOOK_KEY')) return;

  const update = JSON.parse(e.postData.contents);
  const msg = update.message;
  if (!msg || !msg.text) return;
  if (String(msg.from.id) !== P.getProperty('ALLOWED_USER_ID')) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let reply;
  try {
    // Telegram may redeliver an update; process each update_id once
    const lastUpdate = Number(P.getProperty('LAST_UPDATE_ID') || 0);
    if (update.update_id <= lastUpdate) return;
    P.setProperty('LAST_UPDATE_ID', String(update.update_id));

    const text = msg.text.trim();
    if (text === '/undo') reply = undoLast();
    else if (text.startsWith('/')) reply = 'שלח טקסט כדי להוסיף משימה. /undo מוחק את המשימה האחרונה שנוספה.';
    else reply = addTask(text);
  } finally {
    lock.releaseLock();
  }
  send(msg.chat.id, reply);
  // No return value on purpose: returning ContentService output makes Apps Script answer with a 302 redirect
}

function addTask(text) {
  const sheet = getSheet();
  const row = lastRowInColumn(sheet, COL.TASK) + 1;
  if (row > sheet.getMaxRows()) sheet.insertRowAfter(sheet.getMaxRows());

  const today = new Date();
  today.setHours(0, 0, 0, 0); // script time zone is Asia/Jerusalem (appsscript.json)

  sheet.getRange(row, COL.DATE, 1, 2).setValues([[today, text]]);
  sheet.getRange(row, COL.DATE).setNumberFormat(DATE_FORMAT);

  P.setProperty('LAST_ADDED', JSON.stringify({ row: row, text: text }));
  return '✅ נוספה (שורה ' + row + '):\n' + text;
}

function undoLast() {
  const last = JSON.parse(P.getProperty('LAST_ADDED') || 'null');
  if (!last) return 'אין משימה לבטל.';
  const sheet = getSheet();
  // Only delete if the row still holds what we wrote (rows may have moved since)
  if (sheet.getRange(last.row, COL.TASK).getValue() !== last.text) {
    return '⚠️ השורה ' + last.row + ' השתנתה מאז, לא נמחק כלום.';
  }
  sheet.deleteRow(last.row);
  P.deleteProperty('LAST_ADDED');
  return '🗑️ נמחקה: ' + last.text;
}

function getSheet() {
  const ss = SpreadsheetApp.openById(P.getProperty('SHEET_ID'));
  const name = P.getProperty('SHEET_NAME');
  return name ? ss.getSheetByName(name) : ss.getSheets()[0];
}

// appendRow() would land below any stray cell in any column; anchor on the task column instead
function lastRowInColumn(sheet, col) {
  const bottom = sheet.getRange(sheet.getMaxRows(), col);
  if (bottom.getValue() !== '') return bottom.getRow();
  return bottom.getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
}

function send(chatId, text) {
  tg('sendMessage', { chat_id: chatId, text: text });
}

function tg(method, payload) {
  return UrlFetchApp.fetch('https://api.telegram.org/bot' + P.getProperty('BOT_TOKEN') + '/' + method, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  }).getContentText();
}

// ---------- One-time setup, run manually from the editor ----------

function generateWebhookKey() {
  P.setProperty('WEBHOOK_KEY', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  Logger.log('WEBHOOK_KEY saved to Script Properties.');
}

// Send the bot any message first, then run this and copy "from":{"id":...}
function getMyId() {
  Logger.log(tg('getUpdates', {}));
}

function setWebhook() {
  Logger.log(tg('setWebhook', {
    url: P.getProperty('WEB_APP_URL') + '?key=' + P.getProperty('WEBHOOK_KEY'),
    allowed_updates: ['message'],
    drop_pending_updates: true
  }));
}

function webhookInfo() {
  Logger.log(tg('getWebhookInfo', {}));
}

// Local test without Telegram: adds a row and undoes it
function testAddAndUndo() {
  Logger.log(addTask('בדיקה מהסקריפט'));
  Logger.log(undoLast());
}
