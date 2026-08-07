import { supabase } from "./supabase-config.js";

const postContainer =
    document.getElementById(
        "postContainer"
    );


function formatDate(dateValue) {
    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
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


function validImageUrl(value) {
    if (!value) {
        return "";
    }

    const imageUrl =
        value.trim();

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
                imageUrl.startsWith(
                    prefix
                )
        );

    return valid
        ? imageUrl
        : "";
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


function plainTextToHTML(value = "") {
    const text =
        String(value).trim();

    if (!text) {
        return "";
    }

    return text
        .split(/\n{2,}/)
        .map((paragraph) => {
            const safeParagraph =
                escapeHTML(paragraph)
                    .replace(
                        /\n/g,
                        "<br>"
                    );

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
    const allowedProperties =
        new Set([
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
        .map(
            (rule) =>
                rule.trim()
        )
        .filter(Boolean)
        .map((rule) => {
            const divider =
                rule.indexOf(":");

            if (
                divider === -1
            ) {
                return "";
            }

            const property =
                rule
                    .slice(
                        0,
                        divider
                    )
                    .trim()
                    .toLowerCase();

            const value =
                rule
                    .slice(
                        divider + 1
                    )
                    .trim();

            if (
                !allowedProperties.has(
                    property
                )
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
    const parser =
        new DOMParser();

    const documentObject =
        parser.parseFromString(
            `<div id="content-root">${html}</div>`,
            "text/html"
        );

    const root =
        documentObject
            .getElementById(
                "content-root"
            );

    const allowedTags =
        new Set([
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
            root.querySelectorAll(
                "*"
            )
        );

    elements.forEach(
        (element) => {
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
            ).forEach(
                (attribute) => {
                    const name =
                        attribute.name
                            .toLowerCase();

                    const allowedAttributes =
                        new Set([
                            "style",
                            "face",
                            "size",
                            "color"
                        ]);

                    if (
                        !allowedAttributes.has(
                            name
                        )
                    ) {
                        element.removeAttribute(
                            attribute.name
                        );

                        return;
                    }

                    if (
                        name === "style"
                    ) {
                        const safeStyle =
                            sanitizeStyle(
                                attribute.value
                            );

                        if (
                            safeStyle
                        ) {
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
                }
            );
        }
    );

    return root.innerHTML.trim();
}


function renderContent(value = "") {
    const content =
        String(value);

    if (
        !content.trim()
    ) {
        return "";
    }

    if (
        looksLikeHTML(content)
    ) {
        return sanitizeRichHTML(
            content
        );
    }

    return plainTextToHTML(
        content
    );
}


function showNotFound() {
    postContainer.innerHTML = "";

    const state =
        document.createElement(
            "div"
        );

    const heading =
        document.createElement(
            "h1"
        );

    const message =
        document.createElement(
            "p"
        );

    const link =
        document.createElement(
            "a"
        );

    state.className =
        "post-state";

    heading.textContent =
        "Diary entry not found.";

    message.textContent =
        "This entry may not exist or may not be published.";

    link.href =
        "blog.html";

    link.className =
        "back-link";

    link.textContent =
        "← BACK TO BLOG";

    state.append(
        heading,
        message,
        link
    );

    postContainer.appendChild(
        state
    );
}


function renderPost(post) {
    postContainer.innerHTML = "";

    const header =
        document.createElement(
            "header"
        );

    const category =
        document.createElement(
            "p"
        );

    const title =
        document.createElement(
            "h1"
        );

    const meta =
        document.createElement(
            "p"
        );

    const excerpt =
        document.createElement(
            "p"
        );

    const content =
        document.createElement(
            "div"
        );

    const backLink =
        document.createElement(
            "a"
        );

    header.className =
        "post-header";

    category.className =
        "post-category";

    title.className =
        "post-title";

    meta.className =
        "post-meta";

    excerpt.className =
        "post-excerpt";

    content.className =
        "post-content";

    backLink.className =
        "back-link";

    category.textContent =
        post.category;

    title.textContent =
        post.title;

    meta.textContent =
        `${formatDate(post.created_at)} • Angel Mig G. Fucoy`;

    excerpt.textContent =
        post.excerpt;

    content.innerHTML =
        renderContent(
            post.content
        );

    backLink.href =
        "blog.html";

    backLink.textContent =
        "← BACK TO BLOG";

    header.append(
        category,
        title,
        meta
    );

    postContainer.appendChild(
        header
    );

    const imageUrl =
        validImageUrl(
            post.cover_image
        );

    if (imageUrl) {
        const imageWrapper =
            document.createElement(
                "div"
            );

        const image =
            document.createElement(
                "img"
            );

        imageWrapper.className =
            "post-cover";

        image.src =
            imageUrl;

        image.alt =
            post.title;

        imageWrapper.appendChild(
            image
        );

        postContainer.appendChild(
            imageWrapper
        );
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
        new URLSearchParams(
            window.location.search
        );

    const postId =
        parameters.get("id");

    if (!postId) {
        showNotFound();
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("posts")
        .select(
            "id, title, category, excerpt, content, cover_image, created_at"
        )
        .eq(
            "id",
            postId
        )
        .eq(
            "status",
            "published"
        )
        .limit(1);

    if (
        error ||
        !data ||
        data.length === 0
    ) {
        showNotFound();
        return;
    }

    renderPost(
        data[0]
    );
}


loadPost();