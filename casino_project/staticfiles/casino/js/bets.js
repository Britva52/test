document.addEventListener('DOMContentLoaded', () => {
    class BetSystem {
        constructor() {
            this.selectedBets = [];
            this.betSlip = document.querySelector('.selected-bets');
            this.winAmount = document.querySelector('.win-amount');
            this.initEvents();
        }

        initEvents() {
            document.querySelectorAll('.odds-btn').forEach(btn => {
                btn.addEventListener('click', () => this.addToBetSlip(btn));
            });

            document.querySelector('.place-bet-btn').addEventListener('click', async () => {
                if(this.selectedBets.length === 0) return;

                const amount = parseFloat(document.querySelector('.bet-amount').value);
                if (!await this.checkBalance(amount)) return;

                try {
                    const response = await this.placeBet(amount);
                    if(response.success) {
                        this.showResult(response);
                        this.clearBetSlip();
                    }
                } catch(error) {
                    console.error('Error:', error);
                }
            });
        }

        addToBetSlip(btn) {
            const eventCard = btn.closest('.event-card');
            const bet = {
                eventId: eventCard.dataset.eventId,
                teams: eventCard.querySelector('.event-teams').textContent,
                outcome: btn.dataset.outcome,
                odds: parseFloat(btn.dataset.odds)
            };

            this.selectedBets.push(bet);
            this.updateBetSlip();
        }

        updateBetSlip() {
            this.betSlip.innerHTML = this.selectedBets.map((bet, index) => `
                <div class="bet-item">
                    <div class="bet-teams">${bet.teams}</div>
                    <div class="bet-outcome">${this.getOutcomeName(bet.outcome)}</div>
                    <div class="bet-odds">${bet.odds.toFixed(2)}</div>
                    <button class="remove-bet" data-index="${index}">×</button>
                </div>
            `).join('');

            this.calculatePotentialWin();
            this.initRemoveButtons();
        }

        async checkBalance(amount) {
            const response = await fetch('/api/get_balance/');
            const data = await response.json();
            if(data.balance < amount) {
                alert('Недостаточно средств!');
                return false;
            }
            return true;
        }

        async placeBet(amount) {
            const response = await fetch('/api/place_bet/sport/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': Casino.getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bets: this.selectedBets,
                    amount: amount
                })
            });
            return response.json();
        }

        calculatePotentialWin() {
            const amount = parseFloat(document.querySelector('.bet-amount').value) || 0;
            const totalOdds = this.selectedBets.reduce((acc, bet) => acc * bet.odds, 1);
            this.winAmount.textContent = `${(amount * totalOdds).toFixed(2)}$`;
        }

        getOutcomeName(outcome) {
            const outcomes = {
                'win1': 'Победа 1',
                'win2': 'Победа 2',
                'draw': 'Ничья'
            };
            return outcomes[outcome];
        }

        showResult(response) {
            const resultDiv = document.createElement('div');
            resultDiv.className = response.success ? 'bet-success' : 'bet-error';
            resultDiv.textContent = response.message;
            document.body.appendChild(resultDiv);

            setTimeout(() => resultDiv.remove(), 3000);
        }

        initRemoveButtons() {
            document.querySelectorAll('.remove-bet').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.dataset.index;
                    this.selectedBets.splice(index, 1);
                    this.updateBetSlip();
                });
            });
        }

        clearBetSlip() {
            this.selectedBets = [];
            this.updateBetSlip();
        }
    }

    new BetSystem();
});