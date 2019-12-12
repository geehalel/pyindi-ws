# -*- coding: utf-8 -*-
import argparse
import random
import os
import json

# for BLOB transfers
import base64

import cherrypy
from cherrypy.lib.static import serve_file

from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool
from ws4py.websocket import WebSocket
from ws4py.messaging import TextMessage

import PyIndi

def strISState(s):
    if (s == PyIndi.ISS_OFF):
        return "Off"
    else:
        return "On"

def strIPState(s):
    if (s == PyIndi.IPS_IDLE):
        return "Idle"
    elif (s == PyIndi.IPS_OK):
        return "Ok"
    elif (s == PyIndi.IPS_BUSY):
        return "Busy"
    elif (s == PyIndi.IPS_ALERT):
        return "Alert"

class IndiJSONEncoder(json.JSONEncoder):
    def getencoder(self, obj):
        if isinstance(obj, PyIndi.BaseDevice):
            return {'name':  PyIndi.BaseDevice.getDeviceName }
        if isinstance(obj, PyIndi.Property):
            return {'name' : PyIndi.Property.getName, 
                    'label': PyIndi.Property.getLabel, 
                    'groupname' : PyIndi.Property.getGroupName,
                    'devicename' : PyIndi.Property.getDeviceName,
                    'state' : PyIndi.Property.getState,
                    'permission' : PyIndi.Property.getPermission,
                    'type' : PyIndi.Property.getType
                    }
        if (isinstance(obj, PyIndi.INumberVectorProperty) or
            isinstance(obj, PyIndi.ITextVectorProperty) or
            isinstance(obj, PyIndi.ILightVectorProperty) or
            isinstance(obj, PyIndi.IBLOBVectorProperty)):
           return {'device' : None,
                   'name' : None,
                   'label' : None, 
                   'group' : None,
                   's' : None
                   #'timestamp' : None # Not set by basedevice.setValue on message receive
                   }
        if isinstance(obj, PyIndi.ISwitchVectorProperty):
           return {'device' : None,
                   'name' : None,
                   'label' : None, 
                   'group' : None,
                   's' : None,
                   'r' : None
                   #'timestamp' : None # Not set by basedevice.setValue on message receive
                   }
        if isinstance(obj, PyIndi.IText):
           return {'name' : None,
                   'label': None, 
                   'text': None 
                   }
        if isinstance(obj, PyIndi.INumber):
           return {'name' : None,
                   'label' : None,
                   'format': None, 
                   'min': None, 
                   'max': None, 
                   'step': None, 
                   'value': None 
                   }
        if isinstance(obj, PyIndi.ISwitch):
           return {'name' : None,
                   'label' : None,
                   's' : None
                   }
        if isinstance(obj, PyIndi.ILight):
           return {'name' : None,
                   'label' : None,
                   's' : None
                   }
        if isinstance(obj, PyIndi.IBLOB):
           return {'name' : None,
                   'label' : None,
                   'format': None, 
                   'size': None, 
                   'bloblen': None,
                   'blob': (lambda x: base64.b64encode(x.getblobdata()))
                   #'blob': str(obj.blob) if hasattr(obj, 'blob') else ''
                   }
        return None
    def getvectormethod(self, obj):
        if isinstance(obj, PyIndi.Property):
            if (obj.getType() == PyIndi.INDI_TEXT): 
                return PyIndi.Property.getText
            if (obj.getType() == PyIndi.INDI_NUMBER): 
                return PyIndi.Property.getNumber
            if (obj.getType() == PyIndi.INDI_SWITCH): 
                return PyIndi.Property.getSwitch 
            if (obj.getType() == PyIndi.INDI_LIGHT): 
                return PyIndi.Property.getLight
            if (obj.getType() == PyIndi.INDI_BLOB): 
                return PyIndi.Property.getBLOB
        if (isinstance(obj, PyIndi.INumberVectorProperty) or
            isinstance(obj, PyIndi.ITextVectorProperty) or
            isinstance(obj, PyIndi.ISwitchVectorProperty) or
            isinstance(obj, PyIndi.ILightVectorProperty) or
            isinstance(obj, PyIndi.IBLOBVectorProperty)):
            return (lambda x: x)
        return None
    def default(self, obj):
        encoder=self.getencoder(obj)
        if encoder:
            jsonobj={ }
            for (key, getmethod) in encoder.iteritems():
                if getmethod:
                    jsonobj[key] = getmethod(obj)
                else:
                    if (hasattr(obj, key)):
                        element = getattr(obj, key)
                        if (isinstance(element, str)):
                            try:
                                # indi does not init correctly some strings
                                jsonobj[key] = element.decode('utf_8')
                            except:
                                jsonobj[key] = ''
                        else:
                            jsonobj[key] = element

            if (isinstance(obj, PyIndi.Property) and (obj.getType()==PyIndi.INDI_SWITCH)):
                jsonobj['rule'] = obj.getSwitch().r
            if (isinstance(obj, PyIndi.Property) or
                isinstance(obj, PyIndi.INumberVectorProperty) or
                isinstance(obj, PyIndi.ITextVectorProperty) or
                isinstance(obj, PyIndi.ISwitchVectorProperty) or
                isinstance(obj, PyIndi.ILightVectorProperty) or
                isinstance(obj, PyIndi.IBLOBVectorProperty)):
                getvectormethod = self.getvectormethod(obj)
                jsonobj['vector']=[]
                if getvectormethod:
                    for item in getvectormethod(obj):
                        jsonobj['vector'].append(self.default(item))
            return jsonobj
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)

