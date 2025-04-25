document.addEventListener('DOMContentLoaded', function() {
    const betInput = document.querySelector('.bets-container .bet-input');
    const placeBetBtn = document.querySelector('.place-bet-btn');
    const outcomeBtns = document.querySelectorAll('.outcome-btn');
    const messageBox = document.getElementById('bets-message');
    let selectedOutcome = null;

    // Создаем падающие фишки для фона
    function createFallingChips() {
        const container = document.querySelector('.bets-container');
        const chipCount = 8;

        for (let i = 0; i < chipCount; i++) {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.style.left = `${Math.random() * 100}%`;
            chip.style.animation = `chipFall ${3 + Math.random() * 4}s linear ${Math.random() * 5}s infinite`;
            container.appendChild(chip);
        }
    }

    createFallingChips();

    // Обработчики для кнопок исходов
    outcomeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            outcomeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedOutcome = {
                element: this,
                multiplier: parseFloat(this.dataset.multiplier)
            };

            // Анимация выбора
            this.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.style.transform = 'scale(1.05)';
            }, 200);
        });
    });

    // Обработчик кнопки ставки
    placeBetBtn.addEventListener('click', async function() {
        if (!selectedOutcome) {
            showMessage("Выберите исход события", false);
            return;
        }

        const betAmount = parseFloat(betInput.value);
        if (isNaN(betAmount) || betAmount <= 0) {
            showMessage("Введите корректную сумму", false);
            return;
        }

        // Проверка баланса (заглушка)
        const balance = 1000; // Здесь должна быть реальная проверка баланса
        if (betAmount > balance) {
            showMessage("Недостаточно средств", false);
            return;
        }

        // Блокируем кнопку на время "ставки"
        placeBetBtn.disabled = true;
        placeBetBtn.textContent = "Обработка...";

        showMessage("Ставка обрабатывается...", true);

        // Имитация запроса к серверу
        setTimeout(() => {
            const isWin = Math.random() > 0.5; // 50% шанс на победу

            if (isWin) {
                const winAmount = (betAmount * selectedOutcome.multiplier).toFixed(2);
                showMessage(`🎉 Вы выиграли ${winAmount}$!`, true);
                selectedOutcome.element.classList.add('win-flash');

                // Анимация выигрыша
                placeBetBtn.classList.add('win-flash');
            } else {
                showMessage("❌ Ставка не сыграла", false);
                selectedOutcome.element.classList.add('lose-shake');

                // Анимация проигрыша
                placeBetBtn.classList.add('lose-shake');
            }

            // Возвращаем кнопку в исходное состояние
            setTimeout(() => {
                placeBetBtn.disabled = false;
                placeBetBtn.textContent = "Сделать ставку";
                selectedOutcome.element.classList.remove('win-flash', 'lose-shake');
                placeBetBtn.classList.remove('win-flash', 'lose-shake');
            }, 2000);
        }, 1500);
    });

    // Функция показа сообщений
    function showMessage(text, isSuccess) {
        messageBox.textContent = text;
        messageBox.className = 'message-box';

        if (isSuccess) {
            messageBox.classList.add('win');
        } else {
            messageBox.classList.add('error');
        }
    }
});