from django.core.management.base import BaseCommand
from casino.models import Case, CaseItem


class Command(BaseCommand):
    help = 'Initialize base cases and items'

    def handle(self, *args, **options):
        Case.objects.all().delete()

        basic_case = Case.objects.create(
            name="Американский кейс",
            price=10,
            currency="USD",
            is_active=True
        )

        CaseItem.objects.create(
            case=basic_case,
            name="Стартовый бонус",
            value=10.00,
            probability=1.0,
            rarity="common"
        )

        self.stdout.write(self.style.SUCCESS('Successfully initialized base data'))