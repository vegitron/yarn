from yarn.models import Thread, Artifact, Person, PersonAttribute, SolsticeFile, User, FavoriteThreads, ThreadNotification, ThreadManager
import simplejson as json
import re
import hashlib
import sys
import time
import base64
from django.conf import settings
from datetime import datetime
from datetime import timedelta
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required
from wsgiref.handlers import format_date_time

@login_required
def private_thread_info(request, login_name):
    person = Person.objects.get(login_name = request.user.username)
    talk_with = Person.objects.get(login_name = login_name)

    channel_name = ""

    if person.person_id < talk_with.person_id:
        channel_name = "%d|%d" % (person.person_id, talk_with.person_id)
    else:
        channel_name = "%d|%d" % (talk_with.person_id, person.person_id)

    thread = None
    try:
        thread = Thread.objects.get(name = channel_name, is_private = True)
    except Thread.DoesNotExist:
        thread = Thread.objects.create(
            name = channel_name,
            is_private = True,
        )

    return thread_info(request, thread.pk)


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
        data = { "thread": thread.json_data(person), "artifacts": artifact_data, "max_artifact_id": max_artifact_id }

        data["online_users"] = _get_online_users(thread)
        data["last_person_update"] = time.mktime(datetime.now().timetuple())

        return HttpResponse(json.dumps(data), { "Content-type": "application/json; charset=utf-8" })

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

        if thread.is_private:
            other_person = thread.get_other_person(person)
            thread_notification = ThreadNotification.objects.get_or_create(person = other_person, thread = thread)[0]
            thread_notification.is_new = True
            thread_notification.save()


        return HttpResponse('""')

    if request.method == "PUT":

        json_data = json.loads(request.raw_post_data)

        if "topic" in json_data:
            thread.description = json_data["topic"]
            artifact = Artifact.objects.create(
                thread_id = thread.pk,
                person_id =  person.person_id,
                description = json_data["topic"],
                timestamp = datetime.now(),
                artifact_type = "new_description",
            )

        if "name" in json_data:
            if thread.is_manager(person):
                thread.name = json_data["name"]
                artifact = Artifact.objects.create(
                    thread_id = thread.pk,
                    person_id =  person.person_id,
                    description = json_data["name"],
                    timestamp = datetime.now(),
                    artifact_type = "new_thread_name",
                )

        if "managers" in json_data:
            if thread.is_manager(person):
                p = re.compile('[, ]+')
                netids = p.split(json_data["managers"])
                manager_people = Person.objects.filter(login_name__in = netids)

                if len(manager_people):
                    with transaction.commit_manually():
                        ThreadManager.objects.filter(thread_id = thread.pk).delete()
                        for person in manager_people:
                            ThreadManager.objects.create(
                                thread_id = thread.pk,
                                person_id = person.pk,
                            )

                        transaction.commit()

        thread.save()

        return HttpResponse('""')



@login_required
def thread_list(request):
    if request.method == "POST":
        return _create_new_thread(request)
    elif request.method == "GET":
        return _get_threads_for_current_user(request)

def _create_new_thread(request):
    json_data = json.loads(request.raw_post_data)

    threads = Thread.objects.filter(is_private__isnull = True, name = json_data["name"])

    if len(threads):
        return HttpResponse(status=409)

    thread = Thread.objects.create(name=json_data["name"], description=json_data["topic"], is_private=None)

    return HttpResponse(thread.id)

def _get_threads_for_current_user(request):
    """ Returns a list of all threads the user has access to """
    threads = Thread.objects.filter(is_private__isnull = True).exclude(is_deleted = True)

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
    person, was_created = Person.objects.get_or_create(login_name = request.user.username)

    use_websockets = False
    websockets_url = ''
    if hasattr(settings, 'YARN_WEBSOCKETS_URL'):
        use_websockets = True
        websockets_url = settings.YARN_WEBSOCKETS_URL

    return render_to_response("home.html", {
        "login_name": person.login_name,
        "name": person.name,
        "use_websockets": use_websockets,
        "websockets_url": websockets_url,
    }, RequestContext(request))


@login_required
def download_file(request, thread_id, file_id, verify_hash):
    if verify_hash != hashlib.md5("%s-%s-%s" % (thread_id, file_id, settings.SECRET_KEY)).hexdigest():
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
    if verify_hash != hashlib.md5("%s-%s-%s" % (thread_id, file_id, settings.SECRET_KEY)).hexdigest():
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

    if verify_hash != hashlib.md5("%s-%s" % (person_id, settings.SECRET_KEY)).hexdigest():
        raise Exception("Invalid file hash")

    avatar_attribute = PersonAttribute.objects.get(person = person, attribute = "yarn_avatar_id")

    sol_file = SolsticeFile.objects.get(pk=avatar_attribute.value)
    fsock = open(sol_file.path_to_file(), "r")
    response = HttpResponse(fsock, mimetype=sol_file.content_type)

    return response

