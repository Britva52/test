document.addEventListener('DOMContentLoaded', function() {
    // Элементы интерфейса
    const caseCards = document.querySelectorAll('.case-card');
    const openingModal = document.getElementById('caseOpeningModal');
    const rouletteTrack = document.getElementById('rouletteTrack');
    const spinBtn = document.getElementById('spinRoulette');
    const prizeDisplay = document.getElementById('prizeDisplay');

    // Переменные состояния
    let currentCase = null;
    let isSpinning = false;
    let spinAnimation = null;

    // Открытие кейса
    caseCards.forEach(card => {
        card.addEventListener('click', async function(e) {
            if (!e.target.classList.contains('open-case-btn') && !e.target.closest('.open-case-btn')) return;

            const caseId = this.dataset.caseId;
            const casePrice = parseFloat(this.querySelector('.open-case-btn').textContent.match(/\d+/)[0]);
            const balance = parseFloat(document.querySelector('.balance-amount').textContent);

            // Проверка баланса
            if (balance < casePrice) {
                showMessage('Недостаточно средств!', 'error');
                return;
            }

            // Загрузка данных кейса
            try {
                const response = await fetch(`/api/get_case/${caseId}/`);
                if (!response.ok) throw new Error('Ошибка загрузки кейса');

                currentCase = await response.json();
                setupRoulette(currentCase.items);

                // Показываем модальное окно
                document.getElementById('openingCaseImage').src = currentCase.image || '';
                openingModal.style.display = 'flex';
            } catch (error) {
                console.error('Error:', error);
                showMessage('Ошибка загрузки кейса', 'error');
            }
        });
    });

    // Крутим рулетку
    spinBtn.addEventListener('click', async function() {
        if (isSpinning || !currentCase) return;

        const casePrice = parseFloat(document.querySelector('.open-case-btn').textContent.match(/\d+/)[0]);
        isSpinning = true;
        spinBtn.disabled = true;

        try {
            // Отправляем запрос на сервер
            const response = await fetch(`/api/open_case/${currentCase.id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error('Ошибка сервера');
            const data = await response.json();

            if (data.success) {
                // Запускаем анимацию рулетки
                await spinRouletteAnimation(data.prize);

                // Показываем выигранный предмет
                showPrize(data.prize, data.new_balance);

                // Обновляем баланс
                document.querySelector('.balance-amount').textContent = data.new_balance + '$';
            } else {
                throw new Error(data.error || 'Ошибка при открытии');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message, 'error');
        } finally {
            isSpinning = false;
            spinBtn.disabled = false;
        }
    });

    // Настройка рулетки
    function setupRoulette(items) {
        rouletteTrack.innerHTML = '';

        // Добавляем элементы (3 цикла для плавности)
        for (let i = 0; i < 3; i++) {
            items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = `roulette-item ${item.rarity}`;
                itemElement.innerHTML = `
                    <img src="${item.image || '{% static 'casino/images/default_item.png' %}'}" alt="${item.name}">
                    <div class="item-value">${item.value}$</div>
                    <div class="item-name">${item.name}</div>
                `;
                rouletteTrack.appendChild(itemElement);
            });
        }
    }

    // Анимация вращения рулетки
    function spinRouletteAnimation(prize) {
        return new Promise(resolve => {
            const items = document.querySelectorAll('.roulette-item');
            const targetItem = Array.from(items).find(item =>
                item.querySelector('.item-value').textContent === `${prize.value}$` &&
                item.querySelector('.item-name').textContent === prize.name
            );

            if (!targetItem) {
                resolve();
                return;
            }

            // Позиционируем рулетку
            const trackWidth = rouletteTrack.offsetWidth;
            const itemWidth = targetItem.offsetWidth;
            const targetPosition = -targetItem.offsetLeft + (trackWidth / 2) - (itemWidth / 2);

            // Дополнительный случайный сдвиг для натуральности
            const randomOffset = Math.random() * 100 - 50;

            // Сброс анимации
            if (spinAnimation) {
                cancelAnimationFrame(spinAnimation);
            }

            let startTime = null;
            const duration = 5000; // 5 секунд

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);

                // Эффект замедления
                const easing = Math.sin(progress * Math.PI / 2);
                const distance = targetPosition + randomOffset;
                const currentPosition = distance * easing;

                rouletteTrack.style.transform = `translateX(${currentPosition}px)`;

                if (progress < 1) {
                    spinAnimation = requestAnimationFrame(animate);
                } else {
                    // Точная фиксация на выигрышном предмете
                    rouletteTrack.style.transition = 'transform 0.5s ease-out';
                    rouletteTrack.style.transform = `translateX(${targetPosition}px)`;
                    setTimeout(resolve, 500);
                }
            };

            // Начальное ускорение
            rouletteTrack.style.transition = 'none';
            spinAnimation = requestAnimationFrame(animate);
        });
    }

    // Показ выигранного предмета
    function showPrize(prize, newBalance) {
        prizeDisplay.innerHTML = `
            <div class="prize-item ${prize.rarity}">
                <img src="${prize.image || '{% static 'casino/images/default_item.png' %}'}" alt="${prize.name}">
                <div class="prize-info">
                    <div class="prize-name">${prize.name}</div>
                    <div class="prize-value">${prize.value}$</div>
                    <div class="new-balance">Новый баланс: ${newBalance}$</div>
                </div>
            </div>
        `;
    }

    // Закрытие модального окна
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    function closeModal() {
        openingModal.style.display = 'none';
        if (spinAnimation) {
            cancelAnimationFrame(spinAnimation);
        }
    }

    // Вспомогательные функции
    function showMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.textContent = text;
        document.body.appendChild(msg);

        setTimeout(() => msg.remove(), 3000);
    }

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
});