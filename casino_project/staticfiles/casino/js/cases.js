document.addEventListener('DOMContentLoaded', function() {
    const caseModal = document.getElementById('caseInfoModal');
    const resultModal = document.getElementById('caseResultModal');
    const openCaseBtns = document.querySelectorAll('.open-case-btn');
    const openCaseModalBtn = document.getElementById('openCaseBtn');
    const continueBtn = document.getElementById('continueBtn');
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
                    alert('Ошибка загрузки кейса');
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

        // Отображаем предметы по группам
        for (const rarity in itemsByRarity) {
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
    }

    // Открытие кейса
    openCaseModalBtn.addEventListener('click', function() {
        if (!currentCase) return;

        const balance = parseFloat(document.querySelector('.balance-amount').textContent);
        if (balance < currentCase.price) {
            alert('Недостаточно средств!');
            return;
        }

        fetch(`/api/open_case/${currentCase.id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                caseModal.style.display = 'none';
                displayResult(data);
            } else {
                alert(data.error || 'Ошибка при открытии кейса');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ошибка при открытии кейса');
        });
    });

    // Отображение результата
    function displayResult(data) {
        const prize = data.prize;
        document.getElementById('prizeImage').src = prize.image;
        document.getElementById('prizeName').textContent = prize.name;
        document.getElementById('prizeValue').textContent = `${prize.value}$`;
        document.getElementById('newBalance').textContent = `Баланс: ${data.new_balance}$`;

        // Обновляем баланс на странице
        document.querySelector('.balance-amount').textContent = data.new_balance;

        // Добавляем класс редкости для анимации
        resultModal.querySelector('.modal-content').className = `modal-content ${prize.rarity}`;
        resultModal.style.display = 'block';
    }

    // Закрытие модальных окон
    document.querySelectorAll('.close-modal, .continue-btn').forEach(btn => {
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
            'legendary': 'Легендарные',
            'mythical': 'Мифические'
        };
        return names[rarity] || rarity;
    }
});