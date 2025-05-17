from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.http import JsonResponse
from django.views.decorators.http import require_GET
import random
from django.views.decorators.http import require_POST
from decimal import Decimal
from django.db import transaction
import json
from datetime import timedelta
from django.utils import timezone
from .models import Bet, Case, CaseItem, CaseOpening, User, SportEvent, BettingOdd, SportBet
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model
from .forms import CustomUserCreationForm
from django.db.models import Q
from django.core.paginator import Paginator
from django.views.decorators.cache import cache_page

User = get_user_model()

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
    game_type = request.GET.get('game_type', None)

    bets_query = Bet.objects.filter(player=request.user)
    if game_type:
        bets_query = bets_query.filter(game=game_type)

    bets = bets_query.order_by('-created_at')

    total_bets = bets.count()

    total_wins = 0
    win_rate = 0
    biggest_win = 0

    if total_bets > 0:
        winning_bets = bets.filter(outcome='win')
        total_wins = sum(bet.win_amount for bet in winning_bets)
        win_rate = int((winning_bets.count() / total_bets * 100)) if winning_bets.count() > 0 else 0
        biggest_win = max([bet.win_amount for bet in winning_bets], default=0)

    context = {
        'bets': bets[:20],
        'total_bets': total_bets,
        'total_wins': total_wins,
        'win_rate': win_rate,
        'biggest_win': biggest_win,
        'user': request.user,
        'selected_game': game_type
    }

    return render(request, 'casino/profile.html', context)


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
    cases = Case.objects.filter(is_active=True).prefetch_related('items')
    return render(request, 'casino/cases.html', {
        'cases': cases,
        'user_balance': request.user.balance
    })

