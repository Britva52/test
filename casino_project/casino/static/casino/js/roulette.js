document.addEventListener('DOMContentLoaded', () => {
    console.log("Roulette initialized");

    /*** Canvas setup ***/
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return; // Stop if canvas is missing

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    /*** European‑roulette layout (number → color) ***/
    const wheelLayout = [
        { number: 0, color: 'green' },
        { number: 32, color: 'red' }, { number: 15, color: 'black' },
        { number: 19, color: 'red' }, { number: 4, color: 'black' },
        { number: 21, color: 'red' }, { number: 2, color: 'black' },
        { number: 25, color: 'red' }, { number: 17, color: 'black' },
        { number: 34, color: 'red' }, { number: 6, color: 'black' },
        { number: 27, color: 'red' }, { number: 13, color: 'black' },
        { number: 36, color: 'red' }, { number: 11, color: 'black' },
        { number: 30, color: 'red' }, { number: 8, color: 'black' },
        { number: 23, color: 'red' }, { number: 10, color: 'black' },
        { number: 5, color: 'red' },  { number: 24, color: 'black' },
        { number: 16, color: 'red' }, { number: 33, color: 'black' },
        { number: 1, color: 'red' },  { number: 20, color: 'black' },
        { number: 14, color: 'red' }, { number: 31, color: 'black' },
        { number: 9, color: 'red' },  { number: 22, color: 'black' },
        { number: 18, color: 'red' }, { number: 29, color: 'black' },
        { number: 7, color: 'red' },  { number: 28, color: 'black' },
        { number: 12, color: 'red' }, { number: 35, color: 'black' },
        { number: 3, color: 'red' },  { number: 26, color: 'black' }
    ];

    const numbers = wheelLayout.map(i => i.number);
    const anglePerNumber = (2 * Math.PI) / numbers.length;

    let currentAngle = 0;
    let isSpinning   = false;
    let selectedBet  = null;

    /******************** Drawing functions ********************/
    drawWheel();

    function drawWheel(angle = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius  = Math.min(canvas.width, canvas.height) / 2 - 20;

        wheelLayout.forEach((item, i) => {
            const startAngle = angle + i * anglePerNumber;

            // Sector background
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + anglePerNumber);
            ctx.fillStyle = item.color;
            ctx.fill();

            // Sector number
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + anglePerNumber / 2);
            ctx.fillStyle   = item.color === 'black' ? 'white' : 'black';
            ctx.font        = 'bold 14px Arial';
            ctx.textAlign   = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.number, radius - 25, 0);
            ctx.restore();
        });

        // Golden pointer
        ctx.beginPath();
        ctx.moveTo(centerX - 10, 5);
        ctx.lineTo(centerX + 10, 5);
        ctx.lineTo(centerX, 30);
        ctx.fillStyle = 'gold';
        ctx.fill();
    }

    /******************** Spin animation ********************/
    function spinWheel(resultNumber, cb) {
        if (isSpinning) return;
        isSpinning = true;

        const targetIndex = numbers.indexOf(+resultNumber);
        if (targetIndex === -1) {
            console.error('Invalid number returned by API:', resultNumber);
            isSpinning = false;
            return;
        }

        // 5 full rotations + alignment so the win sector ends under the pointer
        const targetAngle = (2 * Math.PI * 5) - (targetIndex * anglePerNumber) - (Math.PI / 2 + anglePerNumber / 2);

        const startTime = performance.now();
        const duration  = 3000; // 3 s
        const startAngle = currentAngle % (2 * Math.PI);

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = easeOutCubic(progress);

            currentAngle = startAngle + (targetAngle - startAngle) * eased;
            drawWheel(currentAngle);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                currentAngle = targetAngle % (2 * Math.PI);
                isSpinning = false;
                cb?.();
            }
        }

        requestAnimationFrame(animate);
    }

    const easeOutCubic = t => (--t) * t * t + 1;

    /******************** UI handlers ********************/
    // Selecting a bet
    document.querySelectorAll('.number-cell, .bet-btn').forEach(el => {
        el.addEventListener('click', () => {
            if (isSpinning) return;
            document.querySelectorAll('.active').forEach(a => a.classList.remove('active'));
            el.classList.add('active');
            selectedBet = {
                type:  el.dataset.type  || 'number',
                value: el.dataset.value || el.textContent
            };
        });
    });

    // Spin button
    document.querySelector('.spin-btn')?.addEventListener('click', async () => {
        if (isSpinning || !selectedBet) return;

        const amount = parseFloat(document.querySelector('.bet-input').value);
        if (isNaN(amount) || amount <= 0) {
            Casino.showMessage('roulette-message', 'Введите корректную сумму ставки', false);
            return;
        }

        Casino.toggleButtons(true);
        Casino.showMessage('roulette-message', 'Крутим...', true);

        try {
            const response = await Casino.sendRequest('/api/place_bet/roulette/', {
                amount,
                type: selectedBet.type,
                value: selectedBet.value
            });

            if (!response.success) {
                Casino.showMessage('roulette-message', response.error, false);
                return;
            }

            const { win, win_number, win_color, payout_multiplier } = response;

            spinWheel(win_number, () => {
                if (win) {
                    Casino.showMessage(
                        'roulette-message',
                        `Выигрыш: ${amount * payout_multiplier}$ (x${payout_multiplier})\nЧисло: ${win_number} (${win_color})`,
                        true
                    );
                } else {
                    Casino.showMessage(
                        'roulette-message',
                        `Проигрыш: ${amount}$\nЧисло: ${win_number} (${win_color})`,
                        false
                    );
                }
                Casino.syncBalance();
            });
        } catch (err) {
            console.error('Spin error:', err);
            Casino.showMessage('roulette-message', 'Ошибка соединения', false);
        } finally {
            Casino.toggleButtons(false);
        }
    });

    // Add‑funds button (cool‑down 1h)
    document.getElementById('add-funds-btn')?.addEventListener('click', async function () {
        this.disabled = true;
        try {
            const response = await Casino.sendRequest('/api/add_funds/', {});
            if (response.success) {
                Casino.updateBalance(response.new_balance);
                Casino.showMessage('roulette-message', 'Баланс пополнен на 150$!', true);
                setTimeout(() => (this.disabled = false), 60 * 60 * 1000);
            } else {
                Casino.showMessage('roulette-message', response.error, false);
                this.disabled = false;
            }
        } catch (err) {
            console.error('Add‑funds error:', err);
            this.disabled = false;
        }
    });
});
