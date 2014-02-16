/* Namespace, class, object scheme 
var Ns = Ns || {};

Ns.class = (function() {
var pclassvar='pclassvar'; // static private member
var classvar='classvar'; // public member with static init (put in prototype)

var psmethod = function () { // static private method
   return 'static private '+pclassvar;
};

var setmethod = function (cvar) { // static public method
   pclassvar=cvar;
};

//constructor
var class=function(iname, ipname) {

  var pname=ipname; //private member
  this.name=iname; // public member
  var that=this; // bug in private this access

  // private member accessor
  this.getpname = function() { return pname; };
  this.setpname = function(sname) { pname=sname; };

  // private method (acces private and public member)
  // dont use this here
  function pmethod() {
    return 'private '+pname +'/'+ that.name+'/'+pclassvar;
  }

  // privileged (acces private and public member)
  this.method = function () {
    return 'privileged {' + pmethod() +'}/'+this.name+'/'+pname+'/'+pclassvar;
  }
};
// prototype
class.prototype = {
constructor:class, //constructor
classvar: classvar, //  public instance member with static default
setpclassvar: setmethod, // static public method
getfname:function() { // public instance method (no access to private member)
  return 'Qualified '+ this.name;
  }
};

return class;
}());
o1=new Ns.class('o1', 'po1');
o2=new Ns.class('o2', 'po2');

*/
// TODO
// Switch handling: ok
// Light handling: ok
// Blob handling: ok, no save, no display, no upload
// Property state display: ok
// number formatting
// CSS styling

// BUGS
// undefined input values when vector property setting is used

// TO CHECK IN INDI
// timestamp not handled in baseclient
// format in blob (and other strings) not correctly initialized 
// definition of BLOBHandling lies in indidevapi.h -> device is a dependance of baseclient
 
var Indi = Indi || {};

Indi.ISState = { ISS_OFF:0, ISS_ON:1};
Indi.IPState = { IPS_IDLE:0, IPS_OK:1, IPS_BUSY:2, IPS_ALERT:3 };
Indi.ISRule = { ISR_1OFMANY:0, ISR_ATMOST1:1, ISR_NOFMANY:2 };
Indi.IPerm = { IP_RO:0, IP_WO:1, IP_RW:2 };
Indi.INDI_TYPE= { INDI_NUMBER:0, INDI_SWITCH:1, INDI_TEXT:2, INDI_LIGHT:3, INDI_BLOB:4, INDI_UNKNOWN:5 };
Indi.BLOBHandling = { B_NEVER:0, B_ALSO:1, B_ONLY:2 };

