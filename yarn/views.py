from yarn.models import Thread, Artifact, Person, PersonAttribute, SolsticeFile, User, FavoriteThreads
import simplejson as json
import md5
import base64
from django.conf import settings
from datetime import datetime
from django.db import IntegrityError
from django.http import HttpResponse
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required

@login_required
def thread_info(request, thread_id):
    thread = Thread.objects.get(pk=thread_id)
    person = Person.objects.get(login_name = request.user.username)

    if not thread.person_has_access(person):
        return HttpResponse()

    if request.method == "GET":
        """ Returns the initial data needed for a thread """


        #artifacts = Artifact.objects.filter(thread_id__exact = thread.pk).order_by(pk)[:10]
        artifacts = Artifact.objects.filter(thread_id = thread.pk).order_by('-pk')[:50]

        max_artifact_id = 0
        artifact_data = []
        for artifact in artifacts:
            if artifact.pk > max_artifact_id:
                max_artifact_id = artifact.pk
            artifact_data.append(artifact.json_data())

        artifact_data.reverse()
        data = { "thread": thread.json_data(), "artifacts": artifact_data, "max_artifact_id": max_artifact_id }

        online_list = User.objects.filter(thread = thread, is_online = True)
        online_users = []
        for user in online_list:
            online_users.append(user.person.json_data())

        data["online_users"] = online_users

        return HttpResponse(json.dumps(data), { "Content-type": "application/json" })

    if request.method == "POST":
        json_data = json.loads(request.raw_post_data)

        if json_data["type"] == "text":
            artifact = Artifact.objects.create(
                thread_id = thread.pk,
                person_id =  person.person_id,
                description = json_data["value"],
                timestamp = datetime.now(),
                artifact_type = None,
            )

        elif json_data["type"] == "file":
            raw_content = base64.b64decode(json_data["file"])
            sol_file = SolsticeFile.objects.create(
                person = person,
                name = json_data["name"],
                content_type = json_data["content_type"],
                content_length = len(raw_content),
                creation_date = datetime.now(),
                modification_date = datetime.now(),
                filestore_id = 0,
            )

            path = sol_file.path_to_file()
            handle = open(path, "w")
            handle.write(raw_content)
            handle.close()


            artifact = Artifact.objects.create(
                thread_id = thread.pk,
                person_id =  person.person_id,
                description = sol_file.pk,
                timestamp = datetime.now(),
                artifact_type = "file",
            )

        return HttpResponse('""')


@login_required
def thread_list(request):
    """ Returns a list of all threads the user has access to """
    threads = Thread.objects.filter(is_private__isnull = True)

    person = Person.objects.get(login_name = request.user.username)
    if not person:
        person = Person.objects.create(login_name = request.user.username)


    data = {}
    thread_data = []
    for thread in threads:
        if thread.person_has_access(person):
            thread_data.append(thread.json_data())

    data["threads"] = thread_data
    data["favorites"] = []
    try:
        fav_threads = FavoriteThreads.objects.get(person = person)
        data["favorites"] = json.loads(fav_threads.threads)
    except FavoriteThreads.DoesNotExist:
        pass

    return HttpResponse(json.dumps(data), { "Content-type": "application/json" })

@login_required
def home(request):
    return render_to_response("home.html", {}, RequestContext(request))


@login_required
def download_file(request, thread_id, file_id, verify_hash):
    if verify_hash != md5.new("%s-%s-%s" % (thread_id, file_id, settings.SECRET_KEY)).hexdigest():
        raise Exception("Invalid file hash")

    thread = Thread.objects.get(pk=thread_id)
    person = Person.objects.get(login_name = request.user.username)

    if not thread.person_has_access(person):
        return HttpResponse()

    sol_file = SolsticeFile.objects.get(pk=file_id)
    fsock = open(sol_file.path_to_file(), "r")
    response = HttpResponse(fsock, mimetype=sol_file.content_type)
    response['Content-Disposition'] = 'attachment; filename = '+sol_file.name

    return response

@login_required
def thumbnail_file(request, thread_id, file_id, verify_hash):
    if verify_hash != md5.new("%s-%s-%s" % (thread_id, file_id, settings.SECRET_KEY)).hexdigest():
        raise Exception("Invalid file hash")

    thread = Thread.objects.get(pk=thread_id)
    person = Person.objects.get(login_name = request.user.username)

    if not thread.person_has_access(person):
        return HttpResponse()

    sol_file = SolsticeFile.objects.get(pk=file_id)
    fsock = open(sol_file.path_to_file(), "r")
    response = HttpResponse(fsock, mimetype=sol_file.content_type)
    response['Content-Disposition'] = 'attachment; filename = '+sol_file.name

    return response

@login_required
def view_avatar(request, person_id, verify_hash):
    person = Person.objects.get(pk = person_id)

    if verify_hash != md5.new("%s-%s" % (person_id, settings.SECRET_KEY)).hexdigest():
        raise Exception("Invalid file hash")

    avatar_attribute = PersonAttribute.objects.get(person = person, attribute = "yarn_avatar_id")

    sol_file = SolsticeFile.objects.get(pk=avatar_attribute.value)
    fsock = open(sol_file.path_to_file(), "r")
    response = HttpResponse(fsock, mimetype=sol_file.content_type)

    return response

@login_required
def update_threads(request, thread_info):
    person = Person.objects.get(login_name = request.user.username)

    response_data = {}

    threads = thread_info.split(",")
    for per_thread in threads:
        thread_id, max_artifact_id = per_thread.split(":")
        thread = Thread.objects.get(pk=thread_id)

        if thread.person_has_access(person):
            artifacts = Artifact.objects.filter(thread_id = thread.pk, pk__gt = max_artifact_id).order_by('-pk')

            if artifacts:
                new_max_id = 0
                artifact_data = []
                for artifact in artifacts:
                    if artifact.pk > new_max_id:
                        new_max_id = artifact.pk
                    artifact_data.append(artifact.json_data())

                artifact_data.reverse()
                response_data[thread_id] = {
                    "max_artifact_id": new_max_id or max_artifact_id,
                    "artifacts": artifact_data
                }

    return HttpResponse(json.dumps(response_data), { "Content-type": "application/json" })

@login_required
def set_fav_threads(request):
    if request.method != "POST":
        return HttpResponse(status = 405)

    json_data = json.loads(request.raw_post_data)
    person = Person.objects.get(login_name = request.user.username)

    save_values = []
    seen_thread_ids = {}

    for thread_id in json_data:
        thread = Thread.objects.get(pk=thread_id)

        if thread.person_has_access(person) and not thread.is_private:
            if thread_id not in seen_thread_ids:
                save_values.append(thread_id)
                seen_thread_ids[thread_id] = True


    favorites = FavoriteThreads.objects.get_or_create(person = person)[0]
    favorites.threads = json.dumps(save_values)
    favorites.save()

    return HttpResponse()
