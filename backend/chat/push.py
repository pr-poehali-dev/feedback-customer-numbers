"""Рассылка web-push уведомлений участникам чата."""
import json
import os

from pywebpush import webpush, WebPushException


def _vapid_claims():
    return {'sub': 'mailto:admin@example.com'}


def send_push_to_all(cur, conn, title: str, body_text: str, exclude_phone: str = ''):
    """Шлёт push всем сохранённым подпискам. Битые подписки удаляет.

    exclude_phone не используется для фильтрации (телефон не привязан к подписке),
    оставлен для будущего расширения.
    """
    private_key = os.environ.get('VAPID_PRIVATE_KEY')
    if not private_key:
        return

    cur.execute("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    subs = cur.fetchall()
    if not subs:
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
            webpush(
                subscription_info=subscription,
                data=payload,
                vapid_private_key=private_key,
                vapid_claims=dict(_vapid_claims()),
                timeout=10,
            )
        except WebPushException as exc:
            status = getattr(getattr(exc, 'response', None), 'status_code', None)
            if status in (404, 410):
                dead_ids.append(sub_id)
        except Exception:
            pass

    if dead_ids:
        ids_str = ','.join(str(int(i)) for i in dead_ids)
        cur.execute("DELETE FROM push_subscriptions WHERE id IN (%s)" % ids_str)
        conn.commit()
