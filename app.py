
from flask import Flask, render_template, request, jsonify
from database import get_db_connection, init_db

app = Flask(__name__)

# Initialize database
init_db()


# Home page
@app.route("/")
def home():
    return render_template("index.html")


# Get all expenses
@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    connection = get_db_connection()

    expenses = connection.execute(
        "SELECT * FROM expenses ORDER BY date DESC, id DESC"
    ).fetchall()

    connection.close()

    return jsonify([dict(expense) for expense in expenses])


# Add a new expense
@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    required_fields = ["name", "amount", "category", "payment", "date"]

    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    try:
        amount = float(data["amount"])

        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400

    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    connection = get_db_connection()

    cursor = connection.execute(
        """
        INSERT INTO expenses (name, amount, category, payment, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data["name"],
            amount,
            data["category"],
            data["payment"],
            data["date"],
            data.get("description", "")
        )
    )

    connection.commit()

    expense_id = cursor.lastrowid

    connection.close()

    return jsonify({
        "message": "Expense added successfully",
        "id": expense_id
    }), 201


# Delete an expense
@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    connection = get_db_connection()

    cursor = connection.execute(
        "DELETE FROM expenses WHERE id = ?",
        (expense_id,)
    )

    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({"error": "Expense not found"}), 404

    return jsonify({"message": "Expense deleted successfully"})


if __name__ == "__main__":
    app.run(debug=True)
