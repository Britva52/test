document.addEventListener('DOMContentLoaded', function() {
    window.Casino = {
        init: function() {
            this.syncBalance();
            window.addEventListener('beforeunload', () => this.syncBalance());
            setInterval(() => this.syncBalance(), 30000);
        },

        saveBalance: function(balance) {
            localStorage.setItem('casinoBalance', balance);
        },

        getSavedBalance: function() {
            return parseFloat(localStorage.getItem('casinoBalance')) || 0;
        },

        syncBalance: async function() {
            try {
                const response = await fetch('/api/get_balance/', {
                    method: 'GET',
                    headers: {
                        'X-CSRFToken': this.getCookie('csrftoken'),
                    },
                    credentials: 'same-origin'
                });
                const data = await response.json();
                if (data.success) {
                    this.updateBalance(data.balance);
                    this.saveBalance(data.balance);
                }
            } catch (error) {
                console.error('Balance sync error:', error);
                const savedBalance = this.getSavedBalance();
                this.updateBalance(savedBalance);
            }
        },

        sendRequest: async function(url, data) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken'),
                    },
                    body: JSON.stringify(data),
                    credentials: 'same-origin'
                });
                return await response.json();
            } catch (error) {
                console.error('Request error:', error);
                return {success: false, error: 'Network error'};
            }
        },

        getCookie: function(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },

        updateBalance: function(newBalance) {
            const formatted = parseFloat(newBalance).toFixed(2) + '$';
            document.querySelectorAll('.balance-amount').forEach(el => {
                const current = parseFloat(el.textContent.replace('$','')) || 0;
                if (Math.abs(current - newBalance) > 0.01) {
                    el.textContent = formatted;
                }
            });
            this.saveBalance(newBalance);
        },

        showMessage: function(elementId, message, isSuccess = true) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.style.color = isSuccess ? '#2ecc71' : '#e74c3c';
            }
        },

        toggleButtons: function(disabled = true) {
            document.querySelectorAll('button').forEach(btn => {
                btn.disabled = disabled;
            });
        },

        checkBalance: function(amount) {
            const balanceElement = document.querySelector('.balance-amount');
            if (!balanceElement) {
                console.error('Balance element not found');
                return { enough: false, currentBalance: 0 };
            }

            const currentBalance = parseFloat(balanceElement.textContent.replace('$','')) || 0;
            return {
                enough: amount <= currentBalance,
                currentBalance: currentBalance
            };
        }
    };

    Casino.init();
});