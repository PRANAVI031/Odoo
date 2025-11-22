/* App state & persistence */
const STORAGE_KEY = "receipts_v1";
let receipts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

/* Helpers */
const $ = id => document.getElementById(id);
const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
const formatRef = (n) => `WH/IN/${String(n).padStart(4, "0")}`;

/* Views */
const viewList = $("view-list");
const viewKanban = $("view-kanban");
const viewForm = $("view-form");

/* UI elements */
const receiptTable = $("receiptTable");
const colDraft = $("colDraft");
const colReady = $("colReady");
const colDone = $("colDone");
const searchInput = $("searchInput");
const btnNew = $("btnNew");
const btnList = $("btnList");
const btnKanban = $("btnKanban");
const btnBack = $("btnBack");
const btnValidate = $("btnValidate");
const btnPrint = $("btnPrint");
const btnCancel = $("btnCancel");
const btnAddProduct = $("btnAddProduct");
const btnSaveDraft = $("btnSaveDraft");

const inputRef = $("inputRef");
const inputFrom = $("inputFrom");
const inputResponsible = $("inputResponsible");
const inputDate = $("inputDate");
const inputContact = $("inputContact");
const productsTable = $("productsTable");

/* current editing receipt (index or null for new) */
let editingIndex = null;
let editingProducts = [];

/* Initialize: render */
renderAll();

/* Event bindings */
btnNew.addEventListener("click", () => openFormForNew());
btnList.addEventListener("click", () => switchTo("list"));
btnKanban.addEventListener("click", () => switchTo("kanban"));
btnBack.addEventListener("click", () => switchTo("list"));
btnCancel.addEventListener("click", () => {
  // Option A: go back to List view
  switchTo("list");
});
btnValidate.addEventListener("click", onValidate);
btnPrint.addEventListener("click", onPrint);
btnAddProduct.addEventListener("click", addEmptyProductRow);
btnSaveDraft.addEventListener("click", onSaveDraft);
searchInput.addEventListener("input", () => renderList(searchInput.value.trim().toLowerCase()));

/* ---------- Rendering ---------- */

function renderAll() {
  renderList();
  renderKanban();
  saveState();
}

function renderList(filter = "") {
  receiptTable.innerHTML = "";
  const rows = receipts.filter(r => {
    if (!filter) return true;
    return (
      r.reference.toLowerCase().includes(filter) ||
      (r.contact && r.contact.toLowerCase().includes(filter)) ||
      (r.to && r.to.toLowerCase().includes(filter)) ||
      (r.from && r.from.toLowerCase().includes(filter))
    );
  });

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escape(r.reference)}</td>
      <td>${escape(r.from)}</td>
      <td>${escape(r.to)}</td>
      <td>${escape(r.contact)}</td>
      <td>${escape(r.date)}</td>
      <td><span class="status-pill ${r.status.toLowerCase().replace(/\s+/g,'')}">${escape(r.status)}</span></td>
    `;
    tr.addEventListener("click", () => openFormForEdit(idx));
    receiptTable.appendChild(tr);
  });
}

function renderKanban() {
  colDraft.innerHTML = "";
  colReady.innerHTML = "";
  colDone.innerHTML = "";

  receipts.forEach((r, idx) => {
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.innerHTML = `<strong>${escape(r.reference)}</strong><br><small>${escape(r.contact || "")}</small><br><small>${escape(r.date || "")}</small>`;
    card.addEventListener("click", () => openFormForEdit(idx));
    if (r.status === "Done") colDone.appendChild(card);
    else if (r.status === "Ready") colReady.appendChild(card);
    else colDraft.appendChild(card);
  });
}

/* ---------- VIEW SWITCH ---------- */
function switchTo(name) {
  viewList.classList.add("hidden");
  viewKanban.classList.add("hidden");
  viewForm.classList.add("hidden");

  if (name === "list") viewList.classList.remove("hidden");
  if (name === "kanban") viewKanban.classList.remove("hidden");
  if (name === "form") viewForm.classList.remove("hidden");
}

/* ---------- FORM: open for new or edit ---------- */

function openFormForNew() {
  editingIndex = null;
  editingProducts = [];
  // auto ref = next incremental id
  const nextId = receipts.length > 0 ? Math.max(...receipts.map(r => parseInt(r.reference.split("/").pop())||0)) + 1 : 1;
  inputRef.value = formatRef(nextId);
  inputFrom.value = "";
  inputResponsible.value = localStorage.getItem("currentUser") || "Current User";
  inputDate.value = new Date().toISOString().slice(0,10);
  inputContact.value = "";
  productsTable.innerHTML = "";
  highlightStatus("Draft");
  btnPrint.disabled = true;
  switchTo("form");
}

function openFormForEdit(index) {
  editingIndex = index;
  const r = receipts[index];
  inputRef.value = r.reference;
  inputFrom.value = r.from || "";
  inputResponsible.value = r.responsible || localStorage.getItem("currentUser") || "Current User";
  inputDate.value = r.date || "";
  inputContact.value = r.contact || "";
  editingProducts = JSON.parse(JSON.stringify(r.products || []));
  renderProducts();
  highlightStatus(r.status || "Draft");
  btnPrint.disabled = (r.status !== "Done");
  switchTo("form");
}

/* ---------- PRODUCTS UI ---------- */
function renderProducts() {
  productsTable.innerHTML = "";
  if (!editingProducts.length) {
    productsTable.innerHTML = `<div class="product-row" style="justify-content:center;color:#6b7280;padding:14px">No products added</div>`;
    return;
  }
  editingProducts.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
      <div class="col"><input data-i="${i}" class="prod-name" placeholder="Product code / name" value="${escape(p.name||'')}" /></div>
      <div class="col qty"><input data-i="${i}" class="prod-qty" type="number" min="0" value="${escape(p.qty||1)}" /></div>
      <div class="col actions"><button class="remove" data-i="${i}">Remove</button></div>
    `;
    // input handlers
    row.querySelector(".prod-name").addEventListener("input", (e)=> {
      editingProducts[+e.target.dataset.i].name = e.target.value;
    });
    row.querySelector(".prod-qty").addEventListener("input", (e)=> {
      editingProducts[+e.target.dataset.i].qty = parseInt(e.target.value || 0, 10);
    });
    row.querySelector(".remove").addEventListener("click", (e)=> {
      const idx = +e.target.dataset.i;
      editingProducts.splice(idx,1);
      renderProducts();
    });
    productsTable.appendChild(row);
  });
}

