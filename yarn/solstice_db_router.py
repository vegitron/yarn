""" This is for shimming solstice installs into the django version """
class SolsticeDBRouter(object):
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'yarn' and (model.__name__ in ['Person', 'PersonAttribute', 'SolsticeFile', 'SolsticeFileAttribute']):
            return 'solstice'

    def db_for_write(self, model, **hints):
        return self.db_for_read(model, **hints)

    def allow_relation(self, obj1, obj2, **hints):
        return True
