document.addEventListener('DOMContentLoaded', function() {
    // Конфигурация игры
    const config = {
        symbols: ["🍒", "🍋", "🔔", "🍉", "⭐", "7"],
        paytable: {
            "🍒🍒🍒": 3, "🍋🍋🍋": 5, "🔔🔔🔔": 10,
            "🍉🍉🍉": 15, "⭐⭐⭐": 20, "777": 50
        },
        spinDuration: 2000,
        reelDelay: 1000 // Изменено на 1000 мс (1 секунда)
    };

    // Получаем элементы DOM
    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    const spinBtn = document.getElementById('spin-slot');
    const betInput = document.getElementById('slot-bet-amount');
    const messageBox = document.getElementById('slot-message');

    // Состояние игры
    let isSpinning = false;
    let animationId = null;
    let startTime = null;
    let stopTimes = [];
    let finalSymbols = [];

    // Инициализация игры
    function init() {
        resetReels();
        spinBtn.addEventListener('click', startSpin);
    }

    // Сброс барабанов
    function resetReels() {
        reels.forEach(reel => {
            reel.textContent = "🍒";
            reel.dataset.symbol = "🍒";
            reel.classList.remove('winning');
            reel.dataset.stopped = "false";
        });
    }

    // Запуск вращения
    async function startSpin() {
    if (isSpinning) return;

    const betAmount = parseFloat(betInput.value);
    if (!validateBet(betAmount)) return;

    isSpinning = true;
    disableButtons(true);
    showMessage("Барабаны крутятся...", true);

    try {
        const response = await sendRequest('/api/deduct_bet/', {
            amount: betAmount
        });

        if (!response.success) throw new Error("Deduction failed");
        updateBalance(response.new_balance);

        resetReels();
        startTime = performance.now();

        // Новый расчет времени остановки каждого барабана
        stopTimes = [
            startTime + config.spinDuration,               // Первый барабан
            startTime + config.spinDuration + config.reelDelay,    // Второй (через 1 сек после первого)
            startTime + config.spinDuration + config.reelDelay * 2 // Третий (еще через 1 сек после второго)
        ];

        finalSymbols = reels.map(() =>
            config.symbols[Math.floor(Math.random() * config.symbols.length)]
        );

        animateReels(betAmount);
    } catch (error) {
        console.error("Spin error:", error);
        endSpin(false);
    }
}

    // Валидация ставки
function animateReels(betAmount) {
    const now = performance.now();
    let allStopped = true;

    reels.forEach((reel, index) => {
        if (now < stopTimes[index]) {
            allStopped = false;
            reel.textContent = config.symbols[
                Math.floor(Math.random() * config.symbols.length)
            ];

            // Добавляем эффект замедления перед остановкой
            if (now > stopTimes[index] - 300) {
                reel.style.transition = 'transform 0.3s ease-out';
                reel.style.transform = 'scale(1.1)';
            }
        } else if (reel.dataset.stopped === "false") {
            reel.textContent = finalSymbols[index];
            reel.dataset.symbol = finalSymbols[index];
            reel.dataset.stopped = "true";
            reel.style.transform = 'scale(1)';

            // Анимация "приземления" символа
            reel.style.animation = 'drop 0.3s ease-out';
            setTimeout(() => {
                reel.style.animation = '';
            }, 300);
        }
    });

    if (!allStopped) {
        animationId = requestAnimationFrame(() => animateReels(betAmount));
    } else {
        finishSpin(betAmount);
    }
}

    // Проверка результата
    function finishSpin(betAmount) {
        const result = reels.map(r => r.textContent).join('');
        const multiplier = config.paytable[result] || 0;
        const winAmount = betAmount * multiplier;

        if (winAmount > 0) {
            reels.forEach(reel => reel.classList.add('winning'));
            showMessage(`Выигрыш: ${winAmount}$ (x${multiplier})`, true);

            // Начисление выигрыша
            sendRequest('/api/add_winnings/', {
                amount: winAmount
            }).then(response => {
                if (response.success) updateBalance(response.new_balance);
            });
        } else {
            showMessage("Попробуйте ещё раз", false);
        }

        endSpin();
    }

    // Завершение вращения
    function endSpin() {
        cancelAnimationFrame(animationId);
        isSpinning = false;
        disableButtons(false);
    }

    // Вспомогательные функции (замените на свои реализации)
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
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function updateBalance(balance) {
        document.querySelectorAll('.balance-amount').forEach(el => {
            el.textContent = balance.toFixed(2) + '$';
        });
        localStorage.setItem('casinoBalance', balance);
    }

    function getBalance() {
        const balanceEl = document.querySelector('.balance-amount');
        return parseFloat(balanceEl.textContent.replace('$', '')) || 100;
    }

    function showMessage(message, isSuccess) {
        if (messageBox) {
            messageBox.textContent = message;
            messageBox.style.color = isSuccess ? '#2ecc71' : '#e74c3c';
        }
    }

    function disableButtons(disabled) {
        document.querySelectorAll('button').forEach(btn => {
            btn.disabled = disabled;
        });
    }

    // Запуск игры
    init();
});