// guard.js – حماية الصفحات (محسّن)
(function() {
    if (typeof Auth === "undefined") {
        console.error("auth.js must be loaded before guard.js");
        return;
    }

    const LOGIN_PAGE = "https://salahweb.github.io/log/index.html"; // ← عدّلها عند الحاجة
    const CONTENT_ID = "protected-content";                         // ← غيّرها حسب معرف المحتوى

    function showContent() {
        const content = document.getElementById(CONTENT_ID);
        if (content) {
            content.hidden = false;
        }
    }

    if (Auth.isAuthenticated()) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", showContent);
        } else {
            showContent();
        }
    } else {
        Auth.clear();
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.replace(LOGIN_PAGE + "?return=" + returnUrl);
    }
})();
