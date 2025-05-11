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
    const flipDuration = 3000; // Увеличил длительность анимации до 3 секунд

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

    // Улучшенная анимация вращения
    function animateCoin(result, betAmount) {
        const startTime = performance.now();
        const rotations = 8; // Увеличил количество оборотов

        // Добавляем небольшой наклон для более реалистичного вращения
        const tiltAngle = 5 + Math.random() * 10;
        const tiltDirection = Math.random() < 0.5 ? 1 : -1;

        function frame(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / flipDuration, 1);

            // Плавное ускорение и замедление с bounce-эффектом
            let rotation;
            if (progress < 0.3) {
                // Ускорение
                rotation = easeInQuad(progress, 0, 360 * rotations, 0.3);
            } else if (progress < 0.7) {
                // Постоянная скорость
                rotation = 360 * rotations * 0.3 +
                          easeInOutQuad(progress - 0.3, 0, 360 * rotations * 0.4, 0.4);
            } else {
                // Замедление с bounce-эффектом
                rotation = 360 * rotations * 0.7 +
                          easeOutBounce(progress - 0.7, 0, 360 * rotations * 0.3, 0.3);

                if (progress >= 1) {
                    // Фиксируем конечное положение
                    rotation = result === 'heads' ? 0 : 180;
                    coin.style.transform = `rotateY(${rotation}deg) rotateX(${tiltAngle * tiltDirection}deg)`;
                    finishFlip(result, betAmount);
                    return;
                }
            }

            // Добавляем небольшое дрожание и наклон во время вращения
            const wobble = Math.sin(progress * 20) * 2;
            coin.style.transform = `rotateY(${rotation}deg) rotateX(${tiltAngle * tiltDirection + wobble}deg)`;
            animationId = requestAnimationFrame(frame);
        }

        animationId = requestAnimationFrame(frame);
    }

    // Функции плавности анимации
    function easeInQuad(t, b, c, d) {
        t /= d;
        return c * t * t + b;
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t + b;
        t--;
        return -c/2 * (t*(t-2) - 1) + b;
    }

    function easeOutBounce(t, b, c, d) {
        if ((t/=d) < (1/2.75)) {
            return c*(7.5625*t*t) + b;
        } else if (t < (2/2.75)) {
            return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
        } else if (t < (2.5/2.75)) {
            return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
        } else {
            return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
        }
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