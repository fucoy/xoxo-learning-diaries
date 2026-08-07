import { supabase } from "./supabase-config.js";

const idCard = document.querySelector(".id-card");
const blogGrid = document.getElementById("blogGrid");
const postSearch = document.getElementById("postSearch");
const filterButtons = document.querySelectorAll(".filter-button");
const resultsSummary = document.getElementById("blogResultsSummary");

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

    idCard.style.setProperty(
        "--rotate-y",
        "0deg"
    );

    idCard.style.setProperty(
        "--rotate-x",
        "0deg"
    );
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

    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    ).format(date);
}

function getCardClass(index) {
    const classes = [
        "blue-card",
        "yellow-card",
        "white-card"
    ];

    return classes[
        index % classes.length
    ];
}

function getToneClass(index) {
    const tones = [
        "tone-blue",
        "tone-yellow",
        "tone-white"
    ];

    return tones[
        index % tones.length
    ];
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

    const valid =
        allowedPrefixes.some(
            (prefix) =>
                imageUrl.startsWith(prefix)
        );

    return valid
        ? imageUrl
        : "";
}

function getEmptyMessage() {
    if (
        activeCategory !== "All" &&
        postSearch?.value.trim()
    ) {
        return `No ${activeCategory.toLowerCase()} entries matched your search.`;
    }

    if (
        activeCategory !== "All"
    ) {
        return `No published ${activeCategory.toLowerCase()} entries yet.`;
    }

    if (
        postSearch?.value.trim()
    ) {
        return "No entries matched your search.";
    }

    return "No diary entries yet.";
}

function updateResultsSummary(count) {
    if (!resultsSummary) {
        return;
    }

    const entryWord =
        count === 1
            ? "entry"
            : "entries";

    const categoryText =
        activeCategory === "All"
            ? "all categories"
            : activeCategory.toLowerCase();

    resultsSummary.textContent =
        `Showing ${count} ${entryWord} from ${categoryText}.`;
}