Indi.util =  {
    // internal base64 decode if Base64.btoa not present
    base64_decode: function( d,b,c,u,r,q,x ) {
        b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for(r=q=x="";c=d.charAt(x++);~c&&(u=q%4?u*64+c:c,q++%4)?r+=String.fromCharCode(255&u>>(-2*q&6)):0) c=b.indexOf(c);
        return r;
    },

    str2ab: function(str) {
       var buf = new ArrayBuffer(str.length); // 2 bytes for each char
       var bufView = new Uint8Array(buf);
       for (var i=0, strLen=str.length; i<strLen; i++) {
         bufView[i] = str.charCodeAt(i);
       }
       return buf;
     },

    b64decode: (window.atob ? (function(x) { return window.atob(x); }) : (function(x) { return Indi.util.base64_decode(x); })),

    simpletextviewer: (function($) {
	var simpletextviewer = function(iblob) {
	    this.iblob = iblob;
	    this.textarea=$('<textarea style="width:100%" rows="10" readonly="readonly"/>');
	};

	simpletextviewer.prototype = {
	    constructor: simpletextviewer,
	    getdivelt : function () {
		return this.textarea;
	    },
	    refresh : function() {
		this.textarea.html(this.iblob.blob);
	    },
	    name: function () {
		return 'simpletext';
	    }
	};
	
	return simpletextviewer;
    }(jQuery)),
    
};

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
	this.inputro=$('<input type="number" readonly="readonly">');
	this.inputrw=$('<input type="number">');
	if (this.min) this.inputrw.attr({ min: this.min});
	if (this.max) this.inputrw.attr({ min: this.max});
	if (this.step) this.inputrw.attr({ min: this.step});
	this.setvalue(this.value);
	this.divelt=$('<tr/>', {
	    html : '<td title="'+this.name+'">'+this.label+'</td>'
	});
	if (this.property.permission!=Indi.IPerm.IP_WO) {
	    var td=$('<td/>');
	    td.append(this.inputro);
	    this.divelt.append(td);
	}
	if (this.property.permission!=Indi.IPerm.IP_RO) {
	    var td=$('<td/>');
	    td.append(this.inputrw);
	    this.divelt.append(td);
	    this.setelt=$('<button style="height:100%">Set</button>');
	    this.tdelt=$('<td style="height:100%"/>');
	    this.tdelt.append(this.setelt);
	    this.divelt.append(this.tdelt);
	    this.setelt.on('click', {context: this}, function (evt) {
		evt.data.context.sendnewvalue();
	    });
	}
    };
    
    inumber.prototype = {
	constructor: inumber,
	getvalue: function() {
	    return this.value;
	},
	setvalue: function(value) {
	    this.value=value;
	    this.inputro.val(this.value);
	},
	setitem: function(item) {
	    this.value=item.value;
	    this.inputro.val(this.value);
	},
	getinput: function() {
	    return this.inputrw.val();
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
	switch (this.property.rule) {
	case Indi.ISRule.ISR_1OFMANY:
	case Indi.ISRule.ISR_ATMOST1:
	    this.input=$('<button/>');
	    this.input.append(this.label);
	    this.divelt=this.input;
	    break;
	case Indi.ISRule.ISR_NOFMANY:
	    this.input=$('<input type="checkbox"/>');
	    this.divelt=$('<label/>');
	    this.divelt.append(this.input);
	    this.divelt.append(this.label);
	    this.divelt.css({
		'margin-right': '5px'
	    });
	    break;
	}
	this.input.attr({
	    'title': this.name 
	});
	this.input.css({
	    'margin-left': '2px',
	    'margin-right': '2px'
	});
	this.setvalue(this.state);


	/* Write only Switch ? */
	/*
	if (this.property.permission!=Indi.IPerm.IP_WO) {
	    var td=$('<td/>');
	    td.append(this.inputro);
	    this.divelt.append(td);
	}
	*/
	if (this.property.permission!=Indi.IPerm.IP_RO) {
	    this.input.on('click', {context: this}, function (evt) {
		evt.data.context.sendnewvalue();
	    });
	} else {
	    this.input.attr({
		'disabled': 'disabled'
	    }); 
	}
    };
    
    iswitch.prototype = {
	constructor: iswitch,
	getvalue: function() {
	    return this.text;
	},
	drawelement: function() {
	    switch (this.property.rule) {
	    case Indi.ISRule.ISR_1OFMANY:
	    case Indi.ISRule.ISR_ATMOST1:
		if (this.state == Indi.ISState.ISS_OFF) {
		    this.input.css({
			'background-color': ''
		    });
		} else {
		    this.input.css({
			'background-color': 'orange'
		    });
		};
		break;
	    case Indi.ISRule.ISR_NOFMANY:
		this.input.prop({ 
		    checked : (this.state == Indi.ISState.ISS_ON)
		}); 
		break;
	    }
	},
	setvalue: function(value) {
	    if ((value == Indi.ISState.ISS_ON) && (this.property.rule == Indi.ISRule.ISR_1OFMANY))
		this.property.resetswitch();
	    this.state=value;
	    this.drawelement();
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
	this.inputro=$('<input type="text" readonly="readonly">');
	this.inputrw=$('<input type="text">');
	this.setvalue(this.text);
	this.divelt=$('<tr/>', {
	    html : '<td title="'+this.name+'">'+this.label+'</td>'
	});
	if (this.property.permission!=Indi.IPerm.IP_WO) {
	    var td=$('<td/>');
	    td.append(this.inputro);
	    this.divelt.append(td);
	}
	if (this.property.permission!=Indi.IPerm.IP_RO) {
	    var td=$('<td/>');
	    td.append(this.inputrw);
	    this.divelt.append(td);
	    this.setelt=$('<button style="height:100%">Set</button>');
	    this.tdelt=$('<td style="height:100%"/>');
	    this.tdelt.append(this.setelt);
	    this.divelt.append(this.tdelt);
	    this.setelt.on('click', {context: this}, function (evt) {
		evt.data.context.sendnewvalue();
	    });
	}
    };
    
    itext.prototype = {
	constructor: itext,
	getvalue: function() {
	    return this.text;
	},
	setvalue: function(value) {
	    this.text=value;
	    this.inputro.val(this.text);
	},
	setitem: function(item) {
	    this.text=item.text;
	    this.inputro.val(this.text);
	},
	getinput: function() {
	    return this.inputrw.val();
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
	this.inputro=$('<img src="images/led_rounded_h_black.svg.thumb.png" style="height: 20px;">');
	this.setvalue(this.state);
	this.divelt=$('<tr/>', {
	    html : '<td title="'+this.name+'">'+this.label+'</td>'
	});
	var td=$('<td/>');
	td.append(this.inputro);
	this.divelt.append(td);
    };
    
    ilight.prototype = {
	constructor: ilight,
	getvalue: function() {
	    return this.text;
	},
	setvalue: function(value) {
	    this.state=value;
	    this.drawstate();
	},
	setitem: function(item) {
	    this.state=item.s;
	    this.drawstate();
	},
	getinput: function() {
	    return this.state;
	},
	drawstate: function() {
	    switch(this.state) {
	    case Indi.IPState.IPS_IDLE:
		this.inputro.attr('src', 'images/led_rounded_h_black.svg.thumb.png');
		break;
		case Indi.IPState.IPS_OK:
		this.inputro.attr('src', 'images/led_rounded_h_green.svg.thumb.png');
		break;
		case Indi.IPState.IPS_BUSY:
		this.inputro.attr('src', 'images/led_rounded_h_yellow.svg.thumb.png');
		break;
		case Indi.IPState.IPS_ALERT:
		this.inputro.attr('src', 'images/led_rounded_h_red.svg.thumb.png');
		break;
	    }
	},
	sendnewvalue: function () {
	    //var jsonmsg={ type:"newValue", serverkey: this.property.device.server.id, devicename: this.property.device.name, 
		//	  name:this.property.name, proptype: this.property.type};
	    //jsonmsg.element= { name:this.name, value: this.getinput()};
	    //alert(JSON.stringify(jsonmsg));
	    alert('sendnewvalue: Light Properties are Read-Only');
	    //this.ws.send(JSON.stringify(jsonmsg));
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
	this.displayed=false;
	this.blob=null;
	this.ws=this.property.device.server.ws;
	this.id= this.property.id+'_'+this.name;
	this.inputbloblen=$('<input type="number" readonly="readonly">');
	this.inputblobsize=$('<input type="number" readonly="readonly">');
	this.inputformat=$('<input type="text" readonly="readonly">');
	this.inputblob=$('<input type="file">');
	this.inputenable=$('<input type="checkbox">');
	//this.setvalue(this.state);
	this.divelt=$('<tr/>', {
	    html : '<td title="'+this.name+'">'+this.label+'</td>'
	});
	var td=$('<td/>');
	var label=$('<label>Len: </label>');
	label.append(this.inputbloblen);
	td.append(label);
	this.divelt.append(td);
	td=$('<td/>');
	label=$('<label>Size: </label>');
	label.append(this.inputblobsize);
	td.append(label);
	this.divelt.append(td);
	td=$('<td/>');
	label=$('<label>Format: </label>');
	label.append(this.inputformat);
	td.append(label);
	this.divelt.append(td);
	td=$('<td/>');
	label=$('<label>Enable transfer: </label>');
	label.append(this.inputenable);
	td.append(label);
	this.divelt.append(td);
	td=$('<td/>');
	this.buttonSave=$('<button disabled="disabled" style="margin-left:5px;">Save</button>');
	td.append(this.buttonSave);
	this.divelt.append(td);	
	this.buttonDisplay=$('<button disabled="disabled" style="margin-left:5px;">Display</button>');
	td.append(this.buttonDisplay);
	this.divelt.append(td);	

	this.drawstate();

	this.inputenable.on('click', {context: this }, function(evt) {
	    var blob=evt.data.context;
	    var jsonmsg={ type:"newBlobmode", serverkey: blob.property.device.server.id, devicename: blob.property.device.name, 
			  name:blob.property.name, proptype: blob.property.type};
	    blob.enabletransfer= !(blob.enabletransfer);
	    blob.drawstate();

	    jsonmsg.element= { name:blob.name, mode: blob.getblobmode()};
	    //alert(JSON.stringify(jsonmsg));
	    blob.ws.send(JSON.stringify(jsonmsg));
	});
	
	this.buttonSave.on('click', {context: this }, function(evt) {
	    //alert('Save '+evt.data.context.name);
	    evt.data.context.save();
	});
	this.buttonDisplay.on('click', {context: this }, function(evt) {
	    //alert('Display '+evt.data.context.name);
	    evt.data.context.toggleDisplay();
	});
	
	// Display element
	this.displayelt=$('<tr/>', {
	    css : { display: 'none' },
	    html : '<td title="VISUALIZER">None</td>'
	});
	this.displaycontentelt=$('<td/>', {
	    attr : { colspan : 5 }, 
	    //css : { display: 'none' },
	    html : this.name+' contents'
	});
	this.displayelt.append(this.displaycontentelt);
	this.displaycontent=null;

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
	    this.format=item.format;
	    if (this.enabletransfer)
		this.blob=Indi.util.b64decode(item.blob);
	       //b=new Blob(this.blob, {type: "application/octet-binary"});
	    this.drawstate();
	},
	setitem: function(item) {
	    this.setvalue(item);
	    this.drawstate();
	},
	getinput: function() {
	    return this.enabletransfer;
	},
	drawstate: function() {
	    this.inputbloblen.val(this.bloblen);
	    this.inputblobsize.val(this.size);
	    this.inputformat.val(this.format);
	    this.inputenable.prop({ 
		checked : (this.enabletransfer)
	    }); 
	    if (this.enabletransfer) {
		this.buttonSave.removeAttr('disabled'); 
		this.buttonDisplay.removeAttr('disabled'); 
	    } else {
		this.buttonSave.attr('disabled', 'disabled');
		this.buttonDisplay.attr('disabled', 'disabled');
	    }
	},
	save: function () {
	    var blobblob = null;
	    var blobtype=null;
	    var blobdate=new Date();
	    var blobfilename=this.name+'_'+blobdate.toISOString()+this.format;
	    
	    if (!this.blob || this.size == 0) {
	    	alert('Save Blob: '+this.name+' is empty or undefined');
		return;
	    }
	    switch (this.format) {
		case '.fits':
		case '.jpg':
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
	toggleDisplay: function() {
	    if (!this.displayed && (!this.blob || this.size==0)) {
		alert('Display Blob: '+this.name+' is empty or undefined');
		return;
	    }
	    this.displayed = !this.displayed;
	    if (this.displayed) { 
		if (!this.displaycontent) {
		    this.buildcontent();
		    if (this.displaycontent) {
			this.displaycontentelt.empty();
			this.displaycontentelt.append(this.displaycontent.getdivelt());
			this.displayelt.children('td:first').empty();
			this.displayelt.children('td:first').append(this.displaycontent.name());
		    }
		}
		if (this.displaycontent) 
		    this.displaycontent.refresh();
		this.displayelt.show();
		this.buttonDisplay.html('Hide');
	    } else {
		this.displayelt.hide();
		this.buttonDisplay.html('Display');
	    }
	    
	},
	buildcontent: function() {
	    switch (this.format) {
	    case '.txt':
	    case '.xml':
		this.displaycontent=new Indi.util.simpletextviewer(this);
		break;
	    }
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
	var nbitems=0;
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
	this.divelt=$('<fieldset/>', {
	    html : '<legend><span style="font-style:italic" title="'+this.name+'">'+this.label+'</span></legend>'
	});
	switch (this.type) {
	case Indi.INDI_TYPE.INDI_TEXT:
	case Indi.INDI_TYPE.INDI_NUMBER:
	case Indi.INDI_TYPE.INDI_LIGHT:
	case Indi.INDI_TYPE.INDI_BLOB:
	    this.tableelt=$('<table/>');
	    for (var index in jsondata.vector) {
		var item = newpropitem(this, jsondata.vector[index]);
		if (item) {
		    nbitems+=1;
		    this.vector[item.name]=item;
		    this.tableelt.append(item.divelt);
		    if (this.type == Indi.INDI_TYPE.INDI_BLOB) {
			nbitems+=1; // (add a row for the display element)
			this.tableelt.append(item.displayelt);
		    }
		}
	    }
	    this.statuselt=$('<td rowspan="'+nbitems+'" style="height:100%; width: 10px; border: 1px solid; border-radius: 5px;"/>');
	    this.tableelt.children('tbody:first').children('tr:first').prepend(this.statuselt);
	    this.drawstatus();
	    if ((this.permission!=Indi.IPerm.IP_RO) && (nbitems > 1)) {
		this.setelt=$('<button style="height:100%">Set</button>');
		this.tdelt=$('<td rowspan="'+nbitems+'" style="height:100%"/>');
		this.tdelt.append(this.setelt);
		this.tableelt.children('tbody:first').children('tr:first').append(this.tdelt);
		this.setelt.on('click', {context: this}, function (evt) {
		    evt.data.context.sendnewvector();
		});
	    }
	    this.divelt.append(this.tableelt);
	    break;
	case Indi.INDI_TYPE.INDI_SWITCH:
	    var tr=$('<tr/>');
	    this.tableelt=$('<table/>');
	    this.statuselt=$('<td style="height:100%; width: 10px; border: 1px solid; border-radius: 5px;"/>');
	    tr.append(this.statuselt);
	    this.drawstatus();
	    for (var index in jsondata.vector) {
		var item = newpropitem(this, jsondata.vector[index]);
		if (item) {
		    nbitems+=1;
		    this.vector[item.name]=item;
		    tr.append(item.divelt);
		}
	    }
	    this.tableelt.append(tr);
	    this.divelt.append(this.tableelt);
	    break;
	}
    };

    property.prototype = {
	constructor: property,
	sendnewvector: function () {
	    var jsonmsg={ type:"newVector", serverkey: this.device.server.id, devicename: this.device.name, name: this.name, proptype: this.type};
	    var vector= [ ];
	    var index=0;
	    for (var itemindex in this.vector) {
		var item = this.vector[itemindex]
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
	    this.drawstatus();
	},
	resetswitch: function() {
	    if (this.type != Indi.INDI_TYPE.INDI_SWITCH) {
		alert('Can not reset switch of a non switch property');
		return;
	    }
	    for (var sw in this.vector)
		this.vector[sw].setvalue(Indi.ISState.ISS_OFF);
	},
	drawstatus: function() {
	    switch (this.state) {
		case Indi.IPState.IPS_IDLE:
		this.statuselt.css({
		    'background-color': '#8E8E8E'
		});
		break;
		case Indi.IPState.IPS_OK:
		this.statuselt.css({
		    'background-color': '#8ECA80'
		});
		break;
		case Indi.IPState.IPS_BUSY:
		this.statuselt.css({
		    'background-color': '#F5F39C'
		});
		break;
		case Indi.IPState.IPS_ALERT:
		this.statuselt.css({
		    'background-color': '#EC5564'
		});
		break;
	    }
	},
	getdivelt : function () {
	    return this.divelt;
	}
    };

    return property;
}(jQuery)) ;

Indi.device = (function($) {

    var device = function(indiserver, jsondata) {
	this.server = indiserver;
	this.name = jsondata.name;
	this.divelt=$('<div/>', {
	    html : '<h4>'+this.name+'</h4>'
	});
	this.id=this.server.id+'_'+this.name;
	this.propertylist = [ ];
	this.grouplist = [ ];
	this.server.getdivelt().append(this.divelt);
    }
    
    device.prototype = { 
	constructor : device,
	newProperty : function (jsondata) {
	    var groupname = jsondata.groupname;
	    if (this.grouplist[groupname] === undefined) {
		var newgroupdiv = $('<div/>', {
		    html : '<h5>'+groupname+'</h5>'
		});
		this.divelt.append(newgroupdiv);
		this.grouplist[groupname] = {div: newgroupdiv, count: 0};
	    }
	    var newproperty = new Indi.property(this, jsondata);
	    this.propertylist[jsondata.name] = newproperty;
	    this.grouplist[newproperty.groupname].div.append(newproperty.divelt);
	    this.grouplist[newproperty.groupname].count+=1;
	},
	removeProperty : function (jsondata) {
	    var prop=this.propertylist[jsondata.name];
	    prop.divelt.remove();
	    this.grouplist[prop.groupname].count-=1;
	    if (this.grouplist[prop.groupname].count == 0) {
		this.grouplist[prop.groupname].div.remove();
		delete(this.grouplist[prop.groupname]);
	    }
	    delete(this.propertylist[jsondata.name]);
	},
	getproperty: function(name) {
	    return this.propertylist[name]
	},
	getgroupdiv: function(groupname) {
	    return this.grouplist[groupname].div;
	},
	getdivelt : function () {
	    return this.divelt;
	}
    };

    return device;
}(jQuery)) ;

Indi.server = (function($) {

    var server = function(ehost, eport, websocket) {
	this.host=ehost;
	this.port=eport;
	this.id= this.host+':'+this.port;
	this.connected=false;
	this.ws=websocket;
	this.divelt = null;
	this.listelt=$('<li/>');
	this.anchorelt=$('<a/>', {
	    html : this.host+':'+this.port,
	    href : 'javascript:void(0);',

	});
	this.connectelt=$('<button/>', {
	    html : 'Connect',
	    type : 'button',
	    disabled : 'disabled'
	});
	this.devicelist = [ ];
	this.listelt.append(this.anchorelt);
	this.listelt.append(this.connectelt);
    };

    server.prototype = { 
	constructor : server,
	connect : function (status) {
	    var msgdata = {server : this.host, port: this.port};
	    this.anchorelt.css('background-color', '#AE5050');
	    this.connectelt.attr('disabled', 'disabled');
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
	    console.log('SERVER '+this.host+':'+this.port+' : setConnected = '+isconnected);
	    if (this.connected) {
		this.connectelt.html('Disconnect');
		this.connectelt.removeAttr('disabled');
		//connectelt.click = function (evt) { connect(false); };
		this.connectelt.on('click', {context: this }, function (evt) { 
		    evt.data.context.connect(false); 
		});
		this.anchorelt.css('background-color', '');
		this.divelt=$('<div/>', {
		    html : '<h3>Server '+this.host+':'+this.port+'</h3>'
		});
		this.divelt.attr('id', this.id);
		$('#indi').append(this.divelt);
		this.anchorelt.attr('href', '#'+this.id);
	    } else {
		this.connectelt.html('Connect');
		this.connectelt.removeAttr('disabled');
		this.connectelt.on('click', {context: this }, function (evt) { 
		    evt.data.context.connect(true); 
		});	
		this.anchorelt.css('background-color', '#AEAEAE');
		this.anchorelt.attr('href', 'javascript:void(0);');
		this.divelt.remove();
		this.divelt=null;
	    }
	},
	newDevice : function(jsondata) {
	    var newdevice = new Indi.device(this, jsondata);
	    this.devicelist[jsondata.name]=newdevice;
	},
	getdevice : function(devicename) {
	    return this.devicelist[devicename];
	},
	getlistelt : function () {
	    return this.listelt;
	},
	getdivelt : function () {
	    return this.divelt;
	}
    };
    
    return server;
}(jQuery)) ;


Indi.manager=(function($) {
    
    var manager = function(ews, before) {
	this.serverlist = [ ];
	this.beforeelt=before;
	this.ws=ews;
	this.key = null;
	$.ajax({
	    url: '/html/indi_simple_html.html',
	    success: function(data) {
		this.before('<div id="indi">\n' + data+'</div>\n');
	    },
	    context: this.beforeelt
	});
	before.parent().on('click', '#connect', {context: this}, function(evt) { 
	    var server = $('#server').val();
	    var port =  $('#port').val();
	    console.log("Connect server "+ server +':'+ port + '\n');
	    var serverkey = evt.data.context.createserver(server, port);
	    $('#message').val($('#message').val() + 'Connecting ' +serverkey+ '\n'); 
	    
	    //return false;
	}); 
    };

    manager.prototype = {
	constructor : manager,
	createserver : function(host, port) {
	    var indiserver = null;
	    var serverkey=host+':'+port;
	    var serverlistelt=$('#serverlist');
	    if (!(serverkey in this.serverlist)) {
		indiserver = new Indi.server(host, port, this.ws);
		this.serverlist[serverkey] = indiserver;
		serverlistelt.append(indiserver.getlistelt());
	    } else {
		indiserver = this.serverlist[serverkey];
	    }
	    if (!(indiserver.isConnected())) {
		indiserver.connect(true);
	    }
	    if (serverlistelt.is(':hidden')) {
		$('#noservertext').hide();
		serverlistelt.show();
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
