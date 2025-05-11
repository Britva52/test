document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const coin = document.querySelector('.coin');
    const coinFront = document.querySelector('.coin-front');
    const coinBack = document.querySelector('.coin-back');
    const headsBtn = document.getElementById('heads-btn');
    const tailsBtn = document.getElementById('tails-btn');
    const betInput = document.querySelector('.bet-input');
    const messageBox = document.getElementById('coin-message');

    // Настройки анимации
    const FLIP_DURATION = 3000; // 3 секунды анимации
    const FLIP_ROTATIONS = 6;   // Количество оборотов
    let isFlipping = false;
    let animationId = null;
    let userChoice = null;

    // Инициализация игры
    function init() {
        // Устанавливаем начальные символы
        coinFront.textContent = 'О';
        coinBack.textContent = 'Р';

        // Обработчики событий
        headsBtn.addEventListener('click', function() {
            if (isFlipping) return;
            userChoice = 'heads';
            updateButtonStyles();
            showMessage("Выбрано: Орёл", true);
        });

        tailsBtn.addEventListener('click', function() {
            if (isFlipping) return;
            userChoice = 'tails';
            updateButtonStyles();
            showMessage("Выбрано: Решка", true);
        });

        coin.addEventListener('click', function() {
            if (isFlipping) return;

            // Проверка выбора стороны
            if (!userChoice) {
                showError("Сначала выберите Орёл или Решку");
                shakeButtons();
                return;
            }

            // Проверка ставки
            const betAmount = parseFloat(betInput.value);
            if (!validateBet(betAmount)) return;

            // Запуск анимации
            startFlip(betAmount);
        });
    }

    // Обновление стилей кнопок
    function updateButtonStyles() {
        headsBtn.classList.toggle('active', userChoice === 'heads');
        tailsBtn.classList.toggle('active', userChoice === 'tails');
    }

    // Запуск вращения монетки
    async function startFlip(betAmount) {
        isFlipping = true;
        disableControls(true);
        showMessage("Монета крутится...", true);

        try {
            // Имитация запроса (замените на реальный)
            await new Promise(resolve => setTimeout(resolve, 300));
            updateBalance(getBalance() - betAmount);

            // Генерация случайного результата
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            animateFlip(result, betAmount);
        } catch (error) {
            console.error("Ошибка:", error);
            endFlip(false);
        }
    }

    // Анимация вращения
    function animateFlip(result, betAmount) {
    const startTime = performance.now();
    const endRotation = result === 'heads' ? 0 : 180;

    // Случайный наклон для реализма
    const tiltAngle = 5 + Math.random() * 15;
    const tiltDirection = Math.random() < 0.5 ? 1 : -1;

    // Вычисляем общее количество градусов для вращения
    const totalRotations = FLIP_ROTATIONS * 360;
    // Корректируем конечный угол, чтобы он соответствовал полным оборотам
    const adjustedEndRotation = Math.round((totalRotations + endRotation) / 360) * 360;

    function frame(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / FLIP_DURATION, 1);

        // Плавное замедление по кривой Безье
        let rotationProgress;
        if (progress < 0.7) {
            // Линейная часть (первые 70% времени)
            rotationProgress = progress / 0.7;
        } else {
            // Замедление (последние 30% времени)
            const decelProgress = (progress - 0.7) / 0.3;
            rotationProgress = 1 - (1 - decelProgress) * (1 - decelProgress);
        }

        // Вычисляем текущий угол вращения
        let rotation = rotationProgress * totalRotations;

        // Корректируем угол для плавной остановки
        if (progress >= 0.95) {
            const stopProgress = (progress - 0.95) / 0.05;
            rotation = totalRotations + (endRotation * stopProgress);
        }

        if (progress >= 1) {
            // Финишная позиция
            coin.style.transform = `rotateY(${endRotation}deg) rotateX(${tiltAngle * tiltDirection}deg)`;
            finishFlip(result, betAmount);
            return;
        }

        // Добавляем небольшое дрожание
        const wobble = Math.sin(progress * 20) * 2;
        coin.style.transform = `rotateY(${rotation}deg) rotateX(${tiltAngle * tiltDirection + wobble}deg)`;
        animationId = requestAnimationFrame(frame);
    }

    animationId = requestAnimationFrame(frame);
}

    // Функции плавности анимации
    function linear(t, b, c, d) { return c * t / d + b; }
    function easeOutQuad(t, b, c, d) { t /= d; return -c * t*(t-2) + b; }
    function easeInCubic(t, b, c, d) { t /= d; return c*t*t*t + b; }

    // Завершение вращения
    function finishFlip(result, betAmount) {
        const win = userChoice === result;
        const winAmount = win ? betAmount * 1.95 : 0;
        const resultText = result === 'heads' ? 'Орёл' : 'Решка';

        const message = win
            ? `Поздравляем! Выпал ${resultText}. Выигрыш: ${winAmount.toFixed(2)}$`
            : `Увы! Выпал ${resultText}`;

        showMessage(message, win);

        if (winAmount > 0) {
            setTimeout(() => updateBalance(getBalance() + winAmount), 500);
        }

        endFlip();
    }

    // Валидация ставки
    function validateBet(amount) {
        if (isNaN(amount)) {
            showError("Введите корректную сумму ставки");
            return false;
        }
        if (amount <= 0) {
            showError("Ставка должна быть больше 0");
            return false;
        }
        if (amount > getBalance()) {
            showError(`Недостаточно средств. Баланс: ${getBalance().toFixed(2)}$`);
            return false;
        }
        return true;
    }

    // Показать сообщение об ошибке
    function showError(message) {
        showMessage(message, false);
        messageBox.classList.add('error-message');
        setTimeout(() => messageBox.classList.remove('error-message'), 500);
    }

    // Анимация тряски кнопок
    function shakeButtons() {
        headsBtn.classList.add('shake');
        tailsBtn.classList.add('shake');
        setTimeout(() => {
            headsBtn.classList.remove('shake');
            tailsBtn.classList.remove('shake');
        }, 500);
    }

    // Вспомогательные функции
    function disableControls(disabled) {
        headsBtn.disabled = disabled;
        tailsBtn.disabled = disabled;
        coin.style.pointerEvents = disabled ? 'none' : 'auto';
    }

    function showMessage(message, isSuccess) {
        messageBox.textContent = message;
        messageBox.style.color = isSuccess ? '#2ecc71' : '#e74c3c';
    }

    function updateBalance(balance) {
        document.querySelector('.balance-amount').textContent = balance.toFixed(2) + '$';
    }

    function getBalance() {
        return parseFloat(document.querySelector('.balance-amount').textContent.replace('$', '')) || 100;
    }

    function endFlip() {
        cancelAnimationFrame(animationId);
        isFlipping = false;
        disableControls(false);
    }

    // Запуск игры
    init();
});