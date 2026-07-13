(function () {
    if (window.__LUXEVA_WIDGET__) return;
    window.__LUXEVA_WIDGET__ = true;

    const CONFIG = {
        API_URL: "https://script.google.com/macros/s/AKfycbzxEIb1BsVa-sG7kbmLGSBr65V2b8gHP39ixosiWIXeXRjZSw19sTFFe7imZTgQnvQ/exec",
        STORAGE_KEY: "luxevaAuthData",
        CONTAINER_ID: "luxeva-auth-container",
        SESSION_DURATION_HOURS: 24
    };

    let state = {
        savedEmail: "",
        currentStage: "email",
        uiElements: {}
    };

    const Storage = {
        load() {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!raw) return null;
            try { return JSON.parse(raw); } catch (e) { this.clear(); return null; }
        },
        save(email) {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
                email, isLoggedIn: true, loginTime: new Date().toISOString()
            }));
        },
        clear() { localStorage.removeItem(CONFIG.STORAGE_KEY); },
        isValid(sessionData) {
            if (!sessionData || !sessionData.isLoggedIn || !sessionData.loginTime) return false;
            const login = new Date(sessionData.loginTime);
            if (isNaN(login.getTime())) return false;
            return (new Date() - login) / 36e5 < CONFIG.SESSION_DURATION_HOURS;
        }
    };

    function showAlert(message, type = "error") {
        const box = state.uiElements.alertBox;
        box.textContent = message;
        box.className = `auth-alert auth-alert-${type}`;
        box.style.display = "block";
    }
    function hideAlert() { if (state.uiElements.alertBox) state.uiElements.alertBox.style.display = "none"; }
    function showSpinner(b, s, t, txt) {
        state.uiElements[b].disabled = true;
        state.uiElements[s].style.display = "inline-block";
        state.uiElements[t].textContent = txt;
    }
    function hideSpinner(b, s, t, txt) {
        state.uiElements[b].disabled = false;
        state.uiElements[s].style.display = "none";
        state.uiElements[t].textContent = txt;
    }
    function switchStage(stage) {
        const stages = { email: state.uiElements.stageEmail, otp: state.uiElements.stageOtp, success: state.uiElements.stageSuccess };
        Object.values(stages).forEach(el => el.style.display = "none");
        stages[stage].style.display = "block";
        state.currentStage = stage;
        hideAlert();
    }

    function injectStyles() {
        if (document.getElementById("luxeva-auth-styles")) return;
        const style = document.createElement("style");
        style.id = "luxeva-auth-styles";
        style.textContent = `
            .auth-card { background:#fff; padding:2.5rem 2rem; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.05); width:100%; max-width:380px; text-align:center; border:1px solid #e2e8f0; font-family:system-ui; direction:rtl; }
            .auth-title { font-size:1.35rem; font-weight:700; color:#0f172a; margin-bottom:0.5rem; }
            .auth-subtitle { font-size:0.875rem; color:#64748b; margin-bottom:2rem; }
            .auth-group { margin-bottom:1.25rem; text-align:right; }
            .auth-label { display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:0.5rem; }
            .auth-input { width:100%; padding:0.75rem; border:1px solid #cbd5e1; border-radius:8px; font-size:1rem; direction:ltr; text-align:left; background:#f8fafc; }
            .auth-input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 4px rgba(37,99,235,0.1); }
            .auth-btn { width:100%; padding:0.75rem; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:0.5rem; }
            .auth-btn:hover { background:#1d4ed8; }
            .auth-btn:disabled { background:#94a3b8; cursor:not-allowed; }
            .auth-alert { font-size:0.85rem; margin-top:1rem; padding:0.65rem; border-radius:6px; display:none; text-align:right; }
            .auth-alert-error { background:#fee2e2; color:#991b1b; border-right:4px solid #dc2626; }
            .auth-alert-info { background:#e0f2fe; color:#0369a1; border-right:4px solid #0284c7; }
            .auth-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:auth-spin 0.8s linear infinite; display:none; }
            @keyframes auth-spin { to{transform:rotate(360deg);} }
            .success-checkmark { width:56px; height:56px; margin:0 auto 1rem; background:#dcfce7; color:#16a34a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.75rem; }
            .logout-btn { background:#ef4444; margin-top:15px; }
            .logout-btn:hover { background:#dc2626; }
        `;
        document.head.appendChild(style);
    }

    function createContainer() {
        let c = document.getElementById(CONFIG.CONTAINER_ID);
        if (!c) {
            c = document.createElement("div");
            c.id = CONFIG.CONTAINER_ID;
            c.style.cssText = "display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc;";
            document.body.appendChild(c);
        }
        return c;
    }

    function buildUI(container) {
        container.innerHTML = `
            <div class="auth-card">
                <div id="auth-stage-email">
                    <h3 class="auth-title">بوابة تسجيل الدخول</h3>
                    <p class="auth-subtitle">أدخل بريدك الإلكتروني لاستلام رمز تحقق مؤقت (OTP).</p>
                    <div class="auth-group"><label class="auth-label">البريد الإلكتروني</label><input type="email" id="auth-email-input" class="auth-input" placeholder="username@example.com"></div>
                    <button id="auth-btn-send" class="auth-btn"><span class="auth-spinner" id="auth-spin-send"></span><span id="auth-text-send">إرسال رمز التحقق</span></button>
                </div>
                <div id="auth-stage-otp" style="display:none;">
                    <h3 class="auth-title">التحقق من الهوية</h3>
                    <p class="auth-subtitle">أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك.</p>
                    <div class="auth-group"><label class="auth-label">رمز التحقق</label><input type="text" id="auth-otp-input" class="auth-input" placeholder="000000" maxlength="6" style="text-align:center; letter-spacing:4px; font-weight:bold;"></div>
                    <button id="auth-btn-verify" class="auth-btn" style="background:#16a34a;"><span class="auth-spinner" id="auth-spin-verify"></span><span id="auth-text-verify">تأكيد الدخول</span></button>
                </div>
                <div id="auth-stage-success" style="display:none;">
                    <div class="success-checkmark">✓</div>
                    <h3 class="auth-title" style="color:#16a34a;">تم الدخول بنجاح</h3>
                    <p class="auth-subtitle" id="auth-success-msg">مرحباً بك! تم التحقق من هويتك بنجاح.</p>
                    <button id="auth-btn-logout" class="auth-btn logout-btn">تسجيل خروج</button>
                </div>
                <div id="auth-alert-box" class="auth-alert"></div>
            </div>
        `;
        state.uiElements = {
            stageEmail: document.getElementById("auth-stage-email"),
            stageOtp: document.getElementById("auth-stage-otp"),
            stageSuccess: document.getElementById("auth-stage-success"),
            emailInput: document.getElementById("auth-email-input"),
            otpInput: document.getElementById("auth-otp-input"),
            btnSend: document.getElementById("auth-btn-send"),
            btnVerify: document.getElementById("auth-btn-verify"),
            btnLogout: document.getElementById("auth-btn-logout"),
            spinSend: document.getElementById("auth-spin-send"),
            spinVerify: document.getElementById("auth-spin-verify"),
            textSend: document.getElementById("auth-text-send"),
            textVerify: document.getElementById("auth-text-verify"),
            alertBox: document.getElementById("auth-alert-box"),
            successMsg: document.getElementById("auth-success-msg")
        };
    }

    async function apiGenerateOTP(email) {
        const res = await fetch(`${CONFIG.API_URL}?action=generate&email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error("Network error");
        return res.json();
    }
    async function apiVerifyOTP(email, otp) {
        const res = await fetch(`${CONFIG.API_URL}?action=verify&email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
        if (!res.ok) throw new Error("Network error");
        return res.json();
    }

    function loadSessionAndCheck() {
        const session = Storage.load();
        if (!session || !Storage.isValid(session)) { Storage.clear(); return false; }
        state.savedEmail = session.email;
        const params = new URLSearchParams(window.location.search);
        const returnPage = params.get("return");
        if (returnPage) {
            window.location.replace(decodeURIComponent(returnPage));
            return true;
        }
        showSuccessStage(`مرحباً بعودتك! (${session.email})`);
        return true;
    }

    function saveSession(email) { Storage.save(email); }
    function logout() {
        Storage.clear();
        state.savedEmail = "";
        if (state.uiElements.emailInput) state.uiElements.emailInput.value = "";
        if (state.uiElements.otpInput) state.uiElements.otpInput.value = "";
        switchStage("email");
    }

    function redirectAfterLogin() {
        const params = new URLSearchParams(window.location.search);
        const returnPage = params.get("return");
        if (returnPage && returnPage.trim() !== "") {
            window.location.replace(decodeURIComponent(returnPage));
        } else {
            showSuccessStage("مرحباً بك! تم التحقق من هويتك بنجاح.");
        }
    }

    function showSuccessStage(message) {
        if (message && state.uiElements.successMsg) state.uiElements.successMsg.textContent = message;
        switchStage("success");
    }

    function bindEvents() {
        const e = state.uiElements;
        e.btnSend.addEventListener("click", async () => {
            const email = e.emailInput.value.trim();
            if (!email || !email.includes("@")) { showAlert("بريد إلكتروني غير صحيح."); return; }
            hideAlert(); showSpinner("btnSend","spinSend","textSend","جاري الإرسال...");
            try {
                const data = await apiGenerateOTP(email);
                hideSpinner("btnSend","spinSend","textSend","إرسال رمز التحقق");
                if (data.status === "success") {
                    state.savedEmail = email;
                    switchStage("otp");
                    showAlert("تم الإرسال! تفقد بريدك.", "info");
                } else showAlert(data.message || "خطأ غير متوقع.");
            } catch (err) {
                hideSpinner("btnSend","spinSend","textSend","إرسال رمز التحقق");
                showAlert("تعذر الاتصال بالخادم.");
            }
        });

        e.btnVerify.addEventListener("click", async () => {
            const otp = e.otpInput.value.trim();
            if (!otp || otp.length < 5) { showAlert("أدخل رمز التحقق كاملاً."); return; }
            hideAlert(); showSpinner("btnVerify","spinVerify","textVerify","جاري التحقق...");
            try {
                const data = await apiVerifyOTP(state.savedEmail, otp);
                hideSpinner("btnVerify","spinVerify","textVerify","تأكيد الدخول");
                if (data.status === "success") {
                    saveSession(state.savedEmail);
                    redirectAfterLogin();
                } else showAlert(data.message || "الرمز غير صحيح.");
            } catch (err) {
                hideSpinner("btnVerify","spinVerify","textVerify","تأكيد الدخول");
                showAlert("تعذر التحقق، حاول مجدداً.");
            }
        });

        e.btnLogout.addEventListener("click", logout);
    }

    function init() {
        injectStyles();
        buildUI(createContainer());
        bindEvents();
        loadSessionAndCheck();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
