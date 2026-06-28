import json
import os
import psycopg2

def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """Регистрация участников по телефону (без пароля)"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = _db()
    cur = conn.cursor()

    # GET — список всех участников или проверка по телефону
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        phone = (params.get('phone') or '').strip()

        # Без телефона — вернуть всех участников
        if not phone:
            cur.execute("SELECT id, full_name, organization, work_direction, created_at FROM participants ORDER BY created_at DESC")
            rows = cur.fetchall()
            members = []
            for r in rows:
                name = r[1] or ''
                # Формируем Фамилия И.О.
                parts = name.split()
                if len(parts) >= 3:
                    short = '%s %s.%s.' % (parts[0], parts[1][0], parts[2][0])
                elif len(parts) == 2:
                    short = '%s %s.' % (parts[0], parts[1][0])
                else:
                    short = name
                members.append({
                    'id': r[0],
                    'short_name': short,
                    'organization': r[2] or '',
                    'work_direction': r[3] or '',
                    'joined': r[4].strftime('%d.%m.%Y') if r[4] else '',
                })
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'members': members}, ensure_ascii=False)}
        ph_esc = phone.replace("'", "''")
        cur.execute("SELECT id, full_name, organization, work_direction FROM participants WHERE phone = '%s'" % ph_esc)
        row = cur.fetchone()
        if row:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'found': True, 'participant': {
                        'id': row[0], 'full_name': row[1],
                        'organization': row[2] or '', 'work_direction': row[3] or '',
                    }}, ensure_ascii=False)}
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'found': False}, ensure_ascii=False)}

    # POST — зарегистрировать участника
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        full_name = (body.get('full_name') or '').strip()[:200]
        organization = (body.get('organization') or '').strip()[:300]
        work_direction = (body.get('work_direction') or '').strip()[:300]
        phone = (body.get('phone') or '').strip()[:50]

        if not full_name or not phone:
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Заполните ФИО и номер телефона'}, ensure_ascii=False)}

        ph_esc = phone.replace("'", "''")
        cur.execute("SELECT id FROM participants WHERE phone = '%s'" % ph_esc)
        existing = cur.fetchone()
        if existing:
            return {'statusCode': 200, 'headers': _cors(),
                    'body': json.dumps({'success': True, 'id': existing[0], 'already_registered': True}, ensure_ascii=False)}

        fn_esc = full_name.replace("'", "''")
        org_esc = organization.replace("'", "''")
        wd_esc = work_direction.replace("'", "''")
        cur.execute(
            "INSERT INTO participants (full_name, organization, work_direction, phone) "
            "VALUES ('%s', '%s', '%s', '%s') RETURNING id" % (fn_esc, org_esc, wd_esc, ph_esc)
        )
        pid = cur.fetchone()[0]
        conn.commit()

        try:
            from push import send_push_to_all
            org_part = (' (%s)' % organization) if organization else ''
            send_push_to_all(
                cur, conn,
                'Новый участник',
                '%s%s зарегистрировался' % (full_name, org_part),
                '/',
            )
        except Exception as exc:
            print('PUSH on register error: %s' % str(exc)[:200])

        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'success': True, 'id': pid}, ensure_ascii=False)}

    # DELETE — удалить участника по id
    if method == 'DELETE':
        params = event.get('queryStringParameters') or {}
        pid = (params.get('id') or '').strip()
        if not pid.isdigit():
            body = json.loads(event.get('body') or '{}')
            pid = str(body.get('id') or '').strip()
        if not pid.isdigit():
            return {'statusCode': 400, 'headers': _cors(),
                    'body': json.dumps({'error': 'Не указан участник'}, ensure_ascii=False)}
        cur.execute("DELETE FROM participants WHERE id = %s" % pid)
        conn.commit()
        return {'statusCode': 200, 'headers': _cors(),
                'body': json.dumps({'success': True}, ensure_ascii=False)}

    return {'statusCode': 405, 'headers': _cors(), 'body': json.dumps({'error': 'Метод не поддерживается'})}