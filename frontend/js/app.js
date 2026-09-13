// ============================================================
// app.js
// ============================================================
// Handles the "Analyze a Signal" form on the home page:
// reads the input values, calls the Flask backend, and
// displays the result with an animated reveal.

// CHANGE THIS if your Flask backend runs on a different address.
const API_BASE = "http://127.0.0.1:5000";

const form = document.getElementById("predictForm");

form.addEventListener("submit", async function (event) {
  // Stop the browser from reloading the page (default form behavior).
  event.preventDefault();

  const statusMsg = document.getElementById("statusMsg");
  statusMsg.textContent = "Running analysis...";

  // Step 1: Read every input value from the form.
  const payload = {
    koi_period: parseFloat(document.getElementById("koi_period").value),
    koi_duration: parseFloat(document.getElementById("koi_duration").value),
    koi_depth: parseFloat(document.getElementById("koi_depth").value),
    koi_prad: parseFloat(document.getElementById("koi_prad").value),
    koi_teq: parseFloat(document.getElementById("koi_teq").value),
    koi_insol: parseFloat(document.getElementById("koi_insol").value),
    koi_model_snr: parseFloat(document.getElementById("koi_model_snr").value),
    koi_steff: parseFloat(document.getElementById("koi_steff").value),
    koi_slogg: parseFloat(document.getElementById("koi_slogg").value),
    koi_srad: parseFloat(document.getElementById("koi_srad").value)
  };

  // Step 2: Send it to the Flask backend.
  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Server responded with an error.");
    }

    const data = await response.json();
    statusMsg.textContent = "";

    // Step 3: Display the result on the page.
    showResult(data);

  } catch (err) {
    statusMsg.textContent =
      "Could not reach the backend. Make sure app.py is running (python app.py) on localhost:5000.";
    console.log("Prediction error:", err);
  }
});

function showResult(data) {
  const panel = document.getElementById("resultPanel");

  document.getElementById("classBadge").textContent = data.predicted_class;
  document.getElementById("funLabel").textContent = data.fun_label;
  document.getElementById("scoreSub").textContent =
    "Priority score " + data.priority_score + " / 100";

  document.getElementById("mClass").textContent = data.predicted_class;
  document.getElementById("mConfidence").textContent =
    (data.confidence * 100).toFixed(1) + "%";
  document.getElementById("mAnomaly").textContent = data.is_anomaly ? "Yes" : "No";
  document.getElementById("mPriority").textContent = data.priority_score;
  document.getElementById("mHabitability").textContent = data.habitability_score;

  // Color the reveal glow: gold for a normal result, teal if anomaly.
  panel.style.setProperty("--glow-color", data.is_anomaly ? "#6DD3C7" : "#F2A65A");

  const badge = document.getElementById("classBadge");
  badge.className = data.is_anomaly ? "badge anomaly" : "badge";

  // Restart the reveal animation even if it already played once before.
  panel.classList.remove("reveal");
  void panel.offsetWidth; // this forces the browser to notice the change
  panel.classList.add("show", "reveal");
}