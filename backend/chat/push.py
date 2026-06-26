"""Рассылка web-push уведомлений участникам чата."""
import base64
import json
import os

from pywebpush import webpush, WebPushException


def _b64u_decode(data: str) -> bytes:
    data = data.strip().replace('-', '+').replace('_', '/')
    data += '=' * (-len(data) % 4)
    return base64.b64decode(data)


def _private_key_pem() -> str:
    """Конвертирует raw base64url приватный VAPID-ключ (32 байта) в PEM.

    Браузеры/py-vapid новой версии ожидают приватный ключ в формате PEM,
    а в секрете он хранится как «сырой» base64url. Конвертируем на лету.
    """
    raw = os.environ.get('VAPID_PRIVATE_KEY', '')
    if 'BEGIN' in raw:
        return raw
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    priv_int = int.from_bytes(_b64u_decode(raw), 'big')
    key = ec.derive_private_key(priv_int, ec.SECP256R1())
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem.decode('utf-8')


def _vapid_claims(endpoint: str):
    # Apple требует валидный sub (mailto или https) и aud = origin эндпоинта
    try:
        from urllib.parse import urlparse
        parsed = urlparse(endpoint)
        aud = '%s://%s' % (parsed.scheme, parsed.netloc)
    except Exception:
        aud = None
    claims = {'sub': 'mailto:noreply@poehali.dev'}
    if aud:
        claims['aud'] = aud
    return claims


def send_push_to_all(cur, conn, title: str, body_text: str, exclude_phone: str = ''):
    """Шлёт push всем сохранённым подпискам. Битые подписки удаляет."""
    if not os.environ.get('VAPID_PRIVATE_KEY'):
        print('PUSH: no VAPID_PRIVATE_KEY')
        return

    try:
        private_key = _private_key_pem()
    except Exception as exc:
        print('PUSH: bad private key %s' % str(exc)[:200])
        return

    cur.execute("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    subs = cur.fetchall()
    if not subs:
        print('PUSH: no subscriptions')
        return

    payload = json.dumps({
        'title': title,
        'body': body_text,
        'url': '/#chat',
    }, ensure_ascii=False)

    dead_ids = []
    for sub_id, endpoint, p256dh, auth in subs:
        subscription = {
            'endpoint': endpoint,
            'keys': {'p256dh': p256dh, 'auth': auth},
        }
        try:
            resp = webpush(
                subscription_info=subscription,
                data=payload,
                vapid_private_key=private_key,
                vapid_claims=_vapid_claims(endpoint),
                timeout=10,
                content_encoding='aes128gcm',
            )
            print('PUSH OK id=%s status=%s host=%s' % (
                sub_id, getattr(resp, 'status_code', '?'), endpoint[:40]))
        except WebPushException as exc:
            status = getattr(getattr(exc, 'response', None), 'status_code', None)
            resp_text = ''
            try:
                resp_text = exc.response.text[:200] if exc.response is not None else ''
            except Exception:
                resp_text = ''
            print('PUSH FAIL id=%s status=%s host=%s err=%s body=%s' % (
                sub_id, status, endpoint[:40], str(exc)[:200], resp_text))
            if status in (404, 410):
                dead_ids.append(sub_id)
        except Exception as exc:
            print('PUSH ERROR id=%s host=%s err=%s' % (sub_id, endpoint[:40], str(exc)[:200]))

    if dead_ids:
        ids_str = ','.join(str(int(i)) for i in dead_ids)
        cur.execute("DELETE FROM push_subscriptions WHERE id IN (%s)" % ids_str)
        conn.commit()