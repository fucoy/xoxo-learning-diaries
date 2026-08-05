import { supabase } from "/supabase-config.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

function showMessage(message = "", type = "") {
    loginMessage.textContent = message;
    loginMessage.className = `login-message ${type}`.trim();
}

function setLoading(isLoading) {
    loginButton.disabled = isLoading;

    loginButton.innerHTML = isLoading
        ? "SIGNING IN..."
        : "LOGIN TO DASHBOARD <span>→</span>";
}

function getErrorMessage(error) {
    const message = error?.message?.toLowerCase() || "";

    if (message.includes("invalid login credentials")) {
        return "Incorrect email or password.";
    }

    if (message.includes("email not confirmed")) {
        return "Please confirm your email before signing in.";
    }

    if (
        message.includes("failed to fetch") ||
        message.includes("network")
    ) {
        return "Unable to connect. Check your internet connection.";
    }

    return error?.message || "Unable to sign in. Please try again.";
}

async function checkExistingLogin() {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (session) {
        window.location.replace("/admin/dashboard.html");
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage(
            "Enter your email and password.",
            "error"
        );

        return;
    }

    setLoading(true);
    showMessage();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage(
            getErrorMessage(error),
            "error"
        );

        passwordInput.value = "";
        passwordInput.focus();
        setLoading(false);

        return;
    }

    showMessage(
        "Login successful. Opening dashboard...",
        "success"
    );

    window.setTimeout(() => {
        window.location.replace("/admin/dashboard.html");
    }, 500);
});

checkExistingLogin();