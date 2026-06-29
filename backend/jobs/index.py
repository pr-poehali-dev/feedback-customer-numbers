import json
import os
import psycopg2

from push import send_push_to_all

def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    }

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """Заявки на работу: создание и получение списка"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = _db()
    cur = conn.cursor()

    # GET — список заявок
    if method == 'GET':
        cur.execute(
            "SELECT id, address, workers, hours, price, phone, work_type, comment, created_at "
            "FROM job_requests ORDER BY created_at DESC LIMIT 50"
        )
        rows = cur.fetchall()
        jobs = [
            {
                'id': r[0],
                'address': r[1],
                'workers': r[2],
                'hours': float(r[3]),
                'price': r[4] or '',
                'phone': r[5],
                'work_type': r[6],
                'comment': r[7] or '',
                'created_at': r[8].strftime('%d.%m.%Y %H:%M') if r[8] else '',
            }
            for r in rows
        ]
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'jobs': jobs}, ensure_ascii=False)}

    # POST — создать заявку
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        address = (body.get('address') or '').strip()
        workers = body.get('workers')
        hours = body.get('hours')
        price = (body.get('price') or '').strip()[:200]
        phone = (body.get('phone') or '').strip()
        work_type = (body.get('work_type') or '').strip()
        docs = (body.get('docs') or '').strip()[:50]
        comment = (body.get('comment') or '').strip()[:1000]

        if not address or not workers or not hours or not phone or not work_type:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Заполните все обязательные поля'}, ensure_ascii=False)}

        try:
            workers = int(workers)
            hours = float(hours)
        except (ValueError, TypeError):
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Неверный формат числа'}, ensure_ascii=False)}

        a_esc = address.replace("'", "''")
        p_esc = price.replace("'", "''")
        ph_esc = phone.replace("'", "''")
        wt_esc = work_type.replace("'", "''")
        c_esc = comment.replace("'", "''")

        cur.execute(
            "INSERT INTO job_requests (address, workers, hours, price, phone, work_type, comment) "
            "VALUES ('%s', %s, %s, '%s', '%s', '%s', '%s') RETURNING id, created_at" % (
                a_esc, workers, hours, p_esc, ph_esc, wt_esc, c_esc)
        )
        row = cur.fetchone()

        # Формируем сообщение в общий чат
        hours_str = int(hours) if hours == int(hours) else hours
        lines = ['[[red]]НОВОЕ РАЗМЕЩЕНИЕ', '']
        lines.append('Адрес: %s' % address)
        lines.append('Кол-во чел.: %s' % workers)
        lines.append('Часов: %s' % hours_str)
        if price:
            lines.append('Цена: %s' % price)
        lines.append('Описание работ: %s' % work_type)
        if docs:
            lines.append('Документы: %s' % docs)
        lines.append('Телефон: %s' % phone)
        if comment:
            lines.append('Комментарий: %s' % comment)
        chat_text = '\n'.join(lines)
        chat_esc = chat_text.replace("'", "''")
        cur.execute(
            "INSERT INTO messages (user_id, user_name, text, author_phone) VALUES (NULL, 'Новое размещение', '%s', '%s')" % (chat_esc, ph_esc)
        )
        conn.commit()

        push_body = 'Адрес: %s · %s чел. · %s ч' % (address, workers, hours_str)
        try:
            send_push_to_all(cur, conn, 'Новое размещение заказа', push_body)
        except Exception as exc:
            print('JOBS PUSH ERROR: %s' % str(exc)[:200])

        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'success': True, 'id': row[0]}, ensure_ascii=False)}

    return {'statusCode': 405, 'headers': _cors(), 'body': json.dumps({'error': 'Метод не поддерживается'})}