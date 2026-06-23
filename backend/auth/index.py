import json
import os
import hashlib
import secrets
import psycopg2  # noqa

OWNER_ID = 2  # id владельца

def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    }

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def _get_user_by_token(cur, token: str):
    cur.execute(
        "SELECT u.id, u.email, u.name, u.is_approved FROM sessions s "
        "JOIN users u ON u.id = s.user_id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''")
    )
    return cur.fetchone()

def _get_token_from_headers(event):
    headers = event.get('headers') or {}
    raw = headers.get('X-Authorization') or headers.get('Authorization') or headers.get('authorization') or ''
    return raw.replace('Bearer ', '').replace('bearer ', '').strip()

def handler(event: dict, context) -> dict:
    """Регистрация, вход, выход, одобрение пользователей"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')

    conn = _db()
    cur = conn.cursor()

    # GET — проверка текущего токена
    if method == 'GET':
        token = _get_token_from_headers(event)
        if not token:
            return {'statusCode': 401, 'headers': _cors(), 'body': json.dumps({'error': 'Не авторизован'})}
        row = _get_user_by_token(cur, token)
        if not row:
            return {'statusCode': 401, 'headers': _cors(), 'body': json.dumps({'error': 'Сессия истекла'})}
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'user': {'id': row[0], 'email': row[1], 'name': row[2], 'is_approved': row[3]}}, ensure_ascii=False)}

    action = body.get('action')

    # Регистрация
    if action == 'register':
        email = (body.get('email') or '').strip().lower()
        password = (body.get('password') or '').strip()
        name = (body.get('name') or '').strip()[:200]
        birthdate_raw = (body.get('birthdate') or '').strip()
        work_direction = (body.get('work_direction') or '').strip()[:300]
        organization = (body.get('organization') or '').strip()[:300]
        birthdate = None
        if birthdate_raw:
            try:
                for sep in ['.', '/', '-']:
                    if sep in birthdate_raw:
                        parts = birthdate_raw.split(sep)
                        if len(parts) == 3:
                            p0, p1, p2 = parts[0].strip(), parts[1].strip(), parts[2].strip()
                            if len(p2) == 4:
                                birthdate = '%s-%s-%s' % (p2, p1.zfill(2), p0.zfill(2))
                            elif len(p0) == 4:
                                birthdate = '%s-%s-%s' % (p0, p1.zfill(2), p2.zfill(2))
                        break
            except Exception:
                birthdate = None
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
        if birthdate:
            cur.execute(
                "INSERT INTO users (email, password_hash, name, birthdate, work_direction, organization, is_approved) "
                "VALUES ('%s', '%s', '%s', '%s'::date, '%s', '%s', FALSE) RETURNING id" % (e_esc, pw_hash, n_esc, birthdate, wd_esc, org_esc)
            )
        else:
            cur.execute(
                "INSERT INTO users (email, password_hash, name, work_direction, organization, is_approved) "
                "VALUES ('%s', '%s', '%s', '%s', '%s', FALSE) RETURNING id" % (e_esc, pw_hash, n_esc, wd_esc, org_esc)
            )
        user_id = cur.fetchone()[0]
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'pending': True, 'message': 'Заявка отправлена. Ожидайте одобрения администратора.'}, ensure_ascii=False)}

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
            "SELECT id, name, is_approved FROM users WHERE email = '%s' AND password_hash = '%s'" % (e_esc, pw_hash)
        )
        row = cur.fetchone()
        if not row:
            return {'statusCode': 401, 'headers': _cors(),
                    'body': json.dumps({'error': 'Неверный email или пароль'}, ensure_ascii=False)}
        if not row[2]:
            return {'statusCode': 403, 'headers': _cors(),
                    'body': json.dumps({'error': 'Ваша заявка ещё не одобрена администратором'}, ensure_ascii=False)}
        token = secrets.token_hex(32)
        cur.execute(
            "INSERT INTO sessions (user_id, token) VALUES (%s, '%s')" % (row[0], token)
        )
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'token': token, 'user': {'id': row[0], 'email': email, 'name': row[1]}}, ensure_ascii=False)}

    # Выход
    if action == 'logout':
        token = _get_token_from_headers(event)
        if token:
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = '%s'" % token.replace("'", "''"))
            conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    # Список участников (одобренных)
    if action == 'members':
        cur.execute(
            "SELECT id, name, created_at, work_direction, organization FROM users "
            "WHERE is_hidden IS NOT TRUE AND is_approved = TRUE ORDER BY created_at DESC"
        )
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

    # Список ожидающих одобрения (только для владельца)
    if action == 'pending_users':
        token = _get_token_from_headers(event)
        caller = _get_user_by_token(cur, token) if token else None
        if not caller or caller[0] != OWNER_ID:
            return {'statusCode': 403, 'headers': _cors(),
                    'body': json.dumps({'error': 'Нет доступа'}, ensure_ascii=False)}
        cur.execute(
            "SELECT id, name, email, work_direction, organization, created_at FROM users "
            "WHERE is_approved = FALSE ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        users = [
            {
                'id': r[0], 'name': r[1] or '', 'email': r[2],
                'work_direction': r[3] or '', 'organization': r[4] or '',
                'created_at': r[5].strftime('%d.%m.%Y %H:%M') if r[5] else '',
            }
            for r in rows
        ]
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'users': users}, ensure_ascii=False)}

    # Одобрить или отклонить пользователя (только для владельца)
    if action == 'approve_user' or action == 'reject_user':
        token = _get_token_from_headers(event)
        caller = _get_user_by_token(cur, token) if token else None
        if not caller or caller[0] != OWNER_ID:
            return {'statusCode': 403, 'headers': _cors(),
                    'body': json.dumps({'error': 'Нет доступа'}, ensure_ascii=False)}
        user_id = int(body.get('user_id', 0))
        if action == 'approve_user':
            cur.execute("UPDATE users SET is_approved = TRUE WHERE id = %s" % user_id)
        else:
            cur.execute("UPDATE users SET is_hidden = TRUE WHERE id = %s" % user_id)
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'ok': True})}

    return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'Неизвестное действие'})}