class WSIndiClient(PyIndi.BaseClient):
    def __init__(self, ws):
        super(WSIndiClient, self).__init__()
        self.serverkey=None
        self.ws=ws
        self.ws.send('creating an instance of PyIndi.BaseClient')
    def newDevice(self, d):
        self.ws.send('{"type":"newDevice", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(d, cls=IndiJSONEncoder)+'}')
        #self.ws.send("new device " + d.getDeviceName())
    def newProperty(self, p):
        self.ws.send('{"type":"newProperty", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(p, cls=IndiJSONEncoder)+'}')
        #self.ws.send("new property "+ p.getName() + " for device "+ p.getDeviceName())
    def removeProperty(self, p):
        if p:
            self.ws.send('{"type":"removeProperty", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(p, cls=IndiJSONEncoder)+'}')
            #self.ws.send("remove property "+ p.getName() + " for device "+ p.getDeviceName())
    def newBLOB(self, bp):
        self.ws.send('{"type":"newBlob", "serverkey":"'+str(self.serverkey)+'", "data": { "device": "'+ str(bp.bvp.device) +'", '+'"name": "'+ str(bp.bvp.name) +'", '+
                     '"s": '+ str(bp.bvp.s) +', '+'"vector": ['+ json.dumps(bp, cls=IndiJSONEncoder)+']}}')
        #self.ws.send("new BLOB "+ bp.name.decode())
    def newSwitch(self, svp):
        self.ws.send('{"type":"newSwitch", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(svp, cls=IndiJSONEncoder)+'}')
        #self.ws.send ("new Switch "+ svp.name.decode() + " for device "+ svp.device.decode())
    def newNumber(self, nvp):
        self.ws.send('{"type":"newNumber", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(nvp, cls=IndiJSONEncoder)+'}')
        #self.ws.send("new Number "+ nvp.name.decode() + " for device "+ nvp.device.decode())
    def newText(self, tvp):
        self.ws.send('{"type":"newText", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(tvp, cls=IndiJSONEncoder)+'}')
        #self.ws.send("new Text "+ tvp.name.decode() + " for device "+ tvp.device.decode())
    def newLight(self, lvp):
        self.ws.send('{"type":"newLight", "serverkey":"'+str(self.serverkey)+'", "data":'+ json.dumps(lvp, cls=IndiJSONEncoder)+'}')
        #self.ws.send("new Light "+ lvp.name.decode() + " for device "+ lvp.device.decode())
    def newMessage(self, d, m):
        self.ws.send("new Message "+ d.messageQueue(m).decode())
    def serverConnected(self):
        self.serverkey=self.getHost()+":"+str(self.getPort())
        self.ws.setConnected(self.serverkey, True)
    def serverDisconnected(self, code):
        self.ws.setConnected(self.serverkey, False)

class IndiServerData(object):
    def __init__(self, server, port, indiclient, connected):
        self.server=server
        self.port=port
        self.indiclient=indiclient
        self.connected=connected

