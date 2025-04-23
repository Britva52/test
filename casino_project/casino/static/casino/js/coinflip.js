document.addEventListener('DOMContentLoaded', function() {
    const coin = document.querySelector('.coin');
    const headsBtn = document.getElementById('heads');
    const tailsBtn = document.getElementById('tails');
    const betInput = document.getElementById('bet-amount');
    const messageBox = document.getElementById('coin-message');
    let currentBalance = parseInt(localStorage.getItem('casinoBalance')) || 1000;
    let isFlipping = false;

    function updateBalance() {
        document.querySelectorAll('.balance-amount').forEach(el => {
            el.textContent = currentBalance + '$';
        });
        localStorage.setItem('casinoBalance', currentBalance);
    }

    function showMessage(msg, isWin = false) {
        messageBox.textContent = msg;
        messageBox.style.color = isWin ? 'green' : 'red';
        messageBox.style.display = 'block';
        setTimeout(() => messageBox.style.display = 'none', 3000);
    }

    function flipCoin(betSide) {
        if (isFlipping) return;

        const betAmount = parseInt(betInput.value);
        if (isNaN(betAmount) || betAmount <= 0) {
            showMessage('Введите корректную сумму ставки');
            return;
        }

        if (betAmount > currentBalance) {
            showMessage('Недостаточно средств');
            return;
        }

        isFlipping = true;
        currentBalance -= betAmount;
        updateBalance();

        // Анимация вращения
        coin.style.transform = 'rotateY(0)';
        setTimeout(() => {
            coin.style.transition = 'transform 1s ease-out';
            coin.style.transform = 'rotateY(1800deg)';
        }, 10);

        setTimeout(() => {
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const isWin = result === betSide;

            if (isWin) {
                const winAmount = betAmount * 2;
                currentBalance += winAmount;
                showMessage(`Вы выиграли ${winAmount}$!`, true);

                // Отправка на сервер
                Casino.updateBalance(winAmount);
            } else {
                showMessage('Вы проиграли');
            }

            updateBalance();
            isFlipping = false;
        }, 1000);
    }

    headsBtn.addEventListener('click', () => flipCoin('heads'));
    tailsBtn.addEventListener('click', () => flipCoin('tails'));

    // Инициализация
    updateBalance();
});