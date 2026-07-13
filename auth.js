// auth.js – مكتبة الجلسة المشتركة
(function(global) {
    const STORAGE_KEY = "luxevaAuthData";
    const SESSION_DURATION_HOURS = 24;

    const Auth = {
        load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                this.clear();
                return null;
            }
        },
        save(email) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                email: email,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            }));
        },
        clear() {
            localStorage.removeItem(STORAGE_KEY);
        },
        isValid(session) {
            if (!session || !session.isLoggedIn || !session.loginTime) return false;
            const login = new Date(session.loginTime);
            if (isNaN(login.getTime())) return false;
            const diffHours = (Date.now() - login.getTime()) / 3600000;
            return diffHours < SESSION_DURATION_HOURS;
        },
        isAuthenticated() {
            const session = this.load();
            return session && this.isValid(session);
        }
    };

    global.Auth = Auth;
})(window);
