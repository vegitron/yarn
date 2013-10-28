from django.conf import settings

def is_desktop(request):
    """ See if it's desktop
    """
    if request.MOBILE == 0:
        return {'is_desktop': True}
    else:
        return {'is_desktop': False}