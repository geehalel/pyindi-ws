var Indi = Indi || {};

Indi.ISState = { ISS_OFF:0, ISS_ON:1};
Indi.IPState = { IPS_IDLE:0, IPS_OK:1, IPS_BUSY:2, IPS_ALERT:3 };
Indi.ISRule = { ISR_1OFMANY:0, ISR_ATMOST1:1, ISR_NOFMANY:2 };
Indi.IPerm = { IP_RO:0, IP_WO:1, IP_RW:2 };
Indi.INDI_TYPE= { INDI_NUMBER:0, INDI_SWITCH:1, INDI_TEXT:2, INDI_LIGHT:3, INDI_BLOB:4, INDI_UNKNOWN:5 };
Indi.BLOBHandling = { B_NEVER:0, B_ALSO:1, B_ONLY:2 };

Indi.inumber = (function($) {
  var inumber = function(propertyvector, jsondata) {
	  this.property = propertyvector;
	  this.name = jsondata.name;
	  this.label = jsondata.label;
	  this.format = jsondata.format;
	  this.min = jsondata.min;
	  this.max = jsondata.max;
	  this.step = jsondata.step;
	  this.value=jsondata.value;
	  this.ws=this.property.device.server.ws;
	  this.id= this.property.id+'_'+this.name;
    this.ui_element = new IndiUI.ui_inumber(this);
	  this.setvalue(this.value);
    };

  inumber.prototype = {
	   constructor: inumber,
	   getvalue: function() {
	      return this.value;
	   },
	   setvalue: function(value) {
	     this.value=value;
	     this.ui_element.setvalue(this.value);
	   },
	   setitem: function(item) {
	     this.value=item.value;
	     this.ui_element.setvalue(this.value);
	   },
	   getinput: function() {
	     return this.ui_element.getinput();
	   },
	   sendnewvalue: function () {
	     var jsonmsg={ type:"newValue", serverkey: this.property.device.server.id, devicename: this.property.device.name,
			    name:this.property.name, proptype: this.property.type};
	     jsonmsg.element= { name:this.name, value: this.getinput()};
	     //alert(JSON.stringify(jsonmsg));
	     this.ws.send(JSON.stringify(jsonmsg));
	   },
  };

  return inumber;
}(jQuery)) ;

Indi.iswitch = (function($) {
  var iswitch = function(propertyvector, jsondata) {
	  this.property = propertyvector;
	  this.name = jsondata.name;
	  this.label = jsondata.label;
	  this.state=jsondata.s;
	  this.ws=this.property.device.server.ws;
	  this.id= this.property.id+'_'+this.name;
    this.ui_element=new IndiUI.ui_iswitch(this);
    this.setvalue(this.state);
  };

  iswitch.prototype = {
    constructor: iswitch,
    getvalue: function() {
      return this.state;
    },
    setvalue: function(value) {
      if ((value == Indi.ISState.ISS_ON) && (this.property.rule == Indi.ISRule.ISR_1OFMANY))
        this.property.resetswitch();
	    this.state=value;
	    this.ui_element.setvalue(this.state);
    },
    setitem: function(item) {
	    this.setvalue(item.s);
    },
    getinput: function() {
	    return this.state;
    },
    sendnewvalue: function () {
	    var jsonmsg={ type:"newValue", serverkey: this.property.device.server.id, devicename: this.property.device.name,
			  name:this.property.name, proptype: this.property.type};
	    if (this.property.rule == Indi.ISRule.ISR_1OFMANY) {
        if (this.value == Indi.ISState.ISS_ON) return;
        this.property.resetswitch();
        this.state=Indi.ISState.ISS_ON;
        this.property.sendnewvector();
	    } else {
        this.state = (this.state == Indi.ISState.ISS_ON) ? Indi.ISState.ISS_OFF : Indi.ISState.ISS_ON;
        jsonmsg.element= { name:this.name, value: this.state};
		    //alert(JSON.stringify(jsonmsg));
		    // sendNewSwitch limitation: if state=ISS_OFF, should send the whole vector
		    if (this.state == Indi.ISState.ISS_ON) {
          this.ws.send(JSON.stringify(jsonmsg));
		    } else {
          this.property.sendnewvector();
        }
      }
    },
  };
  return iswitch;
}(jQuery)) ;


