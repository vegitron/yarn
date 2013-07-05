# XXX - at this point, this is just tracking the lifecycle of a
# websockets app, it doesn't actually serve the app
# usage:
# in your virtualenv: python socket_server.py

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'project.settings'

import gevent
import time
import json
from gevent import monkey; monkey.patch_all()
from socketio import socketio_manage
from socketio.server import SocketIOServer
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin
from yarn.models import Artifact, WebsocketAuthToken, Person
from yarn.views import data_for_thread_list, data_for_thread_info
from django.db.models import Max, F
from django.contrib.sessions.middleware import SessionMiddleware



class Tester(BaseNamespace, RoomsMixin, BroadcastMixin):
#    def __init__(self, *args, **kwargs):
#        print "S: ", self
#        print "A: ", args
#        print "K: ", kwargs

    def on_load_threads(self, args):
        token = args['token']
        login_name = args['user']

        if not WebsocketAuthToken().validate_token(token, login_name):
            return

        person = Person.objects.get(login_name = login_name)
        self.person = person

        thread_data = data_for_thread_list(person)

        self.emit('initial_thread_list', json.dumps(thread_data))
        self.spawn(self.update_messages, server)


    def on_thread_info(self, args):
        thread_id = args['thread_id']

        data = data_for_thread_info(thread_id, self.person)
        self.emit('thread_info', json.dumps(data))

    @staticmethod
    def update_messages(self):
        while True:
            print "In the per-request spawning"
            time.sleep(3)


    def recv_disconnect(self):
        print "Disconnecting"
        self.disconnect(silent=True)
        self.kill_local_jobs()

    def on_tester(self, message):
        newest = Artifact.objects.get(pk = 539)
        print "N: ", newest
        self.emit('new_message', newest.description)


#def update_messages(server):
#    while True:
#        print "In update_messages"
#
#        for sessid, socket in server.sockets.iteritems():
#            print "S1: ", sessid, "S2: ", socket
#
#            pkt = dict(type="event",
#                   name="new_message",
#                   args=["What goes in here?"],
#                   endpoint="")
#
#            socket.send_packet(pkt)
#
#        time.sleep(2)


class Application(object):
    def __init__(self):
        self.request = { }

    def __call__(self, environ, start_response):
        path = environ['PATH_INFO'].strip('/')
        if path.startswith("socket.io"):
            socketio_manage(environ, {'': Tester}, self.request)

if __name__ == '__main__':
    print 'Listening on port 8008'

    # XXX - Make port, interface, and ssl stuff configuration driven
    server = SocketIOServer(('192.168.1.99', 8008), Application(),
        resource="socket.io")

    server.serve_forever()


