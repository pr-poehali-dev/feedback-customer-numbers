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
        birthdate = (body.get('birthdate') or '').strip()
        work_direction = (body.get('work_direction') or '').strip()[:300]
        organization = (body.get('organization') or '').strip()[:300]
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
        wd_esc = work_direction.replace("'", "''")
        org_esc = organization.replace("'", "''")
        bd_val = ("'%s'" % birthdate) if birthdate else 'NULL'
        cur.execute(
            "INSERT INTO users (email, password_hash, name, birthdate, work_direction, organization) "
            "VALUES ('%s', '%s', '%s', %s, '%s', '%s') RETURNING id" % (e_esc, pw_hash, n_esc, bd_val, wd_esc, org_esc)
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

    # Список участников
    if action == 'members':
        cur.execute("SELECT id, name, created_at, work_direction, organization FROM users ORDER BY created_at DESC")
        rows = cur.fetchall()
        members = [
            {
                'id': r[0],
                'name': r[1] or '',
                'joined': r[2].strftime('%d.%m.%Y') if r[2] else '',
                'work_direction': r[3] or '',
                'organization': r[4] or '',
            }
            for r in rows
        ]
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'members': members}, ensure_ascii=False)}

    return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'Неизвестное действие'})}