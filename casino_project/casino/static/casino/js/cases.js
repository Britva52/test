document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('prizeModal');
    const modalImage = document.getElementById('prizeImage');
    const modalValue = document.getElementById('prizeValue');
    const modalBalance = document.getElementById('newBalance');
    const closeBtn = document.querySelector('.close-btn');

    document.querySelectorAll('.open-case-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const caseId = this.dataset.caseId;
            const casePrice = parseFloat(this.querySelector('.case-price').textContent);
            const balanceCheck = Casino.checkBalance(casePrice);

            if (!balanceCheck.enough) {
                Casino.showMessage('cases-message', "Недостаточно средств", false);
                return;
            }

            Casino.toggleButtons(true);

            try {
                const response = await Casino.sendRequest('/api/open_case/', {
                    case_id: caseId,
                    amount: casePrice
                });

                if (response.success) {
                    modalImage.src = response.item_image || '{% static "casino/images/default_prize.png" %}';
                    modalValue.textContent = response.prize_value;
                    modalBalance.textContent = response.new_balance;
                    modal.style.display = 'flex';

                    Casino.updateBalance(response.new_balance);
                } else {
                    Casino.showMessage('cases-message', response.error || "Ошибка при открытии кейса", false);
                }
            } catch (error) {
                console.error('Error:', error);
                Casino.showMessage('cases-message', "Ошибка соединения", false);
            } finally {
                Casino.toggleButtons(false);
            }
        });
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => e.target === modal && (modal.style.display = 'none'));
});