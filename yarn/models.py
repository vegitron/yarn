from django.db import models
import time
from wsgiref.handlers import format_date_time

# Create your models here.

class Thread(models.Model):
    name = models.CharField(max_length=100, unique=True, db_column='name')
    description = models.CharField(max_length=1000, db_column='description')
    is_private = models.BooleanField(db_column='is_private')
    has_groups = models.BooleanField(db_column='has_groups')

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

class Artifact(models.Model):
    description = models.TextField(db_column='description')
    timestamp = models.DateTimeField(db_column='timestamp')
    artifact_type = models.CharField(max_length=128, db_column='type')
    thread = models.ForeignKey(Thread, db_column='thread_id')
    bot = models.TextField(db_column='bot')

    def json_data(self):
        return {
            "id": self.pk,
            "description": self.description,
            "timestamp": format_date_time(time.mktime(self.timestamp.timetuple())),
            "type": self.artifact_type,
            "thread_id": self.thread.pk,
            "bot": self.bot
        }

    class Meta:
        db_table = 'artifact'
