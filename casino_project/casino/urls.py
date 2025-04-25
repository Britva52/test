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

    path('api/open_case/<int:case_id>/', views.open_case, name='open_case'),
    path('api/complete_bet/<int:bet_id>/', views.complete_bet, name='complete_bet'),
    path('api/deduct_bet/', views.deduct_bet, name='deduct_bet'),
    path('api/play_roulette/', views.play_roulette, name='play_roulette'),
    path('api/add_winnings/', views.add_winnings, name='add_winnings'),
    path('api/add_funds/', views.add_funds, name='add_funds'),
    path('api/get_balance/', views.get_balance, name='get_balance'),
    path('api/place_bet/sport/', views.place_sport_bet, name='place_sport_bet'),
    path('api/update_balance/', views.update_balance, name='update_balance'),
    path('api/place_bet/roulette/', views.place_roulette_bet, name='place_roulette_bet'),
    path('api/place_bet/slots/', views.place_slots_bet, name='place_slots_bet'),
    path('api/place_bet/coinflip/', views.place_coinflip_bet, name='place_coinflip_bet'),

    path('register/', views.register, name='register'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)