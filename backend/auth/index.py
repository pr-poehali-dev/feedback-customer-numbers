import json
import os
import hashlib
import secrets
import psycopg2  # noqa

def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
    }

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def _get_user_by_token(cur, token: str):
    cur.execute(
        "SELECT u.id, u.email, u.name FROM sessions s "
        "JOIN users u ON u.id = s.user_id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''")
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Регистрация, вход и выход пользователей через email и пароль"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body') or '{}')

    conn = _db()
    cur = conn.cursor()

    # GET /me — проверка текущего токена
    if method == 'GET':
        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
        if not token:
            return {'statusCode': 401, 'headers': _cors(), 'body': json.dumps({'error': 'Не авторизован'})}
        row = _get_user_by_token(cur, token)
        if not row:
            return {'statusCode': 401, 'headers': _cors(), 'body': json.dumps({'error': 'Сессия истекла'})}
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'user': {'id': row[0], 'email': row[1], 'name': row[2]}}, ensure_ascii=False)}

    action = body.get('action')

    # Регистрация
    if action == 'register':
        email = (body.get('email') or '').strip().lower()
        password = (body.get('password') or '').strip()
        name = (body.get('name') or '').strip()[:200]
        if not email or not password:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Укажите email и пароль'}, ensure_ascii=False)}
        if len(password) < 6:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Пароль минимум 6 символов'}, ensure_ascii=False)}
        e_esc = email.replace("'", "''")
        cur.execute("SELECT id FROM users WHERE email = '%s'" % e_esc)
        if cur.fetchone():
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Email уже зарегистрирован'}, ensure_ascii=False)}
        pw_hash = _hash(password)
        n_esc = name.replace("'", "''")
        cur.execute(
            "INSERT INTO users (email, password_hash, name) VALUES ('%s', '%s', '%s') RETURNING id" % (e_esc, pw_hash, n_esc)
        )
        user_id = cur.fetchone()[0]
        token = secrets.token_hex(32)
        cur.execute(
            "INSERT INTO sessions (user_id, token) VALUES (%s, '%s')" % (user_id, token)
        )
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'token': token, 'user': {'id': user_id, 'email': email, 'name': name}}, ensure_ascii=False)}

    # Вход
    if action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = (body.get('password') or '').strip()
        if not email or not password:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Укажите email и пароль'}, ensure_ascii=False)}
        e_esc = email.replace("'", "''")
        pw_hash = _hash(password)
        cur.execute(
            "SELECT id, name FROM users WHERE email = '%s' AND password_hash = '%s'" % (e_esc, pw_hash)
        )
        row = cur.fetchone()
        if not row:
            return {'statusCode': 401, 'headers': _cors(),
                    'body': json.dumps({'error': 'Неверный email или пароль'}, ensure_ascii=False)}
        token = secrets.token_hex(32)
        cur.execute(
            "INSERT INTO sessions (user_id, token) VALUES (%s, '%s')" % (row[0], token)
        )
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'token': token, 'user': {'id': row[0], 'email': email, 'name': row[1]}}, ensure_ascii=False)}

    # Выход
    if action == 'logout':
        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
        if token:
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = '%s'" % token.replace("'", "''"))
            conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True}), 'isBase64Encoded': False}

    return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'Неизвестное действие'})}