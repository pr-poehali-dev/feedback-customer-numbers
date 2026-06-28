"""Рассылка web-push уведомлений всем подписанным устройствам."""
import base64
import json
import os

from pywebpush import webpush, WebPushException


def _b64u_decode(data: str) -> bytes:
    data = data.strip().replace('-', '+').replace('_', '/')
    data += '=' * (-len(data) % 4)
    return base64.b64decode(data)


def _build_vapid():
    from py_vapid import Vapid01
    from cryptography.hazmat.primitives.asymmetric import ec

    raw = os.environ.get('VAPID_PRIVATE_KEY', '')
    priv_int = int.from_bytes(_b64u_decode(raw), 'big')
    key = ec.derive_private_key(priv_int, ec.SECP256R1())
    v = Vapid01()
    v.private_key = key
    return v


def _vapid_claims(endpoint: str):
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


def send_push_to_all(cur, conn, title: str, body_text: str, url: str = '/'):
    """Шлёт push всем сохранённым подпискам. Битые подписки удаляет."""
    if not os.environ.get('VAPID_PRIVATE_KEY'):
        return

    try:
        vapid = _build_vapid()
    except Exception as exc:
        print('PUSH: bad private key %s' % str(exc)[:200])
        return

    cur.execute("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    subs = cur.fetchall()
    if not subs:
        return

    payload = json.dumps({
        'title': title,
        'body': body_text,
        'url': url,
    }, ensure_ascii=False)

    dead_ids = []
    for sub_id, endpoint, p256dh, auth in subs:
        subscription = {
            'endpoint': endpoint,
            'keys': {'p256dh': p256dh, 'auth': auth},
        }
        try:
            webpush(
                subscription_info=subscription,
                data=payload,
                vapid_private_key=vapid,
                vapid_claims=_vapid_claims(endpoint),
                timeout=10,
                content_encoding='aes128gcm',
            )
        except WebPushException as exc:
            status = getattr(getattr(exc, 'response', None), 'status_code', None)
            if status in (404, 410, 400, 403):
                dead_ids.append(sub_id)
            else:
                print('PUSH FAIL id=%s status=%s' % (sub_id, status))
        except Exception as exc:
            print('PUSH ERROR id=%s err=%s' % (sub_id, str(exc)[:150]))

    if dead_ids:
        ids_str = ','.join(str(int(i)) for i in dead_ids)
        cur.execute("DELETE FROM push_subscriptions WHERE id IN (%s)" % ids_str)
        conn.commit()
