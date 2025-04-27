document.addEventListener('DOMContentLoaded', function() {
    // Состояние приложения
    let selectedBets = [];
    const MIN_RESOLVE_TIME = 15 * 60 * 1000; // 15 минут в миллисекундах
    const MAX_RESOLVE_TIME = 30 * 60 * 1000; // 30 минут

    // DOM элементы
    const selectedBetsContainer = document.getElementById('selectedBets');
    const betAmountInput = document.getElementById('betAmount');
    const potentialWinSpan = document.getElementById('potentialWin');
    const placeBetBtn = document.getElementById('placeBetBtn');
    const clearBetsBtn = document.getElementById('clearBetsBtn');
    const betResultModal = document.getElementById('betResultModal');
    const betResultContent = document.getElementById('betResultContent');
    const sportFilterBtns = document.querySelectorAll('.sport-filter-btn');
    const historyFilterSelect = document.getElementById('history-filter-select');

    // Инициализация
    updateBetSlip();
    startEventUpdates();
    setupEventListeners();

    // Основные функции
    function setupEventListeners() {
        // Обработчики для кнопок "Добавить" в ставках
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('add-to-bet-btn')) {
                handleAddBetButtonClick(e);
            }
        });

        // Обработчики для кнопок удаления ставок
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-bet-btn')) {
                const index = parseInt(e.target.dataset.index);
                selectedBets.splice(index, 1);
                updateBetSlip();
                showMessage('Ставка удалена из купона', true);
            }
        });

        // Остальные обработчики
        betAmountInput.addEventListener('input', calculatePotentialWin);
        clearBetsBtn.addEventListener('click', clearAllBets);
        placeBetBtn.addEventListener('click', handlePlaceBet);

        // Фильтры
        sportFilterBtns.forEach(btn => {
            btn.addEventListener('click', handleSportFilterClick);
        });

        historyFilterSelect.addEventListener('change', handleHistoryFilterChange);

        // Модальное окно
        window.addEventListener('click', handleModalClose);
    }

    function handleAddBetButtonClick(e) {
        console.log('Add button clicked');
        const oddId = e.target.dataset.oddId;
        console.log('Odd ID:', oddId);
        const eventCard = e.target.closest('.event-card');
        const outcomeOption = e.target.closest('.outcome-option');

        // Проверка дублирования ставки
        if (selectedBets.some(bet => bet.oddId === oddId)) {
            showMessage('Эта ставка уже добавлена в купон', false);
            return;
        }

        // Сбор данных о ставке
        const betData = {
            oddId: oddId,
            eventId: eventCard.dataset.eventId,
            teams: `${eventCard.querySelector('.team1').textContent} vs ${eventCard.querySelector('.team2').textContent}`,
            outcome: outcomeOption.dataset.outcome,
            outcomeName: outcomeOption.querySelector('.outcome-name').textContent,
            odd: parseFloat(outcomeOption.querySelector('.outcome-odd').textContent),
            sport: eventCard.dataset.sport
        };

        selectedBets.push(betData);
        updateBetSlip();
        showMessage('Ставка добавлена в купон', true);
    }

    // Функция для имитации обработки ставки
    function simulateBetResolution(betId) {
        const resolveTime = Math.floor(Math.random() * (MAX_RESOLVE_TIME - MIN_RESOLVE_TIME + 1)) + MIN_RESOLVE_TIME;

        setTimeout(() => {
            // Случайный результат: win, lose или refund (возврат)
            const possibleOutcomes = ['win', 'lose', 'refund'];
            const weights = [0.45, 0.45, 0.1]; // Вероятности: 45% win, 45% lose, 10% refund
            const randomOutcome = weightedRandom(possibleOutcomes, weights);

            // Обновляем статус ставки
            updateBetOutcome(betId, randomOutcome);

        }, resolveTime);
    }

    // Функция для взвешенного случайного выбора
    function weightedRandom(items, weights) {
        let i;
        for (i = 1; i < weights.length; i++) {
            weights[i] += weights[i - 1];
        }

        const random = Math.random() * weights[weights.length - 1];

        for (i = 0; i < weights.length; i++) {
            if (weights[i] > random) {
                break;
            }
        }

        return items[i];
    }

    // Функция для обновления исхода ставки
    async function updateBetOutcome(betId, outcome) {
        try {
            const response = await fetch('/api/resolve_bet/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    bet_id: betId,
                    outcome: outcome
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка сервера при обновлении ставки');
            }

            const result = await response.json();

            if (result.success) {
                // Обновляем историю ставок
                fetchBetHistory();

                // Обновляем баланс
                if (result.new_balance !== undefined) {
                    Casino.updateBalance(result.new_balance);
                }

                // Показываем уведомление
                showMessage(`Ставка #${betId} завершена: ${getOutcomeDisplay(outcome)}`, true);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка сервера');
            }
        } catch (error) {
            console.error('Ошибка при обновлении ставки:', error);
            showMessage('Ошибка при обработке результата ставки', false);
        }
    }

    // Вспомогательная функция для отображения результата
    function getOutcomeDisplay(outcome) {
        const outcomes = {
            'win': 'Выигрыш',
            'lose': 'Проигрыш',
            'refund': 'Возврат средств'
        };
        return outcomes[outcome] || outcome;
    }

    async function handlePlaceBet() {
        console.log('Начало обработки ставки');

        try {
            // Валидация данных
            const betAmount = parseFloat(betAmountInput.value);
            if (!validateBetData(betAmount)) return;

            // Проверка баланса
            const balanceCheck = await Casino.checkBalance(betAmount);
            if (!balanceCheck.enough) {
                showMessage(`Недостаточно средств. Баланс: ${balanceCheck.currentBalance.toFixed(2)}$`, false);
                return;
            }

            // Подтверждение ставки
            const potentialWin = (betAmount * selectedBets.reduce((acc, bet) => acc * bet.odd, 1)).toFixed(2);
            if (!confirm(`Подтвердить ставку на ${betAmount}$?\n\nПотенциальный выигрыш: ${potentialWin}$`)) {
                return;
            }

            // Подготовка данных
            const betData = {
                amount: betAmount,
                odds: selectedBets.map(bet => ({
                    odd_id: bet.oddId,
                    outcome: bet.outcome,
                    event_id: bet.eventId
                }))
            };

            // Визуальная индикация загрузки
            placeBetBtn.disabled = true;
            placeBetBtn.innerHTML = 'Обработка... <span class="loading-spinner"></span>';

            // Отправка ставки с таймаутом
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch('/api/place_sport_bet/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(betData),
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));

            // Обработка ответа
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Ответ сервера:', result);

            if (!result.success) {
                throw new Error(result.error || 'Неизвестная ошибка сервера');
            }

            // Успешная ставка
            showBetResult(
                true,
                'Ставка успешно размещена!',
                `Потенциальный выигрыш: ${result.potential_win.toFixed(2)}$`
            );

            // Обновление интерфейса
            Casino.updateBalance(result.new_balance);
            selectedBets = [];
            updateBetSlip();
            fetchBetHistory();

            // Запускаем таймер для обработки ставки
            if (result.bet_id) {
                simulateBetResolution(result.bet_id);
            }

        } catch (error) {
            console.error('Ошибка при размещении ставки:', error);
            handleBetError(error);
        } finally {
            placeBetBtn.disabled = false;
            placeBetBtn.textContent = 'Сделать ставку';
        }
    }

    function validateBetData(betAmount) {
        if (isNaN(betAmount) || betAmount <= 0) {
            showMessage('Введите корректную сумму ставки', false);
            return false;
        }

        if (selectedBets.length === 0) {
            showMessage('Добавьте хотя бы одну ставку', false);
            return false;
        }

        return true;
    }

    function handleBetError(error) {
        let errorMessage = error.message || 'Не удалось разместить ставку';

        if (error.name === 'AbortError') {
            errorMessage = 'Превышено время ожидания ответа сервера';
        }

        showBetResult(false, 'Ошибка', errorMessage);
    }

    // Вспомогательные функции
    function updateBetSlip() {
        selectedBetsContainer.innerHTML = selectedBets.length === 0 ?
            createEmptyBetSlipMessage() :
            createBetSlipContent();

        calculatePotentialWin();
    }

    function createEmptyBetSlipMessage() {
        return `
            <div class="no-bets-message">
                <p>Добавьте ставки из списка событий</p>
                <p>Выберите исход и нажмите "Добавить"</p>
            </div>
        `;
    }

    function createBetSlipContent() {
        placeBetBtn.disabled = false;
        return selectedBets.map((bet, index) => `
            <div class="selected-bet">
                <div class="bet-info">
                    <div class="bet-teams">${bet.teams}</div>
                    <div class="bet-outcome">${bet.outcomeName} (${bet.odd.toFixed(2)})</div>
                    <div class="bet-sport">${getSportName(bet.sport)}</div>
                </div>
                <button class="remove-bet-btn" data-index="${index}">×</button>
            </div>
        `).join('');
    }

    function calculatePotentialWin() {
        const betAmount = parseFloat(betAmountInput.value) || 0;
        const totalOdds = selectedBets.reduce((acc, bet) => acc * bet.odd, 1);
        potentialWinSpan.textContent = (betAmount * totalOdds).toFixed(2);
    }

    function clearAllBets() {
        selectedBets = [];
        updateBetSlip();
        showMessage('Купон очищен', true);
    }

    function showBetResult(success, title, message) {
        betResultContent.innerHTML = `
            <h3 class="${success ? 'success' : 'error'}">${title}</h3>
            <p>${message}</p>
            <button class="close-result-btn">OK</button>
        `;

        betResultModal.style.display = 'block';

        // Добавляем обработчик для кнопки OK
        const closeBtn = betResultContent.querySelector('.close-result-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                betResultModal.style.display = 'none';
            });
        }
    }

    function handleModalClose(event) {
        if (event.target === betResultModal ||
            event.target.classList.contains('close-modal') ||
            event.target.classList.contains('close-result-btn')) {
            betResultModal.style.display = 'none';
        }
    }

    function handleSportFilterClick() {
        const sport = this.dataset.sport;
        sportFilterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filterEventsBySport(sport);
    }

    function handleHistoryFilterChange() {
        const filter = this.value;
        document.querySelectorAll('.bet-item').forEach(item => {
            item.style.display = filter === 'all' || item.classList.contains(filter) ? 'flex' : 'none';
        });
    }

    // Casino API
    const Casino = {
        checkBalance: async function(amount) {
            const response = await fetch('/api/get_balance/');
            const data = await response.json();
            return {
                enough: data.balance >= amount,
                currentBalance: data.balance
            };
        },

        updateBalance: function(newBalance) {
            document.querySelectorAll('.balance-amount').forEach(el => {
                el.textContent = newBalance.toFixed(2);
            });
        }
    };

    // Обновление событий
    function startEventUpdates() {
        fetchEvents();
        setInterval(fetchEvents, 30000);
    }

    async function fetchEvents() {
        try {
            const response = await fetch('/api/get_live_events/');
            const data = await response.json();
            if (data.success) updateEventsList(data.events);
        } catch (error) {
            console.error('Ошибка при загрузке событий:', error);
        }
    }

    function updateEventsList(events) {
        const eventsContainer = document.querySelector('.events-list');

        eventsContainer.innerHTML = events && events.length ?
            createEventsListContent(events) :
            createNoEventsMessage();

        applyCurrentSportFilter();
    }

    function createEventsListContent(events) {
        return events.map(event => `
            <div class="event-card" data-event-id="${event.id}" data-sport="${event.sport_type.toLowerCase()}">
                <div class="event-header">
                    <div class="event-teams">
                        <span class="team team1">${event.team1}</span>
                        <span class="vs">vs</span>
                        <span class="team team2">${event.team2}</span>
                    </div>
                    <div class="event-meta">
                        <span class="event-time">${formatDateTime(event.start_time)}</span>
                        <span class="event-sport">${event.sport_type}</span>
                    </div>
                </div>
                <div class="event-odds">
                    ${event.odds.map(odd => `
                        <div class="outcome-option" data-outcome="${odd.outcome}">
                            <span class="outcome-name">${getOutcomeName(odd.outcome)}</span>
                            <span class="outcome-odd">${odd.odd.toFixed(2)}</span>
                            <button class="add-to-bet-btn" data-odd-id="${odd.id}">Добавить</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function createNoEventsMessage() {
        return `
            <div class="no-events">
                <p>Нет доступных событий</p>
                <p>Попробуйте позже или выберите другой вид спорта</p>
            </div>
        `;
    }

    function applyCurrentSportFilter() {
        const activeFilter = document.querySelector('.sport-filter-btn.active')?.dataset.sport || 'all';
        filterEventsBySport(activeFilter);
    }

    // Вспомогательные функции
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) return decodeURIComponent(value);
        }
        return null;
    }

    function showMessage(text, isSuccess) {
        const messageBox = document.createElement('div');
        messageBox.className = `message ${isSuccess ? 'success' : 'error'}`;
        messageBox.textContent = text;
        document.body.appendChild(messageBox);

        setTimeout(() => {
            messageBox.style.opacity = '0';
            setTimeout(() => messageBox.remove(), 500);
        }, 3000);
    }

    function getSportName(sportKey) {
        const sports = {
            'football': 'Футбол',
            'tennis': 'Теннис',
            'basketball': 'Баскетбол',
            'hockey': 'Хоккей',
            'default': 'Другой'
        };
        return sports[sportKey] || sports['default'];
    }

    function getOutcomeName(outcome) {
        const outcomes = {
            'win1': 'П1', 'win2': 'П2', 'draw': 'X',
            'handicap1': 'Ф1', 'handicap2': 'Ф2',
            'total_over': 'ТБ', 'total_under': 'ТМ'
        };
        return outcomes[outcome] || outcome;
    }

    function formatDateTime(datetimeStr) {
        const date = new Date(datetimeStr);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', '');
    }

    function filterEventsBySport(sport) {
        document.querySelectorAll('.event-card').forEach(card => {
            card.style.display = sport === 'all' || card.dataset.sport === sport ? 'block' : 'none';
        });
    }

    // История ставок
    async function fetchBetHistory() {
        try {
            const response = await fetch('/api/get_bet_history/');
            if (response.ok) {
                const data = await response.json();
                if (data.success) updateBetHistory(data.bets);
            }
        } catch (error) {
            console.error('Ошибка при загрузке истории ставок:', error);
        }
    }

    function updateBetHistory(bets) {
        const historyContainer = document.getElementById('betsHistory');
        if (!historyContainer) return;

        historyContainer.innerHTML = bets.length ?
            createBetHistoryContent(bets) :
            createNoBetsMessage();
    }

    function createBetHistoryContent(bets) {
        return bets.map(bet => `
            <div class="bet-item ${bet.outcome}">
                <div class="bet-header">
                    <span class="bet-event">${bet.event.team1} vs ${bet.event.team2}</span>
                    <span class="bet-time">${new Date(bet.created_at).toLocaleString()}</span>
                </div>
                <div class="bet-details">
                    <span class="bet-outcome">${bet.odd.outcome} (x${bet.odd.odd})</span>
                    <span class="bet-amount">${bet.amount}$</span>
                </div>
                <div class="bet-result">
                    ${bet.outcome === 'win' ?
                        `<span class="win">+${bet.potential_win}$</span>` :
                        bet.outcome === 'lose' ?
                        `<span class="lose">-${bet.amount}$</span>` :
                        bet.outcome === 'refund' ?
                        `<span class="refund">Возврат ${bet.amount}$</span>` :
                        `<span class="pending">В обработке</span>`}
                </div>
            </div>
        `).join('');
    }

    function createNoBetsMessage() {
        return `
            <div class="no-bets">
                <p>У вас пока нет ставок</p>
            </div>
        `;
    }
});