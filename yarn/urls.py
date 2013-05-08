from django.conf.urls import patterns, url

urlpatterns = patterns('',
    url(r'^$', 'yarn.views.home'),
    url(r'^rest/v1/threads', 'yarn.views.thread_list'),
    url(r'^rest/v1/thread/(?P<thread_id>[0-9]+)', 'yarn.views.thread_info'),
)
