'use strict';

// ===== 인증 시스템 =====
// 책임: 사용자 등록·로그인·로그아웃, localStorage/sessionStorage 관리
const Auth = {
    STORAGE_KEY: 'tetless_users',
    SESSION_KEY: 'tetless_session',

    getUsers() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    },

    saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    },

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem(this.SESSION_KEY) || 'null');
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(
            (u) => u.email === email && u.password === password
        );
        if (!user)
            return {
                ok: false,
                msg: '이메일 또는 비밀번호가 올바르지 않습니다.',
            };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
        return { ok: true, user };
    },

    signup(nickname, email, password) {
        if (!nickname || nickname.length < 2)
            return { ok: false, msg: '닉네임은 2자 이상이어야 합니다.' };
        if (!email.includes('@'))
            return { ok: false, msg: '올바른 이메일을 입력하세요.' };
        if (password.length < 6)
            return { ok: false, msg: '비밀번호는 6자 이상이어야 합니다.' };
        const users = this.getUsers();
        if (users.find((u) => u.email === email))
            return { ok: false, msg: '이미 사용중인 이메일입니다.' };
        const user = { nickname, email, password };
        users.push(user);
        this.saveUsers(users);
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
        return { ok: true, user };
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
    },
};
