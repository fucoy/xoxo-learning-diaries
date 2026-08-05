import { supabase } from "./supabase-config.js";

const categoryGrid = document.getElementById("categoryGrid");
const selectedCategory = document.body.dataset.category;

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

    const validPrefixes = [
        "https://",
        "http://",
        "./",
        "../",
        "/"
    ];

    const valid = validPrefixes.some((prefix) =>
        imageUrl.startsWith(prefix)
    );

    return valid ? imageUrl : "";
}

function getCardClass(index) {
    const classes = [
        "blue-card",
        "yellow-card",
        "white-card"
    ];

    return classes[index % classes.length];
}

function renderPosts(posts) {
    if (!posts.length) {
        categoryGrid.innerHTML = `
            <div class="empty-state">
                <span>♡</span>

                <h3>
                    No ${escapeHTML(
                        selectedCategory.toLowerCase()
                    )} entries yet.
                </h3>

                <p>
                    Published entries in this category will appear here.
                </p>
            </div>
        `;

        return;
    }

    categoryGrid.innerHTML = posts
        .map((post, index) => {
            const imageUrl = validImageUrl(
                post.cover_image
            );

            const imageMarkup = imageUrl
                ? `
                    <div class="blog-cover">
                        <img
                            src="${escapeHTML(imageUrl)}"
                            alt="${escapeHTML(post.title)}"
                        >
                    </div>
                `
                : "";

            return `
                <article class="blog-card ${getCardClass(index)}">

                    ${imageMarkup}

                    <div class="blog-card-body">

                        <div class="blog-card-top">

                            <p class="number">
                                ${String(index + 1).padStart(2, "0")}
                            </p>

                            <p class="type">
                                ${escapeHTML(post.category)}
                            </p>

                        </div>

                        <h3>
                            ${escapeHTML(post.title)}
                        </h3>

                        <p class="post-date">
                            ${formatDate(post.created_at)}
                        </p>

                        <p class="card-description">
                            ${escapeHTML(post.excerpt)}
                        </p>

                        <a
                            href="post.html?id=${encodeURIComponent(post.id)}"
                            class="read-more"
                        >
                            READ ENTRY →
                        </a>

                    </div>

                </article>
            `;
        })
        .join("");
}

async function loadCategoryPosts() {
    if (!selectedCategory || !categoryGrid) {
        return;
    }

    const { data, error } = await supabase
        .from("posts")
        .select(
            "id, title, category, excerpt, cover_image, created_at"
        )
        .eq("status", "published")
        .eq("category", selectedCategory)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        categoryGrid.innerHTML = `
            <div class="empty-state error-state">
                <h3>Unable to load entries.</h3>

                <p>
                    Please check the Supabase connection.
                </p>
            </div>
        `;

        return;
    }

    renderPosts(data || []);
}

loadCategoryPosts();