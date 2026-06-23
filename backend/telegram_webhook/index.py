import json
import os
import urllib.request
import psycopg2

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def _tg_api(method: str, payload: dict):
    token = os.environ['TELEGRAM_BOT_TOKEN']
    url = 'https://api.telegram.org/bot%s/%s' % (token, method)
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {'ok': False, 'error': str(e)}

def handler(event: dict, context) -> dict:
    """Обработка нажатий кнопок Одобрить/Отклонить в Telegram"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    callback = body.get('callback_query')
    if not callback:
        return {'statusCode': 200, 'body': json.dumps({'ok': True})}

    data = callback.get('data', '')
    callback_id = callback.get('id')
    message = callback.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    message_id = message.get('message_id')

    conn = _db()
    cur = conn.cursor()

    # data формата: approve:<pending_id> или reject:<pending_id>
    if ':' not in data:
        _tg_api('answerCallbackQuery', {'callback_query_id': callback_id})
        return {'statusCode': 200, 'body': json.dumps({'ok': True})}

    action, pid_str = data.split(':', 1)
    try:
        pid = int(pid_str)
    except ValueError:
        _tg_api('answerCallbackQuery', {'callback_query_id': callback_id})
        return {'statusCode': 200, 'body': json.dumps({'ok': True})}

    cur.execute("SELECT device_id, user_name, text, status FROM pending_messages WHERE id = %s" % pid)
    row = cur.fetchone()
    if not row:
        _tg_api('answerCallbackQuery', {'callback_query_id': callback_id, 'text': 'Заявка не найдена'})
        return {'statusCode': 200, 'body': json.dumps({'ok': True})}

    device_id, user_name, text, status = row
    if status != 'pending':
        _tg_api('answerCallbackQuery', {'callback_query_id': callback_id, 'text': 'Уже обработано'})
        return {'statusCode': 200, 'body': json.dumps({'ok': True})}

    if action == 'approve':
        # Публикуем сообщение в чат
        name_esc = (user_name or 'Гость').replace("'", "''")
        text_esc = text.replace("'", "''")
        cur.execute(
            "INSERT INTO messages (user_id, user_name, text) VALUES (NULL, '%s', '%s')" % (name_esc, text_esc)
        )
        # Добавляем автора в доверенные
        did_esc = device_id.replace("'", "''")
        cur.execute(
            "INSERT INTO trusted_authors (device_id) VALUES ('%s') ON CONFLICT (device_id) DO NOTHING" % did_esc
        )
        cur.execute("UPDATE pending_messages SET status = 'approved' WHERE id = %s" % pid)
        conn.commit()
        new_text = '✅ ОДОБРЕНО\n\n👤 %s\n💬 %s\n\nТеперь этот человек может писать свободно.' % (user_name, text)
        _tg_api('editMessageText', {'chat_id': chat_id, 'message_id': message_id, 'text': new_text})
        _tg_api('answerCallbackQuery', {'callback_query_id': callback_id, 'text': 'Одобрено!'})
    elif action == 'reject':
        cur.execute("UPDATE pending_messages SET status = 'rejected' WHERE id = %s" % pid)
        conn.commit()
        new_text = '❌ ОТКЛОНЕНО\n\n👤 %s\n💬 %s' % (user_name, text)
        _tg_api('editMessageText', {'chat_id': chat_id, 'message_id': message_id, 'text': new_text})
        _tg_api('answerCallbackQuery', {'callback_query_id': callback_id, 'text': 'Отклонено'})

    return {'statusCode': 200, 'body': json.dumps({'ok': True})}