@csrf_exempt
@login_required
def get_case_details(request, case_id):
    case = get_object_or_404(Case, id=case_id)
    items = case.items.all()

    return JsonResponse({
        'success': True,
        'case': {
            'id': str(case.id),
            'name': case.name,
            'price': float(case.price),
            'image': case.image.url if case.image else None,
            'currency': case.currency
        },
        'items': [{
            'id': str(item.id),
            'name': item.name,
            'value': float(item.value),
            'image': item.image.url if item.image else None,
            'rarity': item.rarity,
            'probability': item.probability
        } for item in items]
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
    active_events = SportEvent.objects.filter(
        is_active=True,
        start_time__gt=timezone.now()
    ).prefetch_related('odds').order_by('start_time')

    user_bets = SportBet.objects.filter(user=request.user).order_by('-created_at')

    paginator = Paginator(user_bets, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'events': active_events,
        'user_bets': page_obj,
        'user_balance': request.user.balance
    }
    return render(request, 'casino/bets.html', context)

@csrf_exempt
@login_required
def add_funds(request):
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

@csrf_exempt
@login_required
@transaction.atomic
def open_case(request, case_id):
    try:
        case = get_object_or_404(Case, id=case_id)
        user = request.user

        if user.balance < case.price:
            return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

        items = list(case.items.all())
        if not items:
            return JsonResponse({'success': False, 'error': 'Кейс пуст'})

        probabilities = [item.probability for item in items]
        prize = random.choices(items, weights=probabilities, k=1)[0]

        CaseOpening.objects.create(user=user, case=case, item=prize)

        user.balance -= case.price
        user.balance += prize.value
        user.save()

        return JsonResponse({
            'success': True,
            'prize': {
                'name': prize.name,
                'value': float(prize.value),
                'image': prize.image.url if prize.image else None,
                'rarity': prize.rarity,
                'currency': case.currency
            },
            'new_balance': float(user.balance)
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
@transaction.atomic
def place_sport_bet(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        user = request.user
        amount = Decimal(str(data.get('amount', 0)))
        odds_data = data.get('odds', [])

        if amount <= 0:
            return JsonResponse({'success': False, 'error': 'Неверная сумма ставки'})

        if not odds_data:
            return JsonResponse({'success': False, 'error': 'Не выбраны коэффициенты'})

        if user.balance < amount:
            return JsonResponse({
                'success': False,
                'error': 'Недостаточно средств на балансе',
                'current_balance': float(user.balance)
            })

        odds_ids = [odd['odd_id'] for odd in odds_data]
        odds = BettingOdd.objects.filter(
            id__in=odds_ids,
            is_active=True
        ).select_related('event')

        if len(odds) != len(odds_ids):
            return JsonResponse({
                'success': False,
                'error': 'Некоторые коэффициенты не найдены или неактивны'
            })

        for odd in odds:
            if odd.event.start_time <= timezone.now():
                return JsonResponse({
                    'success': False,
                    'error': f'Событие {odd.event} уже началось'
                })

        bet_type = 'single' if len(odds) == 1 else 'express'
        total_odd = Decimal(1)
        for odd in odds:
            total_odd *= odd.odd

        user.balance -= amount
        user.save()

        if bet_type == 'single':
            bet = SportBet.objects.create(
                user=user,
                event=odds[0].event,
                odd=odds[0],
                amount=amount,
                potential_win=amount * odds[0].odd,
                bet_type=bet_type,
                outcome='pending'
            )
        else:
            bet = SportBet.objects.create(
                user=user,
                event=odds[0].event,
                odd=odds[0],
                amount=amount,
                potential_win=amount * total_odd,
                bet_type=bet_type,
                outcome='pending',
                meta_data={
                    'express_odds': [
                        {
                            'id': str(odd.id),
                            'event_id': str(odd.event.id),
                            'outcome': odd.outcome,
                            'odd': float(odd.odd)
                        } for odd in odds
                    ]
                }
            )

        return JsonResponse({
            'success': True,
            'bet_id': bet.id,
            'potential_win': float(bet.potential_win),
            'new_balance': float(user.balance)
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@login_required
@transaction.atomic
def place_roulette_bet(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        user = request.user
        amount = Decimal(str(data.get('amount', 0)))
        bet_type = data.get('type')
        bet_value = data.get('value')

        if user.balance < amount:
            return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

        win_number = random.randint(0, 36)
        RED_NUMBERS = {1, 3, 5, 7, 9, 12, 14, 16, 18,
                       19, 21, 23, 25, 27, 30, 32, 34, 36}

        win_color = (
            'green' if win_number == 0 else
            'red' if win_number in RED_NUMBERS else
            'black'
        )

        # Определение выигрыша
        win = False
        payout_multiplier = 1

        if bet_type == 'number':
            win = int(bet_value) == win_number
            payout_multiplier = 36
        elif bet_type == 'color':
            win = bet_value == win_color
            payout_multiplier = 2
        elif bet_type == 'parity' and win_number != 0:
            win = (bet_value == 'even' and win_number % 2 == 0) or \
                  (bet_value == 'odd' and win_number % 2 != 0)
            payout_multiplier = 2
        elif bet_type == 'range':
            if bet_value == 'low':
                win = 1 <= win_number <= 18
            else:
                win = 19 <= win_number <= 36
            payout_multiplier = 2

        user.balance -= amount
        if win:
            user.balance += amount * Decimal(payout_multiplier)
        user.save()

        Bet.objects.create(
            player=user,
            game='roulette',
            amount=amount,
            bet_type=bet_type,
            bet_value=str(bet_value),
            outcome='win' if win else 'lose',
            win_amount=amount * Decimal(payout_multiplier) if win else Decimal(0),
            resolved_at=timezone.now()
        )

        return JsonResponse({
            'success': True,
            'win': win,
            'win_number': win_number,
            'win_color': win_color,
            'new_balance': float(user.balance),
            'payout_multiplier': payout_multiplier,
            'betAmount': float(amount)
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
def place_slots_bet(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user
            amount = Decimal(str(data.get('amount', 0)))

            if amount <= Decimal('0'):
                return JsonResponse({'success': False, 'error': 'Неверная сумма ставки'})

            if user.balance < amount:
                return JsonResponse({'success': False, 'error': 'Недостаточно средств'})

            symbols = ["🍒", "🍋", "🔔", "🍉", "⭐", "7"]
            reels = [random.choice(symbols) for _ in range(3)]

            win = False
            win_amount = Decimal('0')

            if reels[0] == reels[1] == reels[2]:
                multiplier = Decimal('50') if reels[0] == "7" else Decimal('10')
                win = True
                win_amount = amount * multiplier
            elif reels[0] == reels[1] or reels[1] == reels[2]:
                multiplier = Decimal('2')
                win = True
                win_amount = amount * multiplier

            with transaction.atomic():
                user.balance -= amount
                if win:
                    user.balance += win_amount
                user.save()

                Bet.objects.create(
                    player=user,
                    game='slots',
                    amount=amount,
                    bet_type='spin',
                    bet_value='standard',
                    outcome='win' if win else 'lose',
                    win_amount=win_amount if win else Decimal('0')
                )

            return JsonResponse({
                'success': True,
                'reels': reels,
                'win': win,
                'win_amount': float(win_amount),
                'new_balance': float(user.balance),
                'betAmount': float(amount)
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})

@csrf_exempt
@login_required
def place_coinflip_bet(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user
            amount = Decimal(str(data.get('amount', 0)))
            side = data.get('side')

            if amount <= Decimal('0'):
                return JsonResponse({'success': False, 'error': 'Invalid bet amount'})

            if user.balance < amount:
                return JsonResponse({'success': False, 'error': 'Not enough funds'})

            result = random.choice(['heads', 'tails'])
            win = result == side
            win_amount = amount * Decimal('1.95') if win else Decimal('0')

            with transaction.atomic():
                user.balance -= amount
                if win:
                    user.balance += win_amount
                user.save()

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
                'new_balance': float(user.balance),
                'betAmount': float(amount)
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

@csrf_exempt
@login_required
def cash_out_bet(request, bet_id):
    bet = get_object_or_404(SportBet, id=bet_id, user=request.user, outcome='pending')

    if bet.event.start_time <= timezone.now():
        return JsonResponse({'success': False, 'error': 'Событие уже началось'})

    cash_out_amount = bet.amount * Decimal('0.7')
    request.user.balance += cash_out_amount
    request.user.save()

    bet.outcome = 'returned'
    bet.resolved_at = timezone.now()
    bet.save()

    return JsonResponse({
        'success': True,
        'cash_out_amount': float(cash_out_amount),
        'new_balance': float(request.user.balance)
    })

@cache_page(60 * 5)
@require_GET
def get_live_events(request):
    sport_type = request.GET.get('sport_type')
    page = request.GET.get('page', 1)
    per_page = 10

    events = SportEvent.objects.filter(
        is_active=True,
        start_time__gt=timezone.now()
    ).prefetch_related('odds').order_by('start_time')

    if sport_type:
        events = events.filter(sport_type=sport_type)

    paginator = Paginator(events, per_page)
    page_obj = paginator.get_page(page)

    events_data = []
    for event in page_obj:
        event_data = {
            'id': event.id,
            'team1': event.team1,
            'team2': event.team2,
            'start_time': event.start_time.isoformat(),
            'sport_type': event.get_sport_type_display(),
            'odds': []
        }

        for odd in event.odds.all():
            event_data['odds'].append({
                'id': odd.id,
                'outcome': odd.outcome,
                'odd': float(odd.odd)
            })

        events_data.append(event_data)

    return JsonResponse({
        'success': True,
        'events': events_data,
        'total_pages': paginator.num_pages,
        'current_page': page
    })


@csrf_exempt
@login_required
def complete_bet(request, bet_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        bet = Bet.objects.get(id=bet_id, outcome='pending')
        user = request.user

        if bet.win:
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
def play_roulette(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'})

    try:
        data = json.loads(request.body)
        amount = Decimal(str(data.get('amount', 0)))
        bet_type = data.get('type')
        bet_value = data.get('value')

        win_number = random.randint(0, 36)
        RED_NUMBERS = {1, 3, 5, 7, 9, 12, 14, 16, 18,
                       19, 21, 23, 25, 27, 30, 32, 34, 36}

        win_color = (
            'green' if win_number == 0 else
            'red' if win_number in RED_NUMBERS else
            'black'
        )

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


def create_full_test_data():
    User = get_user_model()

    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'balance': 1000.00,
            'password': 'testpass123'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()

    def create_full_test_data():
        User = get_user_model()

        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'balance': 1000.00,
                'password': 'testpass123'
            }
        )

        Case.objects.all().delete()

        bronze_case = Case.objects.create(
            name="Бронзовый кейс",
            price=50.00,
            currency='USD',
            image="cases/bronze.png",
            is_active=True
        )
        CaseItem.objects.bulk_create([
            CaseItem(case=bronze_case, name="10$", value=10.00, probability=0.5, rarity='common'),
            CaseItem(case=bronze_case, name="25$", value=25.00, probability=0.3, rarity='uncommon'),
            CaseItem(case=bronze_case, name="50$", value=50.00, probability=0.15, rarity='rare'),
            CaseItem(case=bronze_case, name="100$", value=100.00, probability=0.04, rarity='epic'),
            CaseItem(case=bronze_case, name="500$", value=500.00, probability=0.01, rarity='legendary')
        ])

        silver_case = Case.objects.create(
            name="Серебряный кейс",
            price=40.00,
            currency='EUR',
            image="cases/silver.png",
            is_active=True
        )
        CaseItem.objects.bulk_create([
            CaseItem(case=silver_case, name="10€", value=10.00, probability=0.45, rarity='common'),
            CaseItem(case=silver_case, name="25€", value=25.00, probability=0.25, rarity='uncommon'),
            CaseItem(case=silver_case, name="50€", value=50.00, probability=0.2, rarity='rare'),
            CaseItem(case=silver_case, name="100€", value=100.00, probability=0.08, rarity='epic'),
            CaseItem(case=silver_case, name="500€", value=500.00, probability=0.02, rarity='legendary')
        ])

        gold_case = Case.objects.create(
            name="Золотой кейс",
            price=100.00,
            currency='USD',
            image="cases/gold.png",
            is_active=True
        )
        CaseItem.objects.bulk_create([
            CaseItem(case=gold_case, name="25$", value=25.00, probability=0.4, rarity='common'),
            CaseItem(case=gold_case, name="50$", value=50.00, probability=0.3, rarity='uncommon'),
            CaseItem(case=gold_case, name="100$", value=100.00, probability=0.2, rarity='rare'),
            CaseItem(case=gold_case, name="250$", value=250.00, probability=0.08, rarity='epic'),
            CaseItem(case=gold_case, name="1000$", value=1000.00, probability=0.02, rarity='legendary')
        ])

        platinum_case = Case.objects.create(
            name="Платиновый кейс",
            price=5000.00,
            currency='RUB',
            image="cases/platinum.png",
            is_active=True
        )
        CaseItem.objects.bulk_create([
            CaseItem(case=platinum_case, name="1000₽", value=1000.00, probability=0.5, rarity='common'),
            CaseItem(case=platinum_case, name="2500₽", value=2500.00, probability=0.3, rarity='uncommon'),
            CaseItem(case=platinum_case, name="5000₽", value=5000.00, probability=0.15, rarity='rare'),
            CaseItem(case=platinum_case, name="10000₽", value=10000.00, probability=0.04, rarity='epic'),
            CaseItem(case=platinum_case, name="50000₽", value=50000.00, probability=0.01, rarity='legendary')
        ])

        crypto_case = Case.objects.create(
            name="Крипто кейс",
            price=50.00,
            currency='USDT',
            image="cases/crypto.png",
            is_active=True
        )
        CaseItem.objects.bulk_create([
            CaseItem(case=crypto_case, name="10 USDT", value=10.00, probability=0.4, rarity='common'),
            CaseItem(case=crypto_case, name="25 USDT", value=25.00, probability=0.3, rarity='uncommon'),
            CaseItem(case=crypto_case, name="50 USDT", value=50.00, probability=0.2, rarity='rare'),
            CaseItem(case=crypto_case, name="100 USDT", value=100.00, probability=0.08, rarity='epic'),
            CaseItem(case=crypto_case, name="500 USDT", value=500.00, probability=0.02, rarity='legendary')
        ])

        SportEvent.objects.all().delete()

        football_event = SportEvent.objects.create(
            team1="Барселона",
            team2="Реал Мадрид",
            start_time=timezone.now() + timedelta(days=1),
            sport_type='football',
            is_active=True
        )
        BettingOdd.objects.bulk_create([
            BettingOdd(event=football_event, outcome='win1', odd=2.50),
            BettingOdd(event=football_event, outcome='draw', odd=3.20),
            BettingOdd(event=football_event, outcome='win2', odd=2.80)
        ])

        tennis_event = SportEvent.objects.create(
            team1="Надаль",
            team2="Джокович",
            start_time=timezone.now() + timedelta(days=2),
            sport_type='tennis',
            is_active=True
        )
        BettingOdd.objects.bulk_create([
            BettingOdd(event=tennis_event, outcome='win1', odd=1.80),
            BettingOdd(event=tennis_event, outcome='win2', odd=2.00)
        ])

        SportBet.objects.create(
            user=user,
            event=football_event,
            odd=BettingOdd.objects.filter(event=football_event).first(),
            amount=100.00,
            potential_win=250.00,
            outcome='pending'
        )

        print("Тестовые данные успешно созданы!")
        print(f"Логин: testuser\nПароль: testpass123")


@require_POST
@csrf_exempt
def resolve_bet(request):
    try:
        data = json.loads(request.body)
        bet_id = data.get('bet_id')
        outcome = data.get('outcome')

        bet = Bet.objects.get(id=bet_id, outcome='pending')

        bet.outcome = outcome
        bet.resolved_at = timezone.now()
        bet.save()
        user = request.user

        if outcome == 'win':
            user.balance += bet.potential_win
        elif outcome == 'refund':
            user.balance += bet.amount

        user.save()

        return JsonResponse({
            'success': True,
            'new_balance': float(user.balance),
            'message': f'Ставка {bet_id} завершена с результатом: {outcome}'
        })

    except Bet.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Ставка не найдена или уже обработана'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
@csrf_exempt
def get_bet_history(request):
    try:
        bets = Bet.objects.filter(player=request.user).order_by(
            '-created_at')

        bet_list = []
        for bet in bets:
            bet_data = {
                'id': bet.id,
                'amount': float(bet.amount),
                'potential_win': float(bet.potential_win) if bet.potential_win else None,
                'outcome': bet.outcome,
                'created_at': bet.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'resolved_at': bet.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if bet.resolved_at else None,
                'game': bet.game
            }

            bet_list.append(bet_data)

        return JsonResponse({'success': True, 'bets': bet_list})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})