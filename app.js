
/* =========================================================
   ADDY — FAST LIBRARY + PROTECTED DOWNLOADS
========================================================= */

let allFiles = [];
let currentCategory = "all";
let isLoading = false;

const fileGrid   = document.getElementById("fileGrid");
const fileCount  = document.getElementById("fileCount");
const loading    = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

/* ===================== START ===================== */
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupCategories();
  loadFiles();
});

/* ===================== LOAD FILES ===================== */
async function loadFiles() {
  if (isLoading) return;
  isLoading = true;
  showLoading();

  try {
    const { data, error } = await supabaseClient
      .from("files")
      .select(`
        id,
        title,
        description,
        category,
        file_name,
        file_path,
        file_type,
        file_size,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allFiles = Array.isArray(data) ? data : [];
    hideLoading();
    renderFiles(allFiles);
  } catch (err) {
    console.error("ADDY LOAD ERROR:", err);
    showError(err.message || "Unable to load the library.");
  } finally {
    isLoading = false;
  }
}

/* ===================== RENDER ===================== */
function renderFiles(files) {
  if (!fileGrid) return;

  fileGrid.innerHTML = "";

  if (fileCount) {
    fileCount.textContent = `${files.length} ${files.length === 1 ? "file" : "files"}`;
  }

  if (!files.length) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  const fragment = document.createDocumentFragment();

  files.forEach((file) => {
    const card = document.createElement("article");
    card.className = "file-card";

    const type = getFileType(file);
    const icon = getFileIcon(type);
    const name = file.title || file.file_name || "Untitled file";
    const description = file.description || "Study material from ADDY.";
    const size = formatSize(file.file_size);

    card.innerHTML = `
      <div class="file-icon">${icon}</div>
      <h3>${escapeHTML(name)}</h3>
      <p class="file-description">${escapeHTML(description)}</p>
      <div class="file-meta">
        ${escapeHTML(type.toUpperCase())}${size ? ` • ${escapeHTML(size)}` : ""}
      </div>

      <button class="download-button" type="button">
        DOWNLOAD
      </button>

      <div class="turnstile-container" style="display:none; margin-top:12px;"></div>
      <div class="download-status" style="margin-top:8px; font-size:12px; color:#929aa8;"></div>
    `;

    const btn = card.querySelector(".download-button");
    btn.addEventListener("click", () => handleDownloadClick(card, file.id));

    fragment.appendChild(card);
  });

  fileGrid.appendChild(fragment);
}

/* ===================== PROTECTED DOWNLOAD ===================== */
async function handleDownloadClick(card, fileId) {
  const btn = card.querySelector(".download-button");
  const status = card.querySelector(".download-status");
  const container = card.querySelector(".turnstile-container");

  if (btn.disabled) return;

  btn.disabled = true;
  btn.textContent = "VERIFYING...";
  status.textContent = "";
  container.style.display = "block";
  container.innerHTML = "";

  const widgetId = turnstile.render(container, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: async (token) => {
      status.textContent = "Generating secure link...";

      try {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/protected-download`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            file_id: fileId,
            turnstile_token: token,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Download failed");
        }

        // Start download
        const a = document.createElement("a");
        a.href = data.url;
        a.download = data.file_name || "download";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();

        status.textContent = "✅ Download started";
        btn.textContent = "DOWNLOAD AGAIN";
      } catch (err) {
        console.error(err);
        status.textContent = err.message || "Something went wrong";
        btn.textContent = "TRY AGAIN";
      } finally {
        btn.disabled = false;
        turnstile.remove(widgetId);
        container.style.display = "none";
        container.innerHTML = "";
      }
    },
    "error-callback": () => {
      status.textContent = "Verification failed. Please try again.";
      btn.disabled = false;
      btn.textContent = "TRY AGAIN";
      turnstile.remove(widgetId);
      container.style.display = "none";
    },
  });
}

/* ===================== HELPERS ===================== */
function getFileType(file) {
  const filename = file.file_name || file.title || "";
  const parts = filename.split(".");
  if (parts.length > 1) return parts.pop().toLowerCase();

  if (file.file_type) {
    const mime = file.file_type.toLowerCase();
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("word")) return "docx";
    if (mime.includes("sheet")) return "xlsx";
    if (mime.includes("presentation")) return "pptx";
    if (mime.includes("text")) return "txt";
  }
  return "other";
}

function getFileIcon(type) {
  const icons = {
    pdf: "📕", doc: "📘", docx: "📘",
    xls: "📊", xlsx: "📊",
    ppt: "📽️", pptx: "📽️",
    txt: "📎", zip: "📦"
  };
  return icons[type] || "📎";
}

function formatSize(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showLoading() {
  loading?.classList.remove("hidden");
}
function hideLoading() {
  loading?.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  if (!fileGrid) return;

  fileGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-notebook">⚠</div>
      <h3>Library connection failed</h3>
      <p>${escapeHTML(message)}</p>
      <button class="download-button" id="retryButton" style="margin-top:20px; max-width:200px;">
        TRY AGAIN
      </button>
    </div>
  `;

  document.getElementById("retryButton")?.addEventListener("click", () => {
    isLoading = false;
    loadFiles();
  });
}

function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener("input", filterFiles);

  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      filterFiles();
      searchInput.focus();
    });
  }
}

function filterFiles() {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  if (clearSearch) {
    clearSearch.style.display = query ? "flex" : "none";
  }

  const filtered = allFiles.filter((file) => {
    const name = String(file.title || file.file_name || "").toLowerCase();
    const desc = String(file.description || "").toLowerCase();
    const type = getFileType(file);
    const cat  = String(file.category || "").toLowerCase();

    const searchMatch =
      !query ||
      name.includes(query) ||
      desc.includes(query) ||
      type.includes(query) ||
      cat.includes(query);

    const categoryMatch =
      currentCategory === "all" ||
      type === currentCategory ||
      cat === currentCategory;

    return searchMatch && categoryMatch;
  });

  renderFiles(filtered);
}

function setupCategories() {
  document.querySelectorAll(".category").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      filterFiles();
    });
  });
}
