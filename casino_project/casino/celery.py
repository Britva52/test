from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casino_project.settings')

app = Celery('casino')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'process-pending-bets-every-minute': {
        'task': 'casino.tasks.process_pending_bets',
        'schedule': crontab(minute='*/1'),  # Каждую минуту
    },
}