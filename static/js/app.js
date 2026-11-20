
// ==========================================
// CLOUDSPEND - DATABASE CONNECTED VERSION
// ==========================================

let expenses = [];
const monthlyBudget = 10000;

let monthlyChart;
let categoryChart;

const modal = document.getElementById("expense-modal");
const addExpenseBtn = document.getElementById("add-expense-btn");
const closeModalBtn = document.getElementById("close-modal");
const cancelModalBtn = document.getElementById("cancel-modal");
const expenseForm = document.getElementById("expense-form");

const transactionsBody = document.getElementById("transactions-body");
const emptyState = document.getElementById("empty-state");

const totalExpensesElement = document.getElementById("total-expenses");
const monthlyExpensesElement = document.getElementById("monthly-expenses");
const transactionCountElement = document.getElementById("transaction-count");
const budgetAmountElement = document.getElementById("budget-amount");

const currentDateElement = document.getElementById("current-date");
const expenseDateInput = document.getElementById("expense-date");

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    setCurrentDate();
    setDefaultExpenseDate();

    budgetAmountElement.textContent = formatCurrency(monthlyBudget);

    await loadExpenses();

    initializeCharts();
});

// ==========================================
// LOAD EXPENSES FROM DATABASE
// ==========================================

async function loadExpenses() {
    try {
        const response = await fetch("/api/expenses");

        if (!response.ok) {
            throw new Error("Failed to fetch expenses");
        }

        expenses = await response.json();

        renderDashboard();

    } catch (error) {
        console.error("Error loading expenses:", error);
        alert("Unable to load expenses from the database.");
    }
}

// ==========================================
// DATE FUNCTIONS
// ==========================================

function setCurrentDate() {
    const today = new Date();

    currentDateElement.textContent = today.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function setDefaultExpenseDate() {
    const today = new Date();

    const localDate = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];

    expenseDateInput.value = localDate;
}

// ==========================================
// MODAL
// ==========================================

function openModal() {
    modal.classList.remove("hidden");
    setDefaultExpenseDate();
}

function closeModal() {
    modal.classList.add("hidden");
    expenseForm.reset();
    setDefaultExpenseDate();
}

addExpenseBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
    }
});

// ==========================================
// ADD EXPENSE TO DATABASE
// ==========================================

expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const expense = {
        name: document.getElementById("expense-name").value.trim(),
        amount: Number(document.getElementById("expense-amount").value),
        category: document.getElementById("expense-category").value,
        payment: document.getElementById("expense-payment").value,
        date: expenseDateInput.value,
        description: document.getElementById("expense-description").value.trim()
    };

    if (
        !expense.name ||
        expense.amount <= 0 ||
        !expense.category ||
        !expense.payment ||
        !expense.date
    ) {
        alert("Please fill in all required fields correctly.");
        return;
    }

    try {
        const response = await fetch("/api/expenses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(expense)
        });

        if (!response.ok) {
            throw new Error("Failed to save expense");
        }

        closeModal();

        await loadExpenses();
        updateCharts();

    } catch (error) {
        console.error("Error saving expense:", error);
        alert("Unable to save expense to the database.");
    }
});

// ==========================================
// DASHBOARD
// ==========================================

function renderDashboard() {
    updateSummary();
    renderTransactions();
}

function updateSummary() {
    const today = new Date();

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const total = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
    );

    const monthlyTotal = expenses
        .filter(expense => {
            const expenseDate = new Date(expense.date + "T00:00:00");

            return expenseDate.getMonth() === currentMonth &&
                   expenseDate.getFullYear() === currentYear;
        })
        .reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
        );

    totalExpensesElement.textContent = formatCurrency(total);
    monthlyExpensesElement.textContent = formatCurrency(monthlyTotal);
    transactionCountElement.textContent = expenses.length;
}

// ==========================================
// TRANSACTION TABLE
// ==========================================

