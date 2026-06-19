import os
import sqlite3
import json
from flask import Flask, request, jsonify, send_from_directory, session, redirect

app = Flask(__name__, static_folder='', static_url_path='')
# we encrypt our cookies with this secret key. make sure to configure FLASK_SECRET_KEY in production!
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'samarpan_kuwait_secure_secret_key_129837198')

DATABASE = 'samarpan.db'

# dictionary lookup of admins. in prod, set these through env vars (e.g. ADMIN_PASSWORD) for safety.
ADMINS = {
    "admin": os.environ.get("ADMIN_PASSWORD", "samarpan123"),
    "samarpan": os.environ.get("SAMARPAN_PASSWORD", "gujarati"),
    "mainadmin": os.environ.get("MAINADMIN_PASSWORD", "admin123")
}

# quick database connection helper. row_factory lets us access columns as dictionary keys which is very handy
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# database builder. runs once at server startup to build out the schema if SQLite is empty.
def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id TEXT PRIMARY KEY,
            membership_type TEXT NOT NULL,
            main_name TEXT NOT NULL,
            main_age INTEGER NOT NULL,
            main_photo TEXT,
            wife_name TEXT,
            wife_age TEXT,
            wife_photo TEXT,
            father_name TEXT,
            father_age TEXT,
            father_photo TEXT,
            mother_name TEXT,
            mother_age TEXT,
            mother_photo TEXT,
            children TEXT, -- Stores children rows as a JSON array string
            india_address TEXT NOT NULL,
            india_phone TEXT NOT NULL,
            kuwait_mobile TEXT NOT NULL,
            kuwait_home TEXT,
            kuwait_office TEXT,
            email_primary TEXT NOT NULL,
            email_secondary TEXT,
            years_in_gujarat INTEGER NOT NULL,
            rec1_name TEXT NOT NULL,
            rec1_id TEXT NOT NULL,
            rec2_name TEXT NOT NULL,
            rec2_id TEXT NOT NULL,
            submission_date TEXT NOT NULL,
            status TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# simple helper to check if this user session is authenticated as admin
def is_admin_logged_in():
    return session.get('admin_logged_in') == True

# landing page route
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

# dashboard panel route. redirects to login page if they are not authenticated.
@app.route('/admin/admin-dashboard.html')
def admin_dashboard():
    if not is_admin_logged_in():
        return redirect('/admin/admin-login.html')
    return send_from_directory('admin', 'admin-dashboard.html')

# login endpoint: sets admin session cookies on success
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')

    if username in ADMINS and ADMINS[username] == password:
        session['admin_logged_in'] = True
        session['admin_user'] = username
        return jsonify({"success": True, "redirect": "/admin/admin-dashboard.html?user=" + username}), 200
    
    return jsonify({"success": False, "message": "Invalid username or password"}), 401

# logout endpoint: clears session keys and boots the user out
@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_user', None)
    return jsonify({"success": True, "redirect": "/admin/admin-login.html"}), 200