Indi.itext = (function($) {
  var itext = function(propertyvector, jsondata) {
    this.property = propertyvector;
    this.name = jsondata.name;
    this.label = jsondata.label;
    this.text=jsondata.text;
    this.ws=this.property.device.server.ws;
    this.id= this.property.id+'_'+this.name;
    this.ui_element = new IndiUI.ui_itext(this);
    this.setvalue(this.text);
  };
  itext.prototype = {
    constructor: itext,
    getvalue: function() {
      return this.text;
    },
    setvalue: function(value) {
	    this.text=value;
	    this.ui_element.setvalue(this.text);
    },
    setitem: function(item) {
      this.setvalue(item.text);
    },
    getinput: function() {
      return this.ui_element.getinput();
    },
    sendnewvalue: function () {
      var jsonmsg={ type:"newValue", serverkey: this.property.device.server.id, devicename: this.property.device.name,
			  name:this.property.name, proptype: this.property.type};
	    jsonmsg.element= { name:this.name, value: this.getinput()};
	    //alert(JSON.stringify(jsonmsg));
	    this.ws.send(JSON.stringify(jsonmsg));
    },
  };
  return itext;
}(jQuery)) ;

Indi.ilight = (function($) {
  var ilight = function(propertyvector, jsondata) {
    this.property = propertyvector;
    this.name = jsondata.name;
    this.label = jsondata.label;
    this.state=jsondata.s;
    this.ws=this.property.device.server.ws;
    this.id= this.property.id+'_'+this.name;
    this.ui_element=new IndiUI.ui_ilight(this);
    this.setvalue(this.state);
  };
  ilight.prototype = {
    constructor: ilight,
    getvalue: function() {
      return this.state;
    },
    setvalue: function(value) {
      this.state=value;
      this.ui_element.setvalue(this.state);
    },
    setitem: function(item) {
      this.setvalue(item.s);
    },
    getinput: function() {
      return this.state;
    },
    sendnewvalue: function () {
	    alert('sendnewvalue: Light Properties are Read-Only');
    },
  };
  return ilight;
}(jQuery)) ;

Indi.iblob = (function($) {
  var iblob = function(propertyvector, jsondata) {
    this.property = propertyvector;
    this.name = jsondata.name;
    this.label = jsondata.label;
    this.bloblen=jsondata.bloblen;
    this.size=jsondata.size;
    //this.format=jsondata.format; uninitialized data
    this.format='';
    this.enabletransfer=false;
    this.blob=null;
    this.ws=this.property.device.server.ws;
    this.id= this.property.id+'_'+this.name;
    this.ui_element=new IndiUI.ui_iblob(this);
    //this.ui_element.setvalue();
  };
  iblob.prototype = {
    constructor: iblob,
    getblobmode: function () {
      if (this.enabletransfer)
        return Indi.BLOBHandling.B_ALSO;
	    else
        return Indi.BLOBHandling.B_NEVER;
    },
    getvalue: function() {
      return this.data;
    },
    setvalue: function(item) {
	    this.bloblen=item.bloblen;
	    this.size=item.size;
	    this.format=item.format.toLowerCase();
	    if (this.enabletransfer) {
        this.blob='data:image/'+this.format.substring(1)+';base64,'+item.blob;
        //this.blob=Indi.util.b64decode(item.blob);
        //if (this.format == '.gif' || this.format == '.jpg' || this.format == '.jpeg' || this.format == '.png')
        //    this.b64blob=item.blob; // keep b64 data to display images as data url
	    }
	    this.ui_element.setvalue();
    },
    setitem: function(item) {
	    this.setvalue(item);
    },
    getinput: function() {
	    return this.enabletransfer;
    },
    save: function () {
	    var blobblob = null;
	    var blobtype=null;
	    var blobdate=new Date();
	    var blobfilename=this.name+'_'+blobdate.toISOString()+this.format;

	    if (!this.blob || this.size == 0) {
	    	alert('Save Blob: '+this.name+' is empty or undefined');
        eturn;
	    }
	    switch (this.format) {
        case '.gif':
	      case '.jpg':
	      case '.jpeg':
	      case '.png':
	      case '.tiff':
	      case '.fits':
          blobtype='application/octet-binary';
          break;
        case '.txt':
          blobtype='text/plain;';
          break;
        case '.xml':
          blobtype='application/xhtml+xml';
          break;
      }
	    blobblob = new Blob([Indi.util.str2ab(this.blob)], {type: blobtype});
	    saveAs(blobblob, blobfilename);
    },
    sendnewvalue: function () {
      //var jsonmsg={ type:"newValue", serverkey: this.property.device.server.id, devicename: this.property.device.name,
		  //	  name:this.property.name, proptype: this.property.type};
	    //jsonmsg.element= { name:this.name, value: this.getinput()};
	    //alert(JSON.stringify(jsonmsg));
      alert('sendnewvalue: Blob Properties are not implemented');
	    //this.ws.send(JSON.stringify(jsonmsg));
    },
  };
  return iblob;
}(jQuery)) ;

