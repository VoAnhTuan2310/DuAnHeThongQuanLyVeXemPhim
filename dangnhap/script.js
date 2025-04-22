document.addEventListener('DOMContentLoaded', () => {
    // Các elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    const themeToggle = document.getElementById('theme-toggle');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const twoFactorModal = document.getElementById('twoFactorModal');
    const closeButtons = document.querySelectorAll('.close');
    const otpInputs = document.querySelectorAll('.otp-input');
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');

    // CSRF Token
    const csrfToken = generateCSRFToken();
    document.getElementById('csrf_token').value = csrfToken;

    // Dark Mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    }

    themeToggle.addEventListener('change', () => {
        const theme = themeToggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // Kiểm tra thông tin đăng nhập đã lưu
    const savedUsername = localStorage.getItem('savedUsername');
    const savedRemember = localStorage.getItem('rememberMe');

    if (savedUsername && savedRemember === 'true') {
        usernameInput.value = savedUsername;
        rememberCheckbox.checked = true;
    }

    // Xử lý hiển thị/ẩn mật khẩu
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePasswordBtn.innerHTML = `<i class="far fa-eye${type === 'password' ? '' : '-slash'}"></i>`;
    });

    // Đánh giá độ mạnh mật khẩu
    passwordInput.addEventListener('input', () => {
        const strength = evaluatePasswordStrength(passwordInput.value);
        updatePasswordStrengthIndicator(strength);
    });

    // Xử lý OTP inputs
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    // Xử lý form đăng nhập
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Validation
        if (!validateForm(username, password)) {
            return;
        }

        // Hiển thị loading
        const submitBtn = loginForm.querySelector('.login-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner');

        btnText.style.opacity = '0';
        spinner.style.display = 'block';
        submitBtn.disabled = true;

        try {
            // Mã hóa mật khẩu trước khi gửi
            const encryptedPassword = encryptPassword(password);

            // Giả lập call API
            await simulateAPICall({ username, password: encryptedPassword });

            // Lưu thông tin đăng nhập nếu được chọn
            if (rememberCheckbox.checked) {
                localStorage.setItem('savedUsername', username);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('savedUsername');
                localStorage.removeItem('rememberMe');
            }

            // Hiển thị modal 2FA
            showTwoFactorModal();
        } catch (error) {
            showToast('error', error.message);
        } finally {
            btnText.style.opacity = '1';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    });

    // Xử lý quên mật khẩu
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(forgotPasswordModal);
    });

    // Đóng modal
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            hideModal(modal);
        });
    });

    // Click bên ngoài để đóng modal
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });

    // Xử lý đăng nhập mạng xã hội
    document.querySelector('.google').addEventListener('click', () => {
        handleSocialLogin('google');
    });

    document.querySelector('.facebook').addEventListener('click', () => {
        handleSocialLogin('facebook');
    });
});

// Các hàm tiện ích
function generateCSRFToken() {
    return Math.random().toString(36).substring(2);
}

function evaluatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    return strength;
}

function updatePasswordStrengthIndicator(strength) {
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');

    const width = (strength / 5) * 100;
    let color = '#f44336';
    let text = 'Yếu';

    if (strength >= 4) {
        color = '#4caf50';
        text = 'Mạnh';
    } else if (strength >= 3) {
        color = '#ffa726';
        text = 'Trung bình';
    }

    strengthMeter.style.width = `${width}%`;
    strengthMeter.style.backgroundColor = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

function validateForm(username, password) {
    let isValid = true;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Validate email
    if (!emailRegex.test(username)) {
        showError(document.getElementById('username'), 'Email không hợp lệ');
        isValid = false;
    } else {
        hideError(document.getElementById('username'));
    }

    // Validate password
    if (password.length < 8) {
        showError(document.getElementById('password'), 'Mật khẩu phải có ít nhất 8 ký tự');
        isValid = false;
    } else {
        hideError(document.getElementById('password'));
    }

    return isValid;
}

function showError(input, message) {
    const errorElement = input.parentElement.querySelector('.error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    input.classList.add('error');
}

function hideError(input) {
    const errorElement = input.parentElement.querySelector('.error-message');
    errorElement.style.display = 'none';
    input.classList.remove('error');
}

function encryptPassword(password) {
    // Sử dụng thư viện CryptoJS để mã hóa mật khẩu
    return CryptoJS.AES.encrypt(password, 'secret_key').toString();
}

function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
}

function showTwoFactorModal() {
    const twoFactorModal = document.getElementById('twoFactorModal');
    showModal(twoFactorModal);

    // Focus vào ô input đầu tiên
    const firstInput = twoFactorModal.querySelector('.otp-input');
    if (firstInput) {
        firstInput.focus();
    }
}

async function simulateAPICall(data) {
    // Giả lập call API
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() > 0.5) {
                resolve({ success: true });
            } else {
                reject(new Error('Thông tin đăng nhập không chính xác'));
            }
        }, 1500);
    });
}

function handleSocialLogin(provider) {
    // Xử lý đăng nhập mạng xã hội
    console.log(`Đang đăng nhập với ${provider}`);
    showToast('info', `Đang chuyển hướng đến trang đăng nhập ${provider}...`);
} 