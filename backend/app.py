# ============================================================
# app.py (PostgreSQL version)
# ============================================================
# This is the main Flask backend for StellarScan.
#
# What this file does, in order:
# 1. Loads the 3 trained model files (classifier, anomaly detector, scaler)
# 2. Sets up a connection helper to PostgreSQL
# 3. Defines one API endpoint: POST /predict
#    - Frontend sends 10 numbers (the star's measurements)
#    - This file runs them through both models
#    - It calculates a priority score and a fun label
#    - It saves the whole result into PostgreSQL
#    - It sends the result back to the frontend as JSON
# 4. Defines GET /history to list past predictions

from flask import Flask
from flask import request
from flask import jsonify
from flask_cors import CORS

import joblib
import numpy as np

import psycopg2
import psycopg2.extras

import config

# --------------------------------------------------------------
# SECTION 1: Set up the Flask app
# --------------------------------------------------------------

app = Flask(__name__)

# CORS allows your frontend (running on a different port/domain)
# to be able to talk to this backend without being blocked by the browser.
CORS(app)


# --------------------------------------------------------------
# SECTION 2: Load the trained models (only happens once, at startup)
# --------------------------------------------------------------

classifier_model = joblib.load("model/stellarscan_classifier.joblib")
anomaly_model = joblib.load("model/stellarscan_anomaly_detector.joblib")
scaler = joblib.load("model/stellarscan_scaler.joblib")

# This MUST be the exact same order used during training in the notebook.
FEATURE_ORDER = [
    "koi_period",
    "koi_duration",
    "koi_depth",
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_model_snr",
    "koi_steff",
    "koi_slogg",
    "koi_srad"
]

print("All 3 models loaded successfully.")


# --------------------------------------------------------------
# SECTION 3: Helper function to connect to PostgreSQL
# --------------------------------------------------------------

def get_database_connection():
    """
    Opens and returns a fresh connection to our PostgreSQL database,
    using the credentials from config.py.

    NOTE: psycopg2 uses "dbname", NOT "database" like mysql-connector did.
    This is a common mistake when switching between the two libraries.
    """
    connection = psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        dbname=config.DB_NAME
    )
    return connection


# --------------------------------------------------------------
# SECTION 4: Helper functions (same logic as the notebook)
# --------------------------------------------------------------

def calculate_priority_score(classifier_confidence, is_anomaly):
    """
    Turns model outputs into one simple 0-100 score.
    Same logic as Section 11 of the training notebook.
    """
    base_score = classifier_confidence * 100

    if is_anomaly:
        base_score = base_score + 10

    if base_score > 100:
        base_score = 100

    return round(base_score, 2)


def calculate_habitability_score(predicted_class, koi_teq, koi_insol, koi_prad):
    """
    Gives a 0-100 score for how "Earth-like" the conditions are.
    This is a simple, honest heuristic based on real astrophysics -
    NOT a claim about actual life or aliens, just how close the
    planet's temperature, energy received, and size are to Earth's.

    If the signal is not CONFIRMED as a real planet, we return "N/A"
    instead of a number, because scoring habitability for something
    that might not even be a real planet would be misleading.
    """

    if predicted_class != "CONFIRMED":
        return "N/A"

    # Earth's own reference values:
    # Equilibrium temperature ~255 K, Insolation = 1.0 (by definition),
    # Radius = 1.0 Earth radius.

    ideal_teq = 255
    ideal_insol = 1.0
    ideal_prad = 1.0

    # For each property, we calculate how far away it is from Earth's
    # value, as a percentage. A perfect match gives 0 difference.

    teq_difference = abs(koi_teq - ideal_teq) / ideal_teq
    insol_difference = abs(koi_insol - ideal_insol) / ideal_insol
    prad_difference = abs(koi_prad - ideal_prad) / ideal_prad

    # Average the three differences into one overall "distance from Earth-like".
    average_difference = (teq_difference + insol_difference + prad_difference) / 3

    # Convert that distance into a 0-100 score.
    # A small difference (close to 0) should give a score close to 100.
    # A large difference should push the score down toward 0.
    score = 100 - (average_difference * 100)

    # Keep the score within the 0 to 100 range.
    if score < 0:
        score = 0
    if score > 100:
        score = 100

    return round(score, 1)


def get_fun_label(is_anomaly, anomaly_score):
    """
    Turns a real anomaly detection result into a fun, presentable label.
    Same logic as Section 11 of the training notebook.
    """
    if is_anomaly == False:
        return "Standard Signal"

    if anomaly_score < -0.15:
        return "Highly Unusual Signal - Priority Review"
    else:
        return "Unusual Cosmic Signature Detected"


