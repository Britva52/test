document.addEventListener('DOMContentLoaded', function() {
    const caseModal = document.getElementById('caseInfoModal');
    const resultModal = document.getElementById('caseResultModal');
    const openCaseBtns = document.querySelectorAll('.open-case-btn');
    const openCaseModalBtn = document.getElementById('openCaseBtn');
    const continueBtn = document.getElementById('continueBtn');
    const closeModalBtn = document.querySelector('.close-modal');
    let currentCase = null;

    // Открытие модального окна с информацией о кейсе
    openCaseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const caseId = this.dataset.caseId;
            fetch(`/api/get_case_details/${caseId}/`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        currentCase = data.case;
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
        document.getElementById('modalCaseImage').src = data.case.image;

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

        // Сортируем по редкости (от обычных к легендарным)
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
                        <img src="${item.image}" alt="${item.name}" class="item-image">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-value">${item.value}$</div>
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

    // Открытие кейса
    openCaseModalBtn.addEventListener('click', function() {
        if (!currentCase) return;

        const balance = parseFloat(document.querySelector('.balance-amount').textContent);
        if (balance < currentCase.price) {
            showError('Недостаточно средств!');
            return;
        }

        // Блокируем кнопку на время открытия
        openCaseModalBtn.disabled = true;
        openCaseModalBtn.innerHTML = '<div class="spinner"></div>';

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
                caseModal.style.display = 'none';
                displayResult(data);
            } else {
                showError(data.error || 'Ошибка при открытии кейса');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Ошибка при открытии кейса');
        })
        .finally(() => {
            openCaseModalBtn.disabled = false;
            openCaseModalBtn.textContent = 'ОТКРЫТЬ КЕЙС';
        });
    });

    // Отображение результата
    function displayResult(data) {
        const prize = data.prize;
        document.getElementById('prizeImage').src = prize.image || '/static/casino/images/default_prize.png';
        document.getElementById('prizeName').textContent = prize.name;
        document.getElementById('prizeValue').textContent = `${prize.value}${prize.currency}`;
        document.getElementById('newBalance').textContent = `Баланс: ${data.new_balance}$`;

        // Обновляем баланс на странице
        document.querySelectorAll('.balance-amount').forEach(el => {
            el.textContent = data.new_balance;
        });

        // Добавляем класс редкости для анимации
        resultModal.className = `modal ${prize.rarity}`;
        resultModal.style.display = 'block';

        // Анимация выигрыша
        const prizeContainer = resultModal.querySelector('.prize-body');
        prizeContainer.classList.add('win-animation');
    }

    // Закрытие модальных окон
    [closeModalBtn, continueBtn].forEach(btn => {
        btn.addEventListener('click', function() {
            caseModal.style.display = 'none';
            resultModal.style.display = 'none';
        });
    });

    // Закрытие при клике вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target === caseModal) {
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