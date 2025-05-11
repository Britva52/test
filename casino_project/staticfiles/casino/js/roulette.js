document.addEventListener('DOMContentLoaded', () => {
    console.log("Roulette initialized");

    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    // Правильный порядок чисел и цветов для европейской рулетки
    const wheelLayout = [
        {number: 0, color: 'green'},
        {number: 32, color: 'red'},
        {number: 15, color: 'black'},
        {number: 19, color: 'red'},
        {number: 4, color: 'black'},
        {number: 21, color: 'red'},
        {number: 2, color: 'black'},
        {number: 25, color: 'red'},
        {number: 17, color: 'black'},
        {number: 34, color: 'red'},
        {number: 6, color: 'black'},
        {number: 27, color: 'red'},
        {number: 13, color: 'black'},
        {number: 36, color: 'red'},
        {number: 11, color: 'black'},
        {number: 30, color: 'red'},
        {number: 8, color: 'black'},
        {number: 23, color: 'red'},
        {number: 10, color: 'black'},
        {number: 5, color: 'red'},
        {number: 24, color: 'black'},
        {number: 16, color: 'red'},
        {number: 33, color: 'black'},
        {number: 1, color: 'red'},
        {number: 20, color: 'black'},
        {number: 14, color: 'red'},
        {number: 31, color: 'black'},
        {number: 9, color: 'red'},
        {number: 22, color: 'black'},
        {number: 18, color: 'red'},
        {number: 29, color: 'black'},
        {number: 7, color: 'red'},
        {number: 28, color: 'black'},
        {number: 12, color: 'red'},
        {number: 35, color: 'black'},
        {number: 3, color: 'red'},
        {number: 26, color: 'black'}
    ];

    const numbers = wheelLayout.map(item => item.number);
    const colors = wheelLayout.map(item => item.color);
    const anglePerNumber = (2 * Math.PI) / numbers.length;

    let currentAngle = 0;
    let isSpinning = false;
    let selectedBet = null;

    drawWheel();

    function drawWheel(angle = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

        wheelLayout.forEach((item, i) => {
            const startAngle = angle + i * anglePerNumber;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + anglePerNumber);
            ctx.fillStyle = item.color;
            ctx.fill();

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + anglePerNumber/2);
            ctx.fillStyle = item.color === 'black' ? 'white' : 'black';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.number, radius - 25, 0);
            ctx.restore();
        });

        ctx.beginPath();
        ctx.moveTo(centerX - 10, 5);
        ctx.lineTo(centerX + 10, 5);
        ctx.lineTo(centerX, 30);
        ctx.fillStyle = 'gold';
        ctx.fill();
    }

    function spinWheel(resultNumber, callback) {
        if (isSpinning) return;
        isSpinning = true;

        const targetIndex = numbers.indexOf(parseInt(resultNumber));
        if (targetIndex === -1) return;

        const targetAngle = (2 * Math.PI * 5) - (targetIndex * anglePerNumber) - (Math.PI/2 + anglePerNumber/2);

        const startTime = Date.now();
        const duration = 3000;
        const startAngle = currentAngle % (2 * Math.PI);

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            currentAngle = startAngle + (targetAngle - startAngle) * easedProgress;
            drawWheel(currentAngle);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                currentAngle = targetAngle % (2 * Math.PI);
                isSpinning = false;
                if (callback) callback();
            }
        }

        animate();
    }

    function easeOutCubic(t) {
        return (--t) * t * t + 1;
    }

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

            const winItem = wheelLayout.find(item => item.number === parseInt(response.win_number));

            spinWheel(response.win_number, () => {
                Casino.updateBalance(response.new_balance);
                const message = response.win
                    ? `Выигрыш: ${amount}$\nЧисло: ${response.win_number} (${winItem.color})`
                    : `Проигрыш: ${amount}$\nЧисло: ${response.win_number} (${winItem.color})`;
                Casino.showMessage('roulette-message', message, response.win);
            });

        } catch (error) {
            console.error('Error:', error);
            Casino.showMessage('roulette-message', 'Ошибка соединения', false);
        } finally {
            Casino.toggleButtons(false);
        }
    });

    document.getElementById('add-funds-btn')?.addEventListener('click', async function() {
        this.disabled = true;
        try {
            const response = await Casino.sendRequest('/api/add_funds/', {});
            if (response.success) {
                Casino.updateBalance(response.new_balance);
                Casino.showMessage('roulette-message', 'Баланс пополнен на 150$!', true);
                setTimeout(() => this.disabled = false, 3600000);
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