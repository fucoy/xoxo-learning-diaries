import { supabase } from "/supabase-config.js";

const postForm =
    document.getElementById("postForm");

const postIdInput =
    document.getElementById("postId");

const postTitleInput =
    document.getElementById("postTitle");

const postCategoryInput =
    document.getElementById("postCategory");

const postStatusInput =
    document.getElementById("postStatus");

const coverImageInput =
    document.getElementById("coverImage");

const postExcerptInput =
    document.getElementById("postExcerpt");

const postContentInput =
    document.getElementById("postContent");

const clearButton =
    document.getElementById("clearButton");

const savePostButton =
    document.getElementById("savePostButton");

const logoutButton =
    document.getElementById("logoutButton");

const postMessage =
    document.getElementById("postMessage");

const adminPostList =
    document.getElementById("adminPostList");

const postSearch =
    document.getElementById("postSearch");

const totalPostsElement =
    document.getElementById("totalPosts");

const publishedPostsElement =
    document.getElementById("publishedPosts");

const draftPostsElement =
    document.getElementById("draftPosts");

const adminEmailElement =
    document.getElementById("adminEmail");

const editorTitle =
    document.getElementById("editorTitle");

const editorToolbar =
    document.getElementById("editorToolbar");

const textStyle =
    document.getElementById("textStyle");

const fontFamily =
    document.getElementById("fontFamily");

const fontSize =
    document.getElementById("fontSize");

const fontColor =
    document.getElementById("fontColor");

const clearFormatting =
    document.getElementById("clearFormatting");

let currentUser = null;
let posts = [];
let savedEditorRange = null;


