document.addEventListener('DOMContentLoaded', function() {
    const openCaseButtons = document.querySelectorAll('.open-case-btn');
    const prizeModal = document.getElementById('prizeModal');
    const prizeImage = document.getElementById('prizeImage');
    const prizeValue = document.getElementById('prizeValue');
    const newBalance = document.getElementById('newBalance');
    const closeBtn = document.querySelector('.close-btn');

    openCaseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const caseId = this.getAttribute('data-case-id');

            fetch(`/open_case/${caseId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': Casino.getCookie('csrftoken'),
                },
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Показываем выигрыш
                    prizeImage.src = data.item.image;
                    prizeValue.textContent = data.item.value;
                    newBalance.textContent = data.new_balance;

                    // Добавляем класс редкости
                    prizeModal.className = 'modal ' + data.item.rarity;
                    prizeModal.style.display = 'flex';

                    // Обновляем баланс на странице
                    document.querySelectorAll('.balance-amount').forEach(el => {
                        el.textContent = data.new_balance + '$';
                    });
                } else {
                    alert('Ошибка: ' + data.error);
                }
            });
        });
    });

    closeBtn.addEventListener('click', function() {
        prizeModal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === prizeModal) {
            prizeModal.style.display = 'none';
        }
    });
});