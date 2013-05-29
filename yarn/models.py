from django.db import models
from django.conf import settings
import time
import md5
from wsgiref.handlers import format_date_time
from django.core.urlresolvers import reverse

class Thread(models.Model):
    name = models.CharField(max_length=100, unique=True, db_column='name')
    description = models.CharField(max_length=1000, db_column='description')
    is_private = models.NullBooleanField(db_column='is_private', null=True)
    has_groups = models.BooleanField(db_column='has_groups')

    def person_has_access(self, person):
        # XXX - needs to check the auth_list and group_auth, as well
        # as checking for private threads that the person is one of the 2
        # participants

        # Private threads
        if self.is_private:
            person_ids = self.name.split("|")
            for pid in person_ids:
                if int(pid) == int(person.person_id):
                    return True
            return False

        # thread managers
        try:
            manager_entry = ThreadManager.objects.get(thread = self, person = person)
            if manager_entry.pk:
                return True
        except ThreadManager.DoesNotExist:
            pass

        # Legacy auth
        try:
            auth_entry = AuthList.objects.get(thread = self, person = person)
            if auth_entry.pk:
                return True
        except AuthList.DoesNotExist:
            pass

        try:
            has_auth_entry = AuthList.objects.get(thread = self)
            if has_auth_entry.pk:
                return False
        except AuthList.DoesNotExist:
            pass


        # Group auth
        try:
            group_links = GroupLink.objects.filter(thread = self)
            # XXX - need to iterate over the groups, and get membership
            for link in group_links:
                return False

        except GroupLink.DoesNotExist:
            pass


        return True

    def get_other_person(self, person):
        if not self.is_private:
            raise Exception("No other person for non-private thread")

        id1, id2 = self.name.split('|')
        person1, person2 = Person.objects.filter(person_id__in = [id1, id2])

        if person1.person_id == person.person_id:
            return person2
        return person1

    def json_data(self, person=None):
        data = {
            "id": self.pk,
            "name": self.name,
            "description": self.description,
            "is_private": self.is_private,
            "has_groups": self.has_groups,
            "managers": []
        }

        if self.is_private and person:
            person_ids = self.name.split("|")
            pid = None
            if int(person_ids[0]) == person.pk:
                pid = person_ids[1]
            else:
                pid = person_ids[0]

            other_person = Person.objects.get(person_id = pid)
            data["login_name"] = other_person.login_name

        managers = ThreadManager.objects.filter(thread = self)
        for manager in managers:
            data["managers"].append(manager.json_data())

        print "D: ", data["managers"]
        return data


    class Meta:
        db_table = 'thread'


class Person(models.Model):
    person_id = models.AutoField(primary_key = True, db_column = 'person_id')
    login_name = models.TextField(max_length=128, db_column='login_name')
    name = models.TextField(max_length=255, db_column='name')

    def json_data(self):
        data = {
            "id": self.person_id,
            "login_name": self.login_name,
            "name": self.name,
            "attributes": {},
        }

        attributes = PersonAttribute.objects.filter(person=self)
        for attribute in attributes:
            data["attributes"][attribute.attribute] = attribute.value
            if attribute.attribute == "yarn_avatar_id":
                hashval = md5.new("%s-%s" % ( self.pk, settings.SECRET_KEY)).hexdigest()
                data["avatar_url"] = reverse('yarn.views.view_avatar', kwargs = { 'person_id': self.pk, 'verify_hash': hashval })

        return data

    class Meta:
        db_table = 'Person'


class PersonAttribute(models.Model):
    id = models.AutoField(db_column='person_attribute_id', primary_key=True)
    attribute = models.CharField(max_length = 255, db_column='attribute')
    value = models.TextField(db_column='value')
    person = models.ForeignKey(Person, db_column='person_id')

    class Meta:
        db_table = 'PersonAttribute'

class AuthList(models.Model):
    """ Legacy access controls - should use group access now """
    person = models.ForeignKey(Person)
    thread = models.ForeignKey(Thread)

    class Meta:
        db_table = 'auth_list'
        unique_together = ('thread', 'person')

class GroupLink(models.Model):
    thread = models.ForeignKey(Thread)
    group_id = models.IntegerField(db_column = 'group_id')

    class Meta:
        db_table = 'group_auth'
        unique_together = ('thread', 'group_id')

