from django.contrib import admin
from .models import User, Bet, Case, CaseItem, SportBet

@admin.register(Bet)
class BetAdmin(admin.ModelAdmin):
    list_display = ('id', 'player', 'get_game_display', 'amount', 'outcome', 'created_at')
    list_filter = ('game', 'outcome', 'created_at')
    search_fields = ('player__username', 'bet_type', 'bet_value')
    readonly_fields = ('created_at', 'resolved_at')
    date_hierarchy = 'created_at'
    list_per_page = 25

    def get_game_display(self, obj):
        return dict(Bet.GAME_CHOICES).get(obj.game, obj.game)
    get_game_display.short_description = 'Game'

@admin.register(SportBet)
class SportBetAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'event_short', 'outcome', 'amount', 'potential_win')
    list_filter = ('outcome', 'event__sport_type', 'created_at')
    search_fields = ('user__username', 'event__team1', 'event__team2')
    raw_id_fields = ('event', 'odd')
    date_hierarchy = 'created_at'

    def event_short(self, obj):
        return f"{obj.event.team1} vs {obj.event.team2}"
    event_short.short_description = 'Event'

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'price_with_currency', 'is_active', 'items_count')
    list_filter = ('is_active', 'currency')
    search_fields = ('name',)
    list_per_page = 20

    def price_with_currency(self, obj):
        return f"{obj.price} {obj.get_currency_display()}"
    price_with_currency.short_description = 'Price'

    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Items'

@admin.register(CaseItem)
class CaseItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'case_link', 'value_with_currency', 'rarity_display')
    list_filter = ('rarity', 'case')
    search_fields = ('name', 'case__name')
    raw_id_fields = ('case',)

    def case_link(self, obj):
        return obj.case.name
    case_link.short_description = 'Case'
    case_link.admin_order_field = 'case__name'

    def value_with_currency(self, obj):
        return f"{obj.value} {obj.case.get_currency_display()}"
    value_with_currency.short_description = 'Value'

    def rarity_display(self, obj):
        return obj.get_rarity_display()
    rarity_display.short_description = 'Rarity'

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'balance', 'last_login')
    list_filter = ('is_staff', 'is_superuser')
    search_fields = ('username', 'email')
    readonly_fields = ('last_login', 'date_joined')