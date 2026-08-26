let allFiles = [];

let selectedFile = null;


const fileInput =
  document.getElementById("fileInput");

const browseBtn =
  document.getElementById("browseBtn");

const dropZone =
  document.getElementById("dropZone");

const selectedFileBox =
  document.getElementById("selectedFile");

const selectedName =
  document.getElementById("selectedName");

const selectedSize =
  document.getElementById("selectedSize");

const removeFile =
  document.getElementById("removeFile");

const uploadBtn =
  document.getElementById("uploadBtn");

const fileList =
  document.getElementById("fileList");

const searchInput =
  document.getElementById("searchInput");

const fileCount =
  document.getElementById("fileCount");


/* =========================
   AUTH CHECK
========================= */

async function checkAuth() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {

    window.location.href = "index.html";

    return null;

  }

  document.getElementById("adminEmail").textContent =
    session.user.email;

  return session;

}


checkAuth().then((session) => {

  if (session) {

    loadFiles();

  }

});


/* =========================
   LOGOUT
========================= */

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";

  });


/* =========================
   FILE SELECT
========================= */

browseBtn.addEventListener("click", () => {

  fileInput.click();

});


fileInput.addEventListener("change", () => {

  if (fileInput.files.length) {

    selectFile(fileInput.files[0]);

  }

});


function selectFile(file) {

  selectedFile = file;

  selectedName.textContent =
    file.name;

  selectedSize.textContent =
    formatSize(file.size);

  selectedFileBox.classList.remove("hidden");

  dropZone.classList.add("file-selected");

}


removeFile.addEventListener("click", () => {

  selectedFile = null;

  fileInput.value = "";

  selectedFileBox.classList.add("hidden");

  dropZone.classList.remove("file-selected");

});


/* =========================
   DRAG & DROP
========================= */

[
  "dragenter",
  "dragover"
].forEach(eventName => {

  dropZone.addEventListener(eventName, (event) => {

    event.preventDefault();

    dropZone.classList.add("dragging");

  });

});


[
  "dragleave",
  "drop"
].forEach(eventName => {

  dropZone.addEventListener(eventName, (event) => {

    event.preventDefault();

    dropZone.classList.remove("dragging");

  });

});


dropZone.addEventListener("drop", (event) => {

  const file =
    event.dataTransfer.files[0];

  if (file) {

    selectFile(file);

  }

});


/* =========================
   UPLOAD
========================= */

uploadBtn.addEventListener("click", uploadFile);


async function uploadFile() {

  const title =
    document.getElementById("title")
      .value.trim();

  const category =
    document.getElementById("category")
      .value;

  const description =
    document.getElementById("description")
      .value.trim();


  const message =
    document.getElementById("uploadMessage");


  if (!selectedFile) {

    showMessage(
      message,
      "Please select a file first.",
      "error"
    );

    return;

  }


  if (!title) {

    showMessage(
      message,
      "Please enter a note title.",
      "error"
    );

    return;

  }


  uploadBtn.disabled = true;

  document
    .getElementById("uploadText")
    .classList.add("hidden");

  document
    .getElementById("uploadLoader")
    .classList.remove("hidden");


  document
    .getElementById("progressContainer")
    .classList.remove("hidden");


  setProgress(10);


  try {

    const extension =
      selectedFile.name
        .split(".")
        .pop()
        .toLowerCase();


    const safeName =
      selectedFile.name
        .replace(/[^a-zA-Z0-9._-]/g, "_");


    const uniqueName =
      `${Date.now()}_${crypto.randomUUID()}_${safeName}`;


    const filePath =
      `${category}/${uniqueName}`;


    setProgress(25);


    const {
      error: storageError
    } =
      await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(
          filePath,
          selectedFile,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: selectedFile.type
          }
        );


    if (storageError) {

      throw storageError;

    }


    setProgress(75);


    const {
      error: databaseError
    } =
      await supabaseClient
        .from("notes")
        .insert({

          title,

          description,

          category,

          file_name:
            selectedFile.name,

          file_path:
            filePath,

          file_type:
            extension,

          file_size:
            selectedFile.size

        });


    if (databaseError) {

      await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      throw databaseError;

    }


    setProgress(100);


    showMessage(
      message,
      "File uploaded successfully ✓",
      "success"
    );


    resetUploadForm();

    await loadFiles();


  } catch (error) {

    console.error(error);

    showMessage(
      message,
      error.message ||
      "Upload failed.",
      "error"
    );

  }


  uploadBtn.disabled = false;

  document
    .getElementById("uploadText")
    .classList.remove("hidden");

  document
    .getElementById("uploadLoader")
    .classList.add("hidden");

}


/* =========================
   LOAD FILES
========================= */

async function loadFiles() {

  fileList.innerHTML = `
    <div class="empty-state">
      Loading your library...
    </div>
  `;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("notes")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(error);

    fileList.innerHTML = `
      <div class="empty-state error">
        Failed to load files.
      </div>
    `;

    return;

  }


  allFiles = data || [];

  fileCount.textContent =
    allFiles.length;

  renderFiles(allFiles);

}


/* =========================
   RENDER
========================= */

