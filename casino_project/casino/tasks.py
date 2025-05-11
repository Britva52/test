from __future__ import absolute_import, unicode_literals
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from casino.models import Bet
import random

@shared_task
def process_pending_bets():
    now = timezone.now()
    pending_bets = Bet.objects.filter(
        outcome='pending',
        created_at__lte=now - timedelta(minutes=15)
    )

    for bet in pending_bets:
        try:
            outcome = random.choices(
                ['win', 'lose', 'refund'],
                weights=[45, 45, 10]
            )[0]

            bet.outcome = outcome
            bet.resolved_at = now
            bet.save()

            user = bet.player
            if outcome == 'win':
                user.balance += bet.potential_win
            elif outcome == 'refund':
                user.balance += bet.amount
            user.save()

            return f"Processed bet #{bet.id}: {outcome}"
        except Exception as e:
            return f"Error processing bet #{bet.id}: {str(e)}"