function renderPosts(posts) {
    if (!blogGrid) {
        return;
    }

    updateResultsSummary(
        posts.length
    );

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

    blogGrid.innerHTML =
        posts
            .map((post, index) => {
                const imageUrl =
                    validImageUrl(
                        post.cover_image
                    );

                const imageMarkup =
                    imageUrl
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
        postSearch?.value
            .trim()
            .toLowerCase() || "";

    const filteredPosts =
        allPosts.filter(
            (post) => {
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
                    searchableText.includes(
                        searchText
                    );

                return (
                    matchesCategory &&
                    matchesSearch
                );
            }
        );

    renderPosts(
        filteredPosts
    );
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
        .eq(
            "status",
            "published"
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (
        pageType === "home"
    ) {
        query = query.limit(6);
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        blogGrid.innerHTML = `
            <div class="empty-state error-state">
                <span aria-hidden="true">!</span>
                <h3>
                    Unable to load diary entries.
                </h3>
                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;

        if (resultsSummary) {
            resultsSummary.textContent =
                "";
        }

        return;
    }

    allPosts =
        data || [];

    renderPosts(
        allPosts
    );
}

if (idCard) {
    document.addEventListener(
        "pointermove",
        updateCardTilt
    );

    document.documentElement
        .addEventListener(
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

filterButtons.forEach(
    (button) => {
        button.addEventListener(
            "click",
            () => {
                activeCategory =
                    button.dataset.filter ||
                    "All";

                filterButtons.forEach(
                    (item) => {
                        item.classList.toggle(
                            "active",
                            item === button
                        );
                    }
                );

                filterPosts();
            }
        );
    }
);

loadPublishedPosts();

(() => {
    const revealSelector = [
        ".section-top",
        ".entry-chooser",
        ".blog-card",
        ".journal-paths-heading",
        ".journal-path-card",
        ".profile-photo",
        ".profile-copy",
        ".profile-details",
        ".detail-card",
        ".post-shell",
        ".loading-state",
        ".empty-state"
    ].join(", ");

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    const revealObserver =
        "IntersectionObserver" in window &&
        !prefersReducedMotion
            ? new IntersectionObserver(
                  (entries, observer) => {
                      entries.forEach(
                          (entry) => {
                              if (
                                  !entry.isIntersecting
                              ) {
                                  return;
                              }

                              entry.target
                                  .classList
                                  .add(
                                      "is-visible"
                                  );

                              observer.unobserve(
                                  entry.target
                              );
                          }
                      );
                  },
                  {
                      threshold: 0.12,
                      rootMargin:
                          "0px 0px -50px 0px"
                  }
              )
            : null;

    function registerRevealItems(
        root = document
    ) {
        const elements = [];

        if (
            root instanceof Element &&
            root.matches(
                revealSelector
            )
        ) {
            elements.push(root);
        }

        if (
            root.querySelectorAll
        ) {
            elements.push(
                ...root.querySelectorAll(
                    revealSelector
                )
            );
        }

        elements.forEach(
            (element, index) => {
                if (
                    element.dataset
                        .revealReady ===
                    "true"
                ) {
                    return;
                }

                element.dataset
                    .revealReady =
                    "true";

                element.classList.add(
                    "reveal-item"
                );

                const delay =
                    Math.min(
                        index % 6,
                        5
                    ) * 90;

                element.style
                    .setProperty(
                        "--reveal-delay",
                        `${delay}ms`
                    );

                if (
                    revealObserver
                ) {
                    revealObserver.observe(
                        element
                    );
                } else {
                    element.classList.add(
                        "is-visible"
                    );
                }
            }
        );
    }

    function startRevealAnimation() {
        registerRevealItems(
            document
        );

        const pageObserver =
            new MutationObserver(
                (mutations) => {
                    mutations.forEach(
                        (mutation) => {
                            mutation.addedNodes
                                .forEach(
                                    (node) => {
                                        if (
                                            node instanceof
                                            Element
                                        ) {
                                            registerRevealItems(
                                                node
                                            );
                                        }
                                    }
                                );
                        }
                    );
                }
            );

        pageObserver.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            startRevealAnimation
        );
    } else {
        startRevealAnimation();
    }
})();

(() => {
    const source =
        document.getElementById(
            "blogGrid"
        );

    const track =
        document.getElementById(
            "homeCarouselTrack"
        );

    const dotsContainer =
        document.getElementById(
            "homeCarouselDots"
        );

    const previousButton =
        document.getElementById(
            "homeCarouselPrev"
        );

    const nextButton =
        document.getElementById(
            "homeCarouselNext"
        );

    const carouselMain =
        document.querySelector(
            ".home-carousel-main"
        );

    if (
        !source ||
        !track ||
        !dotsContainer ||
        !previousButton ||
        !nextButton
    ) {
        return;
    }

    let slides = [];
    let dotButtons = [];
    let currentIndex = 0;
    let buildTimer = null;
    let autoplayTimer = null;
    let paused = false;

    const autoplayDelay = 5000;

    function updateCarousel(
        index,
        animate = true
    ) {
        if (
            !slides.length
        ) {
            return;
        }

        currentIndex =
            (
                index +
                slides.length
            ) %
            slides.length;

        if (
            reducedMotion ||
            !animate
        ) {
            track.style.transition =
                "none";
        } else {
            track.style.transition =
                "";
        }

        track.style.transform =
            `translate3d(-${currentIndex * 100}%, 0, 0)`;

        slides.forEach(
            (slide, slideIndex) => {
                const active =
                    slideIndex ===
                    currentIndex;

                slide.classList.toggle(
                    "is-active",
                    active
                );

                slide.setAttribute(
                    "aria-hidden",
                    String(!active)
                );
            }
        );

        dotButtons.forEach(
            (button, buttonIndex) => {
                const active =
                    buttonIndex ===
                    currentIndex;

                button.classList.toggle(
                    "is-active",
                    active
                );

                button.setAttribute(
                    "aria-current",
                    active
                        ? "true"
                        : "false"
                );
            }
        );

        if (
            !animate &&
            !reducedMotion
        ) {
            requestAnimationFrame(
                () => {
                    requestAnimationFrame(
                        () => {
                            track.style
                                .transition =
                                "";
                        }
                    );
                }
            );
        }
    }

    function stopAutoplay() {
        if (
            autoplayTimer
        ) {
            clearInterval(
                autoplayTimer
            );

            autoplayTimer = null;
        }
    }

    function startAutoplay() {
        stopAutoplay();

        if (
            reducedMotion ||
            paused ||
            slides.length <= 1
        ) {
            return;
        }

        autoplayTimer =
            setInterval(
                () => {
                    updateCarousel(
                        currentIndex + 1
                    );
                },
                autoplayDelay
            );
    }

    function resetAutoplay() {
        stopAutoplay();
        startAutoplay();
    }

    function createDot(
        index,
        title
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "home-carousel-dot";

        button.setAttribute(
            "aria-label",
            `Show ${title}`
        );

        button.addEventListener(
            "click",
            () => {
                updateCarousel(
                    index
                );

                resetAutoplay();
            }
        );

        return button;
    }

    function buildCarousel() {
        const cards =
            Array.from(
                source.querySelectorAll(
                    ".blog-card"
                )
            ).slice(
                0,
                6
            );

        if (
            !cards.length
        ) {
            const message =
                source.querySelector(
                    ".empty-state, .error-state"
                );

            if (message) {
                track.innerHTML =
                    "";

                track.appendChild(
                    message.cloneNode(
                        true
                    )
                );
            }

            stopAutoplay();

            return;
        }

        stopAutoplay();

        track.innerHTML =
            "";

        dotsContainer.innerHTML =
            "";

        slides = [];
        dotButtons = [];

        cards.forEach(
            (card, index) => {
                const slide =
                    document.createElement(
                        "div"
                    );

                const cardCopy =
                    card.cloneNode(
                        true
                    );

                cardCopy.classList.remove(
                    "reveal-item",
                    "is-visible"
                );

                cardCopy.removeAttribute(
                    "data-reveal-ready"
                );

                cardCopy.style
                    .removeProperty(
                        "--reveal-delay"
                    );

                slide.className =
                    `home-carousel-slide ${getToneClass(index)}`;

                slide.appendChild(
                    cardCopy
                );

                track.appendChild(
                    slide
                );

                const title =
                    card.querySelector(
                        "h3"
                    )?.textContent
                        .trim() ||
                    `Entry ${index + 1}`;

                const dot =
                    createDot(
                        index,
                        title
                    );

                dotsContainer.appendChild(
                    dot
                );

                slides.push(
                    slide
                );

                dotButtons.push(
                    dot
                );
            }
        );

        updateCarousel(
            0,
            false
        );

        startAutoplay();
    }

    function scheduleBuild() {
        clearTimeout(
            buildTimer
        );

        buildTimer =
            setTimeout(
                () => {
                    buildCarousel();
                },
                80
            );
    }

    previousButton
        .addEventListener(
            "click",
            () => {
                updateCarousel(
                    currentIndex - 1
                );

                resetAutoplay();
            }
        );

    nextButton
        .addEventListener(
            "click",
            () => {
                updateCarousel(
                    currentIndex + 1
                );

                resetAutoplay();
            }
        );

    if (carouselMain) {
        carouselMain
            .addEventListener(
                "mouseenter",
                () => {
                    paused = true;
                    stopAutoplay();
                }
            );

        carouselMain
            .addEventListener(
                "mouseleave",
                () => {
                    paused = false;
                    startAutoplay();
                }
            );

        carouselMain
            .addEventListener(
                "focusin",
                () => {
                    paused = true;
                    stopAutoplay();
                }
            );

        carouselMain
            .addEventListener(
                "focusout",
                () => {
                    paused = false;
                    startAutoplay();
                }
            );

        carouselMain
            .addEventListener(
                "keydown",
                (event) => {
                    if (
                        event.key ===
                        "ArrowLeft"
                    ) {
                        updateCarousel(
                            currentIndex - 1
                        );

                        resetAutoplay();
                    }

                    if (
                        event.key ===
                        "ArrowRight"
                    ) {
                        updateCarousel(
                            currentIndex + 1
                        );

                        resetAutoplay();
                    }
                }
            );
    }

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.hidden
            ) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
        }
    );

    const observer =
        new MutationObserver(
            () => {
                scheduleBuild();
            }
        );

    observer.observe(
        source,
        {
            childList: true,
            subtree: true
        }
    );

    scheduleBuild();
})();