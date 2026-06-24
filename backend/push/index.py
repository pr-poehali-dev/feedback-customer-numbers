import json
import os
import psycopg2
from pywebpush import webpush, WebPushException


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    }


def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _vapid_claims():
    return {'sub': 'mailto:admin@miks-stroy.ru'}


def send_to_all(title: str, body: str, url: str = '/'):
    """Отправляет push всем подписчикам. Удаляет протухшие подписки."""
    private_key = os.environ.get('VAPID_PRIVATE_KEY')
    if not private_key:
        return {'sent': 0, 'error': 'no_vapid'}

    conn = _db()
    cur = conn.cursor()
    cur.execute("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    rows = cur.fetchall()

    payload = json.dumps({'title': title, 'body': body, 'url': url})
    sent = 0
    dead_ids = []
    for sid, endpoint, p256dh, auth in rows:
        sub = {'endpoint': endpoint, 'keys': {'p256dh': p256dh, 'auth': auth}}
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=private_key,
                vapid_claims=dict(_vapid_claims()),
            )
            sent += 1
        except WebPushException as e:
            status = getattr(getattr(e, 'response', None), 'status_code', None)
            if status in (404, 410):
                dead_ids.append(sid)
        except Exception:
            pass

    if dead_ids:
        cur.execute(
            "DELETE FROM push_subscriptions WHERE id IN (%s)"
            % ','.join(str(int(i)) for i in dead_ids)
        )
        conn.commit()
    cur.close()
    conn.close()
    return {'sent': sent, 'removed': len(dead_ids)}


def handler(event: dict, context) -> dict:
    """Web-push: публичный ключ, подписка/отписка устройств, отправка уведомлений."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    # GET ?action=key — публичный VAPID-ключ для фронта
    if method == 'GET':
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'public_key': os.environ.get('VAPID_PUBLIC_KEY', '')})}

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        act = body.get('action') or action

        # Подписка устройства
        if act == 'subscribe':
            sub = body.get('subscription') or {}
            endpoint = (sub.get('endpoint') or '').strip()
            keys = sub.get('keys') or {}
            p256dh = (keys.get('p256dh') or '').strip()
            auth = (keys.get('auth') or '').strip()
            ua = (body.get('user_agent') or '')[:300]
            if not endpoint or not p256dh or not auth:
                return {'statusCode': 400, 'headers': _cors(),
                        'body': json.dumps({'error': 'bad_subscription'})}
            conn = _db()
            cur = conn.cursor()
            e_esc = endpoint.replace("'", "''")
            p_esc = p256dh.replace("'", "''")
            a_esc = auth.replace("'", "''")
            ua_esc = ua.replace("'", "''")
            cur.execute(
                "INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent) "
                "VALUES ('%s', '%s', '%s', '%s') "
                "ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth"
                % (e_esc, p_esc, a_esc, ua_esc)
            )
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'success': True})}

        # Отписка
        if act == 'unsubscribe':
            endpoint = (body.get('endpoint') or '').strip()
            if endpoint:
                conn = _db()
                cur = conn.cursor()
                cur.execute("DELETE FROM push_subscriptions WHERE endpoint = '%s'"
                            % endpoint.replace("'", "''"))
                conn.commit()
                cur.close()
                conn.close()
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'success': True})}

        # Тестовая отправка
        if act == 'test':
            res = send_to_all('Микс Строй', 'Проверка уведомлений работает!', '/')
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps(res)}

        return {'statusCode': 400, 'headers': _cors(),
                'body': json.dumps({'error': 'unknown_action'})}

    return {'statusCode': 405, 'headers': _cors(),
            'body': json.dumps({'error': 'method_not_allowed'})}
