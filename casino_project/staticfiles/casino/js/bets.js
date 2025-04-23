document.addEventListener('DOMContentLoaded', function() {
    const betBtn = document.getElementById('place-bet');
    const betInput = document.getElementById('bet-amount');
    const matchSelect = document.getElementById('match');
    const messageBox = document.getElementById('bets-message');
    let currentBalance = parseInt(localStorage.getItem('casinoBalance')) || 1000;

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

    betBtn.addEventListener('click', function() {
        const betAmount = parseFloat(betInput.value);
        const multiplier = parseFloat(matchSelect.value);

        if (isNaN(betAmount) {
            showMessage('Введите сумму ставки');
            return;
        }

        if (betAmount <= 0) {
            showMessage('Сумма ставки должна быть больше 0');
            return;
        }

        if (betAmount > currentBalance) {
            showMessage('Недостаточно средств');
            return;
        }

        currentBalance -= betAmount;
        updateBalance();

        // Симуляция исхода события (50/50)
        const isWin = Math.random() < 0.5;

        setTimeout(() => {
            if (isWin) {
                const winAmount = betAmount * multiplier;
                currentBalance += winAmount;
                showMessage(`Ваша команда победила! Выигрыш: ${winAmount.toFixed(2)}$`, true);

                // Отправка на сервер
                Casino.updateBalance(winAmount);
            } else {
                showMessage('Ваша команда проиграла');
            }

            updateBalance();
        }, 1500);
    });

    // Инициализация
    updateBalance();
});