function escapeHTML(value = "") {
    return String(value).replace(
        /[&<>"']/g,
        (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        }
    );
}


function formatDate(dateValue) {
    if (!dateValue) {
        return "No date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    ).format(date);
}


function showMessage(
    message = "",
    type = ""
) {
    postMessage.textContent = message;

    postMessage.className =
        `post-message ${type}`.trim();
}


function setSaving(isSaving) {
    savePostButton.disabled = isSaving;

    savePostButton.innerHTML =
        isSaving
            ? "SAVING..."
            : "SAVE POST <span>→</span>";
}


function plainTextToHTML(value = "") {
    const text = String(value).trim();

    if (!text) {
        return "";
    }

    return text
        .split(/\n{2,}/)
        .map((paragraph) => {
            const safeParagraph =
                escapeHTML(paragraph)
                    .replace(/\n/g, "<br>");

            return `<p>${safeParagraph}</p>`;
        })
        .join("");
}


function looksLikeHTML(value = "") {
    return /<\/?[a-z][\s\S]*>/i.test(
        String(value)
    );
}


function sanitizeStyle(styleValue = "") {
    const allowedProperties = new Set([
        "color",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "text-decoration",
        "text-align"
    ]);

    return String(styleValue)
        .split(";")
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => {
            const divider =
                rule.indexOf(":");

            if (divider === -1) {
                return "";
            }

            const property =
                rule
                    .slice(0, divider)
                    .trim()
                    .toLowerCase();

            const value =
                rule
                    .slice(divider + 1)
                    .trim();

            if (
                !allowedProperties.has(property)
            ) {
                return "";
            }

            if (
                /url\s*\(|expression\s*\(|javascript:/i.test(
                    value
                )
            ) {
                return "";
            }

            return `${property}: ${value}`;
        })
        .filter(Boolean)
        .join("; ");
}


function sanitizeRichHTML(html = "") {
    const parser = new DOMParser();

    const documentObject =
        parser.parseFromString(
            `<div id="content-root">${html}</div>`,
            "text/html"
        );

    const root =
        documentObject.getElementById(
            "content-root"
        );

    const allowedTags = new Set([
        "P",
        "DIV",
        "BR",
        "H2",
        "H3",
        "STRONG",
        "B",
        "EM",
        "I",
        "U",
        "UL",
        "OL",
        "LI",
        "SPAN",
        "FONT"
    ]);

    const elements =
        Array.from(
            root.querySelectorAll("*")
        );

    elements.forEach((element) => {
        if (
            !allowedTags.has(
                element.tagName
            )
        ) {
            element.replaceWith(
                ...element.childNodes
            );

            return;
        }

        Array.from(
            element.attributes
        ).forEach((attribute) => {
            const name =
                attribute.name.toLowerCase();

            const allowedAttributes =
                new Set([
                    "style",
                    "face",
                    "size",
                    "color"
                ]);

            if (
                !allowedAttributes.has(name)
            ) {
                element.removeAttribute(
                    attribute.name
                );

                return;
            }

            if (name === "style") {
                const safeStyle =
                    sanitizeStyle(
                        attribute.value
                    );

                if (safeStyle) {
                    element.setAttribute(
                        "style",
                        safeStyle
                    );
                } else {
                    element.removeAttribute(
                        "style"
                    );
                }
            }
        });
    });

    return root.innerHTML.trim();
}


function setEditorContent(value = "") {
    const content = String(value);

    if (!content.trim()) {
        postContentInput.innerHTML = "";
        return;
    }

    const html =
        looksLikeHTML(content)
            ? sanitizeRichHTML(content)
            : plainTextToHTML(content);

    postContentInput.innerHTML = html;
}


function getEditorContent() {
    return sanitizeRichHTML(
        postContentInput.innerHTML
    );
}


function getEditorText() {
    return postContentInput
        .innerText
        .replace(/\u00a0/g, " ")
        .trim();
}


function saveEditorSelection() {
    const selection =
        window.getSelection();

    if (
        !selection ||
        selection.rangeCount === 0
    ) {
        return;
    }

    const range =
        selection.getRangeAt(0);

    if (
        postContentInput.contains(
            range.commonAncestorContainer
        )
    ) {
        savedEditorRange =
            range.cloneRange();
    }
}


function restoreEditorSelection() {
    if (!savedEditorRange) {
        postContentInput.focus();
        return;
    }

    const selection =
        window.getSelection();

    selection.removeAllRanges();
    selection.addRange(savedEditorRange);

    postContentInput.focus();
}


function runEditorCommand(
    command,
    value = null
) {
    restoreEditorSelection();

    document.execCommand(
        "styleWithCSS",
        false,
        true
    );

    document.execCommand(
        command,
        false,
        value
    );

    saveEditorSelection();
}


function clearForm() {
    postForm.reset();

    postIdInput.value = "";

    postStatusInput.value =
        "draft";

    postContentInput.innerHTML = "";

    savedEditorRange = null;

    editorTitle.textContent =
        "Create a diary entry";

    textStyle.value = "P";
    fontFamily.value = "";
    fontSize.value = "";
    fontColor.value = "#10223f";

    showMessage();
}


function updateStatistics() {
    const publishedCount =
        posts.filter(
            (post) =>
                post.status === "published"
        ).length;

    const draftCount =
        posts.filter(
            (post) =>
                post.status === "draft"
        ).length;

    totalPostsElement.textContent =
        posts.length;

    publishedPostsElement.textContent =
        publishedCount;

    draftPostsElement.textContent =
        draftCount;
}


function renderPosts(
    searchValue = ""
) {
    const searchText =
        searchValue
            .trim()
            .toLowerCase();

    const filteredPosts =
        posts.filter((post) => {
            const searchableContent = [
                post.title,
                post.category,
                post.status
            ]
                .join(" ")
                .toLowerCase();

            return searchableContent.includes(
                searchText
            );
        });

    if (
        filteredPosts.length === 0
    ) {
        adminPostList.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    No posts found.
                </td>
            </tr>
        `;

        return;
    }

    adminPostList.innerHTML =
        filteredPosts
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
                            <span
                                class="status-badge ${escapeHTML(post.status)}"
                            >
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

    if (
        error ||
        !user
    ) {
        window.location.replace(
            "/admin"
        );

        return false;
    }

    currentUser = user;

    adminEmailElement.textContent =
        user.email || "";

    return true;
}


async function loadPosts() {
    adminPostList.innerHTML = `
        <tr class="empty-row">
            <td colspan="5">
                Loading posts...
            </td>
        </tr>
    `;

    const {
        data,
        error
    } = await supabase
        .from("posts")
        .select("*")
        .eq(
            "user_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

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

    renderPosts(
        postSearch.value
    );
}


function editPost(postId) {
    const selectedPost =
        posts.find(
            (post) =>
                post.id === postId
        );

    if (!selectedPost) {
        return;
    }

    postIdInput.value =
        selectedPost.id;

    postTitleInput.value =
        selectedPost.title || "";

    postCategoryInput.value =
        selectedPost.category || "";

    postStatusInput.value =
        selectedPost.status ||
        "draft";

    coverImageInput.value =
        selectedPost.cover_image ||
        "";

    postExcerptInput.value =
        selectedPost.excerpt ||
        "";

    setEditorContent(
        selectedPost.content || ""
    );

    editorTitle.textContent =
        "Edit diary entry";

    showMessage(
        "You are editing an existing post.",
        "success"
    );

    document
        .getElementById("editor")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


async function deletePost(postId) {
    const selectedPost =
        posts.find(
            (post) =>
                post.id === postId
        );

    if (!selectedPost) {
        return;
    }

    const confirmed =
        window.confirm(
            `Are you sure you want to delete "${selectedPost.title}"?`
        );

    if (!confirmed) {
        return;
    }

    const { error } =
        await supabase
            .from("posts")
            .delete()
            .eq("id", postId)
            .eq(
                "user_id",
                currentUser.id
            );

    if (error) {
        window.alert(
            error.message
        );

        return;
    }

    if (
        postIdInput.value === postId
    ) {
        clearForm();
    }

    await loadPosts();
}


postForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const title =
            postTitleInput
                .value
                .trim();

        const category =
            postCategoryInput.value;

        const status =
            postStatusInput.value;

        const coverImage =
            coverImageInput
                .value
                .trim();

        const excerpt =
            postExcerptInput
                .value
                .trim();

        const content =
            getEditorContent();

        const contentText =
            getEditorText();

        if (
            !title ||
            !category ||
            !status ||
            !excerpt ||
            !contentText
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
            cover_image:
                coverImage || null,
            excerpt,
            content,
            updated_at:
                new Date()
                    .toISOString()
        };

        const editingId =
            postIdInput.value;

        let error;

        if (editingId) {
            const response =
                await supabase
                    .from("posts")
                    .update(postData)
                    .eq(
                        "id",
                        editingId
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            error =
                response.error;
        } else {
            const response =
                await supabase
                    .from("posts")
                    .insert({
                        ...postData,
                        user_id:
                            currentUser.id
                    });

            error =
                response.error;
        }

        if (error) {
            showMessage(
                error.message,
                "error"
            );

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
    }
);


clearButton.addEventListener(
    "click",
    () => {
        clearForm();
    }
);


postSearch.addEventListener(
    "input",
    () => {
        renderPosts(
            postSearch.value
        );
    }
);


adminPostList.addEventListener(
    "click",
    async (event) => {
        const actionButton =
            event.target.closest(
                "button[data-action]"
            );

        if (!actionButton) {
            return;
        }

        const postId =
            actionButton.dataset.id;

        const action =
            actionButton.dataset.action;

        if (action === "edit") {
            editPost(postId);
        }

        if (action === "delete") {
            await deletePost(
                postId
            );
        }
    }
);


postContentInput.addEventListener(
    "mouseup",
    saveEditorSelection
);

postContentInput.addEventListener(
    "keyup",
    saveEditorSelection
);

postContentInput.addEventListener(
    "focus",
    saveEditorSelection
);

postContentInput.addEventListener(
    "input",
    saveEditorSelection
);


editorToolbar.addEventListener(
    "mousedown",
    (event) => {
        if (
            event.target.closest(
                "button"
            )
        ) {
            event.preventDefault();
        }
    }
);


editorToolbar.addEventListener(
    "click",
    (event) => {
        const button =
            event.target.closest(
                "button[data-command]"
            );

        if (!button) {
            return;
        }

        runEditorCommand(
            button.dataset.command
        );
    }
);


textStyle.addEventListener(
    "change",
    () => {
        if (
            !textStyle.value
        ) {
            return;
        }

        runEditorCommand(
            "formatBlock",
            textStyle.value
        );
    }
);


fontFamily.addEventListener(
    "change",
    () => {
        if (
            !fontFamily.value
        ) {
            return;
        }

        runEditorCommand(
            "fontName",
            fontFamily.value
        );
    }
);


fontSize.addEventListener(
    "change",
    () => {
        if (
            !fontSize.value
        ) {
            return;
        }

        runEditorCommand(
            "fontSize",
            fontSize.value
        );
    }
);


fontColor.addEventListener(
    "input",
    () => {
        runEditorCommand(
            "foreColor",
            fontColor.value
        );
    }
);


clearFormatting.addEventListener(
    "click",
    () => {
        runEditorCommand(
            "removeFormat"
        );
    }
);


postContentInput.addEventListener(
    "paste",
    (event) => {
        event.preventDefault();

        const text =
            event.clipboardData
                .getData(
                    "text/plain"
                );

        document.execCommand(
            "insertText",
            false,
            text
        );
    }
);


logoutButton.addEventListener(
    "click",
    async () => {
        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "LOGGING OUT...";

        await supabase.auth.signOut();

        window.location.replace(
            "/admin"
        );
    }
);


supabase.auth.onAuthStateChange(
    (event, session) => {
        if (
            event === "SIGNED_OUT" ||
            !session
        ) {
            window.location.replace(
                "/admin"
            );
        }
    }
);


async function initializeDashboard() {
    const authenticated =
        await requireAuthentication();

    if (!authenticated) {
        return;
    }

    await loadPosts();
}


initializeDashboard();