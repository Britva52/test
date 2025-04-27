from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    path('contacts/', views.contacts, name='contacts'),
    path('support/', views.support, name='support'),
    path('profile/', views.profile, name='profile'),

    path('roulette/', views.roulette_view, name='roulette'),
    path('slots/', views.slots_view, name='slots'),
    path('coinflip/', views.coinflip_view, name='coinflip'),
    path('bets/', views.bets_view, name='bets'),
    path('cases/', views.cases_view, name='cases'),

    # API endpoints
    path('api/open_case/<uuid:case_id>/', views.open_case, name='open_case'),
    path('api/get_case_details/<uuid:case_id>/', views.get_case_details, name='get_case_details'),
    path('api/deduct_bet/', views.deduct_bet, name='deduct_bet'),
    path('api/place_sport_bet/', views.place_sport_bet, name='place_sport_bet'),
    path('api/resolve_bet/', views.resolve_bet, name='resolve_bet'),
    path('api/add_winnings/', views.add_winnings, name='add_winnings'),
    path('api/add_funds/', views.add_funds, name='add_funds'),
    path('api/get_balance/', views.get_balance, name='get_balance'),
    path('api/update_balance/', views.update_balance, name='update_balance'),
    path('api/place_bet/roulette/', views.place_roulette_bet, name='place_roulette_bet'),
    path('api/place_bet/slots/', views.place_slots_bet, name='place_slots_bet'),
    path('api/get_live_events/', views.get_live_events, name='get_live_events'),
    path('api/place_bet/coinflip/', views.place_coinflip_bet, name='place_coinflip_bet'),
    path('api/get_bet_history/', views.get_bet_history, name='get_bet_history'),

    # Auth
    path('register/', views.register, name='register'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)