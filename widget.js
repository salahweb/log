// widget.js – واجهة تسجيل الدخول
(function() {
    if (window.__LUXEVA_WIDGET__) return;
    window.__LUXEVA_WIDGET__ = true;

    // ====== التأكد من وجود Auth ======
    if (typeof Auth === "undefined") {
        document.body.innerHTML = `
            <div style="text-align:center; padding:2rem; font-family:system-ui,sans-serif;">
                <h2>خطأ في تحميل النظام</h2>
                <p>يرجى تحديث الصفحة أو الاتصال بمدير الموقع.</p>
            </div>`;
        return;
    }

    const CONFIG = {
        API_URL: "https://script.google.com/macros/s/AKfycbzxEIb1BsVa-sG7kbmLGSBr65V2b8gHP39ixosiWIXeXRjZSw19sTFFe7imZTgQnvQ/exec",
        CONTAINER_ID: "luxeva-auth-container"
    };

    let state = {
        savedEmail: "",
        uiElements: {}
    };

    // ---------- دوال واجهة المستخدم ----------
    function showAlert(msg, type = "error") {
        const box = state.uiElements.alertBox;
        if (!box) return;
        box.textContent = msg;
        box.className = `auth-alert auth-alert-${type}`;
        box.style.display = "block";
    }
    function hideAlert() {
        if (state.uiElements.alertBox) state.uiElements.alertBox.style.display = "none";
    }
    function toggleSpinner(btnId, spinId, textId, text, disable) {
        const btn = state.uiElements[btnId], spin = state.uiElements[spinId], txt = state.uiElements[textId];
        if (btn) btn.disabled = disable;
        if (spin) spin.style.display = disable ? "inline-block" : "none";
        if (txt) txt.textContent = text;
    }
    function switchStage(stage) {
        ["stageEmail", "stageOtp", "stageSuccess"].forEach(id => {
            const el = state.uiElements[id];
            if (el) el.style.display = "none";
        });
        const target = state.uiElements[stage === "email" ? "stageEmail" : stage === "otp" ? "stageOtp" : "stageSuccess"];
        if (target) target.style.display = "block";
        hideAlert();
    }

    // ---------- حقن التنسيقات ----------
    function injectStyles() {
        if (document.getElementById("luxeva-auth-styles")) return;
        const style = document.createElement("style");
        style.id = "luxeva-auth-styles";
        style.textContent = `
            .auth-card { background:#fff; padding:2.5rem 2rem; border-radius:16px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05),0 8px 10px -6px rgba(0,0,0,0.05); width:100%; max-width:380px; text-align:center; border:1px solid #e2e8f0; box-sizing:border-box; font-family:system-ui,sans-serif; direction:rtl; }
            .auth-title { font-size:1.35rem; font-weight:700; color:#0f172a; margin:0 0 0.5rem 0; }
            .auth-subtitle { font-size:0.875rem; color:#64748b; margin:0 0 2rem 0; line-height:1.5; }
            .auth-group { margin-bottom:1.25rem; text-align:right; }
            .auth-label { display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:0.5rem; }
            .auth-input { width:100%; padding:0.75rem 1rem; border:1px solid #cbd5e1; border-radius:8px; font-size:1rem; transition:all 0.2s ease; box-sizing:border-box; direction:ltr; text-align:left; background:#f8fafc; }
            .auth-input:focus { outline:none; border-color:#2563eb; background:#fff; box-shadow:0 0 0 4px rgba(37,99,235,0.1); }
            .auth-btn { width:100%; padding:0.75rem 1rem; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:0.95rem; font-weight:600; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:0.5rem; }
            .auth-btn:hover { background:#1d4ed8; }
            .auth-btn:disabled { background:#94a3b8; cursor:not-allowed; }
            .auth-alert { font-size:0.85rem; margin-top:1rem; padding:0.65rem 0.75rem; border-radius:6px; display:none; text-align:right; }
            .auth-alert-error { background:#fee2e2; color:#991b1b; border-right:4px solid #dc2626; }
            .auth-alert-info { background:#e0f2fe; color:#0369a1; border-right:4px solid #0284c7; }
            .auth-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-radius:50%; border-top-color:#fff; animation:auth-spin 0.8s linear infinite; display:none; }
            @keyframes auth-spin { to { transform:rotate(360deg); } }
            .success-checkmark { width:56px; height:56px; margin:0 auto 1rem; background:#dcfce7; color:#16a34a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.75rem; }
            .logout-btn { background:#ef4444; margin-top:15px; }
            .logout-btn:hover { background:#dc2626; }
        `;
        document.head.appendChild(style);
    }

    function createContainer() {
        let container = document.getElementById(CONFIG.CONTAINER_ID);
        if (!container) {
            container = document.createElement("div");
            container.id = CONFIG.CONTAINER_ID;
            container.style.cssText = "display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f8fafc; margin: 0;";
            document.body.appendChild(container);
        }
        return container;
    }

    function buildUI(container) {
        container.innerHTML = `
            <div class="auth-card">
                <div id="auth-stage-email">
                    <h3 class="auth-title">بوابة تسجيل الدخول</h3>
                    <p class="auth-subtitle">أدخل بريدك الإلكتروني لاستلام رمز تحقق مؤقت (OTP).</p>
                    <div class="auth-group">
                        <label class="auth-label">البريد الإلكتروني</label>
                        <input type="email" id="auth-email-input" class="auth-input" placeholder="username@example.com" required>
                    </div>
                    <button id="auth-btn-send" class="auth-btn">
                        <span class="auth-spinner" id="auth-spin-send"></span>
                        <span id="auth-text-send">إرسال رمز التحقق</span>
                    </button>
                </div>
                <div id="auth-stage-otp" style="display:none;">
                    <h3 class="auth-title">التحقق من الهوية</h3>
                    <p class="auth-subtitle">أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك.</p>
                    <div class="auth-group">
                        <label class="auth-label">رمز التحقق (OTP)</label>
                        <input type="text" id="auth-otp-input" class="auth-input" placeholder="000000" maxlength="6" style="text-align:center; letter-spacing:4px; font-weight:bold;">
                    </div>
                    <button id="auth-btn-verify" class="auth-btn" style="background:#16a34a;">
                        <span class="auth-spinner" id="auth-spin-verify"></span>
                        <span id="auth-text-verify">تأكيد الدخول</span>
                    </button>
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
            stageEmail: container.querySelector("#auth-stage-email"),
            stageOtp: container.querySelector("#auth-stage-otp"),
            stageSuccess: container.querySelector("#auth-stage-success"),
            emailInput: container.querySelector("#auth-email-input"),
            otpInput: container.querySelector("#auth-otp-input"),
            btnSend: container.querySelector("#auth-btn-send"),
            btnVerify: container.querySelector("#auth-btn-verify"),
            btnLogout: container.querySelector("#auth-btn-logout"),
            spinSend: container.querySelector("#auth-spin-send"),
            spinVerify: container.querySelector("#auth-spin-verify"),
            textSend: container.querySelector("#auth-text-send"),
            textVerify: container.querySelector("#auth-text-verify"),
            alertBox: container.querySelector("#auth-alert-box"),
            successMsg: container.querySelector("#auth-success-msg")
        };
    }

    // ---------- API ----------
    async function apiCall(action, email, otp = "") {
        const url = `${CONFIG.API_URL}?action=${action}&email=${encodeURIComponent(email)}${otp ? "&otp=" + encodeURIComponent(otp) : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network error");
        return await res.json();
    }

    // ---------- ربط الأحداث ----------
    function bindEvents() {
        const els = state.uiElements;
        els.btnSend.addEventListener("click", async () => {
            const email = els.emailInput.value.trim();
            if (!email.includes("@")) return showAlert("بريد إلكتروني غير صالح");
            toggleSpinner("btnSend", "spinSend", "textSend", "جاري الإرسال...", true);
            try {
                const data = await apiCall("generate", email);
                toggleSpinner("btnSend", "spinSend", "textSend", "إرسال رمز التحقق", false);
                if (data.status === "success") {
                    state.savedEmail = email;
                    switchStage("otp");
                    showAlert("تم إرسال الرمز، تفقد بريدك الوارد.", "info");
                } else {
                    showAlert(data.message || "فشل الإرسال");
                }
            } catch (e) {
                toggleSpinner("btnSend", "spinSend", "textSend", "إرسال رمز التحقق", false);
                showAlert("تعذر الاتصال بالخادم");
            }
        });

        els.btnVerify.addEventListener("click", async () => {
            const otp = els.otpInput.value.trim();
            if (otp.length < 5) return showAlert("أدخل الرمز كاملاً");
            toggleSpinner("btnVerify", "spinVerify", "textVerify", "جاري التحقق...", true);
            try {
                const data = await apiCall("verify", state.savedEmail, otp);
                toggleSpinner("btnVerify", "spinVerify", "textVerify", "تأكيد الدخول", false);
                if (data.status === "success") {
                    Auth.save(state.savedEmail);
                    const returnPage = new URLSearchParams(location.search).get("return");
                    if (returnPage) {
                        window.location.replace(decodeURIComponent(returnPage));
                    } else {
                        switchStage("success");
                    }
                } else {
                    showAlert(data.message || "رمز التحقق غير صحيح");
                }
            } catch (e) {
                toggleSpinner("btnVerify", "spinVerify", "textVerify", "تأكيد الدخول", false);
                showAlert("تعذر التحقق من الرمز بسبب مشكلة في الشبكة");
            }
        });

        els.btnLogout.addEventListener("click", () => {
            Auth.clear();
            state.savedEmail = "";
            els.emailInput.value = "";
            els.otpInput.value = "";
            switchStage("email");
        });
    }

    // ---------- بدء التشغيل ----------
    function init() {
        const session = Auth.load();
        if (session && Auth.isValid(session)) {
            const returnPage = new URLSearchParams(location.search).get("return");
            if (returnPage) {
                window.location.replace(decodeURIComponent(returnPage));
                return;
            }
        }

        injectStyles();
        buildUI(createContainer());
        bindEvents();

        if (session && Auth.isValid(session)) {
            state.savedEmail = session.email;
            state.uiElements.successMsg.textContent = `مرحباً بعودتك! (${session.email})`;
            switchStage("success");
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
