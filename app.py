from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os

# Load the trained model
data_file = "model2.pkl"
try:
    with open(data_file, "rb") as f:
        dataset, features_matrix = pickle.load(f)
    print(f"Model loaded successfully with {len(dataset)} destinations")
except FileNotFoundError:
    dataset, features_matrix = None, None
    print(f"Error: {data_file} not found.")
except Exception as e:
    dataset, features_matrix = None, None
    print(f"Error loading model: {str(e)}")

app = Flask(__name__)
CORS(app)
app.static_folder = 'static'

@app.route("/")
def home():
    if dataset is None:
        return "Error: Model data not loaded.", 500
    return render_template("index.html", destinations=dataset["name"].tolist())

@app.route("/similar", methods=["POST"])
def recommend_similar():
    if dataset is None:
        return jsonify({"error": "Model data not available"}), 500
    
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "No data provided"}), 400
            
        destination_name = request_data.get("destination")
        if not destination_name:
            return jsonify({"error": "No destination provided"}), 400
            
        top_n = int(request_data.get("top_n", 5))
        
        if destination_name not in dataset["name"].values:
            return jsonify({"error": f"Destination '{destination_name}' not found"}), 404
        
        idx = dataset[dataset["name"] == destination_name].index[0]
        
        # Use cosine_similarity from sklearn for consistent results
        destination_features = features_matrix[idx].reshape(1, -1)
        similarity_scores = cosine_similarity(destination_features, features_matrix)[0]
        
        # Get top similar destinations (excluding self)
        similar_indices = np.argsort(similarity_scores)[::-1][1:top_n+1]
        
        similar_destinations = dataset.iloc[similar_indices][["name", "destination_id"]].copy()
        similar_destinations["similarity_score"] = (similarity_scores[similar_indices] * 100).round(1)
        
        return jsonify(similar_destinations.to_dict(orient="records"))
    
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/recommend", methods=["POST"])
def recommend_by_preferences():
    if dataset is None:
        return jsonify({"error": "Model data not available"}), 500
    
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "No preference data provided"}), 400
        
        # Convert preference values to integers with validation
        prefs = {}
        for key in ["culture", "nature", "adventure", "relaxation", "spiritual", "food"]:
            try:
                value = int(request_data.get(key, 5))
                if value < 1 or value > 10:
                    return jsonify({"error": f"Preference '{key}' must be between 1 and 10"}), 400
                prefs[key] = value
            except ValueError:
                return jsonify({"error": f"Invalid value for '{key}'"}), 400
        
        preferences = np.array([
            prefs.get("culture", 5),
            prefs.get("nature", 5),
            prefs.get("adventure", 5),
            prefs.get("relaxation", 5),
            prefs.get("spiritual", 5),
            prefs.get("food", 5)
        ]).reshape(1, -1) / 10  # Normalize to 0-1 scale
        
        # Use cosine_similarity for consistent results
        similarity_scores = cosine_similarity(preferences, features_matrix)[0]
        top_n = int(request_data.get("top_n", 5))
        top_indices = np.argsort(similarity_scores)[::-1][:top_n]
        
        recommendations = dataset.iloc[top_indices][["name", "destination_id"]].copy()
        recommendations["match_score"] = (similarity_scores[top_indices] * 100).round(1)
        
        return jsonify(recommendations.to_dict(orient="records"))
    
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/destination/<int:dest_id>")
def get_destination_details(dest_id):
    if dataset is None:
        return jsonify({"error": "Model data not available"}), 500
    
    try:
        if dest_id not in dataset["destination_id"].values:
            return jsonify({"error": f"Destination ID {dest_id} not found"}), 404
            
        destination = dataset[dataset["destination_id"] == dest_id].iloc[0].to_dict()
        return jsonify(destination)
    
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)