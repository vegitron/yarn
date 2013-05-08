from django.conf.urls import patterns, url

urlpatterns = patterns('',
    url(r'^$', 'yarn.views.home'),
    url(r'^rest/v1/threads', 'yarn.views.thread_list'),
)