function renderFiles(files) {

  if (!files.length) {

    fileList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>No files yet</h3>
        <p>Upload your first note above.</p>
      </div>
    `;

    return;

  }


  fileList.innerHTML =
    files.map(file => {

      const icon =
        getFileIcon(file.file_type);


      return `

        <div class="file-card">

          <div class="file-type-icon">
            ${icon}
          </div>

          <div class="file-details">

            <h3>
              ${escapeHTML(file.title)}
            </h3>

            <div class="file-meta">

              <span>
                ${escapeHTML(file.category)}
              </span>

              <span>•</span>

              <span>
                ${formatSize(file.file_size)}
              </span>

              <span>•</span>

              <span>
                ${formatDate(file.created_at)}
              </span>

            </div>

            ${
              file.description
                ? `
                  <p>
                    ${escapeHTML(file.description)}
                  </p>
                `
                : ""
            }

          </div>

          <div class="file-actions">

            <button
              onclick="openFile('${file.file_path}')"
              title="Open"
            >
              ↗
            </button>

            <button
              onclick="editFile('${file.id}')"
              title="Edit"
            >
              ✎
            </button>

            <button
              class="delete-action"
              onclick="deleteFile('${file.id}')"
              title="Delete"
            >
              ×
            </button>

          </div>

        </div>

      `;

    }).join("");

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener("input", () => {

  const query =
    searchInput.value
      .toLowerCase()
      .trim();


  const filtered =
    allFiles.filter(file =>

      file.title
        .toLowerCase()
        .includes(query)

      ||

      file.category
        .toLowerCase()
        .includes(query)

      ||

      file.file_name
        .toLowerCase()
        .includes(query)

    );


  renderFiles(filtered);

});


/* =========================
   OPEN FILE
========================= */

window.openFile = function(path) {

  const {
    data
  } =
    supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);


  window.open(
    data.publicUrl,
    "_blank"
  );

};


/* =========================
   DELETE
========================= */

window.deleteFile = async function(id) {

  const file =
    allFiles.find(
      item => item.id === id
    );


  if (!file) return;


  const confirmed =
    confirm(
      `Delete "${file.title}"?`
    );


  if (!confirmed) return;


  try {

    const {
      error: storageError
    } =
      await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .remove([
          file.file_path
        ]);


    if (storageError) {

      throw storageError;

    }


    const {
      error: databaseError
    } =
      await supabaseClient
        .from("notes")
        .delete()
        .eq("id", id);


    if (databaseError) {

      throw databaseError;

    }


    await loadFiles();


  } catch (error) {

    alert(
      error.message ||
      "Could not delete file."
    );

  }

};


/* =========================
   EDIT
========================= */

window.editFile = function(id) {

  const file =
    allFiles.find(
      item => item.id === id
    );


  if (!file) return;


  document.getElementById("editId")
    .value = file.id;

  document.getElementById("editTitle")
    .value = file.title;

  document.getElementById("editCategory")
    .value = file.category;

  document.getElementById("editDescription")
    .value = file.description || "";


  document
    .getElementById("editModal")
    .classList.remove("hidden");

};


document
  .getElementById("closeModal")
  .addEventListener("click", closeModal);


function closeModal() {

  document
    .getElementById("editModal")
    .classList.add("hidden");

}


document
  .getElementById("saveEdit")
  .addEventListener(
    "click",
    saveEdit
  );


async function saveEdit() {

  const id =
    document.getElementById("editId")
      .value;

  const title =
    document.getElementById("editTitle")
      .value.trim();

  const category =
    document.getElementById("editCategory")
      .value;

  const description =
    document.getElementById("editDescription")
      .value.trim();


  if (!title) {

    showMessage(
      document.getElementById("editMessage"),
      "Title is required.",
      "error"
    );

    return;

  }


  const {
    error
  } =
    await supabaseClient
      .from("notes")
      .update({

        title,

        category,

        description

      })
      .eq("id", id);


  if (error) {

    showMessage(
      document.getElementById("editMessage"),
      error.message,
      "error"
    );

    return;

  }


  closeModal();

  await loadFiles();

}


/* =========================
   HELPERS
========================= */

function resetUploadForm() {

  selectedFile = null;

  fileInput.value = "";

  selectedFileBox
    .classList.add("hidden");

  dropZone
    .classList.remove("file-selected");

  document.getElementById("title")
    .value = "";

  document.getElementById("description")
    .value = "";

  document
    .getElementById("progressContainer")
    .classList.add("hidden");

}


function setProgress(percent) {

  document
    .getElementById("progressBar")
    .style.width =
      `${percent}%`;

  document
    .getElementById("progressPercent")
    .textContent =
      `${percent}%`;

}


function formatSize(bytes) {

  if (!bytes) return "0 KB";

  const units =
    ["B", "KB", "MB", "GB"];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    bytes /
    Math.pow(1024, index)
  ).toFixed(
    index === 0 ? 0 : 1
  )
  + " "
  + units[index];

}


function formatDate(date) {

  return new Date(date)
    .toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );

}


function getFileIcon(type) {

  type = type.toLowerCase();


  if (type === "pdf")
    return "PDF";

  if (
    type === "ppt" ||
    type === "pptx"
  )
    return "PPT";

  if (
    type === "doc" ||
    type === "docx"
  )
    return "DOC";

  if (
    type === "xls" ||
    type === "xlsx"
  )
    return "XLS";

  if (type === "zip")
    return "ZIP";

  return "TXT";

}


function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function showMessage(element, text, type) {

  element.textContent = text;

  element.className =
    `message ${type}`;

}
