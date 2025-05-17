from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from django.core.management import call_command
import os
import uuid
from django.core.exceptions import ValidationError
from django.conf import settings


class User(AbstractUser):
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('100.00')
    )
    last_funds_add = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Последнее пополнение"
    )
    initial_data_loaded = models.BooleanField(default=False)

    class Meta:
        db_table = 'casino_user'

    def __str__(self):
        return self.username

    def load_initial_data(self):
        pass


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def user_post_save(sender, instance, created, **kwargs):
    if created:
        try:
            call_command('loaddata', 'initial_cases.json', app_label='casino')
            call_command('loaddata', 'initial_case_items.json', app_label='casino')
            instance.load_initial_data()
            instance.initial_data_loaded = True
            instance.save(update_fields=['initial_data_loaded'])
        except Exception as e:
            print(f"Ошибка при инициализации пользователя: {e}")


class Bet(models.Model):
    GAME_CHOICES = [
        ('roulette', 'Рулетка'),
        ('slots', 'Слоты'),
        ('coinflip', 'Монетка'),
    ]

    OUTCOME_CHOICES = [
        ('win', 'Выигрыш'),
        ('lose', 'Проигрыш'),
        ('pending', 'В обработке'),
        ('canceled', 'Отменена')
    ]

    player = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    game = models.CharField(max_length=20, choices=GAME_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    bet_type = models.CharField(max_length=20, default="standard")
    bet_value = models.CharField(max_length=50, default="")
    outcome = models.CharField(max_length=10, choices=OUTCOME_CHOICES, default='pending')
    win_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Ставка #{self.id} ({self.get_game_display()}) - {self.amount}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Ставка'
        verbose_name_plural = 'Ставки'


class Case(models.Model):
    CURRENCY_CHOICES = [
        ('RUB', 'Рубли'),
        ('USD', 'Доллары'),
        ('CNY', 'Юани'),
        ('EUR', 'Евро'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='cases/', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_currency_display()})"


class CaseItem(models.Model):
    RARITY_CHOICES = [
        ('common', 'Обычный'),
        ('uncommon', 'Необычный'),
        ('rare', 'Редкий'),
        ('epic', 'Эпический'),
        ('legendary', 'Легендарный')
    ]

    case = models.ForeignKey(Case, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=100, default="Приз")
    image = models.ImageField(upload_to='case_items/', null=True, blank=True)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    probability = models.FloatField(default=1.0)
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='common')

    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"


class CaseOpening(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    case = models.ForeignKey(Case, on_delete=models.CASCADE)
    item = models.ForeignKey(CaseItem, on_delete=models.CASCADE)
    opened_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-opened_at']

    def __str__(self):
        return f"{self.user} opened {self.case} and got {self.item}"


class SportEvent(models.Model):
    SPORT_CHOICES = [
        ('football', 'Футбол'),
        ('tennis', 'Теннис'),
        ('basketball', 'Баскетбол'),
        ('hockey', 'Хоккей'),
    ]

    name = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    team1 = models.CharField(max_length=100)
    team2 = models.CharField(max_length=100)
    sport_type = models.CharField(max_length=20, choices=SPORT_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.team1} vs {self.team2}"

    def get_sport_type_display(self):
        return dict(self.SPORT_CHOICES).get(self.sport_type, self.sport_type)


class BettingOdd(models.Model):
    OUTCOME_CHOICES = [
        ('win1', 'Победа 1'),
        ('win2', 'Победа 2'),
        ('draw', 'Ничья')
    ]

    event = models.ForeignKey(SportEvent, related_name='odds', on_delete=models.CASCADE)
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES)
    odd = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.event} - {self.get_outcome_display()} ({self.odd})"


class SportBet(models.Model):
    OUTCOME_CHOICES = [
        ('pending', 'В ожидании'),
        ('win', 'Выиграл'),
        ('lose', 'Проиграл'),
        ('canceled', 'Отменен'),
        ('returned', 'Возврат')
    ]

    BET_TYPES = [
        ('single', 'Одиночная'),
        ('express', 'Экспресс'),
        ('system', 'Система')
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event = models.ForeignKey(SportEvent, on_delete=models.CASCADE)
    odd = models.ForeignKey(BettingOdd, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    potential_win = models.DecimalField(max_digits=10, decimal_places=2)
    outcome = models.CharField(max_length=10, choices=OUTCOME_CHOICES, default='pending')
    bet_type = models.CharField(max_length=10, choices=BET_TYPES, default='single')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Спортивная ставка'
        verbose_name_plural = 'Спортивные ставки'

    def save(self, *args, **kwargs):
        if not self.potential_win and self.odd:
            self.potential_win = self.amount * self.odd.odd
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user}: {self.amount}$ на {self.odd} ({self.get_outcome_display()})"