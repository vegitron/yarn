from django.db import models
import time
from wsgiref.handlers import format_date_time

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

        if hasattr(self, 'person'):
            data["author"] = self.person.json_data()

        return data

    class Meta:
        db_table = 'artifact'


