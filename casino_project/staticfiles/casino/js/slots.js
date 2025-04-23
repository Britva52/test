// slots.js
document.addEventListener('DOMContentLoaded', () => {
    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    const spinBtn = document.getElementById('spin-slot');
    const betInput = document.getElementById('bet-amount');
    const balanceDisplay = document.getElementById('balance');
    const messageBox = document.getElementById('slot-message');
    let currentBalance = parseInt(localStorage.getItem('casinoBalance')) || 1000;
    const symbols = ["🍒", "🍋", "🔔", "🍉", "⭐", "7"];
    let isSpinning = false;

    updateBalance();

    function updateBalance() {
        balanceDisplay.textContent = currentBalance;
        localStorage.setItem('casinoBalance', currentBalance);
    }

    function showMessage(msg, isWin = false) {
        messageBox.textContent = msg;
        messageBox.style.color = isWin ? 'green' : 'red';
        messageBox.style.display = 'block';
        setTimeout(() => messageBox.style.display = 'none', 3000);
    }

    spinBtn.addEventListener('click', () => {
        if (isSpinning) return;
        
        const betAmount = parseInt(betInput.value);
        
        if (isNaN(betAmount) || betAmount <= 0) {
            showMessage('Введите корректную сумму ставки');
            return;
        }
        
        if (betAmount > currentBalance) {
            showMessage('Недостаточно средств');
            return;
        }
        
        isSpinning = true;
        currentBalance -= betAmount;
        updateBalance();
        
        // Анимация вращения
        let spins = 0;
        const maxSpins = 10;
        const spinInterval = setInterval(() => {
            reels.forEach(reel => {
                reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            });
            
            if (++spins >= maxSpins) {
                clearInterval(spinInterval);
                checkResult(betAmount);
                isSpinning = false;
            }
        }, 100);
    });
    
    function checkResult(betAmount) {
        const results = reels.map(reel => reel.textContent);
        
        // Проверка комбинаций
        if (results[0] === '7' && results[1] === '7' && results[2] === '7') {
            const winAmount = betAmount * 50;
            currentBalance += winAmount;
            showMessage(`ДЖЕКПОТ!!! Вы выиграли ${winAmount}$`, true);
        } 
        else if (results[0] === results[1] && results[1] === results[2]) {
            const winAmount = betAmount * 10;
            currentBalance += winAmount;
            showMessage(`Три в ряд! Выигрыш ${winAmount}$`, true);
        }
        else if (results[0] === results[1] || results[1] === results[2]) {
            const winAmount = betAmount * 2;
            currentBalance += winAmount;
            showMessage(`Две одинаковых! Выигрыш ${winAmount}$`, true);
        }
        else {
            showMessage('Попробуйте еще раз!');
        }
        
        updateBalance();
    }
});