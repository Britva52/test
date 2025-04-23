document.addEventListener('DOMContentLoaded', () => {
    console.log("Roulette initialized");

    // Проверяем, находимся ли мы на странице рулетки
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) {
        console.log("Not on roulette page, skipping initialization");
        return;
    }

    // Настройка canvas
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    // Конфигурация колеса
    const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const colors = ['green'].concat(...Array(18).fill(['red', 'black']).flat());
    const anglePerNumber = (2 * Math.PI) / numbers.length;

    let currentAngle = 0;
    let isSpinning = false;
    let selectedBet = null;

    // Первоначальная отрисовка колеса
    drawWheel();

    // Функция отрисовки колеса
    function drawWheel(angle = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 10;

        // Рисуем сектора
        numbers.forEach((num, i) => {
            const startAngle = angle + i * anglePerNumber;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + anglePerNumber);
            ctx.fillStyle = colors[i];
            ctx.fill();

            // Текст чисел
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + anglePerNumber/2);
            ctx.fillStyle = colors[i] === 'black' ? 'white' : 'black';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num, radius - 20, 0);
            ctx.restore();
        });

        // Стрелка
        ctx.beginPath();
        ctx.moveTo(centerX - 15, 10);
        ctx.lineTo(centerX + 15, 10);
        ctx.lineTo(centerX, 40);
        ctx.fillStyle = 'gold';
        ctx.fill();
    }

    // Функция вращения колеса
    function spinWheel(resultNumber, callback) {
        if (isSpinning) return;
        isSpinning = true;

        const targetIndex = numbers.indexOf(parseInt(resultNumber));
        if (targetIndex === -1) {
            console.error("Invalid number:", resultNumber);
            return;
        }

        const targetAngle = 2 * Math.PI * 5 - (targetIndex * anglePerNumber);
        const startTime = Date.now();
        const duration = 3000;

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = Math.sin(progress * Math.PI/2);

            currentAngle = eased * targetAngle;
            drawWheel(currentAngle);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isSpinning = false;
                if (callback) callback();
            }
        }

        animate();
    }

    // Обработчики событий для ставок
    document.querySelectorAll('.number-cell, .bet-btn').forEach(el => {
        el.addEventListener('click', () => {
            if (isSpinning) return;
            document.querySelectorAll('.active').forEach(a => a.classList.remove('active'));
            el.classList.add('active');
            selectedBet = {
                type: el.dataset.type || 'number',
                value: el.dataset.value || el.textContent
            };
        });
    });

    // Обработчик кнопки "Крутить"
    document.querySelector('.spin-btn')?.addEventListener('click', async function() {
        if (isSpinning || !selectedBet) return;
        const amount = parseFloat(document.querySelector('.bet-input').value);
        const balanceCheck = Casino.checkBalance(amount);

        if (!balanceCheck.enough) {
            Casino.showMessage('roulette-message', `Недостаточно средств! Баланс: ${balanceCheck.currentBalance}$`, false);
            return;
        }

        Casino.toggleButtons(true);
        Casino.showMessage('roulette-message', "Крутим...", true);

        try {
            const response = await Casino.sendRequest('/api/place_bet/roulette/', {
                amount: amount,
                type: selectedBet.type,
                value: selectedBet.value
            });

            if (!response.success) {
                Casino.showMessage('roulette-message', response.error, false);
                return;
            }

                // Крутим колесо
            spinWheel(response.win_number, () => {
                Casino.updateBalance(response.new_balance);

                if (response.win) {
                    Casino.showMessage('roulette-message',
                        `Выигрыш: ${amount}$\nЧисло: ${response.win_number} (${response.win_color})`,
                        true);
                } else {
                    Casino.showMessage('roulette-message',
                        `Проигрыш: ${amount}$\nЧисло: ${response.win_number} (${response.win_color})`,
                        false);
                }
            });

        } catch (error) {
            console.error('Error:', error);
            Casino.showMessage('roulette-message', 'Ошибка соединения', false);
        } finally {
            Casino.toggleButtons(false);
        }
    });

    // Обработчик кнопки пополнения баланса
    document.getElementById('add-funds-btn')?.addEventListener('click', async function() {
        this.disabled = true;
        try {
            const response = await Casino.sendRequest('/api/add_funds/', {});

            if (response.success) {
                Casino.updateBalance(response.new_balance);
                Casino.showMessage('roulette-message', 'Баланс пополнен на 150$!', true);
                setTimeout(() => this.disabled = false, 3600000); // 1 hour cooldown
            } else {
                Casino.showMessage('roulette-message', response.error, false);
                this.disabled = false;
            }
        } catch (error) {
            console.error("Add funds error:", error);
            this.disabled = false;
        }
    });
});