Indi.property = (function($) {
  var newpropitem = function(prop, jsondata) {
    switch(prop.type) {
      case Indi.INDI_TYPE.INDI_NUMBER:
        return new Indi.inumber(prop,  jsondata);
        break;
      case Indi.INDI_TYPE.INDI_SWITCH:
        return new Indi.iswitch(prop,  jsondata);
        break;
      case Indi.INDI_TYPE.INDI_TEXT:
        return new Indi.itext(prop,  jsondata);
        break;
      case Indi.INDI_TYPE.INDI_LIGHT:
        return new Indi.ilight(prop,  jsondata);
        break;
      case Indi.INDI_TYPE.INDI_BLOB:
        return new Indi.iblob(prop,  jsondata);
        break;
      case Indi.INDI_TYPE.INDI_UNKNOWN:
        return null;
        break;
      default:
        return null;
        break;
    }
  };

  var property = function(propertydevice, jsondata) {
    this.device=propertydevice;
    this.type=jsondata.type;
    this.name=jsondata.name;
    this.label=jsondata.label;
    this.groupname=jsondata.groupname;
    this.permission=jsondata.permission;
    this.state=jsondata.state;
    if (this.type == Indi.INDI_TYPE.INDI_SWITCH)
      this.rule=Indi.ISRule.ISR_1OFMANY;
    if (this.type == Indi.INDI_TYPE.INDI_SWITCH && jsondata.rule)
	    this.rule=jsondata.rule;
    this.vector = { };
    this.ws=this.device.server.ws;
    this.id=this.device.id+'_'+this.name;
    for (var index in jsondata.vector) {
      var item = newpropitem(this, jsondata.vector[index]);
      if (item) {
        this.vector[item.name]=item;
      }
    }
    this.ui_element=new IndiUI.ui_property(this);
    this.ui_element.setstate();
  };
  property.prototype = {
    constructor: property,
    sendnewvector: function () {
	    var jsonmsg={ type:"newVector", serverkey: this.device.server.id, devicename: this.device.name, name: this.name, proptype: this.type};
	    var vector= [ ];
	    var index=0;
	    for (var itemindex in this.vector) {
        var item = this.vector[itemindex];
        var jsonitem={name: item.name, value: item.getinput()};
        vector[index++]=jsonitem;
	    }
	    jsonmsg.vector=vector;
	    //alert(JSON.stringify(jsonmsg));
	    this.ws.send(JSON.stringify(jsonmsg));
    },
    setvalue : function (jsonmsg, ptype) {
      if (ptype != this.type)
        alert('setvalue: bad property type "'+ptype+'" ('+this.type+')');
	    for (var index in jsonmsg.vector) {
        var item = this.vector[jsonmsg.vector[index].name];
        if (item)
          item.setitem(jsonmsg.vector[index])
      }
	    this.state=jsonmsg.s;
	    this.ui_element.setstate(this.state);
    },
    resetswitch: function() {
	    if (this.type != Indi.INDI_TYPE.INDI_SWITCH) {
        alert('Can not reset switch of a non switch property');
        return;
	    }
	    for (var sw in this.vector)
        this.vector[sw].setvalue(Indi.ISState.ISS_OFF);
    },
  };
  return property;
}(jQuery)) ;