function renderTransactions() {
    transactionsBody.innerHTML = "";

    if (expenses.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    expenses.forEach(expense => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = expense.name;

        const categoryCell = document.createElement("td");

        const categoryBadge = document.createElement("span");
        categoryBadge.className = "category-badge";
        categoryBadge.textContent = expense.category;

        categoryCell.appendChild(categoryBadge);

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(expense.date);

        const paymentCell = document.createElement("td");
        paymentCell.textContent = expense.payment;

        const amountCell = document.createElement("td");
        amountCell.className = "amount-cell";
        amountCell.textContent = formatCurrency(Number(expense.amount));

        const actionCell = document.createElement("td");

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "text-button";
        deleteButton.style.color = "#ef4444";

        deleteButton.addEventListener("click", () => {
            deleteExpense(expense.id);
        });

        actionCell.appendChild(deleteButton);

        row.append(
            nameCell,
            categoryCell,
            dateCell,
            paymentCell,
            amountCell,
            actionCell
        );

        transactionsBody.appendChild(row);
    });
}

// ==========================================
// DELETE EXPENSE FROM DATABASE
// ==========================================

async function deleteExpense(id) {
    const confirmed = confirm("Are you sure you want to delete this expense?");

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Failed to delete expense");
        }

        await loadExpenses();
        updateCharts();

    } catch (error) {
        console.error("Error deleting expense:", error);
        alert("Unable to delete expense.");
    }
}

// ==========================================
// CHARTS
// ==========================================

function initializeCharts() {
    if (typeof Chart === "undefined") {
        console.error("Chart.js could not be loaded.");
        return;
    }

    const monthlyCanvas = document.getElementById("monthly-chart");
    const categoryCanvas = document.getElementById("category-chart");

    monthlyChart = new Chart(monthlyCanvas, {
        type: "bar",

        data: {
            labels: getLastSixMonths(),

            datasets: [{
                label: "Expenses",
                data: getMonthlyData(),
                backgroundColor: "#635bff",
                borderRadius: 7,
                maxBarThickness: 42
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    grid: {
                        color: "#f0f2f7"
                    },

                    ticks: {
                        callback: value => "₹" + value
                    }
                },

                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    categoryChart = new Chart(categoryCanvas, {
        type: "doughnut",

        data: {
            labels: getCategoryLabels(),

            datasets: [{
                data: getCategoryData(),

                backgroundColor: [
                    "#635bff",
                    "#18a874",
                    "#f59e0b",
                    "#3b82f6",
                    "#f472b6",
                    "#8b5cf6",
                    "#14b8a6",
                    "#64748b"
                ],

                borderWidth: 0,
                hoverOffset: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: "circle"
                    }
                }
            }
        }
    });
}

function updateCharts() {
    if (!monthlyChart || !categoryChart) return;

    monthlyChart.data.datasets[0].data = getMonthlyData();
    monthlyChart.update();

    categoryChart.data.labels = getCategoryLabels();
    categoryChart.data.datasets[0].data = getCategoryData();
    categoryChart.update();
}

// ==========================================
// CHART DATA
// ==========================================

function getLastSixMonths() {
    const months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
        );

        months.push(
            date.toLocaleDateString("en-IN", {
                month: "short"
            })
        );
    }

    return months;
}

function getMonthlyData() {
    const today = new Date();
    const results = [];

    for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
        );

        const month = targetDate.getMonth();
        const year = targetDate.getFullYear();

        const total = expenses
            .filter(expense => {
                const expenseDate = new Date(expense.date + "T00:00:00");

                return expenseDate.getMonth() === month &&
                       expenseDate.getFullYear() === year;
            })
            .reduce(
                (sum, expense) => sum + Number(expense.amount),
                0
            );

        results.push(total);
    }

    return results;
}

function getCategoryLabels() {
    const totals = {};

    expenses.forEach(expense => {
        totals[expense.category] =
            (totals[expense.category] || 0) + Number(expense.amount);
    });

    return Object.keys(totals);
}

function getCategoryData() {
    const totals = {};

    expenses.forEach(expense => {
        totals[expense.category] =
            (totals[expense.category] || 0) + Number(expense.amount);
    });

    return Object.values(totals);
}

// ==========================================
// UTILITIES
// ==========================================

function formatCurrency(amount) {
    return amount.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
