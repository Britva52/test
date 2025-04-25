document.addEventListener('DOMContentLoaded', function() {
    const betInput = document.querySelector('.bets-container .bet-input');
    const placeBetBtn = document.querySelector('.place-bet-btn');
    const outcomeBtns = document.querySelectorAll('.outcome-btn');
    let selectedOutcome = null;

    outcomeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            outcomeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedOutcome = {
                element: this,
                multiplier: parseFloat(this.dataset.multiplier)
            };
        });
    });

    placeBetBtn.addEventListener('click', async function() {
        if (!selectedOutcome) {
            Casino.showMessage('bets-message', "Выберите исход события", false);
            return;
        }

        const betAmount = parseFloat(betInput.value);
        if (isNaN(betAmount) || betAmount <= 0) {
            Casino.showMessage('bets-message', "Введите корректную сумму", false);
            return;
        }

        const balanceCheck = Casino.checkBalance(betAmount);
        if (!balanceCheck.enough) {
            Casino.showMessage('bets-message', "Недостаточно средств", false);
            return;
        }

        Casino.toggleButtons(true);
        Casino.showMessage('bets-message', "Обработка ставки...", true);

        try {
            const eventName = selectedOutcome.element.closest('.event-card').querySelector('h3').textContent;
            const outcomeName = selectedOutcome.element.textContent.split(' (')[0];

            const response = await Casino.sendRequest('/api/place_bet/sport/', {
                amount: betAmount,
                event: eventName,
                outcome: outcomeName,
                multiplier: selectedOutcome.multiplier
            });

            if (response.success) {
                Casino.updateBalance(response.new_balance);
                const message = response.won ?
                    `Выигрыш: ${response.win_amount}$` :
                    "Ставка не сыграла";
                Casino.showMessage('bets-message', message, response.won);
            } else {
                Casino.showMessage('bets-message', response.error, false);
            }
        } catch (error) {
            console.error('Error:', error);
            Casino.showMessage('bets-message', "Ошибка соединения", false);
        } finally {
            Casino.toggleButtons(false);
        }
    });
});