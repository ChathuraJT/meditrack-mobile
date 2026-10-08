"""Read-only by default. --apply creates Supabase identities; never resets existing ones.
Requires psycopg2 installed in the executing Python environment.
"""
import argparse
import collections
import json
import os
from pathlib import Path
import re
import secrets
import sys
import urllib.request
import urllib.error


def read_env(path):
    values = {}
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if not line.strip() or line.lstrip().startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('\"').strip("'")
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend-dir', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    # Reuse the backend's installed driver without loading Django or any app startup code.
    sys.path.insert(0, str(args.backend_dir / 'Venv' / 'Lib' / 'site-packages'))
    import psycopg2
    env = {**read_env(args.backend_dir.parent / '.env'), **read_env(args.backend_dir / '.env'), **os.environ}
    url = env.get('SUPABASE_URL', '').rstrip('/')
    if not url.startswith('https://') or '/supabase.co' in url:
        raise RuntimeError('Configure SUPABASE_URL with the reviewed HTTPS project URL')
    secret = env.get('SUPABASE_SECRET_KEY', '')
    if not secret:
        raise RuntimeError('Server-only SUPABASE_SECRET_KEY is required')
    def auth_request(method, route, payload=None):
        headers = {'apikey': secret, 'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'}
        req = urllib.request.Request(url + '/auth/v1/' + route, data=None if payload is None else json.dumps(payload).encode(), headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)
    conn = psycopg2.connect(dbname=env.get('SUPABASE_DB_NAME', 'postgres'), user=env.get('SUPABASE_DB_USER', 'postgres'), password=env.get('SUPABASE_DB_PASSWORD', ''), host=env.get('SUPABASE_DB_HOST', 'db.' + url.split('//')[1].split('.')[0] + '.supabase.co'), port=env.get('SUPABASE_DB_PORT', '5432'), sslmode='require', connect_timeout=10)
    conn.set_session(readonly=True, autocommit=True)
    rows = []
    with conn.cursor() as cur:
        cur.execute("select id, email, username, case when is_superuser then 'admin' else role end from public.accounts_user order by id")
        rows.extend({'source': 'user', 'id': r[0], 'email': (r[1] or '').strip().lower(), 'username': r[2], 'role': r[3]} for r in cur.fetchall())
        cur.execute("select id,email,username from public.pending_doctors where status in ('pending','rejected') order by id")
        rows.extend({'source': 'pending', 'id': r[0], 'email': (r[1] or '').strip().lower(), 'username': r[2], 'role': 'doctor'} for r in cur.fetchall())
        cur.execute("select to_regclass('public.meditrack_accounts') is not null")
        schema_ready = cur.fetchone()[0]
    users = []
    page = 1
    while True:
        batch = auth_request('GET', 'admin/users?page=%d&per_page=1000' % page).get('users', [])
        users.extend(batch)
        if len(batch) < 1000:
            break
        page += 1
    by_email = {u.get('email', '').strip().lower(): u for u in users}
    emails = collections.Counter(r['email'] for r in rows)
    names = collections.Counter(r['username'].strip().lower() for r in rows)
    blockers = collections.Counter()
    todo = []
    imported = 0
    for row in rows:
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', row['email']):
            blockers['missing_or_invalid_email'] += 1
        elif emails[row['email']] > 1 or names[row['username'].strip().lower()] > 1:
            blockers['duplicate_identity'] += 1
        elif row['role'] not in ('patient', 'doctor', 'lab', 'admin'):
            blockers['unsupported_legacy_role'] += 1
        elif row['email'] in by_email:
            existing = by_email[row['email']]
            metadata = existing.get('app_metadata', {})
            if metadata.get('meditrack_legacy_source') != row['source'] or str(metadata.get('meditrack_legacy_id')) != str(row['id']):
                blockers['existing_unlinked_supabase_identity'] += 1
            elif not schema_ready:
                blockers['missing_mapping_schema'] += 1
            else:
                column = 'legacy_user_id' if row['source'] == 'user' else 'legacy_pending_id'
                with conn.cursor() as cur:
                    cur.execute('select id from public.meditrack_accounts where ' + column + '=%s', (row['id'],))
                    mapped = cur.fetchone()
                if not mapped or str(mapped[0]) != existing['id']:
                    blockers['inconsistent_existing_mapping'] += 1
                else:
                    imported += 1
        else:
            todo.append(row)
    print(json.dumps({'legacy_records': len(rows), 'supabase_users': len(users), 'already_imported': imported, 'ready_to_import': len(todo), 'schema_ready': schema_ready, 'blockers': dict(blockers), 'mode': 'apply' if args.apply else 'read-only'}))
    if blockers:
        raise RuntimeError('Resolve identity blockers with the account owners; no changes made')
    if args.apply:
        if not schema_ready:
            raise RuntimeError('Apply the reviewed SQL schema first; no changes made')
        for row in todo:
            # Random unknown password; ownership is verified through the recovery email flow.
            result = auth_request('POST', 'admin/users', {'email': row['email'], 'password': secrets.token_urlsafe(48), 'email_confirm': False, 'app_metadata': {'meditrack_legacy_source': row['source'], 'meditrack_legacy_id': row['id']}})
            uid = result.get('id') or result.get('user', {}).get('id')
            with conn.cursor() as cur:
                cur.execute('select id from public.meditrack_accounts where id=%s', (uid,))
                if not cur.fetchone():
                    raise RuntimeError('Import mapping missing; stop and inspect before retrying')
        print(json.dumps({'created': len(todo), 'emails_sent': 0, 'legacy_records_modified': 0}))
    conn.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Avoid exposing API response bodies, DSNs, emails, secret keys or database passwords.
        print('Migration stopped: ' + type(error).__name__ + '. Check connectivity, server configuration and the preflight counts.', file=sys.stderr)
        sys.exit(1)
