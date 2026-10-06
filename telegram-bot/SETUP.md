# Telegram → גיליון משימות: הוראות הקמה

כל הודעת טקסט שתשלח לבוט תיכנס כשורה חדשה בלשונית "משימות שוטפות":
- עמודה A (תאריך) מקבלת את התאריך של היום בפורמט `d/m/yy`.
- עמודה B (משימות) מקבלת את הטקסט, כולל ירידות שורה.
- עמודה E (ביצוע) מקבלת את הערך "לא בוצע", כדי שהמשימה תופיע בתצוגת הפילטר "בביצוע + לא בוצע".
- אם יש פילטר פעיל, טווח הפילטר מורחב כך שיכלול את השורה החדשה, והקריטריונים שלו נשמרים.

הפקודה `/undo` מוחקת את המשימה האחרונה שנוספה, וזה שימושי כשיש טעות הקלדה.

## 1. בוט (BotFather)
1. שולחים `/newbot`, בוחרים שם ושומרים את ה-token. **לא לשתף אותו עם אף אחד.**
2. שולחים `/setjoingroups` ובוחרים Disable.

## 2. סקריפט
1. בגיליון: Extensions → Apps Script.
2. ב-Project Settings (גלגל השיניים):
   - מסמנים את **Show "appsscript.json" manifest file in editor**.
   - מגדירים Time zone ל-`(GMT+03:00) Jerusalem`.
3. מדביקים את `Code.gs` ואת `appsscript.json` מהתיקייה הזו, במקום התוכן הקיים, ושומרים.
4. ב-Project Settings → Script Properties מוסיפים:
   - `BOT_TOKEN`: ה-token מהבוט.
   - `SHEET_ID`: המזהה מה-URL של הגיליון (החלק שבין `/d/` ל-`/edit`).
   - `SHEET_NAME`: לא חובה. נדרש רק אם משנים את שם הלשונית "משימות שוטפות".

## 3. הרצות חד-פעמיות (בוחרים פונקציה למעלה ולוחצים Run)
1. `generateWebhookKey`. בהרצה הראשונה Google תבקש הרשאות, ומאשרים. אם מופיע "Google hasn't verified this app", לוחצים Advanced → Go to project. זה הסקריפט שלך.
2. שולחים לבוט בטלגרם "hi", מריצים `getMyId`, ומעתיקים מה-Execution log את המספר שמופיע אחרי `"from":{"id":`. אותו שומרים ב-Script Property בשם `ALLOWED_USER_ID`.
3. `testAddAndUndo`: אמורה להופיע ולהימחק שורת בדיקה בגיליון.

## 4. פריסה
1. Deploy → New deployment → סוג Web app, עם Execute as: **Me** ו-Who has access: **Anyone**.
2. מעתיקים את כתובת ה-`.../exec` ושומרים אותה ב-Script Property בשם `WEB_APP_URL`.
3. מריצים `setWebhook`. בלוג אמור להופיע `"ok":true`.
4. שולחים לבוט משימה ובודקים שהיא נוספה לגיליון.

## עדכון קוד בעתיד
Deploy → Manage deployments → עיפרון → Version: **New version** → Deploy.
כך ה-URL נשאר אותו URL, ואין צורך להריץ שוב את `setWebhook`.

## תקלות
- אם הבוט לא עונה, מריצים `webhookInfo` ובודקים את `last_error_message`.
- `Sheet tab not found` בלוג פירושו ששם הלשונית השתנה, וצריך להגדיר `SHEET_NAME`.

## אבטחה
- ה-URL של ה-Web App פתוח לכולם, אבל בקשה בלי `WEBHOOK_KEY` נדחית מיד, בלי לגעת בגיליון.
- רק הודעות מה-`ALLOWED_USER_ID` שלך מעובדות. הודעות מכל משתמש אחר נזרקות בשקט.
- ה-token והמפתח שמורים ב-Script Properties ולא בקוד או בריפו.
- שיחות עם בוט בטלגרם לא מוצפנות מקצה לקצה. לא שולחים דרכן סיסמאות.
- אם ה-token דלף: ב-BotFather שולחים `/revoke`, מעדכנים את `BOT_TOKEN` ומריצים שוב את `setWebhook`.
