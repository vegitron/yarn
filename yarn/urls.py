from django.conf.urls import patterns, url

urlpatterns = patterns('',
    url(r'^$', 'yarn.views.home'),
    url(r'^avatar/(?P<person_id>[0-9]+)/(?P<verify_hash>.*)', 'yarn.views.view_avatar'),
    url(r'^download/(?P<thread_id>[0-9]+)/(?P<file_id>[0-9]+)/(?P<verify_hash>.*)', 'yarn.views.download_file'),
    url(r'^thumbnail/(?P<thread_id>[0-9]+)/(?P<file_id>[0-9]+)/(?P<verify_hash>.*)', 'yarn.views.thumbnail_file'),
    url(r'^rest/v1/threads', 'yarn.views.thread_list'),
    url(r'^rest/v1/thread/(?P<thread_id>[0-9]+)', 'yarn.views.thread_info'),
    url(r'^rest/v1/update_threads/(?P<thread_info>.*)', 'yarn.views.update_threads'),
)
