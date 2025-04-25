document.addEventListener('DOMContentLoaded', function() {
    // Элементы управления
    const coin = document.querySelector('.coin');
    const coinFront = document.querySelector('.coin-front');
    const coinBack = document.querySelector('.coin-back');
    const headsBtn = document.getElementById('heads-btn');
    const tailsBtn = document.getElementById('tails-btn');
    const betInput = document.querySelector('.coinflip-container .bet-input');
    const messageBox = document.getElementById('coin-message');

    // Состояние игры
    let isFlipping = false;
    let animationId = null;
    let userChoice = null;
    const flipDuration = 2000; // 2 секунды анимации

    // Инициализация
    function init() {
        // Инициализация монетки
        coinFront.textContent = 'О';
        coinBack.textContent = 'Р';

        // Обработчики для кнопок выбора
        headsBtn.addEventListener('click', selectHeads);
        tailsBtn.addEventListener('click', selectTails);

        // Обработчик для клика по монетке
        coin.addEventListener('click', flipCoin);
    }

    function selectHeads() {
        if (isFlipping) return;
        userChoice = 'heads';
        updateButtonStyles();
        showMessage("Выбрано: Орёл", true);
    }

    function selectTails() {
        if (isFlipping) return;
        userChoice = 'tails';
        updateButtonStyles();
        showMessage("Выбрано: Решка", true);
    }

    function updateButtonStyles() {
        headsBtn.classList.toggle('active', userChoice === 'heads');
        tailsBtn.classList.toggle('active', userChoice === 'tails');
    }

    // Запуск вращения монетки
    async function flipCoin() {
        if (isFlipping || !userChoice) {
            if (!userChoice) showMessage("Сначала выберите Орёл или Решку", false);
            return;
        }

        const betAmount = parseFloat(betInput.value);
        if (!validateBet(betAmount)) return;

        isFlipping = true;
        disableControls(true);
        showMessage("Монета крутится...", true);

        try {
            // Списание средств
            const response = await sendRequest('/api/deduct_bet/', {
                amount: betAmount
            });

            if (!response.success) throw new Error("Не удалось списать средства");
            updateBalance(response.new_balance);

            // Генерация результата (50/50)
            const result = Math.random() < 0.5 ? 'heads' : 'tails';

            // Запуск анимации
            animateCoin(result, betAmount);
        } catch (error) {
            console.error("Ошибка:", error);
            endFlip(false);
        }
    }

    // Анимация вращения
    function animateCoin(result, betAmount) {
        const startTime = performance.now();
        const rotations = 5; // Количество полных оборотов

        function frame(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / flipDuration, 1);

            // Плавное замедление
            let rotation;
            if (progress < 0.7) {
                rotation = 360 * rotations * progress;
            } else {
                rotation = 360 * rotations - 360 * rotations * (1 - progress) * 5;

                if (progress >= 1) {
                    // Фиксируем конечное положение
                    rotation = result === 'heads' ? 0 : 180;
                    coin.style.transform = `rotateY(${rotation}deg)`;
                    finishFlip(result, betAmount);
                    return;
                }
            }

            coin.style.transform = `rotateY(${rotation}deg)`;
            animationId = requestAnimationFrame(frame);
        }

        animationId = requestAnimationFrame(frame);
    }

    // Завершение вращения
    function finishFlip(result, betAmount) {
        const win = userChoice === result;
        const winAmount = win ? betAmount * 1.95 : 0;

        // Форматирование результата
        const resultText = result === 'heads' ? 'Орёл' : 'Решка';
        const choiceText = userChoice === 'heads' ? 'Орёл' : 'Решка';

        const message = win
            ? `Поздравляем! Выпал ${resultText}. Выигрыш: ${winAmount.toFixed(2)}$`
            : `Увы! Выбрано ${choiceText}, а выпал ${resultText}`;

        showMessage(message, win);

        // Начисление выигрыша
        if (winAmount > 0) {
            sendRequest('/api/add_winnings/', {
                amount: winAmount
            }).then(response => {
                if (response.success) updateBalance(response.new_balance);
            });
        }

        endFlip();
    }

    // Валидация ставки
    function validateBet(amount) {
        if (isNaN(amount)) {
            showMessage("Введите корректную сумму ставки", false);
            return false;
        }

        if (amount <= 0) {
            showMessage("Ставка должна быть больше 0", false);
            return false;
        }

        const balance = getBalance();
        if (balance < amount) {
            showMessage(`Недостаточно средств. Баланс: ${balance.toFixed(2)}$`, false);
            return false;
        }

        return true;
    }

    // Завершение игры
    function endFlip() {
        cancelAnimationFrame(animationId);
        isFlipping = false;
        disableControls(false);
    }

    // === Вспомогательные функции ===
    function disableControls(disabled) {
        [headsBtn, tailsBtn].forEach(btn => {
            btn.disabled = disabled;
        });
        coin.style.pointerEvents = disabled ? 'none' : 'auto';
    }

    function showMessage(message, isSuccess) {
        if (messageBox) {
            messageBox.textContent = message;
            messageBox.style.color = isSuccess ? '#2ecc71' : '#e74c3c';
        }
    }

    function sendRequest(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        }).then(res => res.json());
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function updateBalance(balance) {
        document.querySelectorAll('.balance-amount').forEach(el => {
            el.textContent = balance.toFixed(2) + '$';
        });
    }

    function getBalance() {
        const balanceEl = document.querySelector('.balance-amount');
        return parseFloat(balanceEl?.textContent?.replace('$', '') || '100');
    }

    // Запуск игры
    init();
});