class IndiWebSocketHandler(WebSocket):

    def __init__(self, sock, protocols, extensions, environ, heartbeat_freq):
        super(IndiWebSocketHandler, self).__init__(sock, protocols, extensions, environ, heartbeat_freq)
        self.jsonmsg=  { }
        self.indiservers = { }
    
    def setConnected(self, serverkey, connected):
        if serverkey in self.indiservers:
            self.indiservers[serverkey].connected=connected
            self.send("indi-ws: setConnected "+str(connected)+ " "+ serverkey)
            self.send('{"type": "setConnected", "serverkey":"'+str(serverkey)+'", "connected":'+json.dumps(connected)+'}')
        else:
            self.send("indi-ws: not there " + serverkey ) 

    def received_message(self, m):
        #print(m)
        self.jsonmsg=json.loads(str(m))
        #print(self.jsonmsg)
        if ('type' in self.jsonmsg):
            if (self.jsonmsg['type'] == "getkey"):
                self.send('{"type":"setKey", "data":'+str(self.peer_address[1])+'}')
                return
            if (self.jsonmsg['type'] == "connect"):
                server=self.jsonmsg['data']['server']
                port=int(self.jsonmsg['data']['port'])
                serverkey=server+':'+str(port)
                if serverkey in self.indiservers and self.indiservers[serverkey].connected:
                    self.send('indi-ws: already connected to indi server '+serverkey)
                    return
                if not(serverkey in self.indiservers):
                    indiclient=WSIndiClient(self)
                    indiclient.setServer(str(server), port)
                else:
                    indiclient=self.indiservers[serverkey].indiclient
                self.indiservers[serverkey]=IndiServerData(server, port, indiclient, False)
                self.currentindiclient=indiclient
                self.send("indi-ws: connecting to indi server "+ serverkey)
                if not (indiclient.connectServer()):
                     self.send("indi-ws: connection refused "+ serverkey)
                return
            if (self.jsonmsg['type'] == "disconnect"):
                server=self.jsonmsg['data']['server']
                port=int(self.jsonmsg['data']['port'])
                serverkey=server+':'+str(port)
                if not(serverkey in self.indiservers):
                    self.send('indi-ws: unknown indi server '+serverkey)
                    return
                if not(self.indiservers[serverkey].connected):
                    self.send('indi-ws: indi server '+serverkey + ' alreday disconnected')
                    return
                indiclient=self.indiservers[serverkey].indiclient
                self.send("indi-ws: disconnecting from indi server "+ serverkey)
                if not (indiclient.disconnectServer()):
                    self.send("indi-ws: disconnection refused "+ serverkey)
                return
            if (self.jsonmsg['type'] == "newValue"):
                serverkey=self.jsonmsg['serverkey']
                if not(serverkey in self.indiservers):
                    self.send('indi-ws: unknown indi server '+serverkey+' for newValue')
                    return
                if not(self.indiservers[serverkey].connected):
                    self.send('indi-ws: indi server '+serverkey + ' disconnected -- can not set newValue')
                    return
                indiclient=self.indiservers[serverkey].indiclient
                dname=str(self.jsonmsg['devicename'])
                pname=str(self.jsonmsg['name'])
                itemname=str(self.jsonmsg['element']['name'])
                value=str(self.jsonmsg['element']['value'])
                #print('newvalue :' + dname + ' '+ pname +' '+itemname+' '+value)
                try:
                    if (self.jsonmsg['proptype'] == PyIndi.INDI_TEXT):
                        indiclient.sendNewText(dname, pname, itemname, value)
                    if (self.jsonmsg['proptype'] == PyIndi.INDI_NUMBER): 
                        indiclient.sendNewNumber(dname, pname, itemname, float(value))
                    if (self.jsonmsg['proptype'] == PyIndi.INDI_SWITCH): 
                        # we can not set to 0 a checkbox property with this method!
                        indiclient.sendNewSwitch(dname, pname, itemname) # no value, defult is to set switch on
                    if (self.jsonmsg['proptype'] == PyIndi.INDI_BLOB): 
                        indiclient.sendOneBlob(dname, pname, itemname, value)
                except Exception as e:
                    self.send('indi-ws: Exception '+type(e).__name__ + ':'+str(e))
                return
            if (self.jsonmsg['type'] == "newVector"):
                serverkey=self.jsonmsg['serverkey']
                if not(serverkey in self.indiservers):
                    self.send('indi-ws: unknown indi server '+serverkey+' for newValue')
                    return
                if not(self.indiservers[serverkey].connected):
                    self.send('indi-ws: indi server '+serverkey + ' disconnected -- can not set newValue')
                    return
                indiclient=self.indiservers[serverkey].indiclient
                dname=str(self.jsonmsg['devicename'])
                pname=str(self.jsonmsg['name'])
                prop=indiclient.getDevice(dname).getProperty(pname)
                if (self.jsonmsg['proptype'] == PyIndi.INDI_TEXT):
                    vprop=prop.getText()
                    attr='text'
                    sendmethod=PyIndi.BaseClient.sendNewText
                    convmethod=str
                if (self.jsonmsg['proptype'] == PyIndi.INDI_NUMBER): 
                    vprop=prop.getNumber()
                    attr='value'
                    sendmethod=PyIndi.BaseClient.sendNewNumber
                    convmethod=(lambda x: float(str(x)))
                if (self.jsonmsg['proptype'] == PyIndi.INDI_SWITCH): 
                    vprop=prop.getSwitch()
                    attr='s'
                    sendmethod=PyIndi.BaseClient.sendNewSwitch
                    convmethod=(lambda x: int(str(x)))
                #if (self.jsonmsg['proptype'] == PyIndi.INDI_BLOB): 
                #    vprop=prop.getBLOB()
                #    attr=None
                #    sendmethod=PyIndi.BaseClient.sendOneBlob
                #    convmethod=(lambda x: x)
                for item in self.jsonmsg['vector']:
                    index=0
                    while (vprop[index].name != item['name']):
                        index = index + 1
                    element=vprop[index]
                    try:
                        value=convmethod(item['value'])
                    except Exception as e:
                        self.send('indi-ws: Exception '+type(e).__name__ + ':'+str(e))
                        return
                    setattr(element, attr, value)
                sendmethod(indiclient, vprop)
                return       
            if (self.jsonmsg['type'] == "newBlobmode"):
                serverkey=self.jsonmsg['serverkey']
                if not(serverkey in self.indiservers):
                    self.send('indi-ws: unknown indi server '+serverkey+' for newValue')
                    return
                if not(self.indiservers[serverkey].connected):
                    self.send('indi-ws: indi server '+serverkey + ' disconnected -- can not set newBlobmode')
                    return
                indiclient=self.indiservers[serverkey].indiclient
                dname=str(self.jsonmsg['devicename'])
                pname=None
                if 'name' in self.jsonmsg:
                    pname=str(self.jsonmsg['name'])
                    if 'element' in self.jsonmsg:
                        mode=int(str(self.jsonmsg['element']['mode']))
                    else:
                        mode=int(str(self.jsonmsg['mode']))
                    indiclient.setBLOBMode(mode, dname, pname);
                else: 
                    # device level blob handling
                    mode=int(str(self.jsonmsg['mode']))
                    indiclient.setBLOBMode(mode, dname);
                return
            self.send('indi-ws: unknow json message type '+ str(m))
        else:
            self.send('indi-ws: unknow message '+ str(m))

    def closed(self, code, reason="A client left without a proper explanation."):
        cherrypy.engine.publish('websocket-broadcast', TextMessage(reason))
        #self.send(TextMessage(reason))

