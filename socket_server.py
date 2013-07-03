# XXX - at this point, this is just tracking the lifecycle of a
# websockets app, it doesn't actually serve the app
# usage:
# in your virtualenv: python socket_server.py

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'project.settings'

import gevent
import time
from gevent import monkey; monkey.patch_all()
from socketio import socketio_manage
from socketio.server import SocketIOServer
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin
from yarn.models import Artifact
from django.db.models import Max, F
from django.contrib.sessions.middleware import SessionMiddleware



class Tester(BaseNamespace, RoomsMixin, BroadcastMixin):
#    def __init__(self, *args, **kwargs):
#        print "S: ", self
#        print "A: ", args
#        print "K: ", kwargs

    def initialize(self):
        print "S: ", self
        print "Sock: ", self.socket
#        print "E: ", BaseNamespace.environ
        print "E2: ", self.environ

        self.spawn(self.update_messages, server)

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

    def on_load_threads(self):
        self.emit('thread_list', 'okok')

def update_messages(server):
    while True:
        print "In update_messages"

        for sessid, socket in server.sockets.iteritems():
            print "S1: ", sessid, "S2: ", socket

            pkt = dict(type="event",
                   name="new_message",
                   args=["What goes in here?"],
                   endpoint="")

            socket.send_packet(pkt)

        time.sleep(2)


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
    server = SocketIOServer(('0.0.0.0', 8008), Application(),
        resource="socket.io")

    gevent.spawn(update_messages, server)
    server.serve_forever()


