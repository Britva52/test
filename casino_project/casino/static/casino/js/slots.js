document.addEventListener('DOMContentLoaded', function() {
    const config = {
        symbols: ["🍒", "🍋", "🔔", "🍉", "⭐", "7"],
        paytable: {
            "🍒🍒🍒": 3, "🍋🍋🍋": 5, "🔔🔔🔔": 10,
            "🍉🍉🍉": 15, "⭐⭐⭐": 20, "777": 50
        },
        spinDuration: 3000, // Увеличено до 3 секунд
        reelDelay: 500 // Уменьшено до 0.5 секунды между барабанами
    };

    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    const spinBtn = document.getElementById('spin-slot');
    const betInput = document.getElementById('slot-bet-amount');
    const messageBox = document.getElementById('slot-message');

    let isSpinning = false;
    let animationId = null;
    let startTime = null;
    let stopTimes = [];
    let finalSymbols = [];

    function init() {
        resetReels();
        spinBtn.addEventListener('click', startSpin);

        // Добавляем CSS для анимаций
        const style = document.createElement('style');
        style.textContent = `
            @keyframes drop {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .reel {
                transition: all 0.3s ease-out;
                display: inline-block;
                font-size: 60px;
                width: 100px;
                height: 100px;
                line-height: 100px;
                text-align: center;
                margin: 0 10px;
                border-radius: 10px;
                background: rgba(255,255,255,0.1);
                box-shadow: 0 0 10px rgba(0,0,0,0.2);
            }
            .winning {
                animation: shake 0.5s ease-in-out;
                background: rgba(255,215,0,0.3);
            }
        `;
        document.head.appendChild(style);
    }

    function resetReels() {
        reels.forEach(reel => {
            reel.textContent = "🍒";
            reel.dataset.symbol = "🍒";
            reel.classList.remove('winning');
            reel.dataset.stopped = "false";
            reel.style.transform = 'scale(1)';
            reel.style.animation = '';
        });
    }

    async function startSpin() {
        if (isSpinning) return;

        const betAmount = parseFloat(betInput.value);
        if (!validateBet(betAmount)) return;

        isSpinning = true;
        disableButtons(true);
        showMessage("Барабаны крутятся...", true);

        try {
            // Имитация запроса (замените на реальный)
            await new Promise(resolve => setTimeout(resolve, 300));
            updateBalance(getBalance() - betAmount);

            resetReels();
            startTime = performance.now();
            stopTimes = [
                startTime + config.spinDuration,
                startTime + config.spinDuration + config.reelDelay,
                startTime + config.spinDuration + config.reelDelay * 2
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

    function animateReels(betAmount) {
        const now = performance.now();
        let allStopped = true;

        reels.forEach((reel, index) => {
            if (now < stopTimes[index]) {
                allStopped = false;
                reel.textContent = config.symbols[
                    Math.floor(Math.random() * config.symbols.length)
                ];

                // Эффект замедления перед остановкой
                if (now > stopTimes[index] - 500) {
                    reel.style.transition = 'transform 0.5s cubic-bezier(0.1, 0.7, 0.1, 1)';
                    reel.style.transform = 'scale(1.2)';
                }
            } else if (reel.dataset.stopped === "false") {
                reel.textContent = finalSymbols[index];
                reel.dataset.symbol = finalSymbols[index];
                reel.dataset.stopped = "true";
                reel.style.transform = 'scale(1)';
                reel.style.animation = 'drop 0.5s ease-out';
            }
        });

        if (!allStopped) {
            animationId = requestAnimationFrame(() => animateReels(betAmount));
        } else {
            finishSpin(betAmount);
        }
    }

    function finishSpin(betAmount) {
        const result = reels.map(r => r.textContent).join('');
        const multiplier = config.paytable[result] || 0;
        const winAmount = betAmount * multiplier;

        if (winAmount > 0) {
            reels.forEach(reel => reel.classList.add('winning'));
            showMessage(`Выигрыш: ${winAmount}$ (x${multiplier})`, true);

            // Имитация начисления выигрыша
            setTimeout(() => {
                updateBalance(getBalance() + winAmount);
            }, 500);
        } else {
            showMessage("Попробуйте ещё раз", false);
        }

        endSpin();
    }

    function endSpin() {
        cancelAnimationFrame(animationId);
        isSpinning = false;
        disableButtons(false);
    }

    function validateBet(amount) {
        if (isNaN(amount) || amount <= 0) {
            showMessage("Введите корректную сумму ставки", false);
            return false;
        }
        if (amount > getBalance()) {
            showMessage("Недостаточно средств", false);
            return false;
        }
        return true;
    }

    // Вспомогательные функции
    function disableButtons(disabled) {
        spinBtn.disabled = disabled;
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

    init();
});