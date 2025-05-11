from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import models
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Load initial data after migrations'

    def handle(self, *args, **options):
        # Порядок важен из-за зависимостей!
        fixtures = [
            'cases.json',
            'case_items.json',
            'events.json'
        ]

        for fixture in fixtures:
            try:
                call_command('loaddata', fixture)
                self.stdout.write(f'Successfully loaded {fixture}')
            except Exception as e:
                self.stderr.write(f'Error loading {fixture}: {str(e)}')