class Root(object):
    def __init__(self, host, port, ssl=False):
        self.host = host
        self.port = port
        self.scheme = 'wss' if ssl else 'ws'

    @cherrypy.expose
    def index(self):
        f=open('static/index_simple_html.html')
        return f.read().format(host=self.host, port=self.port, scheme=self.scheme)

    @cherrypy.expose
    def ws(self):
        cherrypy.log("Handler created: %s" % repr(cherrypy.request.ws_handler))

if __name__ == '__main__':
    import logging
    from ws4py import configure_logger
    configure_logger(level=logging.DEBUG)

    parser = argparse.ArgumentParser(description='Indi (simple html) CherryPy Server')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('-p', '--port', default=9000, type=int)
    parser.add_argument('--ssl', action='store_true')
    args = parser.parse_args()

    cherrypy.config.update({'server.socket_host': args.host,
                            'server.socket_port': args.port,
                            'tools.staticdir.root': os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))})

    if args.ssl:
        cherrypy.config.update({'server.ssl_certificate': './server.crt',
                                'server.ssl_private_key': './server.key'})

    WebSocketPlugin(cherrypy.engine).subscribe()
    cherrypy.tools.websocket = WebSocketTool()

    cherrypy.quickstart(Root(args.host, args.port, args.ssl), '', config={
        '/ws': {
            'tools.websocket.on': True,
            'tools.websocket.handler_cls': IndiWebSocketHandler
            },
        '/js': {
              'tools.staticdir.on': True,
              'tools.staticdir.dir': 'js'
            },
        '/css': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'css'
            },
        '/images': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'images'
            },
        '/html': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': ''
            }
    }
    )