@login_required
def update_threads(request, thread_info, last_person_update=None):
    person = Person.objects.get(login_name = request.user.username)

    response_data = {}

    threads = thread_info.split(",")

    max_artifact_lookup = {}
    thread_ids = []
    for per_thread in threads:
        thread_id, max_artifact_id = per_thread.split(":")
        thread_ids.append(thread_id)
        max_artifact_lookup[int(thread_id)] = max_artifact_id

    threads = Thread.objects.filter(pk__in=thread_ids)

    thread_lookup = {}
    for thread in threads:
        if thread.person_has_access(person):
            thread_lookup[thread.pk] = thread

    threads = thread_lookup.values()

    _mark_person_online(person, threads)

    for thread in threads:
        thread_id = thread.pk
        max_artifact_id = max_artifact_lookup[thread_id]

        artifacts = Artifact.objects.filter(thread_id = thread.pk, pk__gt = max_artifact_id).order_by('-pk')

        needs_online_update = False
        if artifacts:
            new_max_id = 0
            artifact_data = []
            for artifact in artifacts:
                if artifact.artifact_type == "online_notice" or artifact.artifact_type == "offline_notice":
                    needs_online_update = True
                if artifact.pk > new_max_id:
                    new_max_id = artifact.pk
                artifact_data.append(artifact.json_data())

            artifact_data.reverse()
            response_data[thread_id] = {
                "max_artifact_id": new_max_id or max_artifact_id,
                "artifacts": artifact_data
            }

            if needs_online_update:
                response_data[thread_id]["online_users"] = _get_online_users(thread)

            response_data[thread_id]["is_private"] = thread.is_private

    new_private_chat_notifications = ThreadNotification.objects.filter(person = person, is_new = True)

    private_chats = []
    for notification in new_private_chat_notifications:
        notification.is_new = False
        notification.save()
        private_chats.append(notification.json_data(person))

    person_updates = {}
    last_update_time = None
    if last_person_update:
        last_date = datetime.fromtimestamp(int(last_person_update))
        people = Person.objects.filter(date_modified__gt=last_date)

        for person in people:
            person_updates[person.login_name] = person.json_data()

        if len(people):
            last_update_time = time.mktime(datetime.now().timetuple())

    data = {
        "person_updates": person_updates,
        "last_person_update": last_update_time,
        "new_private_chats": private_chats,
        "updates": response_data,
    }
    return HttpResponse(json.dumps(data), { "Content-type": "application/json" })

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

@login_required
def thread_history(request, thread_id):
    thread = Thread.objects.get(pk=thread_id)
    person = Person.objects.get(login_name = request.user.username)

    if not thread.person_has_access(person):
        return HttpResponse()


    dates = set(Artifact.objects.filter(thread_id = thread_id, artifact_type__in=[None, 'file', 'new_description', 'new_thread_name']).values('timestamp').order_by('timestamp').dates("timestamp", "day"))


    data = []
    for date in dates:
        if date:
            data.append(format_date_time(time.mktime(date.timetuple())))

    return HttpResponse(json.dumps({ "thread_id": thread_id, "dates": data }), { "Content-type": "application/json" })

@login_required
def thread_history_date(request, thread_id, date):
    thread = Thread.objects.get(pk=thread_id)
    person = Person.objects.get(login_name = request.user.username)

    if not thread.person_has_access(person):
        return HttpResponse()

    month, day, year = date.split('-')

    min_date = datetime(int(year), int(month), int(day))

    max_date = min_date + timedelta(days = 1)

    artifacts = Artifact.objects.filter(thread_id = thread.pk, timestamp__gt = min_date, timestamp__lt = max_date).order_by('pk')
    artifact_data = []
    for artifact in artifacts:
        artifact_data.append(artifact.json_data())
        artifact_data.reverse()


    data = { "thread": thread.json_data(person), "artifacts": artifact_data }

    return HttpResponse(json.dumps(data), { "Content-type": "application/json; charset=utf-8" })

def _get_online_users(thread):
    online_list = User.objects.filter(thread = thread, is_online = True)
    online_users = []

    max_date = datetime.now()
    for user in online_list:
        online_users.append(user.person.json_data())

    return online_users

def _mark_person_online(person, threads):
    users = User.objects.filter(person = person, thread__in = threads)

    existing_user_thread_ids = {}
    for user in users:
        existing_user_thread_ids[user.thread.pk] = True
        if not user.is_online:
            _set_user_online(user)
        else:
            user.last_online = datetime.now()
            user.save()

    for thread in threads:
        if not thread.pk in existing_user_thread_ids:
            new_user = User()
            new_user.thread = thread
            new_user.person = person
            _set_user_online(new_user)

def _set_user_online(user):
    user.last_online = datetime.now()
    user.is_online = True
    user.save()

    online_artifact = Artifact.objects.create(
        thread_id = user.thread.pk,
        person_id = user.person.pk,
        artifact_type = "online_notice",
        timestamp = datetime.now(),
    )

@login_required
def client_error(request):
    json_data = json.loads(request.raw_post_data)
    msg = json_data["msg"]
    url = json_data["url"]
    line = json_data["line"]
    print "User: ", request.user.username, "M: ", msg, "U: ", url, "L: ", line

    return HttpResponse('""')

