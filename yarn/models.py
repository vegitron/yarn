from django.db import models

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
