import { supabase } from "/supabase-config.js";

const postForm = document.getElementById("postForm");
const postIdInput = document.getElementById("postId");
const postTitleInput = document.getElementById("postTitle");
const postCategoryInput = document.getElementById("postCategory");
const postStatusInput = document.getElementById("postStatus");
const coverImageInput = document.getElementById("coverImage");
const postExcerptInput = document.getElementById("postExcerpt");
const postContentInput = document.getElementById("postContent");

const clearButton = document.getElementById("clearButton");
const savePostButton = document.getElementById("savePostButton");
const logoutButton = document.getElementById("logoutButton");

const postMessage = document.getElementById("postMessage");
const adminPostList = document.getElementById("adminPostList");
const postSearch = document.getElementById("postSearch");

const totalPostsElement = document.getElementById("totalPosts");
const publishedPostsElement = document.getElementById("publishedPosts");
const draftPostsElement = document.getElementById("draftPosts");
const adminEmailElement = document.getElementById("adminEmail");
const editorTitle = document.getElementById("editorTitle");

let currentUser = null;
let posts = [];

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "No date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function showMessage(message = "", type = "") {
    postMessage.textContent = message;
    postMessage.className = `post-message ${type}`.trim();
}

function setSaving(isSaving) {
    savePostButton.disabled = isSaving;

    savePostButton.innerHTML = isSaving
        ? "SAVING..."
        : "SAVE POST <span>→</span>";
}

function updateStatistics() {
    const publishedCount = posts.filter(
        (post) => post.status === "published"
    ).length;

    const draftCount = posts.filter(
        (post) => post.status === "draft"
    ).length;

    totalPostsElement.textContent = posts.length;
    publishedPostsElement.textContent = publishedCount;
    draftPostsElement.textContent = draftCount;
}

function clearForm() {
    postForm.reset();
    postIdInput.value = "";
    postStatusInput.value = "draft";
    editorTitle.textContent = "Create a diary entry";
    showMessage();
}

function renderPosts(searchValue = "") {
    const searchText = searchValue.trim().toLowerCase();

    const filteredPosts = posts.filter((post) => {
        const searchableContent = [
            post.title,
            post.category,
            post.status
        ]
            .join(" ")
            .toLowerCase();

        return searchableContent.includes(searchText);
    });

    if (filteredPosts.length === 0) {
        adminPostList.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No posts found.</td>
            </tr>
        `;

        return;
    }

    adminPostList.innerHTML = filteredPosts
        .map(
            (post) => `
                <tr>
                    <td class="post-title-cell">
                        ${escapeHTML(post.title)}
                    </td>

                    <td>
                        ${escapeHTML(post.category)}
                    </td>

                    <td>
                        <span class="status-badge ${escapeHTML(post.status)}">
                            ${escapeHTML(post.status)}
                        </span>
                    </td>

                    <td>
                        ${formatDate(post.created_at)}
                    </td>

                    <td>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="edit-button"
                                data-action="edit"
                                data-id="${post.id}"
                            >
                                EDIT
                            </button>

                            <button
                                type="button"
                                class="delete-button"
                                data-action="delete"
                                data-id="${post.id}"
                            >
                                DELETE
                            </button>
                        </div>
                    </td>
                </tr>
            `
        )
        .join("");
}

async function requireAuthentication() {
    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.replace("/admin");
        return false;
    }

    currentUser = user;
    adminEmailElement.textContent = user.email || "";

    return true;
}

async function loadPosts() {
    adminPostList.innerHTML = `
        <tr class="empty-row">
            <td colspan="5">Loading posts...</td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        adminPostList.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        return;
    }

    posts = data || [];

    updateStatistics();
    renderPosts(postSearch.value);
}

function editPost(postId) {
    const selectedPost = posts.find(
        (post) => post.id === postId
    );

    if (!selectedPost) {
        return;
    }

    postIdInput.value = selectedPost.id;
    postTitleInput.value = selectedPost.title || "";
    postCategoryInput.value = selectedPost.category || "";
    postStatusInput.value = selectedPost.status || "draft";
    coverImageInput.value = selectedPost.cover_image || "";
    postExcerptInput.value = selectedPost.excerpt || "";
    postContentInput.value = selectedPost.content || "";

    editorTitle.textContent = "Edit diary entry";

    showMessage(
        "You are editing an existing post.",
        "success"
    );

    document.getElementById("editor").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function deletePost(postId) {
    const selectedPost = posts.find(
        (post) => post.id === postId
    );

    if (!selectedPost) {
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${selectedPost.title}"?`
    );

    if (!confirmed) {
        return;
    }

    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", currentUser.id);

    if (error) {
        window.alert(error.message);
        return;
    }

    if (postIdInput.value === postId) {
        clearForm();
    }

    await loadPosts();
}

postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = postTitleInput.value.trim();
    const category = postCategoryInput.value;
    const status = postStatusInput.value;
    const coverImage = coverImageInput.value.trim();
    const excerpt = postExcerptInput.value.trim();
    const content = postContentInput.value.trim();

    if (
        !title ||
        !category ||
        !status ||
        !excerpt ||
        !content
    ) {
        showMessage(
            "Please complete all required fields.",
            "error"
        );

        return;
    }

    setSaving(true);
    showMessage();

    const postData = {
        title,
        category,
        status,
        cover_image: coverImage || null,
        excerpt,
        content,
        updated_at: new Date().toISOString()
    };

    const editingId = postIdInput.value;
    let error;

    if (editingId) {
        const response = await supabase
            .from("posts")
            .update(postData)
            .eq("id", editingId)
            .eq("user_id", currentUser.id);

        error = response.error;
    } else {
        const response = await supabase
            .from("posts")
            .insert({
                ...postData,
                user_id: currentUser.id
            });

        error = response.error;
    }

    if (error) {
        showMessage(error.message, "error");
        setSaving(false);
        return;
    }

    clearForm();

    showMessage(
        editingId
            ? "Post updated successfully."
            : "Post created successfully.",
        "success"
    );

    setSaving(false);
    await loadPosts();
});

clearButton.addEventListener("click", () => {
    clearForm();
});

postSearch.addEventListener("input", () => {
    renderPosts(postSearch.value);
});

adminPostList.addEventListener("click", async (event) => {
    const actionButton = event.target.closest(
        "button[data-action]"
    );

    if (!actionButton) {
        return;
    }

    const postId = actionButton.dataset.id;
    const action = actionButton.dataset.action;

    if (action === "edit") {
        editPost(postId);
    }

    if (action === "delete") {
        await deletePost(postId);
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "LOGGING OUT...";

    await supabase.auth.signOut();

    window.location.replace("/admin");
});

supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
        window.location.replace("/admin");
    }
});

async function initializeDashboard() {
    const authenticated = await requireAuthentication();

    if (!authenticated) {
        return;
    }

    await loadPosts();
}

initializeDashboard();