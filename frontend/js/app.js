
// THEME AND LANGUAGE
const themeButton = document.getElementById("themeButton");
const languageButton = document.getElementById("languageButton");
const themeIcon = themeButton.querySelector("i");
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    themeIcon.classList.remove("bi-moon");
    themeIcon.classList.add("bi-sun");
}

themeButton.addEventListener("click", () => {
    if (document.body.getAttribute("data-theme") === "dark") {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
        themeIcon.classList.remove("bi-sun");
        themeIcon.classList.add("bi-moon");
    }
    else {
        document.body.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        themeIcon.classList.remove("bi-moon");
        themeIcon.classList.add("bi-sun");
    }
    loadCharts();
});

const translatableElements = document.querySelectorAll("[data-en][data-ar]");
const languageText = languageButton.querySelector("span");
let currentLanguage = "en";

languageButton.addEventListener("click", () => {
    translatableElements.forEach(element => {
        if (currentLanguage === "en") {
            element.textContent = element.dataset.ar;
        }
        else {
            element.textContent = element.dataset.en;
        }
    });

    if (currentLanguage === "en") {
        currentLanguage = "ar";
        languageText.textContent = "EN";

        document.documentElement.lang = "ar";
        document.documentElement.dir = "rtl";
    }
    else {
        currentLanguage = "en";
        languageText.textContent = "AR";

        document.documentElement.lang = "en";
        document.documentElement.dir = "ltr";
    }
});

const categorySelect = document.getElementById("category");



// NOTIFICATIONS AND ERRORS
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");

    const toast = document.createElement("div");

    toast.className = `app-toast ${type}`;

    const icon = type === "success"
        ? "bi-check-circle-fill"
        : "bi-trash-fill";

    toast.innerHTML = `
        <i class="bi ${icon}"></i>
        <span></span>
    `;

    toast.querySelector("span").textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });
    });

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 350);

    }, 3000);
}

function showAppAlert(message) {
    const alert = document.getElementById("appAlert");
    const alertMessage = document.getElementById("appAlertMessage");

    alertMessage.textContent = message;
    alert.classList.remove("d-none");
}

function hideAppAlert() {
    const alert = document.getElementById("appAlert");
    alert.classList.add("d-none");
}

async function getErrorMessage(response, fallback) {
    const errorData = await response.json().catch(() => ({}));
    return errorData.message || fallback;
}

function showRequestError(error, fallback) {
    console.error(error);

    if (error instanceof TypeError || error.message === "Failed to fetch") {
        showAppAlert(
            "Unable to connect to the server. Please make sure the server is running and try again."
        );
    } else {
        showAppAlert(error.message || fallback);
    }
}

// API CONFIGURATION
const API_URL = "http://localhost:3000/api/expenses";
const CATEGORIES_URL = "http://localhost:3000/api/expenses/categories";

const totalAmountElement = document.getElementById("totalAmount");
const totalExpensesElement = document.getElementById("totalExpenses");
const highestExpenseElement = document.getElementById("highestExpense");
const averageAmountElement = document.getElementById("averageAmount");
let monthlyChartInstance = null;
let categoryChartInstance = null;

// SUMMARY AND CHARTS
async function loadSummary() {
    try {
        const response = await fetch(`${API_URL}/stats`);

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to load summary")
            );
        }

        const stats = await response.json();

        totalAmountElement.textContent =
            `$${Number(stats.totalAmount).toFixed(2)}`;

        totalExpensesElement.textContent =
            stats.totalExpenses;

        highestExpenseElement.textContent =
            `$${Number(stats.highestExpenses).toFixed(2)}`;

        averageAmountElement.textContent =
            `$${Number(stats.averageAmount).toFixed(2)}`;

    }
    catch (error) {
        showRequestError(error, "Failed to load summary");
    }
}


