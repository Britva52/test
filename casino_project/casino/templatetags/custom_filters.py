from django import template
register = template.Library()

@register.filter
def get_range(start, end):
    return range(start, end)
