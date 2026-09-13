// ============================================================
// history.js
// ============================================================
// Fetches past predictions from the Flask backend and
// displays them in a table on history.html.

const API_BASE = "http://127.0.0.1:5000";

async function loadHistory() {
  const loading = document.getElementById("loadingState");
  const table = document.getElementById("historyTable");
  const empty = document.getElementById("emptyState");
  const body = document.getElementById("historyBody");

  try {
    const response = await fetch(`${API_BASE}/history`);

    if (!response.ok) {
      throw new Error("Server responded with an error.");
    }

    const rows = await response.json();
    loading.style.display = "none";

    if (rows.length === 0) {
      empty.style.display = "block";
      return;
    }

    table.style.display = "table";

    rows.forEach(function (row) {
      const tr = document.createElement("tr");

      const date = new Date(row.created_at);
      const dateStr =
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const anomalyBadge = row.is_anomaly
        ? '<span class="badge anomaly">Yes</span>'
        : '<span class="badge">No</span>';

      tr.innerHTML =
        "<td>" + dateStr + "</td>" +
        "<td>" + row.predicted_class + "</td>" +
        "<td>" + (row.confidence * 100).toFixed(1) + "%</td>" +
        "<td>" + row.priority_score + "</td>" +
        "<td>" + row.habitability_score + "</td>" +
        "<td>" + anomalyBadge + "</td>" +
        "<td>" + row.fun_label + "</td>";

      body.appendChild(tr);
    });

  } catch (err) {
    loading.textContent =
      "Could not reach the backend. Make sure app.py is running (python app.py) on localhost:5000.";
    console.log("History fetch error:", err);
  }
}

loadHistory();