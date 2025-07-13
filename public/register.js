// Registration form JavaScript - External file to avoid CSP issues

class RegistrationHandler {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Real-time validation
        document.getElementById('username').addEventListener('input', () => {
            this.validateUsername();
        });

        document.getElementById('email').addEventListener('input', () => {
            this.validateEmail();
        });

        document.getElementById('password').addEventListener('input', () => {
            this.validatePassword();
            this.validateConfirmPassword();
        });

        document.getElementById('confirmPassword').addEventListener('input', () => {
            this.validateConfirmPassword();
        });
    }

    validateUsername() {
        const username = document.getElementById('username').value;
        const field = document.getElementById('username');
        const error = document.getElementById('usernameError');

        if (username.length === 0) {
            this.clearFieldState(field, error);
            return false;
        }

        if (username.length < 3) {
            this.setFieldError(field, error, 'Username must be at least 3 characters');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.setFieldError(field, error, 'Username can only contain letters, numbers, and underscores');
            return false;
        }

        this.setFieldSuccess(field, error);
        return true;
    }

    validateEmail() {
        const email = document.getElementById('email').value;
        const field = document.getElementById('email');
        const error = document.getElementById('emailError');

        if (email.length === 0) {
            this.clearFieldState(field, error);
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.setFieldError(field, error, 'Please enter a valid email address');
            return false;
        }

        this.setFieldSuccess(field, error);
        return true;
    }

    validatePassword() {
        const password = document.getElementById('password').value;
        const field = document.getElementById('password');
        const error = document.getElementById('passwordError');
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (password.length === 0) {
            this.clearFieldState(field, error);
            strengthFill.style.width = '0%';
            strengthText.textContent = 'Minimum 6 characters';
            strengthText.className = 'field-help';
            return false;
        }

        if (password.length < 6) {
            this.setFieldError(field, error, 'Password must be at least 6 characters');
            strengthFill.style.width = '20%';
            strengthFill.className = 'strength-fill strength-weak';
            strengthText.textContent = 'Too short';
            strengthText.className = 'field-error';
            return false;
        }

        // Calculate password strength
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strength < 3) {
            strengthFill.style.width = '40%';
            strengthFill.className = 'strength-fill strength-weak';
            strengthText.textContent = 'Weak password';
            strengthText.className = 'field-help';
        } else if (strength < 4) {
            strengthFill.style.width = '70%';
            strengthFill.className = 'strength-fill strength-medium';
            strengthText.textContent = 'Medium strength';
            strengthText.className = 'field-help';
        } else {
            strengthFill.style.width = '100%';
            strengthFill.className = 'strength-fill strength-strong';
            strengthText.textContent = 'Strong password';
            strengthText.className = 'field-success';
        }

        this.setFieldSuccess(field, error);
        return true;
    }

    validateConfirmPassword() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const field = document.getElementById('confirmPassword');
        const error = document.getElementById('confirmError');
        const success = document.getElementById('confirmSuccess');

        if (confirmPassword.length === 0) {
            this.clearFieldState(field, error);
            success.classList.add('hidden');
            return false;
        }

        if (password !== confirmPassword) {
            this.setFieldError(field, error, 'Passwords do not match');
            success.classList.add('hidden');
            return false;
        }

        this.setFieldSuccess(field, error);
        success.classList.remove('hidden');
        return true;
    }

    setFieldError(field, errorElement, message) {
        field.classList.remove('success');
        field.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    setFieldSuccess(field, errorElement) {
        field.classList.remove('error');
        field.classList.add('success');
        errorElement.classList.add('hidden');
    }

    clearFieldState(field, errorElement) {
        field.classList.remove('error', 'success');
        errorElement.classList.add('hidden');
    }

    async register() {
        console.log('🔍 Registration form submitted');
        
        // Validate all fields
        const usernameValid = this.validateUsername();
        const emailValid = this.validateEmail();
        const passwordValid = this.validatePassword();
        const confirmValid = this.validateConfirmPassword();

        if (!usernameValid || !emailValid || !passwordValid || !confirmValid) {
            this.showError('Please fix the errors above before submitting');
            return;
        }

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log('📤 Sending registration request for:', email);
        
        this.setLoading(true);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            console.log('📊 Response status:', response.status);
            const data = await response.json();
            console.log('📨 Response data:', data);

            if (data.success) {
                this.showSuccess(data.message + ' Redirecting to login...');
                document.getElementById('registerForm').reset();
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                this.showError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            this.showError('Registration failed. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
    }

    showSuccess(message) {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
    }

    setLoading(loading) {
        const form = document.getElementById('registerForm');
        const submitBtn = document.getElementById('submitBtn');
        
        if (loading) {
            form.classList.add('loading');
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;
        } else {
            form.classList.remove('loading');
            submitBtn.textContent = 'Create Account';
            submitBtn.disabled = false;
        }
    }
}

// Initialize the registration handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Registration handler initializing...');
    new RegistrationHandler();
});