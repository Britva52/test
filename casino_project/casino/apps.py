from django.apps import AppConfig


class CasinoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'casino'

    def ready(self):
        from django.db.models.signals import post_migrate
        from .management.commands.load_initial_data import Command

        def load_data(sender, **kwargs):
            Command().handle()

        post_migrate.connect(load_data, sender=self)