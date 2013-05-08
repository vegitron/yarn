from yarn.models import Thread
import simplejson as json
from django.http import HttpResponse
from django.template import RequestContext
from django.shortcuts import render_to_response

def thread_list(request):
    """ Returns a list of all threads the user has access to """
    threads = Thread.objects.all()

    data = []
    for thread in threads:
        data.append(thread.json_data())

    return HttpResponse(json.dumps(data), { "Content-type": "application/json" })


def home(request):
    return render_to_response("home.html", {}, RequestContext(request))

