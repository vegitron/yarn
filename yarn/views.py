from yarn.models import Thread, Artifact, Person
import simplejson as json
from django.http import HttpResponse
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required

@login_required
def thread_info(request, thread_id):
    """ Returns the initial data needed for a thread """
    thread = Thread.objects.get(pk=thread_id)
    person = Person.objects.filter(login_name = request.user.username)

    if not thread.person_has_access(person):
        return HttpResponse()

    #artifacts = Artifact.objects.filter(thread_id__exact = thread.pk).order_by(pk)[:10]
    artifacts = Artifact.objects.filter(thread_id = thread.pk).order_by('-pk')[:50]

    artifact_data = []
    for artifact in artifacts:
        artifact_data.append(artifact.json_data())

    data = { "thread": thread.json_data(), "artifacts": artifact_data }
    return HttpResponse(json.dumps(data), { "Content-type": "application/json" })

@login_required
def thread_list(request):
    """ Returns a list of all threads the user has access to """
    threads = Thread.objects.filter(is_private__isnull = True)

    person = Person.objects.filter(login_name = request.user.username)
    if not person:
        person = Person.objects.create(login_name = request.user.username)

    data = []
    for thread in threads:
        if thread.person_has_access(person):
            data.append(thread.json_data())

    return HttpResponse(json.dumps(data), { "Content-type": "application/json" })

@login_required
def home(request):
    return render_to_response("home.html", {}, RequestContext(request))

