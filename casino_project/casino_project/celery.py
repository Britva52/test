import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casino_project.settings')

app = Celery('casino_project')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'process-bets-every-minute': {
        'task': 'casino.tasks.process_pending_bets',
        'schedule': 60.0,  # Каждую минуту
    },
}