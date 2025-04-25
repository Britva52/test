from django.core.management.base import BaseCommand
from casino.models import Case, CaseItem


class Command(BaseCommand):
    help = 'Creates initial cases with items'

    def handle(self, *args, **options):
        cases_data = [
            {
                'name': 'Русский кейс',
                'currency': 'RUB',
                'price': 100,
                'items': [50, 100, 500, 1000, 5000]
            },
            {
                'name': 'Американский кейс',
                'currency': 'USD',
                'price': 10,
                'items': [5, 10, 50, 100, 500]
            },
            {
                'name': 'Китайский кейс',
                'currency': 'CNY',
                'price': 50,
                'items': [30, 50, 100, 500, 1000]
            },
            {
                'name': 'Европейский кейс',
                'currency': 'EUR',
                'price': 20,
                'items': [10, 20, 50, 100, 500]
            }
        ]

        for case_data in cases_data:
            case = Case.objects.create(
                name=case_data['name'],
                currency=case_data['currency'],
                price=case_data['price']
            )

            for value in case_data['items']:
                CaseItem.objects.create(
                    case=case,
                    value=value,
                    probability=1.0 / len(case_data['items'])
                )

            self.stdout.write(self.style.SUCCESS(f'Created case: {case}'))