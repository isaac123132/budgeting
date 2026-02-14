const MONTHLY_BUDGET = {
  Housing: 1200,
  Food: 450,
  Transportation: 250,
  Utilities: 300,
  Health: 150,
  Entertainment: 180,
  Savings: 400,
  Other: 100,
};

const STORAGE_KEY = "budgetbuddy.transactions";

const form = document.getElementById("transactionForm");
const formHeading = document.getElementById("formHeading");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEdit");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const transactionList = document.getElementById("transactionList");
const categoryBudget = document.getElementById("categoryBudget");
const incomeTotal = document.getElementById("incomeTotal");
const expenseTotal = document.getElementById("expenseTotal");
const remainingTotal = document.getElementById("remainingTotal");
const clearAllButton = document.getElementById("clearAll");
const template = document.getElementById("transactionTemplate");

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

let transactions = loadTransactions();
let editingTransactionId = null;

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  if (editingTransactionId) {
    const transaction = transactions.find((tx) => tx.id === editingTransactionId);
    if (!transaction) {
      resetFormState();
      return;
    }

    transaction.description = description;
    transaction.amount = amount;
    transaction.type = typeInput.value;
    transaction.category = categoryInput.value;
  } else {
    transactions.unshift({
      id: crypto.randomUUID(),
      description,
      amount,
      type: typeInput.value,
      category: categoryInput.value,
      createdAt: new Date().toISOString(),
    });
  }

  persist();
  render();
  resetFormState();
});

cancelEditButton.addEventListener("click", () => {
  resetFormState();
});

clearAllButton.addEventListener("click", () => {
  transactions = [];
  persist();
  render();
  resetFormState();
});

transactionList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.matches(".delete-button")) {
    const id = target.dataset.id;
    transactions = transactions.filter((tx) => tx.id !== id);
    if (editingTransactionId === id) {
      resetFormState();
    }
    persist();
    render();
    return;
  }

  if (target.matches(".edit-button")) {
    const id = target.dataset.id;
    const tx = transactions.find((item) => item.id === id);
    if (!tx) {
      return;
    }

    editingTransactionId = tx.id;
    descriptionInput.value = tx.description;
    amountInput.value = tx.amount;
    typeInput.value = tx.type;
    categoryInput.value = tx.category;
    formHeading.textContent = "Edit Transaction";
    saveButton.textContent = "Save changes";
    cancelEditButton.classList.remove("hidden");
    descriptionInput.focus();
  }
});

function resetFormState() {
  editingTransactionId = null;
  form.reset();
  typeInput.value = "expense";
  categoryInput.value = "Housing";
  formHeading.textContent = "Add Transaction";
  saveButton.textContent = "Add transaction";
  cancelEditButton.classList.add("hidden");
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function render() {
  renderSummary();
  renderTransactions();
  renderCategoryBudget();
}

function renderSummary() {
  const totals = transactions.reduce(
    (acc, tx) => {
      acc[tx.type] += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const remaining = totals.income - totals.expense;

  incomeTotal.textContent = fmt.format(totals.income);
  expenseTotal.textContent = fmt.format(totals.expense);
  remainingTotal.textContent = fmt.format(remaining);
  remainingTotal.style.color = remaining < 0 ? "#dc2626" : "#059669";
}

function renderTransactions() {
  transactionList.innerHTML = "";

  if (transactions.length === 0) {
    transactionList.innerHTML = '<li class="tx-meta">No transactions yet.</li>';
    return;
  }

  for (const tx of transactions) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".tx-description").textContent = tx.description;
    node.querySelector(".tx-meta").textContent = `${tx.category} • ${formatDate(tx.createdAt)}`;

    const amountNode = node.querySelector(".tx-amount");
    amountNode.textContent = `${tx.type === "income" ? "+" : "-"}${fmt.format(tx.amount)}`;
    amountNode.classList.add(tx.type);

    node.querySelector(".edit-button").dataset.id = tx.id;
    node.querySelector(".delete-button").dataset.id = tx.id;

    transactionList.appendChild(node);
  }
}

function renderCategoryBudget() {
  const spentByCategory = {};
  for (const key of Object.keys(MONTHLY_BUDGET)) {
    spentByCategory[key] = 0;
  }

  for (const tx of transactions) {
    if (tx.type === "expense" && spentByCategory[tx.category] !== undefined) {
      spentByCategory[tx.category] += tx.amount;
    }
  }

  categoryBudget.innerHTML = "";

  for (const [category, limit] of Object.entries(MONTHLY_BUDGET)) {
    const spent = spentByCategory[category];
    const percent = Math.min((spent / limit) * 100, 100);

    const li = document.createElement("li");
    li.className = "budget-item";
    li.innerHTML = `
      <p>
        <span>${category}</span>
        <span>${fmt.format(spent)} / ${fmt.format(limit)}</span>
      </p>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}">
        <div class="progress-fill"></div>
      </div>
    `;

    const fill = li.querySelector(".progress-fill");
    fill.style.width = `${percent}%`;

    if (percent >= 100) {
      fill.classList.add("danger");
    } else if (percent >= 80) {
      fill.classList.add("warning");
    }

    categoryBudget.appendChild(li);
  }
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
