""" This is for shimming solstice installs into the django version """
class SolsticeDBRouter(object):
    def db_for_read(self, model, **hints):
        if model._meta.app_label in ['yarn', 'authz_group'] and model.__name__ in ['Person', 'PersonAttribute', 'Crowd', 'CrowdOwner', 'SolsticeFile', 'SolsticeFileAttribute', 'SolsticeCrowd', 'SolsticeCrowdOwner', 'SolsticeCrowdMember']:
            return 'solstice'

        if model._meta.app_label == 'authz_group' and model.__name__ in ['GWSCrowd', 'GWSCrowdOwner']:
            return 'catalyst_tools'

    def db_for_write(self, model, **hints):
        return self.db_for_read(model, **hints)

    def allow_relation(self, obj1, obj2, **hints):
        return True
