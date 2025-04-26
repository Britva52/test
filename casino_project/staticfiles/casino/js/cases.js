document.addEventListener('DOMContentLoaded', function() {
    const caseModal = document.getElementById('caseInfoModal');
    const resultModal = document.getElementById('caseResultModal');
    const openCaseBtns = document.querySelectorAll('.open-case-btn');
    const openCaseModalBtn = document.getElementById('openCaseBtn');
    const continueBtn = document.getElementById('continueBtn');
    const closeModalBtn = document.querySelector('.close-modal');

    let currentCase = null;
    let isSpinning = false;
    let spinInterval;
    let spinItems = [];
    let spinSpeed = 30;
    let spinPosition = 0;
    let spinDuration = 3000; // 3 секунды анимации

    // Открытие модального окна с информацией о кейсе
    openCaseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const caseId = this.dataset.caseId;
            fetch(`/api/get_case_details/${caseId}/`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        currentCase = data.case;
                        spinItems = data.items; // Сохраняем предметы для анимации
                        displayCaseInfo(data);
                        caseModal.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showError('Ошибка загрузки кейса');
                });
        });
    });

    // Отображение информации о кейсе
    function displayCaseInfo(data) {
        document.getElementById('modalCaseName').textContent = data.case.name;
        document.getElementById('modalCasePrice').textContent = `${data.case.price}$`;
        document.getElementById('modalCaseImage').src = data.case.image || '/static/casino/images/default_case.png';
        document.getElementById('modalBtnPrice').textContent = `${data.case.price}${data.case.currency}`;
        document.getElementById('modalContent').className = `modal-content ${data.case.rarity || 'common'}`;

        const itemsContainer = document.getElementById('caseItemsContainer');
        itemsContainer.innerHTML = '';

        // Группируем предметы по редкости
        const itemsByRarity = {};
        data.items.forEach(item => {
            if (!itemsByRarity[item.rarity]) {
                itemsByRarity[item.rarity] = [];
            }
            itemsByRarity[item.rarity].push(item);
        });

        // Сортируем по редкости
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

        rarityOrder.forEach(rarity => {
            if (itemsByRarity[rarity]) {
                const rarityGroup = document.createElement('div');
                rarityGroup.className = `rarity-group ${rarity}`;

                const rarityTitle = document.createElement('h3');
                rarityTitle.className = 'rarity-title';
                rarityTitle.textContent = getRarityName(rarity);
                rarityGroup.appendChild(rarityTitle);

                const itemsList = document.createElement('div');
                itemsList.className = 'items-list';

                itemsByRarity[rarity].forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'case-item';
                    itemElement.innerHTML = `
                        <img src="${item.image || '/static/casino/images/default_prize.png'}" alt="${item.name}" class="item-image">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-value">${item.value}${data.case.currency}</div>
                            <div class="item-probability">${(item.probability * 100).toFixed(2)}%</div>
                        </div>
                    `;
                    itemsList.appendChild(itemElement);
                });

                rarityGroup.appendChild(itemsList);
                itemsContainer.appendChild(rarityGroup);
            }
        });
    }

    // Функция запуска анимации прокрутки
    function startSpinAnimation() {
        const spinContainer = document.createElement('div');
        spinContainer.className = 'spin-container';
        spinContainer.innerHTML = `
            <div class="spin-items-wrapper">
                <div class="spin-items-track"></div>
            </div>
            <div class="spin-pointer"></div>
        `;
        caseModal.querySelector('.modal-content').appendChild(spinContainer);

        const track = spinContainer.querySelector('.spin-items-track');

        // Добавляем предметы для прокрутки (3 копии)
        for (let i = 0; i < 3; i++) {
            spinItems.forEach(item => {
                const spinItem = document.createElement('div');
                spinItem.className = 'spin-item';
                spinItem.innerHTML = `
                    <img src="${item.image || '/static/casino/images/default_prize.png'}" alt="${item.name}" class="spin-item-image">
                    <div class="spin-item-value">${item.value}${currentCase.currency}</div>
                `;
                track.appendChild(spinItem);
            });
        }

        // Запускаем анимацию
        spinPosition = 0;
        const startTime = Date.now();

        spinInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / spinDuration, 1);

            // Замедляем со временем
            spinSpeed = 30 * (1 - progress * 0.9);
            spinPosition += spinSpeed;

            track.style.transform = `translateY(-${spinPosition % (spinItems.length * 100)}px)`;

            if (progress >= 1) {
                clearInterval(spinInterval);
                // После завершения анимации делаем запрос на сервер
                fetchPrizeResult();
            }
        }, 16);
    }

    // Функция получения результата от сервера
    function fetchPrizeResult() {
        fetch(`/api/open_case/${currentCase.id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Удаляем контейнер с анимацией
                document.querySelector('.spin-container').remove();
                // Показываем результат
                displayResult(data.prize);
            } else {
                showError(data.error || 'Ошибка при открытии кейса');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Ошибка при открытии кейса');
        })
        .finally(() => {
            isSpinning = false;
            openCaseModalBtn.disabled = false;
        });
    }

    // Открытие кейса с анимацией
    openCaseModalBtn.addEventListener('click', function() {
        if (!currentCase || isSpinning) return;

        const balance = parseFloat(document.querySelector('.balance-amount').textContent);
        if (balance < currentCase.price) {
            showError('Недостаточно средств!');
            return;
        }

        // Блокируем кнопку
        openCaseModalBtn.disabled = true;
        isSpinning = true;

        // Запускаем анимацию
        startSpinAnimation();
    });

    // Отображение результата
    function displayResult(prize) {
        document.getElementById('prizeImage').src = prize.image || '/static/casino/images/default_prize.png';
        document.getElementById('prizeName').textContent = prize.name;
        document.getElementById('prizeValue').textContent = `${prize.value}${prize.currency}`;

        // Обновляем баланс
        Casino.syncBalance();

        // Показываем модальное окно с результатом
        resultModal.className = `modal ${prize.rarity}`;
        resultModal.style.display = 'block';
    }

    // Закрытие модальных окон
    [closeModalBtn, continueBtn].forEach(btn => {
        btn.addEventListener('click', function() {
            if (isSpinning) {
                clearInterval(spinInterval);
                const spinContainer = document.querySelector('.spin-container');
                if (spinContainer) spinContainer.remove();
                isSpinning = false;
                openCaseModalBtn.disabled = false;
            }
            caseModal.style.display = 'none';
            resultModal.style.display = 'none';
        });
    });

    // Закрытие при клике вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target === caseModal) {
            if (isSpinning) {
                clearInterval(spinInterval);
                const spinContainer = document.querySelector('.spin-container');
                if (spinContainer) spinContainer.remove();
                isSpinning = false;
                openCaseModalBtn.disabled = false;
            }
            caseModal.style.display = 'none';
        }
        if (event.target === resultModal) {
            resultModal.style.display = 'none';
        }
    });

    // Вспомогательные функции
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

    function getRarityName(rarity) {
        const names = {
            'common': 'Обычные',
            'uncommon': 'Необычные',
            'rare': 'Редкие',
            'epic': 'Эпические',
            'legendary': 'Легендарные'
        };
        return names[rarity] || rarity;
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
});