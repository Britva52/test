document.addEventListener('DOMContentLoaded', function() {
    const selectedBets = [];
    const selectedBetsContainer = document.getElementById('selectedBets');
    const betAmountInput = document.getElementById('betAmount');
    const potentialWinSpan = document.getElementById('potentialWin');
    const placeBetBtn = document.getElementById('placeBetBtn');
    const betResultModal = document.getElementById('betResultModal');
    const betResultContent = document.getElementById('betResultContent');

    // Обработчики для кнопок "Ставка"
    document.querySelectorAll('.place-bet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const oddId = this.dataset.oddId;
            const eventCard = this.closest('.event-card');
            const outcomeOption = this.closest('.outcome-option');

            // Проверяем, не добавлена ли уже эта ставка
            if (selectedBets.some(bet => bet.oddId === oddId)) {
                alert('Эта ставка уже добавлена в купон');
                return;
            }

            // Собираем данные о ставке
            const betData = {
                oddId: oddId,
                eventId: eventCard.dataset.eventId,
                teams: eventCard.querySelector('h3').textContent,
                outcome: outcomeOption.dataset.outcome,
                outcomeName: outcomeOption.querySelector('.outcome-name').textContent,
                odd: parseFloat(outcomeOption.querySelector('.outcome-odd').textContent)
            };

            // Добавляем ставку в список
            selectedBets.push(betData);
            updateBetSlip();
        });
    });

    // Обновление купона ставок
    function updateBetSlip() {
        selectedBetsContainer.innerHTML = '';

        if (selectedBets.length === 0) {
            selectedBetsContainer.innerHTML = '<div class="no-bets">Добавьте ставки из списка событий</div>';
            potentialWinSpan.textContent = '0';
            placeBetBtn.disabled = true;
            return;
        }

        placeBetBtn.disabled = false;

        selectedBets.forEach((bet, index) => {
            const betElement = document.createElement('div');
            betElement.className = 'selected-bet';
            betElement.innerHTML = `
                <div class="bet-info">
                    <div class="bet-teams">${bet.teams}</div>
                    <div class="bet-outcome">${bet.outcomeName} (${bet.odd})</div>
                </div>
                <button class="remove-bet-btn" data-index="${index}">×</button>
            `;
            selectedBetsContainer.appendChild(betElement);
        });

        // Добавляем обработчики для кнопок удаления
        document.querySelectorAll('.remove-bet-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                selectedBets.splice(index, 1);
                updateBetSlip();
            });
        });

        // Рассчитываем потенциальный выигрыш
        calculatePotentialWin();
    }

    // Расчет потенциального выигрыша
    function calculatePotentialWin() {
        const betAmount = parseFloat(betAmountInput.value) || 0;
        const totalOdds = selectedBets.reduce((acc, bet) => acc * bet.odd, 1);
        const potentialWin = betAmount * totalOdds;

        potentialWinSpan.textContent = potentialWin.toFixed(2);
    }

    // Обработчик изменения суммы ставки
    betAmountInput.addEventListener('input', calculatePotentialWin);

    // Обработчик для кнопки "Сделать ставку"
    placeBetBtn.addEventListener('click', function() {
        const betAmount = parseFloat(betAmountInput.value);

        if (isNaN(betAmount) {
            showBetResult(false, 'Введите корректную сумму ставки');
            return;
        }

        if (betAmount <= 0) {
            showBetResult(false, 'Сумма ставки должна быть больше 0');
            return;
        }

        if (selectedBets.length === 0) {
            showBetResult(false, 'Добавьте хотя бы одну ставку');
            return;
        }

        // Проверяем баланс
        const balance = parseFloat(document.querySelector('.balance-amount').textContent);
        if (balance < betAmount) {
            showBetResult(false, 'Недостаточно средств на балансе');
            return;
        }

        // Отправляем ставку на сервер
        placeBet(betAmount);
    });

    // Отправка ставки на сервер
    function placeBet(amount) {
        const betData = {
            amount: amount,
            odds: selectedBets.map(bet => ({
                odd_id: bet.oddId,
                outcome: bet.outcome
            }))
        };

        fetch('/api/place_sport_bet/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(betData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Обновляем баланс
                document.querySelector('.balance-amount').textContent = data.new_balance.toFixed(2);

                // Показываем результат
                if (data.outcome === 'win') {
                    showBetResult(true, `Поздравляем! Вы выиграли ${data.win_amount}$`);
                } else {
                    showBetResult(false, 'К сожалению, ставка не сыграла');
                }

                // Очищаем купон
                selectedBets.length = 0;
                updateBetSlip();

                // Можно обновить историю ставок
                setTimeout(() => location.reload(), 2000);
            } else {
                showBetResult(false, data.error || 'Ошибка при размещении ставки');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showBetResult(false, 'Ошибка соединения с сервером');
        });
    }

    // Показать результат ставки
    function showBetResult(success, message) {
        betResultContent.innerHTML = `
            <h3>${success ? 'Успех!' : 'Ошибка'}</h3>
            <p>${message}</p>
            <button class="close-result-btn">OK</button>
        `;

        betResultModal.style.display = 'block';

        // Обработчик для кнопки закрытия
        document.querySelector('.close-result-btn')?.addEventListener('click', () => {
            betResultModal.style.display = 'none';
        });
    }

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (event) => {
        if (event.target === betResultModal || event.target.classList.contains('close-modal')) {
            betResultModal.style.display = 'none';
        }
    });

    // Вспомогательная функция для получения CSRF токена
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Инициализация
    updateBetSlip();
});