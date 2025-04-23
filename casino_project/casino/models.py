from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal


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

    class Meta:
        db_table = 'casino_user'

    def __str__(self):
        return self.username

@receiver(post_save, sender=User)
def create_player_profile(sender, instance, created, **kwargs):
    if created:
        pass

class Bet(models.Model):
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    bet_type = models.CharField(max_length=20)
    bet_value = models.CharField(max_length=50)
    outcome = models.CharField(max_length=10)
    win_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Case(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    image = models.ImageField(upload_to='cases/', null=True, blank=True)

    def __str__(self):
        return self.name

class CaseItem(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    rarity = models.CharField(max_length=20)
    probability = models.FloatField()
    image = models.ImageField(upload_to='case_items/', null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"