class ThreadManager(models.Model):
    person = models.ForeignKey(Person)
    thread = models.ForeignKey(Thread)

    def json_data(self):
        return self.person.json_data()

    class Meta:
        db_table = 'thread_manager'
        unique_together = ('thread', 'person')

class ThreadNotification(models.Model):
    thread = models.ForeignKey(Thread)
    person = models.ForeignKey(Person)
    is_new = models.BooleanField(db_column = "is_new")

    def json_data(self, person):
        other_person = self.thread.get_other_person(person)

        return {
            "login_name": other_person.login_name,
            "thread_id": self.thread.pk,
        }

    class Meta:
        db_table = 'thread_notifications'
        unique_together = ('thread', 'person')

class Artifact(models.Model):
    description = models.TextField(db_column='description')
    timestamp = models.DateTimeField(db_column='timestamp')
    artifact_type = models.CharField(max_length=128, db_column='type', null=True)
    thread = models.ForeignKey(Thread, db_column='thread_id')
    person = models.ForeignKey(Person, db_column='person_id')
    bot = models.TextField(db_column='bot')

    def json_data(self):
        data = {
            "id": self.pk,
            "description": self.description,
            "type": self.artifact_type,
            "thread_id": self.thread.pk,
            "timestamp": None,
            "bot": self.bot
        }
        if self.timestamp:
            data["timestamp"] = format_date_time(time.mktime(self.timestamp.timetuple()))

        if self.artifact_type == "file":
            hashval = md5.new("%s-%s-%s" % ( self.thread.pk, self.description, settings.SECRET_KEY)).hexdigest()
            data["download_url"] = reverse('yarn.views.download_file', kwargs = {'thread_id': self.thread.pk, 'file_id': self.description, 'verify_hash': hashval })

            sol_file = SolsticeFile.objects.get(pk = self.description)
            data["file_name"] = sol_file.name
            if sol_file.is_image():
                data["is_image"] = True
                data["thumbnail_url"] = reverse('yarn.views.thumbnail_file', kwargs = {'thread_id': self.thread.pk, 'file_id': self.description, 'verify_hash': hashval })

        if hasattr(self, 'person'):
            data["author"] = self.person.json_data()

        return data

    class Meta:
        db_table = 'artifact'


class User(models.Model):
    thread = models.ForeignKey(Thread, db_column = 'thread_id')
    person = models.ForeignKey(Person, db_column = 'person_id')
    is_online = models.BooleanField(db_column = 'is_online')
    last_message_id = models.IntegerField(db_column = 'last_message_id')
    last_online = models.DateTimeField(db_column='last_online')

    class Meta:
        db_table = 'user'
        unique_together = ('thread', 'person')

class SolsticeFile(models.Model):
    file_id = models.AutoField(db_column='file_id', primary_key=True)
    person = models.ForeignKey(Person, db_column='person_id')
    name = models.CharField(max_length=255, db_column='name')
    content_type = models.CharField(max_length=255, db_column='content_type')
    content_length = models.IntegerField(db_column='content_length')
    creation_date = models.DateTimeField(db_column='creation_date')
    modification_date = models.DateTimeField(db_column='modification_date')
    filestore_id = models.IntegerField(db_column='filestore_id')

    def is_image(self):
        if self.content_type in ['image/jpeg', 'image/png', 'image/gif']:
            return True
        return False

    def path_to_file(self):
        if not hasattr(settings, "SOLSTICE_FILE_ROOT"):
            raise Exception("Need to have a defined SOLSTICE_FILE_ROOT path in settings, where files will live")

        md5val = md5.new("%i" % self.person.pk).hexdigest()[:3]
        return "%s/%s/%s/%s" % (settings.SOLSTICE_FILE_ROOT, md5val, self.person.pk, self.pk)

    class Meta:
        db_table = 'File'

class SolsticeFileAttribute(models.Model):
    attribute_id = models.AutoField(db_column='file_attribute_id', primary_key=True)
    solstice_file = models.ForeignKey(SolsticeFile, db_column='file_id')
    attribute = models.CharField(max_length=255, db_column='attribute')
    value = models.TextField(db_column='value')

    class Meta:
        db_table = 'FileAttribute'

class FavoriteThreads(models.Model):
    person = models.ForeignKey(Person, unique = True)
    threads = models.TextField()

