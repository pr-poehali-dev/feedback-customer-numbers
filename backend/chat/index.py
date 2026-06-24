import json
import os
from datetime import timedelta
import psycopg2

ADMIN_PHONES = {'9652000177', '9774951403'}
TZ_OFFSET = timedelta(hours=3)  # Москва (UTC+3)


def _fmt(dt, fmt):
    if not dt:
        return ''
    return (dt + TZ_OFFSET).strftime(fmt)
ALLOWED_EMOJI = {'👍', '❤️', '😂', '🔥', '👎', '🙏'}


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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


def _norm_phone(phone: str) -> str:
    digits = ''.join(c for c in (phone or '') if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits


def _load_reactions(cur, message_ids):
    """Возвращает {message_id: [{'emoji':..,'count':..,'users':[phone,..]}, ..]}"""
    result = {}
    if not message_ids:
        return result
    ids_str = ','.join(str(int(i)) for i in message_ids)
    cur.execute(
        "SELECT message_id, emoji, user_phone FROM message_reactions "
        "WHERE message_id IN (%s) ORDER BY id" % ids_str
    )
    grouped = {}
    for mid, emoji, phone in cur.fetchall():
        grouped.setdefault(mid, {})
        grouped[mid].setdefault(emoji, [])
        grouped[mid][emoji].append(phone)
    for mid, emojis in grouped.items():
        result[mid] = [
            {'emoji': e, 'count': len(phones), 'users': phones}
            for e, phones in emojis.items()
        ]
    return result


def handler(event: dict, context) -> dict:
    """Общий чат — сообщения, точное время, реакции, удаление своих сообщений"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = _db()
    cur = conn.cursor()
    body = json.loads(event.get('body') or '{}')

    # GET — получить последние 50 сообщений с реакциями
    if method == 'GET':
        # Автоудаление: чистим сообщения старше 1 часа (и их реакции)
        cur.execute(
            "DELETE FROM message_reactions WHERE message_id IN "
            "(SELECT id FROM messages WHERE created_at < NOW() - INTERVAL '1 hour')"
        )
        cur.execute("DELETE FROM messages WHERE created_at < NOW() - INTERVAL '1 hour'")
        conn.commit()
        cur.execute(
            "SELECT id, user_name, text, created_at, author_phone FROM messages "
            "ORDER BY created_at DESC LIMIT 50"
        )
        rows = list(reversed(cur.fetchall()))
        msg_ids = [r[0] for r in rows]
        reactions = _load_reactions(cur, msg_ids)
        messages = [
            {
                'id': r[0],
                'user_name': r[1],
                'text': r[2],
                'created_at': _fmt(r[3], '%d.%m.%Y %H:%M'),
                'time': _fmt(r[3], '%H:%M'),
                'author_phone': _norm_phone(r[4]) if r[4] else '',
                'reactions': reactions.get(r[0], []),
            }
            for r in rows
        ]
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'messages': messages}, ensure_ascii=False)}

    # POST — отправить сообщение ИЛИ поставить/снять реакцию
    if method == 'POST':
        headers = event.get('headers') or {}
        raw_token = headers.get('X-Authorization') or headers.get('Authorization') or headers.get('authorization') or ''
        token = raw_token.replace('Bearer ', '').replace('bearer ', '').strip()
        user = _get_user(cur, token) if token else None
        user_id = user[0] if user else None
        user_name = user[1] if user else 'Гость'

        action = body.get('action')

        # --- Реакция ---
        if action == 'react':
            msg_id = body.get('message_id')
            emoji = (body.get('emoji') or '').strip()
            phone = _norm_phone(body.get('phone') or '')
            if not msg_id or emoji not in ALLOWED_EMOJI or not phone:
                return {'statusCode': 400, 'headers': _cors(),
                        'body': json.dumps({'error': 'Некорректная реакция'}, ensure_ascii=False)}
            emoji_esc = emoji.replace("'", "''")
            phone_esc = phone.replace("'", "''")
            mid = int(msg_id)
            cur.execute(
                "SELECT id FROM message_reactions WHERE message_id=%d AND user_phone='%s' AND emoji='%s'"
                % (mid, phone_esc, emoji_esc)
            )
            existing = cur.fetchone()
            if existing:
                cur.execute("UPDATE message_reactions SET created_at=NOW() WHERE id=%d" % existing[0])
                cur.execute("DELETE FROM message_reactions WHERE id=%d" % existing[0])
            else:
                cur.execute(
                    "INSERT INTO message_reactions (message_id, user_phone, emoji) VALUES (%d, '%s', '%s')"
                    % (mid, phone_esc, emoji_esc)
                )
            conn.commit()
            reactions = _load_reactions(cur, [mid])
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'message_id': mid, 'reactions': reactions.get(mid, [])}, ensure_ascii=False)}

        # --- Новое сообщение ---
        text = (body.get('text') or '').strip()[:1000]
        if not text:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Сообщение не может быть пустым'}, ensure_ascii=False)}
        body_name = (body.get('user_name') or '').strip()[:200]
        if not user and body_name:
            user_name = body_name
        author_phone = _norm_phone(body.get('phone') or '')
        name_esc = (user_name or 'Гость').replace("'", "''")
        text_esc = text.replace("'", "''")
        uid_val = str(user_id) if user_id else 'NULL'
        phone_val = "'%s'" % author_phone.replace("'", "''") if author_phone else 'NULL'
        cur.execute(
            "INSERT INTO messages (user_id, user_name, text, author_phone) "
            "VALUES (%s, '%s', '%s', %s) RETURNING id, created_at"
            % (uid_val, name_esc, text_esc, phone_val)
        )
        row = cur.fetchone()
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({
                    'message': {
                        'id': row[0],
                        'user_name': user_name or 'Гость',
                        'text': text,
                        'created_at': _fmt(row[1], '%d.%m.%Y %H:%M'),
                        'time': _fmt(row[1], '%H:%M'),
                        'author_phone': author_phone,
                        'reactions': [],
                    }
                }, ensure_ascii=False)}

    # DELETE — удалить своё сообщение (или админ удаляет любое)
    if method == 'DELETE':
        msg_id = body.get('message_id')
        phone = _norm_phone(body.get('phone') or '')
        if not msg_id or not phone:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Нет данных для удаления'}, ensure_ascii=False)}
        req_name = (body.get('user_name') or '').strip()
        mid = int(msg_id)
        cur.execute("SELECT author_phone, user_name FROM messages WHERE id=%d" % mid)
        found = cur.fetchone()
        if not found:
            return {'statusCode': 404, 'headers': _cors(),
                    'body': json.dumps({'error': 'Сообщение не найдено'}, ensure_ascii=False)}
        owner_phone = _norm_phone(found[0]) if found[0] else ''
        owner_name = (found[1] or '').strip()
        is_admin = phone in ADMIN_PHONES
        # Свой по телефону ИЛИ (у старого сообщения нет телефона, но совпадает имя)
        is_owner = (owner_phone and phone == owner_phone) or (not owner_phone and req_name and req_name == owner_name)
        if not is_owner and not is_admin:
            return {'statusCode': 403, 'headers': _cors(),
                    'body': json.dumps({'error': 'Можно удалять только свои сообщения'}, ensure_ascii=False)}
        cur.execute("DELETE FROM message_reactions WHERE message_id=%d" % mid)
        cur.execute("DELETE FROM messages WHERE id=%d" % mid)
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'success': True, 'deleted_id': mid}, ensure_ascii=False)}

    return {'statusCode': 405, 'headers': _cors(), 'body': json.dumps({'error': 'Метод не поддерживается'})}