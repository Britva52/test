document.addEventListener('DOMContentLoaded', function() {
    const coin = document.querySelector('.coin');
    const coinFront = document.querySelector('.coin-front');
    const coinBack = document.querySelector('.coin-back');
    const headsBtn = document.getElementById('heads-btn');
    const tailsBtn = document.getElementById('tails-btn');
    const betInput = document.querySelector('.bet-input');
    const messageBox = document.getElementById('coin-message');

    const FLIP_DURATION = 4500;
    const FLIP_ROTATIONS = 23;
    let isFlipping = false;
    let animationId = null;
    let roundResult = null;
    let userChoice = null;

    function init() {
        coinFront.textContent = 'О';
        coinBack.textContent = 'Р';

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
            if (isFlipping || !userChoice) return;

            const betAmount = parseFloat(betInput.value);
            if (!validateBet(betAmount)) return;

            startFlip(betAmount);
        });
    }

    function updateButtonStyles() {
        headsBtn.classList.toggle('active', userChoice === 'heads');
        tailsBtn.classList.toggle('active', userChoice === 'tails');
    }

    async function startFlip(betAmount) {
        isFlipping = true;
        disableControls(true);
        showMessage("Монета крутится...", true);

        try {
            const resp = await Casino.sendRequest(
                '/api/place_bet/coinflip/',
                {
                    amount: betAmount.toFixed(2),
                    side: userChoice
                }
            );

            if (!resp.success) {
                showError(resp.error);
                endFlip(false);
                return;
            }

            roundResult = {
                ...resp,
                betAmount: betAmount
            };
            animateFlip(resp.result);
        } catch (error) {
            console.error("Ошибка:", error);
            endFlip(false);
        }
    }

    function animateFlip(result) {
    const startTime = performance.now();
    const endRotation = result === 'heads' ? 0 : 180;
    const tiltAngle = 5 + Math.random() * 15;
    const tiltDirection = Math.random() < 0.5 ? 1 : -1;
    const totalRotations = FLIP_ROTATIONS * 360;
    const adjustedEndRotation = Math.round((totalRotations + endRotation) / 360) * 360;

    function frame(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / FLIP_DURATION, 1);

        let rotationProgress;
        if (progress < 0.7) {
            rotationProgress = progress / 0.7;
        } else {
            const decelProgress = (progress - 0.7) / 0.3;
            rotationProgress = 1 - (1 - decelProgress) * (1 - decelProgress);
        }

        let rotation = rotationProgress * totalRotations;

        if (progress >= 0.95) {
            const stopProgress = (progress - 0.95) / 0.05;
            rotation = totalRotations + (endRotation * stopProgress);
        }

        if (progress >= 1) {
            coin.style.transform = `rotateY(${endRotation}deg) rotateX(${tiltAngle * tiltDirection}deg)`;
            finishFlip(result);
            return;
        }

        const wobble = Math.sin(progress * 20) * 2;
        coin.style.transform = `rotateY(${rotation}deg) rotateX(${tiltAngle * tiltDirection + wobble}deg)`;
        animationId = requestAnimationFrame(frame);
    }

    animationId = requestAnimationFrame(frame);
}

    function linear(t, b, c, d) { return c * t / d + b; }
    function easeOutQuad(t, b, c, d) { t /= d; return -c * t*(t-2) + b; }
    function easeInCubic(t, b, c, d) { t /= d; return c*t*t*t + b; }

    function finishFlip(result) {
        const { win, win_amount, new_balance, betAmount } = roundResult;
        const resultText = result === 'heads' ? 'Орёл' : 'Решка';

        showMessage(
            win ? `Поздравляем! Выпал ${resultText}. Выигрыш: ${win_amount.toFixed(2)}$`
                : `Увы! Выпал ${resultText}. Проигрыш: ${betAmount.toFixed(2)}$`,
            win
        );

        Casino.updateBalance(new_balance);

        setTimeout(() => {
            coin.style.transform = 'rotateY(0) rotateX(0)';
            endFlip();
        }, 1000);
    }

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

    function showError(message) {
        showMessage(message, false);
        messageBox.classList.add('error-message');
        setTimeout(() => messageBox.classList.remove('error-message'), 500);
    }

    function shakeButtons() {
        headsBtn.classList.add('shake');
        tailsBtn.classList.add('shake');
        setTimeout(() => {
            headsBtn.classList.remove('shake');
            tailsBtn.classList.remove('shake');
        }, 500);
    }

    function disableControls(disabled) {
        headsBtn.disabled = disabled;
        tailsBtn.disabled = disabled;
        coin.style.pointerEvents = disabled ? 'none' : 'auto';
        betInput.disabled = disabled;
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
        isFlipping = false;
        userChoice = null;
        animationId = null;
        roundResult = null;

        headsBtn.disabled = false;
        tailsBtn.disabled = false;
        coin.style.pointerEvents = 'auto';
        betInput.disabled = false;

        headsBtn.classList.remove('active');
        tailsBtn.classList.remove('active');

        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }

    init();
});