# public wizard form submit route. inserts application fields into sqlite.
@app.route('/api/applications', methods=['POST'])
def add_application():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    conn = get_db()
    cursor = conn.cursor()

    is_family = data.get('membership_type') == 'family'
    family = data.get('family') or {}

    wife = family.get('wife', {})
    father = family.get('father', {})
    mother = family.get('mother', {})
    children = family.get('children', [])

    try:
        cursor.execute('''
            INSERT INTO applications (
                id, membership_type, main_name, main_age, main_photo,
                wife_name, wife_age, wife_photo,
                father_name, father_age, father_photo,
                mother_name, mother_age, mother_photo,
                children,
                india_address, india_phone,
                kuwait_mobile, kuwait_home, kuwait_office,
                email_primary, email_secondary,
                years_in_gujarat,
                rec1_name, rec1_id, rec2_name, rec2_id,
                submission_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('id'),
            data.get('membership_type'),
            data.get('main_member', {}).get('name'),
            int(data.get('main_member', {}).get('age')),
            data.get('main_member', {}).get('photo'),
            
            wife.get('name') if is_family else None,
            wife.get('age') if is_family else None,
            wife.get('photo') if is_family else None,
            
            father.get('name') if is_family else None,
            father.get('age') if is_family else None,
            father.get('photo') if is_family else None,
            
            mother.get('name') if is_family else None,
            mother.get('age') if is_family else None,
            mother.get('photo') if is_family else None,
            
            json.dumps(children) if is_family else '[]',
            
            data.get('address_india', {}).get('address'),
            data.get('address_india', {}).get('phone'),
            
            data.get('contact_kuwait', {}).get('mobile'),
            data.get('contact_kuwait', {}).get('home'),
            data.get('contact_kuwait', {}).get('office'),
            
            data.get('emails', {}).get('primary'),
            data.get('emails', {}).get('secondary'),
            
            int(data.get('declaration', {}).get('years_in_gujarat')),
            
            data.get('recommenders', {}).get('rec1_name'),
            data.get('recommenders', {}).get('rec1_id'),
            data.get('recommenders', {}).get('rec2_name'),
            data.get('recommenders', {}).get('rec2_id'),
            
            data.get('submission_date'),
            data.get('status')
        ))
        conn.commit()
        return jsonify({"message": "Application submitted successfully", "id": data.get('id')}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# stats metric endpoint to fill dashboard stat cards
@app.route('/api/admin/stats', methods=['GET'])
def get_dashboard_stats():
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    
    # lookup approved applications count
    cursor.execute("SELECT COUNT(*) FROM applications WHERE status = 'Approved'")
    approved_count = cursor.fetchone()[0]
    
    # add these approved ones to their baseline (2547) from the old system
    total_members = 2547 + approved_count
    
    # lookup count of applications waiting for review
    cursor.execute("SELECT COUNT(*) FROM applications WHERE status = 'Pending'")
    pending_count = cursor.fetchone()[0]
    
    conn.close()

    return jsonify({
        "total_members": total_members,
        "pending_applications": pending_count,
        "upcoming_events": 3,
        "total_posts": 142
    }), 200

# fetches all pending applications from sqlite for review
@app.route('/api/applications', methods=['GET'])
def get_applications():
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM applications WHERE status = 'Pending'")
    rows = cursor.fetchall()
    conn.close()

    applications = []
    for r in rows:
        children_list = []
        try:
            children_list = json.loads(r['children']) if r['children'] else []
        except Exception:
            pass

        applications.append({
            "id": r['id'],
            "membership_type": r['membership_type'],
            "main_member": {
                "name": r['main_name'],
                "age": r['main_age'],
                "photo": r['main_photo']
            },
            "family": {
                "wife": {"name": r['wife_name'], "age": r['wife_age'], "photo": r['wife_photo']},
                "father": {"name": r['father_name'], "age": r['father_age'], "photo": r['father_photo']},
                "mother": {"name": r['mother_name'], "age": r['mother_age'], "photo": r['mother_photo']},
                "children": children_list
            } if r['membership_type'] == 'family' else None,
            "address_india": {
                "address": r['india_address'],
                "phone": r['india_phone']
            },
            "contact_kuwait": {
                "mobile": r['kuwait_mobile'],
                "home": r['kuwait_home'],
                "office": r['kuwait_office']
            },
            "emails": {
                "primary": r['email_primary'],
                "secondary": r['email_secondary']
            },
            "declaration": {
                "years_in_gujarat": r['years_in_gujarat'],
                "origin_confirm": True,
                "constitution_confirm": True
            },
            "recommenders": {
                "rec1_name": r['rec1_name'],
                "rec1_id": r['rec1_id'],
                "rec2_name": r['rec2_name'],
                "rec2_id": r['rec2_id']
            },
            "submission_date": r['submission_date'],
            "status": r['status']
        })
    return jsonify(applications)

# sets application status to 'Approved'
@app.route('/api/applications/<id>/approve', methods=['POST'])
def approve_app(id):
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE applications SET status = 'Approved' WHERE id = ?", (id,))
        conn.commit()
        return jsonify({"message": "Application approved successfully", "id": id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# sets application status to 'Rejected'
@app.route('/api/applications/<id>/reject', methods=['POST'])
def reject_app(id):
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE applications SET status = 'Rejected' WHERE id = ?", (id,))
        conn.commit()
        return jsonify({"message": "Application rejected successfully", "id": id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# fallback handler for loading pages & assets. intercepts and locks admin dashboard.
@app.route('/<path:path>')
def serve_page(path):
    if path == 'admin/admin-dashboard.html':
        return redirect('/admin/admin-login.html')

    if os.path.exists(path):
        return send_from_directory('.', path)
    # Check inside standard directories
    for folder in ['admin', 'components', 'assets']:
        full_path = os.path.join(folder, path)
        if os.path.exists(full_path):
            return send_from_directory(folder, path)
    return "File Not Found", 404

if __name__ == '__main__':
    init_db()
    print("Flask backend running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
