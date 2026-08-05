import { supabase } from "./supabase-config.js";

const idCard = document.querySelector(".id-card");
const blogGrid = document.getElementById("blogGrid");
const postSearch = document.getElementById("postSearch");
const filterButtons = document.querySelectorAll(".filter-button");
const resultsSummary = document.getElementById(
    "blogResultsSummary"
);

const pageType = document.body.dataset.page || "";
const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

let allPosts = [];
let activeCategory = "All";

function updateCardTilt(event) {
    if (!idCard || reducedMotion) {
        return;
    }

    const cardBounds = idCard.getBoundingClientRect();

    const cardCenterX =
        cardBounds.left + cardBounds.width / 2;

    const cardCenterY =
        cardBounds.top + cardBounds.height / 2;

    const horizontalMovement =
        (event.clientX - cardCenterX) /
        Math.max(cardBounds.width, 1);

    const verticalMovement =
        (event.clientY - cardCenterY) /
        Math.max(cardBounds.height, 1);

    const rotateY = Math.max(
        -5,
        Math.min(5, horizontalMovement * 8)
    );

    const rotateX = Math.max(
        -3,
        Math.min(3, verticalMovement * -6)
    );

    idCard.style.setProperty(
        "--rotate-y",
        `${rotateY}deg`
    );

    idCard.style.setProperty(
        "--rotate-x",
        `${rotateX}deg`
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

    const allowedPrefixes = [
        "https://",
        "http://",
        "./",
        "../",
        "/"
    ];

    const valid = allowedPrefixes.some(
        (prefix) => imageUrl.startsWith(prefix)
    );

    return valid ? imageUrl : "";
}

function getEmptyMessage() {
    if (
        activeCategory !== "All" &&
        postSearch?.value.trim()
    ) {
        return `No ${activeCategory.toLowerCase()} entries matched your search.`;
    }

    if (activeCategory !== "All") {
        return `No published ${activeCategory.toLowerCase()} entries yet.`;
    }

    if (postSearch?.value.trim()) {
        return "No entries matched your search.";
    }

    return "No diary entries yet.";
}

function updateResultsSummary(count) {
    if (!resultsSummary) {
        return;
    }

    const entryWord = count === 1
        ? "entry"
        : "entries";

    const categoryText = activeCategory === "All"
        ? "all categories"
        : activeCategory.toLowerCase();

    resultsSummary.textContent =
        `Showing ${count} ${entryWord} from ${categoryText}.`;
}

function renderPosts(posts) {
    if (!blogGrid) {
        return;
    }

    updateResultsSummary(posts.length);

    if (!posts.length) {
        blogGrid.innerHTML = `
            <div class="empty-state">
                <span aria-hidden="true">♡</span>
                <h3>${escapeHTML(getEmptyMessage())}</h3>
                <p>
                    New published entries will appear here.
                </p>
            </div>
        `;

        return;
    }

    blogGrid.innerHTML = posts
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
                            loading="lazy"
                            decoding="async"
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
                            aria-label="Read ${escapeHTML(post.title)}"
                        >
                            READ ENTRY →
                        </a>

                    </div>

                </article>
            `;
        })
        .join("");
}

function filterPosts() {
    const searchText =
        postSearch?.value.trim().toLowerCase() || "";

    const filteredPosts = allPosts.filter((post) => {
        const matchesCategory =
            activeCategory === "All" ||
            post.category === activeCategory;

        const searchableText = [
            post.title,
            post.category,
            post.excerpt
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !searchText ||
            searchableText.includes(searchText);

        return matchesCategory && matchesSearch;
    });

    renderPosts(filteredPosts);
}

async function loadPublishedPosts() {
    if (!blogGrid) {
        return;
    }

    let query = supabase
        .from("posts")
        .select(
            "id, title, category, excerpt, cover_image, created_at"
        )
        .eq("status", "published")
        .order("created_at", {
            ascending: false
        });

    if (pageType === "home") {
        query = query.limit(3);
    }

    const { data, error } = await query;

    if (error) {
        blogGrid.innerHTML = `
            <div class="empty-state error-state">
                <span aria-hidden="true">!</span>
                <h3>Unable to load diary entries.</h3>
                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;

        if (resultsSummary) {
            resultsSummary.textContent = "";
        }

        return;
    }

    allPosts = data || [];

    renderPosts(allPosts);
}

if (idCard) {
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
}

if (postSearch) {
    postSearch.addEventListener(
        "input",
        filterPosts
    );
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeCategory =
            button.dataset.filter || "All";

        filterButtons.forEach((item) => {
            item.classList.toggle(
                "active",
                item === button
            );
        });

        filterPosts();
    });
});

loadPublishedPosts();