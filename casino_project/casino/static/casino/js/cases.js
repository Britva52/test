document.addEventListener('DOMContentLoaded', function() {
    function getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    const caseModal = document.getElementById('caseInfoModal');
    const resultModal = document.getElementById('caseResultModal');
    const openCaseBtns = document.querySelectorAll('.open-case-btn');
    const openCaseMainBtn = document.getElementById('openCaseBtn');
    const continueBtn = document.getElementById('continueBtn');
    const closeModalBtn = document.querySelector('.close-modal');
    const itemsContainer = document.getElementById('caseItemsContainer');

    let currentCase = null;
    let isSpinning = false;

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    openCaseBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const caseId = this.dataset.caseId;
            try {
                const response = await fetch(`/api/get_case_details/${caseId}/`);
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Ошибка загрузки кейса');
                }

                currentCase = data.case;
                displayCaseInfo(data);
                caseModal.style.display = 'block';
            } catch (error) {
                showError(error.message);
            }
        });
    });

    function displayCaseInfo(data) {
        document.getElementById('modalCaseName').textContent = data.case.name;
        document.getElementById('modalCasePrice').textContent = `${data.case.price}${data.case.currency}`;

        const img = document.getElementById('modalCaseImage');
        img.src = data.case.image || '/static/casino/images/default_case.png';

        document.getElementById('modalBtnPrice').textContent = data.case.price;

        itemsContainer.innerHTML = '';
        data.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = `prize-item ${item.rarity}`;
            itemElement.innerHTML = `
                <img src="${item.image || '/static/casino/images/default_prize.png'}"
                     alt="${item.name}"
                     class="prize-img">
                <div class="prize-info">
                    <div class="prize-name">${item.name}</div>
                    <div class="prize-value">${item.value}${data.case.currency}</div>
                    <div class="prize-probability">${(item.probability * 100).toFixed(2)}%</div>
                </div>
            `;
            itemsContainer.appendChild(itemElement);
        });
    }

    openCaseMainBtn?.addEventListener('click', async function() {
        if (!currentCase || isSpinning) return;

        try {
            const balance = parseFloat(document.querySelector('.balance-amount')?.textContent) || 0;
            if (balance < currentCase.price) {
                showError('Недостаточно средств!');
                return;
            }

            isSpinning = true;
            openCaseMainBtn.disabled = true;

            const response = await fetch(`/api/open_case/${currentCase.id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Ошибка открытия кейса');
            }

            const prizeImg = document.getElementById('prizeImage');
            prizeImg.src = data.prize.image || '/static/casino/images/default_prize.png';
            document.getElementById('prizeName').textContent = data.prize.name;
            document.getElementById('prizeValue').textContent = `${data.prize.value}${data.prize.currency}`;
            resultModal.style.display = 'block';

            const balanceResponse = await fetch('/api/get_balance/');
            const balanceData = await balanceResponse.json();
            if (balanceData.success) {
                document.querySelector('.balance-amount').textContent = balanceData.balance.toFixed(2);
            }

        } catch (error) {
            showError(error.message);
        } finally {
            isSpinning = false;
            openCaseMainBtn.disabled = false;
        }
    });

    function closeModals() {
        caseModal.style.display = 'none';
        resultModal.style.display = 'none';
    }

    [closeModalBtn, continueBtn].forEach(btn => {
        btn?.addEventListener('click', closeModals);
    });

    window.addEventListener('click', function(event) {
        if (event.target === caseModal || event.target === resultModal) {
            closeModals();
        }
    });
});