Indi.device = (function($) {
  var device = function(indiserver, jsondata) {
    this.server = indiserver;
    this.name = jsondata.name;
    this.id=this.server.id+'_'+this.name;
    this.propertylist = [ ];
    this.grouplist = [ ];
    this.ui_element = new IndiUI.ui_device(this, this.server.manager.collapsible);
  };
  device.prototype = {
    constructor : device,
    newProperty : function (jsondata) {
      var groupname = jsondata.groupname;
	    if (this.grouplist[groupname] === undefined) {
        this.grouplist[groupname] = {count: 0};
        this.ui_element.addgroup(groupname);
      }
	    var newproperty = new Indi.property(this, jsondata);
	    this.propertylist[jsondata.name] = newproperty;
	    this.grouplist[newproperty.groupname].count+=1;
      this.ui_element.addproperty(newproperty, groupname);
    },
    removeProperty : function (jsondata) {
	    var prop=this.propertylist[jsondata.name];
	    this.grouplist[prop.groupname].count-=1;
      this.ui_element.removeproperty(prop);
	    if (this.grouplist[prop.groupname].count == 0) {
        delete(this.grouplist[prop.groupname]);
        this.ui_element.removegroup(prop.groupname);
      }
      delete(this.propertylist[jsondata.name]);
    },
    getproperty: function(name) {
	    return this.propertylist[name]
    },
  };
  return device;
}(jQuery)) ;

Indi.server = (function($) {
  var server = function(ehost, eport, manager) {
    this.host=ehost;
    this.port=eport;
    this.id= this.host+':'+this.port;
    this.connected=false;
    this.manager=manager;
    this.ws=this.manager.ws;
    this.devicelist = [ ];
    this.ui_element = new IndiUI.ui_server(this, this.manager.collapsible);
  };
  server.prototype = {
    constructor : server,
    connect : function (status) {
	    var msgdata = {server : this.host, port: this.port};
      this.ui_element.connecting();
	    if (status)
        this.ws.sendmsg('connect', msgdata);
	    else
        this.ws.sendmsg('disconnect', msgdata);
    },
    isConnected : function () {
	    return (this.connected == true);
    },
    setConnected : function (isconnected) {
	    this.connected=isconnected;
      this.ui_element.setconnected(isconnected);
	    console.log('SERVER '+this.host+':'+this.port+' : setConnected = '+isconnected);
    },
    newDevice : function(jsondata) {
      var newdevice = new Indi.device(this, jsondata);
      this.devicelist[jsondata.name]=newdevice;
      this.ui_element.adddevice(newdevice);
    },
    getdevice : function(devicename) {
	    return this.devicelist[devicename];
    },
  };
  return server;
}(jQuery)) ;