async function loadCharts() {
    try {
        const [monthlyResponse, categoryResponse] = await Promise.all([
            fetch(`${API_URL}/stats/monthly`),
            fetch(`${API_URL}/stats/categories`)
        ]);

        if (!monthlyResponse.ok) {
            throw new Error(
                await getErrorMessage(monthlyResponse, "Failed to load monthly chart")
            );
        }

        if (!categoryResponse.ok) {
            throw new Error(
                await getErrorMessage(categoryResponse, "Failed to load category chart")
            );
        }

        const [monthlyData, categoryData] = await Promise.all([
            monthlyResponse.json(),
            categoryResponse.json()
        ]);

        const isDark = document.body.getAttribute("data-theme") === "dark";

        const textColor = getComputedStyle(document.body)
            .getPropertyValue("--text-color").trim();

        const mutedColor = getComputedStyle(document.body)
            .getPropertyValue("--muted-color").trim();

        const borderColor = getComputedStyle(document.body)
            .getPropertyValue("--border-color").trim();

        const primaryColor = getComputedStyle(document.body)
            .getPropertyValue("--primary-color").trim();

        const currentLang = document.documentElement.lang || "en";

        const monthLabels = monthlyData.map(item => {
            const [year, month] = item.month.split("-");

            return new Intl.DateTimeFormat(currentLang, {
                month: "short",
                year: "numeric"
            }).format(new Date(Number(year), Number(month) - 1));
        });

        // Monthly Spending Chart
        const monthlyCanvas = document.getElementById("monthlyChart");

        if (monthlyChartInstance) {
            monthlyChartInstance.destroy();
        }

        monthlyChartInstance = new Chart(monthlyCanvas, {
            type: "bar",

            data: {
                labels: monthLabels,
                datasets: [{
                    label: currentLang === "ar"
                        ? "إجمالي الإنفاق"
                        : "Total Spending",

                    data: monthlyData.map(item => item.totalAmount),

                    backgroundColor: primaryColor + "B3",
                    borderColor: primaryColor,
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: primaryColor
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: context =>
                                `$${Number(context.raw).toFixed(2)}`
                        }
                    }
                },

                scales: {
                    x: {
                        ticks: {
                            color: mutedColor
                        },
                        grid: {
                            display: false
                        }
                    },

                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: mutedColor,
                            callback: value => `$${value}`
                        },
                        grid: {
                            color: borderColor
                        }
                    }
                }
            }
        });

        // Category Spending Chart
        const categoryCanvas = document.getElementById("categoryChart");

        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }

        const categoryColors = [
            "#22C55E",
            "#3B82F6",
            "#F59E0B",
            "#A855F7",
            "#EC4899",
            "#64748B",
            "#14B8A6"
        ];

        categoryChartInstance = new Chart(categoryCanvas, {
            type: "doughnut",

            data: {
                labels: categoryData.map(item => item.category),

                datasets: [{
                    data: categoryData.map(item => item.totalAmount),
                    backgroundColor: categoryData.map(
                        (_, index) => categoryColors[index % categoryColors.length]
                    ),
                    borderColor: isDark ? "#191F20" : "#FFFFFF",
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: textColor,
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: "circle"
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: context =>
                                `${context.label}: $${Number(context.raw).toFixed(2)}`
                        }
                    }
                },

                cutout: "65%"
            }
        });

    } catch (error) {
        showRequestError(error, "Failed to load charts");
    }
}


// CATEGORIES AND EXPENSES TABLE
const expensesTableBody = document.querySelector("#expensesTableBody");
const loadingState = document.getElementById("loadingState");
const categoryFilter = document.getElementById("categoryFilter");

const searchInput = document.getElementById("searchInput");
const fromDate  = document.getElementById("fromDate");
const toDate  = document.getElementById("toDate");
const paginationInfo  = document.getElementById("paginationInfo");
const pagination  = document.getElementById("pagination");
let currentPage = 1;
const pageLimit = 10;
let totalPages = 1;
let searchTimeout;
let currentSort = "";


// GET CATEGORIES
async function loadCategories() {
    try {
        const response = await fetch(CATEGORIES_URL);

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to load categories")
            );
        }

        const result = await response.json();

        categoryFilter.innerHTML = `
            <option value="">All categories</option>
        `;

        result.forEach(item => {
            const category = item.category;

            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;

            categoryFilter.appendChild(option);
        });

    }
    catch (error) {
        showRequestError(error, "Failed to load categories");
    }
}