function addEmptyProductRow() {
  editingProducts.push({ name: "", qty: 1 });
  renderProducts();
}

/* ---------- SAVE / VALIDATE / PRINT ---------- */

function onSaveDraft() {
  const newReceipt = collectForm();
  if (!newReceipt) return;
  if (editingIndex === null) {
    receipts.push(newReceipt);
  } else {
    receipts[editingIndex] = newReceipt;
  }
  saveState();
  renderAll();
  switchTo("list");
}

function onValidate() {
  // move Draft->Ready, Ready->Done
  const idx = editingIndex;
  if (idx === null) {
    // saving new first as draft
    const r = collectForm();
    if (!r) return;
    receipts.push(r);
    editingIndex = receipts.length - 1;
  }
  let current = receipts[editingIndex].status || "Draft";
  if (current === "Draft") current = "Ready";
  else if (current === "Ready") current = "Done";
  receipts[editingIndex].status = current;
  // if first time validate -> update responsible/date etc from form
  const updated = collectForm();
  if (!updated) return;
  receipts[editingIndex] = {...receipts[editingIndex], ...updated, status: current};
  saveState();
  renderAll();
  highlightStatus(current);
  btnPrint.disabled = (current !== "Done");
  if (current === "Done") {
    // optionally auto-print? we only enable print; user must press print
  }
  alert(`Status changed to: ${current}`);
}

function onPrint() {
  // only allowed when Done
  if (editingIndex === null) return alert("Save/Select a receipt to print.");
  if (receipts[editingIndex].status !== "Done") return alert("Receipt must be DONE to print.");
  // Open print window with formatted content
  const r = receipts[editingIndex];
  const printWindow = window.open("", "_blank");
  const html = `
    <html><head><title>Print ${r.reference}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:20px}
        h1{font-size:18px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        td,th{border:1px solid #ddd;padding:8px}
      </style>
    </head><body>
    <h1>Receipt ${r.reference}</h1>
    <p><strong>From:</strong> ${escape(r.from)} &nbsp;&nbsp; <strong>To:</strong> ${escape(r.to)}</p>
    <p><strong>Contact:</strong> ${escape(r.contact)} &nbsp;&nbsp; <strong>Date:</strong> ${escape(r.date)}</p>
    <h3>Products</h3>
    <table>
      <thead><tr><th>Product</th><th>Quantity</th></tr></thead>
      <tbody>
        ${ (r.products || []).map(p=>`<tr><td>${escape(p.name)}</td><td>${escape(p.qty)}</td></tr>`).join("") }
      </tbody>
    </table>
    </body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function collectForm() {
  const ref = inputRef.value.trim();
  const from = inputFrom.value.trim();
  const responsible = inputResponsible.value.trim() || localStorage.getItem("currentUser") || "Current User";
  const date = inputDate.value;
  const contact = inputContact.value.trim();
  const products = editingProducts.map(p => ({ name: p.name||"", qty: p.qty||0 }));

  // validation
  if (!from) { alert("Please enter 'Receive From'"); return null; }
  if (!date) { alert("Please select a date"); return null; }
  if (!contact) { alert("Please enter contact"); return null; }
  if (!products.length) { if (!confirm("No products added. Save without products?")) return null; }

  const status = (editingIndex !== null && receipts[editingIndex] && receipts[editingIndex].status) ? receipts[editingIndex].status : "Draft";

  return {
    reference: ref,
    from,
    responsible,
    to: (products.length && products[0].name && products[0].name.includes("WH/")) ? products[0].name : (inputFrom.value || ""),
    contact,
    date,
    products,
    status
  };
}

function highlightStatus(status) {
  const nodes = document.querySelectorAll(".status-dot");
  nodes.forEach(n => n.classList.remove("active"));
  if (status === "Draft") document.querySelector(".status-dot.draft").classList.add("active");
  if (status === "Ready") document.querySelector(".status-dot.ready").classList.add("active");
  if (status === "Done") document.querySelector(".status-dot.done").classList.add("active");
}

/* ---------- Utility ---------- */
function escape(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

/* ---------- on load: ensure UI shows list ---------- */
switchTo("list");
