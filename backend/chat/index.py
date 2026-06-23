import json
import os
import psycopg2

def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    }

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def _get_user(cur, token: str):
    t = token.replace("'", "''")
    cur.execute(
        "SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % t
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Общий чат — простой, без модерации, пишут все"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = _db()
    cur = conn.cursor()

    # GET — получить последние 50 сообщений
    if method == 'GET':
        cur.execute(
            "SELECT id, user_name, text, created_at FROM messages ORDER BY created_at DESC LIMIT 50"
        )
        rows = cur.fetchall()
        messages = [
            {
                'id': r[0],
                'user_name': r[1],
                'text': r[2],
                'created_at': r[3].strftime('%d.%m.%Y %H:%M') if r[3] else '',
            }
            for r in reversed(rows)
        ]
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'messages': messages}, ensure_ascii=False)}

    # POST — отправить сообщение
    if method == 'POST':
        headers = event.get('headers') or {}
        raw_token = headers.get('X-Authorization') or headers.get('Authorization') or headers.get('authorization') or ''
        token = raw_token.replace('Bearer ', '').replace('bearer ', '').strip()
        user = _get_user(cur, token) if token else None
        user_id = user[0] if user else None
        user_name = user[1] if user else 'Гость'

        body = json.loads(event.get('body') or '{}')
        text = (body.get('text') or '').strip()[:1000]
        if not text:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Сообщение не может быть пустым'}, ensure_ascii=False)}
        name_esc = (user_name or 'Гость').replace("'", "''")
        text_esc = text.replace("'", "''")
        uid_val = str(user_id) if user_id else 'NULL'
        cur.execute(
            "INSERT INTO messages (user_id, user_name, text) VALUES (%s, '%s', '%s') RETURNING id, created_at"
            % (uid_val, name_esc, text_esc)
        )
        row = cur.fetchone()
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({
                    'message': {
                        'id': row[0],
                        'user_name': user_name or 'Участник',
                        'text': text,
                        'created_at': row[1].strftime('%d.%m.%Y %H:%M') if row[1] else '',
                    }
                }, ensure_ascii=False)}

    return {'statusCode': 405, 'headers': _cors(), 'body': json.dumps({'error': 'Метод не поддерживается'})}