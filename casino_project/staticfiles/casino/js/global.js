document.addEventListener('DOMContentLoaded', function() {
    // Общие функции для всех игр
    window.Casino = {
        // Инициализация баланса при загрузке
        init: function() {
            this.syncBalance();
            window.addEventListener('beforeunload', () => this.syncBalance());
            setInterval(() => this.syncBalance(), 30000); // Синхронизация каждые 30 сек
        },

        // Сохранить баланс в localStorage
        saveBalance: function(balance) {
            localStorage.setItem('casinoBalance', balance);
        },

        // Получить сохраненный баланс
        getSavedBalance: function() {
            return parseFloat(localStorage.getItem('casinoBalance')) || 0;
        },

        // Синхронизировать баланс с сервером
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
                // Используем сохраненное значение при ошибке
                const savedBalance = this.getSavedBalance();
                this.updateBalance(savedBalance);
            }
        },

        // Отправка запроса на сервер
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

        // Получение CSRF токена
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

        // Обновление баланса на странице
        updateBalance: function(newBalance) {
            const formatted = parseFloat(newBalance).toFixed(2) + '$';
            document.querySelectorAll('.balance-amount').forEach(el => {
                el.textContent = formatted;
            });
            this.saveBalance(newBalance); // Автоматически сохраняем
        },

        // Показать сообщение
        showMessage: function(elementId, message, isSuccess = true) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.style.color = isSuccess ? '#2ecc71' : '#e74c3c';
            }
        },

        // Отключить кнопки на время обработки
        toggleButtons: function(disabled = true) {
            document.querySelectorAll('button').forEach(btn => {
                btn.disabled = disabled;
            });
        },

        // Проверка баланса перед ставкой
        checkBalance: function(amount) {
            const currentBalance = parseFloat(
                document.querySelector('.balance-amount').textContent.replace('$','')
            );
            return {
                enough: amount <= currentBalance,
                currentBalance: currentBalance
            };
        }
    };

    // Инициализация
    Casino.init();
});