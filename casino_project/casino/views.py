from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from django.http import JsonResponse
import random
from decimal import Decimal, getcontext, InvalidOperation
from django.db import transaction
import json
from datetime import timedelta
from django.utils import timezone
from .models import User, Bet, Case, CaseItem
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model
from .forms import CustomUserCreationForm
from django.contrib.auth import logout



User = get_user_model()



# Основные страницы
def index(request):
    return render(request, 'casino/index.html')


def about(request):
    return render(request, 'casino/about.html')


def contacts(request):
    return render(request, 'casino/contacts.html')


def support(request):
    return render(request, 'casino/support.html')


def custom_logout(request):
    logout(request)
    return redirect('index')


@login_required
def profile(request):
    bets = Bet.objects.filter(player=request.user).order_by('-created_at')[:10]
    context = {'bets': bets, 'user': request.user}
    return render(request, 'casino/profile.html', context)


# Игры
@login_required
def slots_view(request):
    return render(request, 'casino/game.html', {
        'game': 'slots',
        'user': request.user
    })


@login_required
def get_balance(request):
    return JsonResponse({
        'success': True,
        'balance': float(request.user.balance)
    })


@login_required
def cases_view(request):
    cases = Case.objects.all().prefetch_related('items')
    if not cases.exists():
        create_demo_case()
        cases = Case.objects.all()

    return render(request, 'casino/cases.html', {
        'User': request.user,
        'cases': cases,
    })


@login_required
def roulette_view(request):
    number_rows = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    ]
    return render(request, 'casino/game.html', {
        'User': request.user,
        'game': 'roulette',
        'number_rows': number_rows
    })


@login_required
def coinflip_view(request):
    return render(request, 'casino/game.html', {
        'User': request.user,
        'game': 'coinflip'
    })


@login_required
def bets_view(request):
    return render(request, 'casino/game.html', {
        'User': request.user,
        'game': 'bets'
    })


