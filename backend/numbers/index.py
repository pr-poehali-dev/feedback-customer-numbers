import json
import os
import re
import psycopg2


def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Participant-Phone',
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
        "SELECT rating, verdict, author, comment, tags, created_at, customer_name, object_address, id, author_phone "
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
                'id': r[8],
                'authorPhone': r[9] or '',
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
            mine = params.get('mine')

            if mine:
                mine_esc = mine.strip().replace("'", "''")
                cur.execute(
                    "SELECT r.id, r.rating, r.verdict, r.author, r.comment, r.tags, r.created_at, "
                    "r.customer_name, r.object_address, r.author_phone, p.phone "
                    "FROM reviews r JOIN phone_numbers p ON p.id = r.phone_id "
                    "WHERE r.author_phone = '%s' ORDER BY r.created_at DESC" % mine_esc
                )
                mine_list = [
                    {
                        'id': r[0],
                        'rating': r[1],
                        'verdict': r[2],
                        'author': r[3] or 'Аноним',
                        'comment': r[4],
                        'tags': [t.strip() for t in (r[5] or '').split(',') if t.strip()],
                        'createdAt': r[6].isoformat() if r[6] else None,
                        'customerName': r[7] or '',
                        'objectAddress': r[8] or '',
                        'authorPhone': r[9] or '',
                        'phone': r[10],
                    }
                    for r in cur.fetchall()
                ]
                return {'statusCode': 200, 'headers': _cors_headers(),
                        'body': json.dumps({'reviews': mine_list}, ensure_ascii=False)}

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

            cur.execute("SELECT id, phone FROM phone_numbers ORDER BY id DESC")
            phone_rows = cur.fetchall()
            order = [pid for pid, _ in phone_rows]
            phone_by_id = {pid: ph for pid, ph in phone_rows}

            cur.execute(
                "SELECT phone_id, rating, verdict, author, comment, tags, created_at, "
                "customer_name, object_address, id, author_phone "
                "FROM reviews ORDER BY created_at DESC"
            )
            grouped = {}
            total_reviews = 0
            for r in cur.fetchall():
                grouped.setdefault(r[0], []).append(r)
                total_reviews += 1

            records = []
            for pid in order:
                rows = grouped.get(pid)
                if not rows:
                    continue
                ratings = [x[1] for x in rows]
                avg = round(sum(ratings) / len(ratings), 1)
                tag_list = []
                for x in rows:
                    if x[5]:
                        for t in x[5].split(','):
                            t = t.strip()
                            if t and t not in tag_list:
                                tag_list.append(t)
                records.append({
                    'phone': phone_by_id[pid],
                    'rating': avg,
                    'reviews': len(rows),
                    'verdict': _verdict_from_rating(avg),
                    'tags': tag_list[:4],
                    'lastReview': rows[0][4],
                    'reviewList': [
                        {
                            'rating': x[1],
                            'verdict': x[2],
                            'author': x[3] or 'Аноним',
                            'comment': x[4],
                            'tags': [t.strip() for t in (x[5] or '').split(',') if t.strip()],
                            'createdAt': x[6].isoformat() if x[6] else None,
                            'customerName': x[7] or '',
                            'objectAddress': x[8] or '',
                            'id': x[9],
                            'authorPhone': x[10] or '',
                        }
                        for x in rows
                    ],
                })
            return {'statusCode': 200, 'headers': _cors_headers(),
                    'body': json.dumps({'records': records, 'totalReviews': total_reviews}, ensure_ascii=False)}

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
            author_phone = (body.get('author_phone') or '').strip()[:32]

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
            ap_esc = author_phone.replace("'", "''")
            cur.execute(
                "INSERT INTO reviews (phone_id, rating, verdict, author, customer_name, object_address, comment, tags, author_phone) "
                "VALUES (%s, %s, '%s', '%s', '%s', '%s', '%s', '%s', '%s')" % (
                    phone_id, rating, v_esc, a_esc, cn_esc, oa_esc, c_esc, t_esc, ap_esc)
            )
            conn.commit()
            rec = _build_record(cur, phone_id, phone)
            return {'statusCode': 200, 'headers': _cors_headers(),
                    'body': json.dumps({'success': True, 'record': rec}, ensure_ascii=False)}

        if method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            review_id = int(body.get('id', 0))
            comment = (body.get('comment') or '').strip()
            rating = int(body.get('rating', 0))
            customer_name = (body.get('customer_name') or '').strip()[:200]
            object_address = (body.get('object_address') or '').strip()[:500]
            tags = (body.get('tags') or '').strip()[:300]
            verdict = body.get('verdict') or _verdict_from_rating(rating)
            author_phone = (body.get('author_phone') or '').strip()[:32]

            if review_id < 1 or not comment or rating < 1 or rating > 5:
                return {'statusCode': 400, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Заполните отзыв и оценку (1-5)'},
                                           ensure_ascii=False)}
            if not author_phone:
                return {'statusCode': 403, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Нужно войти как участник'},
                                           ensure_ascii=False)}

            cur.execute("SELECT phone_id, author_phone FROM reviews WHERE id = %s" % review_id)
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Отзыв не найден'}, ensure_ascii=False)}
            if (row[1] or '') != author_phone:
                return {'statusCode': 403, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Можно редактировать только свои отзывы'},
                                           ensure_ascii=False)}
            phone_id = row[0]

            c_esc = comment.replace("'", "''")
            cn_esc = customer_name.replace("'", "''")
            oa_esc = object_address.replace("'", "''")
            t_esc = tags.replace("'", "''")
            v_esc = verdict.replace("'", "''")
            cur.execute(
                "UPDATE reviews SET rating = %s, verdict = '%s', customer_name = '%s', "
                "object_address = '%s', comment = '%s', tags = '%s', updated_at = CURRENT_TIMESTAMP "
                "WHERE id = %s" % (rating, v_esc, cn_esc, oa_esc, c_esc, t_esc, review_id)
            )
            conn.commit()
            cur.execute("SELECT phone FROM phone_numbers WHERE id = %s" % phone_id)
            phone = cur.fetchone()[0]
            rec = _build_record(cur, phone_id, phone)
            return {'statusCode': 200, 'headers': _cors_headers(),
                    'body': json.dumps({'success': True, 'record': rec}, ensure_ascii=False)}

        if method == 'DELETE':
            body = json.loads(event.get('body') or '{}')
            review_id = int(body.get('id', 0))
            author_phone = (body.get('author_phone') or '').strip()[:32]

            if review_id < 1:
                return {'statusCode': 400, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Не указан отзыв'}, ensure_ascii=False)}
            if not author_phone:
                return {'statusCode': 403, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Нужно войти как участник'},
                                           ensure_ascii=False)}

            cur.execute("SELECT phone_id, author_phone FROM reviews WHERE id = %s" % review_id)
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Отзыв не найден'}, ensure_ascii=False)}
            if (row[1] or '') != author_phone:
                return {'statusCode': 403, 'headers': _cors_headers(),
                        'body': json.dumps({'error': 'Можно удалять только свои отзывы'},
                                           ensure_ascii=False)}
            phone_id = row[0]

            cur.execute("DELETE FROM reviews WHERE id = %s" % review_id)
            conn.commit()
            cur.execute("SELECT phone FROM phone_numbers WHERE id = %s" % phone_id)
            phrow = cur.fetchone()
            rec = _build_record(cur, phone_id, phrow[0]) if phrow else None
            return {'statusCode': 200, 'headers': _cors_headers(),
                    'body': json.dumps({'success': True, 'record': rec}, ensure_ascii=False)}

        return {'statusCode': 405, 'headers': _cors_headers(),
                'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()