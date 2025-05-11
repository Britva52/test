from django.core.management.base import BaseCommand
from django.utils import timezone
from casino.models import Bet
import random

class Command(BaseCommand):
    help = 'Process pending bets that are due for resolution'

    def handle(self, *args, **options):
        now = timezone.now()
        pending_bets = Bet.objects.filter(
            outcome='pending',
            resolution_time__lte=now
        )

        for bet in pending_bets:
            try:
                # Определяем случайный исход (45% win, 45% lose, 10% refund)
                outcome = random.choices(
                    ['win', 'lose', 'refund'],
                    weights=[45, 45, 10]
                )[0]

                # Обновляем ставку
                bet.outcome = outcome
                bet.resolved_at = now
                bet.save()

                # Обновляем баланс пользователя
                user = bet.player
                if outcome == 'win':
                    user.balance += bet.potential_win
                elif outcome == 'refund':
                    user.balance += bet.amount
                user.save()

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Processed bet #{bet.id}: {outcome}. '
                        f'User {user.username} new balance: {user.balance}'
                    )
                )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing bet #{bet.id}: {str(e)}')
                )