@csrf_exempt
@login_required
def add_funds(request):
    print(f"Текущий баланс до пополнения: {request.user.balance}")  # Добавьте эту строку
    if request.method == 'POST':
        try:
            user = request.user
            now = timezone.now()

            if user.last_funds_add and (now - user.last_funds_add).total_seconds() < 3600:
                remaining_time = int((3600 - (now - user.last_funds_add).total_seconds()) // 60)
                return JsonResponse({
                    'success': False,
                    'error': f'Пополнение доступно только раз в час. Следующее пополнение через {remaining_time} минут'
                })

            user.balance += Decimal('150.00')
            user.last_funds_add = now
            user.save()
            print(f"Новый баланс: {user.balance}")  # И эту строку


            return JsonResponse({
                'success': True,
                'new_balance': float(user.balance),
                'next_available': (now + timedelta(hours=1)).isoformat()
            })

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    return JsonResponse({'success': False, 'error': 'Invalid method'})


# API
@csrf_exempt
@login_required
def open_case(request, case_id):
    if request.method == 'POST':
        try:
            User = request.user
            case = get_object_or_404(Case, id=case_id)

            if User.balance < case.price:
                return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

            User.balance -= case.price
            prize = random.choices(
                case.items.all(),
                weights=[item.probability for item in case.items.all()]
            )[0]

            User.balance += prize.value
            User.save()

            return JsonResponse({
                'success': True,
                'item': {
                    'name': prize.name,
                    'image': prize.image.url if prize.image else '',
                    'value': prize.value,
                    'rarity': prize.rarity,
                    'new_balance': User.balance
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@csrf_exempt
@login_required
def place_sport_bet(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user
            amount = Decimal(str(data.get('amount', 0)))
            event = data.get('event')
            outcome = data.get('outcome')
            multiplier = Decimal(str(data.get('multiplier', 1)))

            if amount <= 0:
                return JsonResponse({'success': False, 'error': 'Неверная сумма ставки'})

            if user.balance < amount:
                return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

            # Симуляция исхода (50% шанс)
            won = random.random() < 0.5
            win_amount = amount * multiplier if won else Decimal(0)

            # Обновление баланса
            user.balance += win_amount - amount
            user.save()

            # Запись ставки
            Bet.objects.create(
                player=user,
                game='sport',
                amount=amount,
                bet_type=event,
                bet_value=outcome,
                outcome='win' if won else 'lose',
                win_amount=win_amount
            )

            return JsonResponse({
                'success': True,
                'won': won,
                'win_amount': float(win_amount),
                'new_balance': float(user.balance)
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@csrf_exempt
@login_required
def place_roulette_bet(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        user = request.user
        amount = Decimal(str(data.get('amount', 0)))

        if amount <= 0:
            return JsonResponse({'success': False, 'error': 'Неверная сумма ставки'})

        if user.balance < amount:
            return JsonResponse({
                'success': False,
                'error': f'Недостаточно средств. Баланс: {user.balance}$, Ставка: {amount}$'
            })

        # Генерация результата
        win_number = random.randint(0, 36)
        win_color = 'green' if win_number == 0 else 'red' if win_number % 2 == 1 else 'black'

        # Проверка ставки
        bet_type = data.get('type')
        bet_value = data.get('value')
        win = False
        payout_multiplier = 0

        if bet_type == 'number':
            win = int(bet_value) == win_number
            payout_multiplier = 36  # 35:1 + возврат ставки
        elif bet_type == 'color':
            win = bet_value == win_color
            payout_multiplier = 2   # 1:1 + возврат ставки
        elif bet_type == 'parity' and win_number != 0:
            win = (bet_value == 'even' and win_number % 2 == 0) or \
                  (bet_value == 'odd' and win_number % 2 != 0)
            payout_multiplier = 2
        elif bet_type == 'range':
            low, high = map(int, bet_value.split('-'))
            win = low <= win_number <= high
            payout_multiplier = 3   # 2:1 + возврат ставки

        # Рассчитываем итоговый баланс
        if win:
            # Выигрыш = ставка * множитель (уже включает возврат ставки)
            user.balance += amount * (Decimal(payout_multiplier) - 1)
        else:
            # Проигрыш - просто списываем ставку
            user.balance -= amount

        user.save()

        # Создаем запись о ставке
        Bet.objects.create(
            player=user,
            game='roulette',
            amount=amount,
            bet_type=bet_type,
            bet_value=str(bet_value),
            outcome='win' if win else 'lose',
            win_amount=amount * Decimal(payout_multiplier) if win else Decimal(0)
        )

        return JsonResponse({
            'success': True,
            'win': win,
            'win_number': win_number,
            'win_color': win_color,  # Добавляем цвет в ответ
            'amount_spent': float(amount),
            'payout': float(amount * 2) if win else 0,  # Фиксированный множитель 2
            'new_balance': float(user.balance)
        })


    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def complete_bet(request, bet_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        bet = Bet.objects.get(id=bet_id, outcome='pending')
        user = request.user

        if bet.win:  # Если ставка выиграла
            win_amount = Decimal(request.POST.get('win_amount', 0))
            user.balance += win_amount
            user.save()
            bet.win_amount = win_amount
            bet.outcome = 'win'
            bet.save()

        return JsonResponse({
            'success': True,
            'new_balance': float(user.balance)
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def place_slots_bet(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            User = request.user
            amount = float(data.get('amount'))

            if amount <= 0:
                return JsonResponse({'success': False, 'error': 'Неверная сумма ставки'})

            if User.balance < amount:
                return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

            symbols = ["🍒", "🍋", "🔔", "🍉", "⭐", "7"]
            reels = [random.choice(symbols) for _ in range(3)]

            if reels[0] == reels[1] == reels[2]:
                multiplier = 50 if reels[0] == "7" else 10
            elif reels[0] == reels[1] or reels[1] == reels[2]:
                multiplier = 2
            else:
                multiplier = 0

            win_amount = amount * multiplier
            User.balance += win_amount - amount
            User.save()

            Bet.objects.create(
                User=User,
                game='slots',
                amount=amount,
                bet_type='spin',
                bet_value='standard',
                outcome='win' if win_amount > 0 else 'lose',
                win_amount=win_amount
            )

            return JsonResponse({
                'success': True,
                'reels': reels,
                'win': win_amount > 0,
                'win_amount': win_amount,
                'new_balance': User.balance
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@csrf_exempt
@login_required
def place_coinflip_bet(request):
    if request.method == 'POST':
        try:
            print("Получен запрос на ставку в монетку")  # Логирование
            data = json.loads(request.body)
            print("Данные запроса:", data)  # Логирование

            user = request.user
            amount = Decimal(str(data.get('amount', 0)))
            side = data.get('side')
            print(f"Ставка: {amount}$, сторона: {side}")  # Логирование

            if amount <= 0:
                return JsonResponse({'success': False, 'error': 'Invalid bet amount'})

            if user.balance < amount:
                return JsonResponse({'success': False, 'error': 'Not enough funds'})

            # Генерация результата
            result = random.choice(['heads', 'tails'])
            print(f"Результат: {result}")  # Логирование

            win = result == side
            win_amount = amount * Decimal('1.95') if win else Decimal(0)
            print(f"Выиграл: {win}, сумма: {win_amount}")  # Логирование

            # Обновление баланса
            user.balance += win_amount - amount
            user.save()
            print(f"Новый баланс: {user.balance}")  # Логирование

            # Сохранение ставки
            Bet.objects.create(
                player=user,
                game='coinflip',
                amount=amount,
                bet_type='side',
                bet_value=side,
                outcome='win' if win else 'lose',
                win_amount=win_amount
            )

            return JsonResponse({
                'success': True,
                'result': result,
                'win': win,
                'win_amount': float(win_amount),
                'new_balance': float(user.balance)
            })

        except Exception as e:
            print("Ошибка:", str(e))  # Логирование
            return JsonResponse({'success': False, 'error': str(e)})


csrf_exempt


@login_required
def update_balance(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user
            new_balance = Decimal(str(data.get('balance', 0)))

            user.balance = new_balance
            user.save()

            return JsonResponse({
                'success': True,
                'new_balance': float(user.balance)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


# Вспомогательные функции
def create_demo_case():
    case = Case.objects.create(
        name="Демо Кейс",
        price=100,
        description="Тестовый кейс с разными предметами"
    )

    items = [
        ("10$", 10, 0.5, 'common'),
        ("50$", 50, 0.3, 'uncommon'),
        ("100$", 100, 0.15, 'rare'),
        ("500$", 500, 0.04, 'epic'),
        ("1000$", 1000, 0.01, 'legendary')
    ]

    for name, value, prob, rarity in items:
        CaseItem.objects.create(
            case=case,
            name=name,
            value=value,
            probability=prob,
            rarity=rarity
        )

    return case


@csrf_exempt
@login_required
def deduct_bet(request):
    """Только списывает ставку"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        user = request.user
        amount = Decimal(str(data.get('amount', 0)))

        if amount <= 0:
            return JsonResponse({'success': False, 'error': 'Invalid amount'})

        if user.balance < amount:
            return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

        user.balance -= amount
        user.save()

        return JsonResponse({
            'success': True,
            'new_balance': float(user.balance)
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def play_roulette(request):
    """Определяет результат, но не меняет баланс"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        amount = Decimal(str(data.get('amount', 0)))
        bet_type = data.get('type')
        bet_value = data.get('value')

        # Генерация результата
        win_number = random.randint(0, 36)
        win_color = 'green' if win_number == 0 else 'red' if win_number % 2 else 'black'

        # Проверка выигрыша
        win = False
        multiplier = 1

        if bet_type == 'number':
            win = int(bet_value) == win_number
            multiplier = 36
        elif bet_type == 'color':
            win = bet_value == win_color
            multiplier = 2
        elif bet_type == 'parity' and win_number != 0:
            win = (bet_value == 'even' and win_number % 2 == 0) or \
                  (bet_value == 'odd' and win_number % 2 != 0)
            multiplier = 2
        elif bet_type == 'range':
            low, high = map(int, bet_value.split('-'))
            win = low <= win_number <= high
            multiplier = 3

        # Создаем запись о ставке
        bet = Bet.objects.create(
            player=request.user,
            game='roulette',
            amount=amount,
            bet_type=bet_type,
            bet_value=str(bet_value),
            outcome='win' if win else 'lose',
            win_amount=amount * Decimal(multiplier) if win else Decimal(0)
        )

        return JsonResponse({
            'success': True,
            'win': win,
            'win_number': win_number,
            'win_amount': float(amount * Decimal(multiplier)),
            'bet_id': bet.id
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def add_winnings(request):
    """Начисляет выигрыш"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        user = request.user
        amount = Decimal(str(data.get('amount', 0)))
        bet_id = data.get('bet_id')

        bet = Bet.objects.get(id=bet_id, player=user)

        user.balance += amount
        user.save()

        return JsonResponse({
            'success': True,
            'new_balance': float(user.balance)
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('index')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


@csrf_exempt
@login_required
def check_balance(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            amount = Decimal(str(data.get('amount', 0)))
            user = request.user

            return JsonResponse({
                'success': True,
                'enough': user.balance >= amount,
                'current_balance': float(user.balance)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def deduct_bet(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            amount = Decimal(str(data.get('amount', 0)))
            user = request.user

            if user.balance < amount:
                return JsonResponse({'success': False, 'error': 'Insufficient funds'})

            user.balance -= amount
            user.save()

            return JsonResponse({
                'success': True,
                'new_balance': float(user.balance)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def add_winnings(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            amount = Decimal(str(data.get('amount', 0)))
            user = request.user

            user.balance += amount
            user.save()

            return JsonResponse({
                'success': True,
                'new_balance': float(user.balance)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})