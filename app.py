from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import random
import smtplib
from email.message import EmailMessage

app = Flask(__name__)
CORS(app)

# ---------------- DATABASE CONNECTION ----------------
db = mysql.connector.connect(
    host="localhost",
    user="root",       # change if needed
    password="root",   # change if your MySQL has a password
    database="login_system"
)
cursor = db.cursor()

# ---------------- EMAIL FUNCTION ----------------
def send_otp_email(to_email, otp):
    msg = EmailMessage()
    msg.set_content(f"Your OTP for password reset is: {otp}")
    msg['Subject'] = 'Password Reset OTP'
    msg['From'] = "abolihackathon@gmail.com"  # replace with your email
    msg['To'] = to_email

    # Gmail SMTP (use app password)
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login("abolihackathon@gmail.com", "ihec lkke gdss reyr")  # replace with your credentials
        smtp.send_message(msg)

# ---------------- SIGNUP ----------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data["username"]
    email = data["email"]
    password = data["password"]

    try:
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (username, email, password)
        )
        db.commit()
        return jsonify({"message": "Signup successful!"})
    except Exception as e:
        print("SIGNUP ERROR:", e)
        return jsonify({"message": "Signup failed"}), 500

# ---------------- LOGIN ----------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    cursor.execute(
        "SELECT * FROM users WHERE username=%s AND password=%s",
        (username, password)
    )
    user = cursor.fetchone()

    if user:
        return jsonify({"message": "Login successful!"})
    else:
        return jsonify({"message": "Invalid username or password"})

# ---------------- FORGOT PASSWORD ----------------
@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")

    # Check if email exists
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cursor.fetchone()
    if not user:
        return jsonify({"message": "Email not found"}), 400

    otp = str(random.randint(100000, 999999))

    # Store OTP in otp_storage table (replace if exists)
    cursor.execute("REPLACE INTO otp_storage (email, otp) VALUES (%s, %s)", (email, otp))
    db.commit()

    try:
        send_otp_email(email, otp)
        return jsonify({"message": "OTP sent to your email"})
    except Exception as e:
        print("EMAIL ERROR:", e)
        return jsonify({"message": "Failed to send OTP"}), 500

# ---------------- VERIFY OTP ----------------
@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    email = data.get("email")
    otp = data.get("otp")

    cursor.execute("SELECT otp FROM otp_storage WHERE email=%s", (email,))
    row = cursor.fetchone()
    if row and row[0] == otp:
        # OTP verified, delete it
        cursor.execute("DELETE FROM otp_storage WHERE email=%s", (email,))
        db.commit()
        return jsonify({"message": "OTP verified"})
    else:
        return jsonify({"message": "Invalid OTP"}), 400

# ---------------- RESET PASSWORD ----------------
@app.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    email = data.get("email")
    new_password = data.get("password")

    cursor.execute("UPDATE users SET password=%s WHERE email=%s", (new_password, email))
    db.commit()

    return jsonify({"message": "Password reset successful!"})

# ---------------- RUN APP ----------------
if __name__ == "__main__":
    app.run(debug=True)