function renderPagination() {
    pagination.innerHTML = "";

    function createPageItem(label, page, disabled = false, active = false) {
        const item = document.createElement("li");
        item.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;

        const button = document.createElement("button");
        button.className = "page-link";
        button.textContent = label;
        button.disabled = disabled;

        button.addEventListener("click", () => {
            if (page !== currentPage) {
                currentPage = page;
                loadExpenses();
            }
        });

        item.appendChild(button);
        pagination.appendChild(item);
    }

    createPageItem("Previous", currentPage - 1, currentPage === 1);

    for (let page = 1; page <= totalPages; page++) {
        createPageItem(
            page,
            page,
            false,
            page === currentPage
        );
    }

    createPageItem("Next", currentPage + 1, currentPage === totalPages);
}

// GET EXPENSES AND RENDER TABLE
async function loadExpenses() {
    try {
        loadingState.classList.remove("d-none");

        const params = new URLSearchParams();

        params.set("page", currentPage);
        params.set("limit", pageLimit);

        if (searchInput.value.trim()) {
            params.set("search", searchInput.value.trim());
        }

        if (categoryFilter.value) {
            params.set("category", categoryFilter.value);
        }

        if (fromDate.value) {
            params.set("from", fromDate.value);
        }

        if (toDate.value) {
            params.set("to", toDate.value);
        }

        if (currentSort) {
            params.set("sort", currentSort);
        }


        const response = await fetch(`${API_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to load expenses")
            );
        }

        const result = await response.json();

        totalPages = Math.max(1, Math.ceil(result.total / pageLimit));

        const start = result.total === 0
            ? 0
            : (currentPage - 1) * pageLimit + 1;

        const end = Math.min(currentPage * pageLimit, result.total);

        paginationInfo.textContent =
            `Showing ${start}-${end} of ${result.total} expenses`;

        renderPagination();

        document.getElementById("emptyState").classList.toggle(
            "d-none",
            result.data.length !== 0
        );

        await Promise.all([
            await loadSummary(),
            await loadCharts()
        ]);

        expensesTableBody.innerHTML = "";

        result.data.forEach(expense => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${expense.title}</td>
                <td>$${expense.amount}</td>
                <td>
                    <span class="category-badge ${expense.category.toLowerCase()}">${expense.category}</span>
                </td>
                <td>${expense.date}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light edit-btn" data-id="${expense.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-light delete-btn" data-id="${expense.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            expensesTableBody.appendChild(row);
        });

        const editButtons = document.querySelectorAll(".edit-btn");

        editButtons.forEach(button => {
            button.addEventListener("click", async () => {
                try {
                    const expenseId = button.dataset.id;

                    const response = await fetch(`${API_URL}/${expenseId}`);

                    if (!response.ok) {
                        throw new Error(
                            await getErrorMessage(response, "Failed to load expense")
                        );
                    }

                    const expense = await response.json();

                    document.getElementById("editExpenseId").value = expense.id;
                    document.getElementById("editTitle").value = expense.title;
                    document.getElementById("editAmount").value = expense.amount;
                    document.getElementById("editCategory").value = expense.category;
                    document.getElementById("editDate").value = expense.date;

                    const editModal = new bootstrap.Modal(
                        document.getElementById("editExpenseModal")
                    );

                    editModal.show();

                } catch (error) {
                    showRequestError(error, "Failed to load expense");
                }
            });
        });

        const deleteButtons = document.querySelectorAll(".delete-btn");

        deleteButtons.forEach(button => {
            button.addEventListener("click", async () => {
                try {
                    const expenseId = button.dataset.id;

                    const response = await fetch(`${API_URL}/${expenseId}`, {
                        method: "DELETE"
                    });

                    if (!response.ok) {
                        throw new Error(
                            await getErrorMessage(response, "Failed to delete expense")
                        );
                    }

                    await loadExpenses();
                    showToast("Expense deleted successfully!", "danger");

                } catch (error) {
                    showRequestError(error, "Failed to delete expense");
                }
            });
        });

    }
    catch (error) {
        showRequestError(error, "Failed to load expenses");
    }
    finally {
        loadingState.classList.add("d-none");
    }
}

// APPLICATION INITIALIZATION
async function initializeApp() {
    await loadCategories();
    await loadExpenses();
}

initializeApp();

// FILTERS AND PAGINATION
function applyFilters() {
    currentPage = 1;
    loadExpenses();
}

categoryFilter.addEventListener("change", applyFilters);
fromDate.addEventListener("change", applyFilters);
toDate.addEventListener("change", applyFilters);
// SORT BY TABLE HEADERS
const sortableHeaders = document.querySelectorAll(".sortable-header");



sortableHeaders.forEach(header => {
    header.addEventListener("click", () => {
        const field = header.dataset.sortField;

        const newDirection =
            header.dataset.sortDirection === "asc" ? "desc" : "asc";

        currentSort = `${field}_${newDirection}`;

        sortableHeaders.forEach(item => {
            item.dataset.sortDirection =
                item === header ? newDirection : "";
        });

        applyFilters();
    });
});

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        applyFilters();
    }, 400);
});

// ADD AND EDIT EXPENSES
const editExpenseForm = document.getElementById("editExpenseForm");

editExpenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const expenseId = document.getElementById("editExpenseId").value;

        const updatedExpense = {
            title: document.getElementById("editTitle").value,
            amount: Number(document.getElementById("editAmount").value),
            category: document.getElementById("editCategory").value,
            date: document.getElementById("editDate").value
        };

        const response = await fetch(`${API_URL}/${expenseId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedExpense)
        });

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to update expense")
            );
        }

        await response.json();

        hideAppAlert();
        showToast("Expense updated successfully", "success");

        await loadExpenses();

        const editModal = bootstrap.Modal.getInstance(
            document.getElementById("editExpenseModal")
        );

        editModal.hide();

    }
    catch (error) {
        showRequestError(error, "Failed to update expense");
    }
});