Indi.manager=(function($) {
  var manager = function(ews, container, collapsible) {
    this.serverlist = [ ];
    this.container= container;
    this.ws=ews;
    this.key = null;
    this.collapsible = collapsible;
    this.ui_element = new IndiUI.ui_manager(this, container, this.collapsible);
  };
  manager.prototype = {
    constructor : manager,
    createserver : function(host, port) {
	    var indiserver = null;
	    var serverkey=host+':'+port;
	    if (!(serverkey in this.serverlist)) {
        indiserver = new Indi.server(host, port, this);
        this.serverlist[serverkey] = indiserver;
        this.ui_element.addserver(indiserver);
      } else {
        indiserver = this.serverlist[serverkey];
	    }
	    if (!(indiserver.isConnected())) {
        indiserver.connect(true);
	    }
	    return serverkey;
    },
    processmessage : function(jsonmsg) {
	    var result;
	    //console.log('processmessage:' + JSON.stringify(jsonmsg));
	    if (jsonmsg.type == 'setKey') {
        this.key = jsonmsg.data;
        result = 'MANAGER: Setting key to ' + this.key;
	    } else {
        var indiserver = this.serverlist[jsonmsg.serverkey];
        if (indiserver !== undefined) {
          switch (jsonmsg.type) {
            case 'setConnected':
              indiserver.setConnected(jsonmsg.connected);
              if (jsonmsg.connected) this.ui_element.setconnected(indiserver);
              result = 'MANAGER('+jsonmsg.serverkey+'): setConnected=' + jsonmsg.connected;
              break;
            case 'newDevice':
              indiserver.newDevice(jsonmsg.data);
              result = 'MANAGER('+jsonmsg.serverkey+'): newDevice=' + jsonmsg.data.name;
              break;
            case 'newProperty':
              indiserver.getdevice(jsonmsg.data.devicename).newProperty(jsonmsg.data);
              result = 'MANAGER('+jsonmsg.serverkey+'): newProperty=' + jsonmsg.data.name+' for '+jsonmsg.data.devicename;
              break;
            case 'removeProperty':
              indiserver.getdevice(jsonmsg.data.devicename).removeProperty(jsonmsg.data);
              result = 'MANAGER('+jsonmsg.serverkey+'): removeProperty=' + jsonmsg.data.name+' for '+jsonmsg.data.devicename;
              break;
            case 'newText':
              indiserver.getdevice(jsonmsg.data.device).getproperty(jsonmsg.data.name).setvalue(jsonmsg.data, Indi.INDI_TYPE.INDI_TEXT);
              //alert('newText: '+JSON.stringify(jsonmsg.data))
              result = 'MANAGER('+jsonmsg.serverkey+'): newText for ' + jsonmsg.data.device+':'+jsonmsg.data.name;
              break;
            case 'newNumber':
              indiserver.getdevice(jsonmsg.data.device).getproperty(jsonmsg.data.name).setvalue(jsonmsg.data, Indi.INDI_TYPE.INDI_NUMBER);
              //alert('newText: '+JSON.stringify(jsonmsg.data))
              result = 'MANAGER('+jsonmsg.serverkey+'): newNumber for ' + jsonmsg.data.device+':'+jsonmsg.data.name;
              break;
            case 'newSwitch':
              indiserver.getdevice(jsonmsg.data.device).getproperty(jsonmsg.data.name).setvalue(jsonmsg.data, Indi.INDI_TYPE.INDI_SWITCH);
              //alert('newText: '+JSON.stringify(jsonmsg.data))
              result = 'MANAGER('+jsonmsg.serverkey+'): newSwitch for ' + jsonmsg.data.device+':'+jsonmsg.data.name;
              break;
            case 'newLight':
              indiserver.getdevice(jsonmsg.data.device).getproperty(jsonmsg.data.name).setvalue(jsonmsg.data, Indi.INDI_TYPE.INDI_LIGHT);
              //alert('newText: '+JSON.stringify(jsonmsg.data))
              result = 'MANAGER('+jsonmsg.serverkey+'): newSwitch for ' + jsonmsg.data.device+':'+jsonmsg.data.name;
              break;
            case 'newBlob':
              indiserver.getdevice(jsonmsg.data.device).getproperty(jsonmsg.data.name).setvalue(jsonmsg.data, Indi.INDI_TYPE.INDI_BLOB);
              //alert('newBlob: '+JSON.stringify(jsonmsg.data))
              result = 'MANAGER('+jsonmsg.serverkey+'): newBlob for ' + jsonmsg.data.device+':'+jsonmsg.data.name;
              break;
            default:
              result = 'MANAGER('+jsonmsg.serverkey+'): not implemented '+jsonmsg.type+'-'+JSON.stringify(jsonmsg.data);
          }
        } else {
          result = 'MANAGER: unknown server ' + jsonmsg.serverkey;
        }
      }
	    return result;
    }
  };
  return manager;
}(jQuery));
