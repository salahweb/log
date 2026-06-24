(function() {
    // الرابط الفعلي الخاص بك الذي أرفقته لربط العمليات بالخلفية
    const API_URL = "https://script.google.com/macros/s/AKfycbzxEIb1BsVa-sG7kbmLGSBr65V2b8gHP39ixosiWIXeXRjZSw19sTFFe7imZTgQnvQ/exec";

    // 1. التحقق من وجود الحاوية في الصفحة المضيفة
    const container = document.getElementById("auth-widget-container");
    if (!container) {
        console.error("نظام التحقق: لم يتم العثور على العنصر <div id='auth-widget-container'></div> في الصفحة.");
        return;
    }

    // 2. حقن التنسيقات الاحترافية (CSS) ديناميكياً في رأس الصفحة لضمان عدم تأثر الويدجت بتنسيقات الموقع الخارجية
    const style = document.createElement('style');
    style.innerHTML = `
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
        }
        .auth-title {
            font-size: 1.35rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 0.5rem 0;
        }
        .auth-subtitle {
            font-size: 0.875rem;
            color: #64748b;
            margin: 0 0 2rem 0;
            line-height: 1.5;
        }
        .auth-group {
            margin-bottom: 1.25rem;
            text-align: right;
        }
        .auth-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
            margin-bottom: 0.5rem;
        }
        .auth-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.2s ease;
            box-sizing: border-box;
            direction: ltr;
            text-align: left;
            background-color: #f8fafc;
        }
        .auth-input:focus {
            outline: none;
            border-color: #2563eb;
            background-color: #ffffff;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }
        .auth-btn {
            width: 100%;
            padding: 0.75rem 1rem;
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            box-sizing: border-box;
        }
        .auth-btn:hover {
            background-color: #1d4ed8;
        }
        .auth-btn:disabled {
            background-color: #94a3b8;
            cursor: not-allowed;
        }
        .auth-alert {
            font-size: 0.85rem;
            margin-top: 1rem;
            padding: 0.65rem 0.75rem;
            border-radius: 6px;
            display: none;
            text-align: right;
            line-height: 1.4;
        }
        .auth-alert-error {
            background-color: #fee2e2;
            color: #991b1b;
            border-right: 4px solid #dc2626;
        }
        .auth-alert-info {
            background-color: #e0f2fe;
            color: #0369a1;
            border-right: 4px solid #0284c7;
        }
        .auth-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: auth-spin 0.8s linear infinite;
            display: none;
        }
        @keyframes auth-spin {
            to { transform: rotate(360deg); }
        }
        .success-checkmark {
            width: 56px;
            height: 56px;
            margin: 0 auto 1rem;
            background: #dcfce7;
            color: #16a34a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
        }
    `;
    document.head.appendChild(style);

    // 3. بناء هيكل الواجهة الأساسي داخل الكرت
    container.innerHTML = `
        <div class="auth-card">
            <div id="auth-stage-email">
                <h3 class="auth-title">تسجيل الدخول الآمن</h3>
                <p class="auth-subtitle">أدخل بريدك الإلكتروني نرسل لك رمز تحقق مؤقت (OTP) للوصول الفوري.</p>
                
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
                <p class="auth-subtitle">تم إرسال رمز مكون من 6 أرقام إلى صندوق بريدك الوارد.</p>
                
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
                <p class="auth-subtitle">مرحباً بك! جاري توجيهك إلى لوحة التحكم الخاصة بك الفكرة تعمل بكفاءة.</p>
            </div>

            <div id="auth-alert-box" class="auth-alert"></div>
        </div>
    `;

    // 4. تعريف عناصر عناصر التحكم
    const stageEmail = document.getElementById("auth-stage-email");
    const stageOtp = document.getElementById("auth-stage-otp");
    const stageSuccess = document.getElementById("auth-stage-success");
    
    const emailInput = document.getElementById("auth-email-input");
    const otpInput = document.getElementById("auth-otp-input");
    
    const btnSend = document.getElementById("auth-btn-send");
    const btnVerify = document.getElementById("auth-btn-verify");
    
    const spinSend = document.getElementById("auth-spin-send");
    const spinVerify = document.getElementById("auth-spin-verify");
    
    const textSend = document.getElementById("auth-text-send");
    const textVerify = document.getElementById("auth-text-verify");
    
    const alertBox = document.getElementById("auth-alert-box");

    let savedEmail = "";

    // دالة مساعدة لإظهار التنبيهات
    function showAlert(message, type = "error") {
        alertBox.innerText = message;
        alertBox.className = `auth-alert auth-alert-${type}`;
        alertBox.style.display = "block";
    }
    
    function hideAlert() {
        alertBox.style.display = "none";
    }

    // 5. حدث إرسال الرمز (Stage 1)
    btnSend.addEventListener("click", function() {
        savedEmail = emailInput.value.trim();
        if (!savedEmail || !savedEmail.includes("@")) {
            showAlert("يرجى إدخال بريد إلكتروني صحيح.");
            return;
        }

        hideAlert();
        btnSend.disabled = true;
        spinSend.style.display = "block";
        textSend.innerText = "جاري إرسال الرمز...";

        fetch(`${API_URL}?action=generate&email=${encodeURIComponent(savedEmail)}`)
            .then(res => res.json())
            .then(data => {
                btnSend.disabled = false;
                spinSend.style.display = "none";
                textSend.innerText = "إرسال رمز التحقق";

                if (data.status === "success") {
                    stageEmail.style.display = "none";
                    stageOtp.style.display = "block";
                    showAlert("تم إرسال الرمز بنجاح! تفقد صندوق الرسائل أو البريد المهمل.", "info");
                } else {
                    showAlert(data.message || "حدث خطأ غير متوقع أثناء إرسال الرمز.");
                }
            })
            .catch(err => {
                btnSend.disabled = false;
                spinSend.style.display = "none";
                textSend.innerText = "إرسال رمز التحقق";
                showAlert("فشل الاتصال بالخادم الخلفي، تحقق من نشر السكريبت بشكل صحيح.");
                console.error(err);
            });
    });

    // 6. حدث التحقق من الرمز (Stage 2)
    btnVerify.addEventListener("click", function() {
        const otpCode = otpInput.value.trim();
        if (!otpCode || otpCode.length < 5) {
            showAlert("يرجى إدخال رمز التحقق بالكامل.");
            return;
        }

        hideAlert();
        btnVerify.disabled = true;
        spinVerify.style.display = "block";
        textVerify.innerText = "جاري التحقق...";

        fetch(`${API_URL}?action=verify&email=${encodeURIComponent(savedEmail)}&otp=${encodeURIComponent(otpCode)}`)
            .then(res => res.json())
            .then(data => {
                btnVerify.disabled = false;
                spinVerify.style.display = "none";
                textVerify.innerText = "تأكيد الدخول";

                if (data.status === "success") {
                    stageOtp.style.display = "none";
                    stageSuccess.style.display = "block";
                    hideAlert();
                    
                    // تحويل المستخدم بعد نجاح الدخول (يمكنك تعديل الرابط هنا لاحقاً)
                    /* setTimeout(() => {
                        window.location.href = "dashboard.html"; 
                    }, 2500);
                    */
                } else {
                    showAlert(data.message || "الرمز غير صحيح، حاول مرة أخرى.");
                }
            })
            .catch(err => {
                btnVerify.disabled = false;
                spinVerify.style.display = "none";
                textVerify.innerText = "تأكيد الدخول";
                showAlert("حدث خطأ أثناء محاولة الاتصال بالخادم للتحقق.");
                console.error(err);
            });
    });
})();
