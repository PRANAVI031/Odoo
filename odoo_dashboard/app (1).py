from flask import Flask, request, jsonify
import pymysql
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# ---------- DATABASE CONNECTION ----------
def db():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="root",
        database="inventory",
        cursorclass=pymysql.cursors.DictCursor
    )


# ---------- ADD WAREHOUSE ----------
@app.route("/add_warehouse", methods=["POST"])
def add_warehouse():
    data = request.json
    conn = db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO warehouse (name, short_code, address)
            VALUES (%s, %s, %s)
        """, (data["name"], data["short_code"], data["address"]))
        conn.commit()

    return jsonify({"message": "Warehouse saved successfully!"})


# ---------- GET WAREHOUSES ----------
@app.route("/get_warehouses")
def get_warehouses():
    conn = db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, short_code FROM warehouse")
        rows = cur.fetchall()
    return jsonify(rows)


# ---------- ADD LOCATION ----------
@app.route("/add_location", methods=["POST"])
def add_location():
    data = request.json
    conn = db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO location (name, short_code, warehouse_id)
            VALUES (%s, %s, %s)
        """, (data["name"], data["short_code"], data["warehouse_id"]))
        conn.commit()

    return jsonify({"message": "Location saved successfully!"})


app.run(debug=True)
