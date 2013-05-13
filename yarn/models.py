from django.db import models
from django.conf import settings
import time
import md5
from wsgiref.handlers import format_date_time
from django.core.urlresolvers import reverse

class Thread(models.Model):
    name = models.CharField(max_length=100, unique=True, db_column='name')
    description = models.CharField(max_length=1000, db_column='description')
    is_private = models.BooleanField(db_column='is_private')
    has_groups = models.BooleanField(db_column='has_groups')

    def person_has_access(self, person):
        # XXX - needs to check the auth_list and group_auth, as well
        # as checking for private threads that the person is one of the 2
        # participants
        return True

    def json_data(self):
        return {
            "id": self.pk,
            "name": self.name,
            "description": self.description,
            "is_private": self.is_private,
            "has_groups": self.has_groups,
        }

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

class Artifact(models.Model):
    description = models.TextField(db_column='description')
    timestamp = models.DateTimeField(db_column='timestamp')
    artifact_type = models.CharField(max_length=128, db_column='type')
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

