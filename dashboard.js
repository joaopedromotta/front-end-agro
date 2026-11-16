const dashboard = document.querySelector(".dashboard");
const authToken = sessionStorage.getItem("agroGuardToken");

if (!authToken) {
    window.location.replace("./login.html");
}

const accountLabel = document.getElementById("account-label");
const logoutButton = document.getElementById("logout-button");
const homeView = document.getElementById("home-view");
const workspaceView = document.getElementById("workspace-view");
const workspaceFrame = workspaceView.querySelector("iframe");
const pageLinks = document.querySelectorAll(".navigation .nav-link[data-view]");
const viewLinks = document.querySelectorAll(".nav-link[data-view], .module-card[data-view]");

if (accountLabel) {
    accountLabel.textContent = sessionStorage.getItem("agroGuardName") || "Área de gestão";
}

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("agroGuardToken");
    sessionStorage.removeItem("agroGuardUserId");
    sessionStorage.removeItem("agroGuardName");
    window.location.replace("./login.html");
});

viewLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const view = link.dataset.view;
        const isHome = view === "home";
        homeView.hidden = !isHome;
        workspaceView.hidden = isHome;
        dashboard.classList.toggle("is-embedded", !isHome);

        if (!isHome) {
            const frameSrc = link.dataset.frameSrc;
            if (workspaceFrame.getAttribute("src") !== frameSrc) {
                workspaceFrame.src = frameSrc;
            }
        }

        pageLinks.forEach(pageLink => {
            const isActive = pageLink.dataset.view === view;
            pageLink.classList.toggle("is-active", isActive);

            if (isActive) {
                pageLink.setAttribute("aria-current", "page");
            } else {
                pageLink.removeAttribute("aria-current");
            }
        });
    });
});