# --------------------------------------------------------------
# SECTION 5: The main prediction endpoint
# --------------------------------------------------------------

@app.route("/predict", methods=["POST"])
def predict():
    """
    Expects a JSON body like this from the frontend:

    {
        "koi_period": 4.2,
        "koi_duration": 3.1,
        "koi_depth": 500,
        "koi_prad": 1.5,
        "koi_teq": 850,
        "koi_insol": 120,
        "koi_model_snr": 25,
        "koi_steff": 5700,
        "koi_slogg": 4.4,
        "koi_srad": 1.0
    }
    """

    # Step 1: Read the JSON data sent by the frontend.
    input_data = request.get_json()

    # Step 2: Put the values in the EXACT same order the model was trained on.
    feature_values = []
    for feature_name in FEATURE_ORDER:
        value = input_data[feature_name]
        feature_values.append(value)

    # Convert to a 2D array, because scikit-learn expects a table
    # (even if it is just one row).
    feature_array = np.array([feature_values])

    # Step 3: Scale the input the same way we scaled training data.
    scaled_features = scaler.transform(feature_array)

    # Step 4: Run the classifier.
    predicted_class = classifier_model.predict(scaled_features)[0]
    probabilities = classifier_model.predict_proba(scaled_features)[0]
    confidence = float(probabilities.max())

    # Step 5: Run the anomaly detector.
    anomaly_flag = anomaly_model.predict(scaled_features)[0]
    is_anomaly = bool(anomaly_flag == -1)
    anomaly_score = float(anomaly_model.decision_function(scaled_features)[0])

    # Step 6: Calculate priority score and fun label.
    priority_score = calculate_priority_score(confidence, is_anomaly)
    fun_label = get_fun_label(is_anomaly, anomaly_score)
    habitability_score = calculate_habitability_score(
        predicted_class,
        input_data["koi_teq"],
        input_data["koi_insol"],
        input_data["koi_prad"]
    )

    # Step 7: Save this result into PostgreSQL.
    connection = get_database_connection()
    cursor = connection.cursor()

    # psycopg2 uses %s placeholders too, so this query looks the same
    # as the MySQL version - the difference is under the hood.
    insert_query = """
        INSERT INTO predictions (
            koi_period, koi_duration, koi_depth, koi_prad, koi_teq,
            koi_insol, koi_model_snr, koi_steff, koi_slogg, koi_srad,
            predicted_class, confidence, is_anomaly, priority_score, fun_label,
            habitability_score
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values_to_insert = (
        input_data["koi_period"],
        input_data["koi_duration"],
        input_data["koi_depth"],
        input_data["koi_prad"],
        input_data["koi_teq"],
        input_data["koi_insol"],
        input_data["koi_model_snr"],
        input_data["koi_steff"],
        input_data["koi_slogg"],
        input_data["koi_srad"],
        predicted_class,
        confidence,
        is_anomaly,
        priority_score,
        fun_label,
        str(habitability_score)
    )

    cursor.execute(insert_query, values_to_insert)
    connection.commit()
    cursor.close()
    connection.close()

    # Step 8: Send the result back to the frontend as JSON.
    result = {
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "is_anomaly": is_anomaly,
        "priority_score": priority_score,
        "fun_label": fun_label,
        "habitability_score": habitability_score
    }

    return jsonify(result)


# --------------------------------------------------------------
# SECTION 6: An endpoint to fetch prediction history
# --------------------------------------------------------------

@app.route("/history", methods=["GET"])
def history():
    """
    Returns the most recent 50 predictions, newest first.
    Your frontend's History page calls this.
    """

    connection = get_database_connection()

    # RealDictCursor makes each row come back as a dictionary
    # (like {"id": 1, "predicted_class": "CONFIRMED", ...})
    # instead of a plain tuple. This is psycopg2's equivalent of
    # mysql-connector's cursor(dictionary=True).
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""
        SELECT * FROM predictions
        ORDER BY created_at DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    # Convert each row (a RealDictRow) into a plain dictionary
    # so Flask's jsonify() can turn it into JSON correctly.
    result_list = []
    for row in rows:
        result_list.append(dict(row))

    return jsonify(result_list)


# --------------------------------------------------------------
# SECTION 7: Run the app
# --------------------------------------------------------------

if __name__ == "__main__":
    # debug=True auto-reloads the server whenever you save a change.
    # Turn this off before deploying to Render.
    app.run(debug=True, host="0.0.0.0", port=5000)