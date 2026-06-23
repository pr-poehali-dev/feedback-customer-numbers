import json
import os
import re
import psycopg2


def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _verdict_from_rating(avg):
    if avg >= 4:
        return 'safe'
    if avg >= 2.5:
        return 'risky'
    return 'scam'


def _build_record(cur, phone_id, phone):
    cur.execute(
        "SELECT rating, verdict, author, comment, tags, created_at, customer_name, object_address "
        "FROM reviews WHERE phone_id = %s ORDER BY created_at DESC" % phone_id
    )
    rows = cur.fetchall()
    if not rows:
        return None
    ratings = [r[0] for r in rows]
    avg = round(sum(ratings) / len(ratings), 1)
    tag_list = []
    for r in rows:
        if r[4]:
            for t in r[4].split(','):
                t = t.strip()
                if t and t not in tag_list:
                    tag_list.append(t)
    last = rows[0]
    return {
        'phone': phone,
        'rating': avg,
        'reviews': len(rows),
        'verdict': _verdict_from_rating(avg),
        'tags': tag_list[:4],
        'lastReview': last[3],
        'reviewList': [
            {
                'rating': r[0],
                'verdict': r[1],
                'author': r[2] or 'Аноним',
                'comment': r[3],
                'tags': [t.strip() for t in (r[4] or '').split(',') if t.strip()],
                'createdAt': r[5].isoformat() if r[5] else None,
                'customerName': r[6] or '',
                'objectAddress': r[7] or '',
            }
            for r in rows
        ],
    }


def handler(event: dict, context) -> dict:
    '''Проверка номеров заказчиков, список отзывов и добавление новых отзывов.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    dsn = os.environ['DATABASE_URL']
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            phone = params.get('phone')

            if phone:
                digits = re.sub(r'\D', '', phone)
                tail = digits[-7:] if len(digits) >= 4 else digits
                cur.execute(
                    "SELECT id, phone FROM phone_numbers "
                    "WHERE regexp_replace(phone, '\\D', '', 'g') LIKE '%%%s%%'" % tail
                )
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 200, 'headers': _cors_headers(),
                            'body': json.dumps({'found': False})}
                rec = _build_record(cur, row[0], row[1])
                return {'statusCode': 200, 'headers': _cors_headers(),
                        'body': json.dumps({'found': True, 'record': rec}, ensure_ascii=False)}

            cur.execute("SELECT id, phone FROM phone_numbers ORDER BY id DESC LIMIT 20")
            records = []
            for pid, ph in cur.fetchall():
                rec = _build_record(cur, pid, ph)
                if rec:
                    records.append(rec)
            return {'statusCode': 200, 'headers': _cors_headers(),
                    'body': json.dumps({'records': records}, ensure_ascii=False)}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            phone = (body.get('phone') or '').strip()
            comment = (body.get('comment') or '').strip()
            rating = int(body.get('rating', 0))
            author = (body.get('author') or 'Аноним').strip()[:120]
            customer_name = (body.get('customer_name') or '').strip()[:200]
            object_address = (body.get('object_address') or '').strip()[:500]
            tags = (body.get('tags') or '').strip()[:300]
            verdict = body.get('verdict') or _verdict_from_rating(rating)

            if not phone or not comment or rating < 1 or rating > 5:
                return {'statusCode': 400, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Заполните номер, отзыв и оценку (1-5)'},
                                           ensure_ascii=False)}

            phone_esc = phone.replace("'", "''")
            cur.execute(
                "INSERT INTO phone_numbers (phone) VALUES ('%s') "
                "ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING id" % phone_esc
            )
            phone_id = cur.fetchone()[0]

            c_esc = comment.replace("'", "''")
            a_esc = author.replace("'", "''")
            cn_esc = customer_name.replace("'", "''")
            oa_esc = object_address.replace("'", "''")
            t_esc = tags.replace("'", "''")
            v_esc = verdict.replace("'", "''")
            cur.execute(
                "INSERT INTO reviews (phone_id, rating, verdict, author, customer_name, object_address, comment, tags) "
                "VALUES (%s, %s, '%s', '%s', '%s', '%s', '%s', '%s')" % (
                    phone_id, rating, v_esc, a_esc, cn_esc, oa_esc, c_esc, t_esc)
            )
            conn.commit()
            rec = _build_record(cur, phone_id, phone)
            return {'statusCode': 200, 'headers': _cors_headers(),
                    'body': json.dumps({'success': True, 'record': rec}, ensure_ascii=False)}

        return {'statusCode': 405, 'headers': _cors_headers(),
                'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()