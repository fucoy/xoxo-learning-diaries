import { supabase } from "./supabase-config.js";

const postContainer = document.getElementById("postContainer");

function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(date);
}

function validImageUrl(value) {
    if (!value) {
        return "";
    }

    const imageUrl = value.trim();

    const allowedPrefixes = [
        "https://",
        "http://",
        "./",
        "../",
        "/"
    ];

    const valid = allowedPrefixes.some((prefix) =>
        imageUrl.startsWith(prefix)
    );

    return valid ? imageUrl : "";
}

function showNotFound() {
    postContainer.innerHTML = "";

    const state = document.createElement("div");
    const heading = document.createElement("h1");
    const message = document.createElement("p");
    const link = document.createElement("a");

    state.className = "post-state";
    heading.textContent = "Diary entry not found.";
    message.textContent =
        "This entry may not exist or may not be published.";
    link.href = "blog.html";
    link.className = "back-link";
    link.textContent = "← BACK TO BLOG";

    state.append(heading, message, link);
    postContainer.appendChild(state);
}

function renderPost(post) {
    postContainer.innerHTML = "";

    const header = document.createElement("header");
    const category = document.createElement("p");
    const title = document.createElement("h1");
    const meta = document.createElement("p");
    const excerpt = document.createElement("p");
    const content = document.createElement("div");
    const backLink = document.createElement("a");

    header.className = "post-header";
    category.className = "post-category";
    title.className = "post-title";
    meta.className = "post-meta";
    excerpt.className = "post-excerpt";
    content.className = "post-content";
    backLink.className = "back-link";

    category.textContent = post.category;
    title.textContent = post.title;
    meta.textContent =
        `${formatDate(post.created_at)} • Angel Mig G. Fucoy`;
    excerpt.textContent = post.excerpt;
    content.textContent = post.content;
    backLink.href = "blog.html";
    backLink.textContent = "← BACK TO BLOG";

    header.append(category, title, meta);
    postContainer.appendChild(header);

    const imageUrl = validImageUrl(post.cover_image);

    if (imageUrl) {
        const imageWrapper =
            document.createElement("div");

        const image =
            document.createElement("img");

        imageWrapper.className = "post-cover";
        image.src = imageUrl;
        image.alt = post.title;

        imageWrapper.appendChild(image);
        postContainer.appendChild(imageWrapper);
    }

    postContainer.append(
        excerpt,
        content,
        backLink
    );

    document.title =
        `${post.title} | XOXO Learning Diaries`;
}

async function loadPost() {
    const parameters =
        new URLSearchParams(window.location.search);

    const postId = parameters.get("id");

    if (!postId) {
        showNotFound();
        return;
    }

    const { data, error } = await supabase
        .from("posts")
        .select(
            "id, title, category, excerpt, content, cover_image, created_at"
        )
        .eq("id", postId)
        .eq("status", "published")
        .limit(1);

    if (
        error ||
        !data ||
        data.length === 0
    ) {
        showNotFound();
        return;
    }

    renderPost(data[0]);
}

loadPost();