const expenseForm = document.getElementById("expenseForm");

expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newExpense = {
        title: document.getElementById("title").value,
        amount: Number(document.getElementById("amount").value),
        category: categorySelect.value,
        date: document.getElementById("date").value
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newExpense)
        });

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to add expense")
            );
        }

        await response.json();

        hideAppAlert();
        showToast("Expense added successfully", "success");

        await loadExpenses();

        expenseForm.reset();
    }
    catch (error) {
        showRequestError(error, "Failed to add expense");
    }
});

// EXPORT CSV
async function exportExpensesToCSV() {
    try {
        const params = new URLSearchParams();

        // Apply the current filters
        if (searchInput.value.trim()) {
            params.set("search", searchInput.value.trim());
        }

        if (categoryFilter.value) {
            params.set("category", categoryFilter.value);
        }

        if (fromDate.value) {
            params.set("from", fromDate.value);
        }

        if (toDate.value) {
            params.set("to", toDate.value);
        }

        // Get the total number of matching expenses
        params.set("page", "1");
        params.set("limit", "1");

        let response = await fetch(`${API_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to export expenses")
            );
        }

        const countResult = await response.json();
        const total = countResult.total;

        if (total === 0) {
            showToast("No expenses to export", "danger");
            return;
        }

        // Fetch all matching expenses
        params.set("limit", String(total));

        response = await fetch(`${API_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(
                await getErrorMessage(response, "Failed to export expenses")
            );
        }

        const result = await response.json();

        // Prepare CSV content
        const headers = ["Title", "Amount", "Category", "Date"];

        const rows = result.data.map(expense => [
            expense.title,
            expense.amount,
            expense.category,
            expense.date
        ]);

        const csvContent = [headers, ...rows]
            .map(row =>
                row.map(value =>
                    `"${String(value ?? "").replace(/"/g, '""')}"`
                ).join(",")
            )
            .join("\r\n");

        // Add BOM so Excel displays Arabic correctly
        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast("Expenses exported successfully!", "success");

    } catch (error) {
        showRequestError(error, "Failed to export expenses");
    }
}

// Export button event
document.getElementById("exportCsvButton")
    .addEventListener("click", exportExpensesToCSV);


function clearFilters() {
    searchInput.value = "";
    categoryFilter.value = "";
    fromDate.value = "";
    toDate.value = "";
    currentSort = "";

    document.querySelectorAll(".sortable-header").forEach(header => {
    header.dataset.sortDirection = "";
});

    currentPage = 1;

    loadExpenses();
}

// Clear filters button event
document.getElementById("clearFiltersButton")
    .addEventListener("click", clearFilters);