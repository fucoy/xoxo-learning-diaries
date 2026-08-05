import { supabase } from "./supabase-config.js";

const idCard = document.querySelector(".id-card");
const blogGrid = document.getElementById("blogGrid");

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

function updateCardTilt(event) {
    if (!idCard || reducedMotion) {
        return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const horizontalMovement =
        (event.clientX - centerX) / centerX;

    const verticalMovement =
        (event.clientY - centerY) / centerY;

    idCard.style.setProperty(
        "--rotate-y",
        `${horizontalMovement * 5}deg`
    );

    idCard.style.setProperty(
        "--rotate-x",
        `${verticalMovement * -3}deg`
    );
}

function resetCardTilt() {
    if (!idCard) {
        return;
    }

    idCard.style.setProperty("--rotate-y", "0deg");
    idCard.style.setProperty("--rotate-x", "0deg");
}

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
    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(new Date(dateValue));
}

function getCardClass(index) {
    const classes = [
        "blue-card",
        "yellow-card",
        "white-card"
    ];

    return classes[index % classes.length];
}

function validImageUrl(value) {
    if (!value) {
        return "";
    }

    const imageUrl = value.trim();

    if (
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("./") ||
        imageUrl.startsWith("../") ||
        imageUrl.startsWith("/")
    ) {
        return imageUrl;
    }

    return "";
}

function renderPosts(posts) {
    if (!blogGrid) {
        return;
    }

    if (!posts.length) {
        blogGrid.innerHTML = `
            <div class="empty-state">
                <span>♡</span>
                <h3>No diary entries yet.</h3>
                <p>Published entries will appear here.</p>
            </div>
        `;

        return;
    }

    blogGrid.innerHTML = posts.map((post, index) => {
        const imageUrl = validImageUrl(post.cover_image);

        const image = imageUrl
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
                ${image}

                <div class="blog-card-body">
                    <div class="blog-card-top">
                        <p class="number">
                            ${String(index + 1).padStart(2, "0")}
                        </p>

                        <p class="type">
                            ${escapeHTML(post.category)}
                        </p>
                    </div>

                    <h3>${escapeHTML(post.title)}</h3>

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
    }).join("");
}

async function loadPublishedPosts() {
    if (!blogGrid) {
        return;
    }

    const { data, error } = await supabase
        .from("posts")
        .select(
            "id, title, category, excerpt, cover_image, created_at"
        )
        .eq("status", "published")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        blogGrid.innerHTML = `
            <div class="empty-state error-state">
                <h3>Unable to load diary entries.</h3>
                <p>Please check the Supabase connection.</p>
            </div>
        `;

        return;
    }

    renderPosts(data || []);
}

document.addEventListener(
    "pointermove",
    updateCardTilt
);

document.documentElement.addEventListener(
    "mouseleave",
    resetCardTilt
);

window.addEventListener(
    "blur",
    resetCardTilt
);

loadPublishedPosts();