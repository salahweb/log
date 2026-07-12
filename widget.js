(function () {
    // ============================================================
    //  الحماية من التحميل المزدوج
    // ============================================================
    if (window.__LUXEVA_WIDGET__) return;
    window.__LUXEVA_WIDGET__ = true;

    // ============================================================
    //  الإعدادات المركزية (Config)
    // ============================================================
    const CONFIG = {
        API_URL: "https://script.google.com/macros/s/AKfycbzxEIb1BsVa-sG7kbmLGSBr65V2b8gHP39ixosiWIXeXRjZSw19sTFFe7imZTgQnvQ/exec",
        STORAGE_KEY: "luxevaAuthData",          // مفتاح موحد مع صفحة الحراسة
        CONTAINER_ID: "luxeva-auth-container",   // معرّف الحاوية الموحد
        SESSION_DURATION_HOURS: 24               // مدة صلاحية الجلسة
    };

    // ============================================================
    //  الحالة الداخلية (State)
    // ============================================================
    let state = {
        savedEmail: "",
        currentStage: "email", // email | otp | success
        uiElements: {}         // سنخزن مراجع العناصر هنا
    };

    // ============================================================
    //  أدوات التخزين المحلي (Storage)
    // ============================================================
    const Storage = {
        load() {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!raw) return null;
            try {
                const data = JSON.parse(raw);
                return data;
            } catch (e) {
                this.clear();
                return null;
            }
        },
        save(email) {
            const session = {
                email: email,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(session));
        },
        clear() {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        },
        isValid(sessionData) {
            if (!sessionData || !sessionData.isLoggedIn || !sessionData.loginTime) return false;
            const login = new Date(sessionData.loginTime);
            if (isNaN(login.getTime())) return false;
            const now = new Date();
            const diffHours = (now - login) / (1000 * 60 * 60);
            return diffHours < CONFIG.SESSION_DURATION_HOURS;
        }
    };

    // ============================================================
    //  وظائف المساعدة (Helpers)
    // ============================================================
    function showAlert(message, type = "error") {
        const box = state.uiElements.alertBox;
        box.textContent = message;
        box.className = `auth-alert auth-alert-${type}`;
        box.style.display = "block";
    }

    function hideAlert() {
        if (state.uiElements.alertBox) {
            state.uiElements.alertBox.style.display = "none";
        }
    }

    function showSpinner(buttonId, spinnerId, textId, text) {
        const btn = state.uiElements[buttonId];
        const spin = state.uiElements[spinnerId];
        const txt = state.uiElements[textId];
        if (btn) btn.disabled = true;
        if (spin) spin.style.display = "inline-block";
        if (txt) txt.textContent = text;
    }

    function hideSpinner(buttonId, spinnerId, textId, text) {
        const btn = state.uiElements[buttonId];
        const spin = state.uiElements[spinnerId];
        const txt = state.uiElements[textId];
        if (btn) btn.disabled = false;
        if (spin) spin.style.display = "none";
        if (txt) txt.textContent = text;
    }

    function switchStage(stage) {
        const stages = {
            email: state.uiElements.stageEmail,
            otp: state.uiElements.stageOtp,
            success: state.uiElements.stageSuccess
        };
        Object.values(stages).forEach(el => { if (el) el.style.display = "none"; });
        if (stages[stage]) stages[stage].style.display = "block";
        state.currentStage = stage;
        hideAlert();
    }

    // ============================================================
    //  واجهة المستخدم (UI) - الإنشاء مرة واحدة فقط
    // ============================================================
    function injectStyles() {
        if (document.getElementById("luxeva-auth-styles")) return; // منع التكرار
        const style = document.createElement("style");
        style.id = "luxeva-auth-styles";
        style.textContent = `
            .auth-card {
                background: #ffffff;
                padding: 2.5rem 2rem;
                border-radius: 16px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                width: 100%;
                max-width: 380px;
                text-align: center;
                border: 1px solid #e2e8f0;
                box-sizing: border-box;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                direction: rtl;
            }
            .auth-title { font-size: 1.35rem; font-weight: 700; color: #0f172a; margin: 0 0 0.5rem 0; }
            .auth-subtitle { font-size: 0.875rem; color: #64748b; margin: 0 0 2rem 0; line-height: 1.5; }
            .auth-group { margin-bottom: 1.25rem; text-align: right; }
            .auth-label { display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.5rem; }
            .auth-input {
                width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem;
                transition: all 0.2s ease; box-sizing: border-box; direction: ltr; text-align: left; background-color: #f8fafc;
            }
            .auth-input:focus { outline: none; border-color: #2563eb; background-color: #ffffff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
            .auth-btn {
                width: 100%; padding: 0.75rem 1rem; background-color: #2563eb; color: #ffffff; border: none; border-radius: 8px;
                font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: center;
                align-items: center; gap: 0.5rem; box-sizing: border-box;
            }
            .auth-btn:hover { background-color: #1d4ed8; }
            .auth-btn:disabled { background-color: #94a3b8; cursor: not-allowed; }
            .auth-alert { font-size: 0.85rem; margin-top: 1rem; padding: 0.65rem 0.75rem; border-radius: 6px; display: none; text-align: right; line-height: 1.4; }
            .auth-alert-error { background-color: #fee2e2; color: #991b1b; border-right: 4px solid #dc2626; }
            .auth-alert-info { background-color: #e0f2fe; color: #0369a1; border-right: 4px solid #0284c7; }
            .auth-spinner {
                width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
                border-top-color: #fff; animation: auth-spin 0.8s linear infinite; display: none;
            }
            @keyframes auth-spin { to { transform: rotate(360deg); } }
            .success-checkmark { width: 56px; height: 56px; margin: 0 auto 1rem; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
            .logout-btn { background-color: #ef4444; margin-top: 15px; }
            .logout-btn:hover { background-color: #dc2626; }
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
                    <p class="auth-subtitle">أدخل بريدك الإلكتروني لاستلام رمز تحقق مؤقت (OTP) للوصول الآمن.</p>
                    <div class="auth-group">
                        <label class="auth-label">البريد الإلكتروني</label>
                        <input type="email" id="auth-email-input" class="auth-input" placeholder="username@example.com" required>
                    </div>
                    <button id="auth-btn-send" class="auth-btn">
                        <span class="auth-spinner" id="auth-spin-send"></span>
                        <span id="auth-text-send">إرسال رمز التحقق</span>
                    </button>
                </div>

                <div id="auth-stage-otp" style="display: none;">
                    <h3 class="auth-title">التحقق من الهوية</h3>
                    <p class="auth-subtitle">أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني.</p>
                    <div class="auth-group">
                        <label class="auth-label">رمز التحقق (OTP)</label>
                        <input type="text" id="auth-otp-input" class="auth-input" placeholder="000000" maxlength="6" style="text-align: center; letter-spacing: 4px; font-weight: bold;">
                    </div>
                    <button id="auth-btn-verify" class="auth-btn" style="background-color: #16a34a;">
                        <span class="auth-spinner" id="auth-spin-verify"></span>
                        <span id="auth-text-verify">تأكيد الدخول</span>
                    </button>
                </div>

                <div id="auth-stage-success" style="display: none;">
                    <div class="success-checkmark">✓</div>
                    <h3 class="auth-title" style="color: #16a34a;">تم الدخول بنجاح</h3>
                    <p class="auth-subtitle" id="auth-success-msg">مرحباً بك! تم التحقق من هويتك بنجاح وجاري إعداد الجلسة.</p>
                    <button id="auth-btn-logout" class="auth-btn logout-btn">تسجيل خروج</button>
                </div>

                <div id="auth-alert-box" class="auth-alert"></div>
            </div>
        `;

        // تخزين المراجع للاستخدام السريع
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

    // ============================================================
    //  الاتصال بالخادم (API)
    // ============================================================
    async function apiGenerateOTP(email) {
        const url = `${CONFIG.API_URL}?action=generate&email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network error");
        return await res.json();
    }

    async function apiVerifyOTP(email, otp) {
        const url = `${CONFIG.API_URL}?action=verify&email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network error");
        return await res.json();
    }

    // ============================================================
    //  إدارة الجلسة (Session)
    // ============================================================
    function loadSessionAndCheck() {
        const session = Storage.load();
        if (session && Storage.isValid(session)) {
            state.savedEmail = session.email;
            showSuccessStage(`مرحباً بعودتك! (${session.email})`);
            return true;
        } else {
            Storage.clear(); // جلسة منتهية أو تالفة
            return false;
        }
    }

    function saveSession(email) {
        Storage.save(email);
    }

    function logout() {
        Storage.clear();
        state.savedEmail = "";
        if (state.uiElements.emailInput) state.uiElements.emailInput.value = "";
        if (state.uiElements.otpInput) state.uiElements.otpInput.value = "";
        switchStage("email");
    }

    // ============================================================
    //  إعادة التوجيه (Redirect)
    // ============================================================
    function redirectAfterLogin() {
        const params = new URLSearchParams(window.location.search);
        const returnPage = params.get("return");
        if (returnPage) {
            window.location.replace(decodeURIComponent(returnPage));
        } else {
            showSuccessStage("مرحباً بك! تم التحقق من هويتك بنجاح.");
        }
    }

    function showSuccessStage(message) {
        if (message && state.uiElements.successMsg) {
            state.uiElements.successMsg.textContent = message;
        }
        switchStage("success");
    }

    // ============================================================
    //  ربط الأحداث (Event binding)
    // ============================================================
    function bindEvents() {
        const els = state.uiElements;

        // إرسال OTP
        els.btnSend.addEventListener("click", async () => {
            const email = els.emailInput.value.trim();
            if (!email || !email.includes("@")) {
                showAlert("يرجى إدخال بريد إلكتروني صحيح.");
                return;
            }
            hideAlert();
            showSpinner("btnSend", "spinSend", "textSend", "جاري إرسال الرمز...");
            try {
                const data = await apiGenerateOTP(email);
                hideSpinner("btnSend", "spinSend", "textSend", "إرسال رمز التحقق");
                if (data.status === "success") {
                    state.savedEmail = email;
                    switchStage("otp");
                    showAlert("تم إرسال الرمز بنجاح! تفقد بريدك الوارد.", "info");
                } else {
                    showAlert(data.message || "حدث خطأ غير متوقع.");
                }
            } catch (err) {
                hideSpinner("btnSend", "spinSend", "textSend", "إرسال رمز التحقق");
                showAlert("تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.");
                console.error(err);
            }
        });

        // التحقق من OTP
        els.btnVerify.addEventListener("click", async () => {
            const otp = els.otpInput.value.trim();
            if (!otp || otp.length < 5) {
                showAlert("يرجى إدخال رمز التحقق بالكامل.");
                return;
            }
            hideAlert();
            showSpinner("btnVerify", "spinVerify", "textVerify", "جاري التحقق...");
            try {
                const data = await apiVerifyOTP(state.savedEmail, otp);
                hideSpinner("btnVerify", "spinVerify", "textVerify", "تأكيد الدخول");
                if (data.status === "success") {
                    saveSession(state.savedEmail);
                    redirectAfterLogin();
                } else {
                    showAlert(data.message || "الرمز غير صحيح، حاول مرة أخرى.");
                }
            } catch (err) {
                hideSpinner("btnVerify", "spinVerify", "textVerify", "تأكيد الدخول");
                showAlert("تعذر التحقق من الرمز بسبب مشكلة في الشبكة. حاول مرة أخرى.");
                console.error(err);
            }
        });

        // تسجيل الخروج
        els.btnLogout.addEventListener("click", () => {
            logout();
        });
    }

    // ============================================================
    //  بدء التشغيل (Init)
    // ============================================================
    function init() {
        injectStyles();
        const container = createContainer();
        buildUI(container);
        bindEvents();

        // تحقق من وجود جلسة سابقة صالحة
        loadSessionAndCheck();
        // إذا لم توجد جلسة صالحة نبقى على مرحلة البريد (الافتراضية)
    }

    // شغّل عند اكتمال تحميل الصفحة
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
