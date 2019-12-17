var IndiUI = IndiUI || {};

IndiUI.ui_inumber = (function($) {
  var ui_inumber = function(inumber) {
    this.inumber=inumber;
    this.inputro=$('<input type="number" readonly="readonly">');
  	this.inputrw=$('<input type="number">');
  	if (this.inumber.min) this.inputrw.attr({ min: this.inumber.min});
  	if (this.inumber.max) this.inputrw.attr({ max: this.inumber.max});
  	if (this.inumber.step) this.inputrw.attr({ step: this.inumber.step});
    this.divelt=$('<tr/>', {
        html : '<td title="'+this.inumber.name+'">'+(this.inumber.label?this.inumber.label:this.inumber.name)+'</td>'
    });
    if (this.inumber.property.permission!=Indi.IPerm.IP_WO) {
        var td=$('<td/>');
        td.append(this.inputro);
        this.divelt.append(td);
    }
    if (this.inumber.property.permission!=Indi.IPerm.IP_RO) {
        var td=$('<td/>');
        td.append(this.inputrw);
        this.divelt.append(td);
        this.setelt=$('<button style="height:100%">Set</button>');
        this.tdelt=$('<td style="height:100%"/>');
        this.tdelt.append(this.setelt);
        this.divelt.append(this.tdelt);
        this.setelt.on('click', {context: this.inumber}, function (evt) {
          evt.data.context.sendnewvalue();
        });
    }
  }
  ui_inumber.prototype = {
	   constructor: ui_inumber,
	   setvalue: function(value) {
	     this.inputro.val(value);
	   },
	   getinput: function() {
	     return this.inputrw.val();
	   },
     get_root: function() {
       return this.divelt;
     },
  };
  return ui_inumber;
}(jQuery)) ;

IndiUI.ui_iswitch = (function($) {
  var ui_iswitch = function(iswitch) {
    this.iswitch = iswitch;
    switch (this.iswitch.property.rule) {
      case Indi.ISRule.ISR_1OFMANY:
      case Indi.ISRule.ISR_ATMOST1:
        this.input=$('<button/>');
        this.input.append((this.iswitch.label?this.iswitch.label:this.iswitch.name));
        this.divelt=this.input;
        break;
      case Indi.ISRule.ISR_NOFMANY:
        this.input=$('<input type="checkbox"/>');
        this.divelt=$('<label/>');
        this.divelt.append(this.input);
        this.divelt.append((this.iswitch.label?this.iswitch.label:this.iswitch.name));
        this.divelt.css({
          'margin-right': '5px'
        });
        break;
    }
    this.input.attr({
      'title': this.iswitch.name
    });
    this.input.css({
      'margin-left': '2px',
      'margin-right': '2px'
    });
    /* Write only Switch ? */
    /*
    if (this.property.permission!=Indi.IPerm.IP_WO) {
      var td=$('<td/>');
      td.append(this.inputro);
      this.divelt.append(td);
    }
    */
    if (this.iswitch.property.permission!=Indi.IPerm.IP_RO) {
      this.input.on('click', {context: this.iswitch}, function (evt) {
        evt.data.context.sendnewvalue();
      });
    } else {
      this.input.attr({
        'disabled': 'disabled'
      });
    }
  };
  ui_iswitch.prototype = {
    constructor: ui_iswitch,
    setvalue: function(state) {
	    switch (this.iswitch.property.rule) {
        case Indi.ISRule.ISR_1OFMANY:
        case Indi.ISRule.ISR_ATMOST1:
          if (state == Indi.ISState.ISS_OFF) {
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
            checked : (state == Indi.ISState.ISS_ON)
          });
          break;
        }
    },
    get_root: function() {
      return this.divelt;
    },
  };
  return ui_iswitch;
}(jQuery));

IndiUI.ui_itext = (function($) {
  var ui_itext = function(itext) {
    this.itext=itext;
    this.inputro=$('<input type="text" readonly="readonly">');
    this.inputrw=$('<input type="text">');
    this.divelt=$('<tr/>', {
      html : '<td title="'+this.itext.name+'">'+(this.itext.label?this.itext.label:this.itext.name)+'</td>'
    });
    if (this.itext.property.permission!=Indi.IPerm.IP_WO) {
      var td=$('<td/>');
      td.append(this.inputro);
      this.divelt.append(td);
    }
    if (this.itext.property.permission!=Indi.IPerm.IP_RO) {
      var td=$('<td/>');
	    td.append(this.inputrw);
	    this.divelt.append(td);
	    this.setelt=$('<button style="height:100%">Set</button>');
	    this.tdelt=$('<td style="height:100%"/>');
	    this.tdelt.append(this.setelt);
	    this.divelt.append(this.tdelt);
	    this.setelt.on('click', {context: this.itext}, function (evt) {
        evt.data.context.sendnewvalue();
	    });
    }
  };
  ui_itext.prototype = {
    constructor: ui_itext,
    setvalue: function(value) {
	    this.inputro.val(value);
    },
    getinput: function() {
      return this.inputrw.val();
    },
    get_root: function() {
      return this.divelt;
    },
  };
  return ui_itext;
}(jQuery));

IndiUI.ui_ilight = (function($) {
  var ui_ilight = function(ilight){
    this.ilight = ilight;
    this.inputro=$('<img src="images/led_rounded_h_black.svg.thumb.png" style="height: 20px;">');
    this.divelt=$('<tr/>', {
      html : '<td title="'+this.name+'">'+(this.label?this.label:this.name)+'</td>'
    });
    var td=$('<td/>');
    td.append(this.inputro);
    this.divelt.append(td);
  };
  ui_ilight.prototype = {
  constructor: ui_ilight,
  setvalue: function(state) {
    switch(state) {
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
  get_root: function() {
    return this.divelt;
  },
};
return ui_ilight;
}(jQuery));

IndiUI.ui_iblob = (function($) {
  var ui_iblob = function(iblob) {
    this.iblob=iblob;
    this.displayed=false;
    this.inputbloblen=$('<input type="number" readonly="readonly" size="8">');
    this.inputblobsize=$('<input type="number" readonly="readonly" size="8">');
    this.inputformat=$('<input type="text" readonly="readonly" size="8">');
    this.inputblob=$('<input type="file">');
    this.inputenable=$('<input type="checkbox">');
    this.divelt=$('<tr/>', {
	    html : '<td title="'+this.iblob.name+'">'+(this.iblob.label?this.iblob.label:this.iblob.name)+'</td>'
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

    this.inputenable.on('click', {context: this.iblob }, function(evt) {
      var blob=evt.data.context;
      var jsonmsg={ type:"newBlobmode", serverkey: blob.property.device.server.id, devicename: blob.property.device.name,
        name:blob.property.name, proptype: blob.property.type};
      blob.enabletransfer= !(blob.enabletransfer);
      blob.ui_element.setvalue();
      jsonmsg.element= { name:blob.name, mode: blob.getblobmode()};
      //alert(JSON.stringify(jsonmsg));
      blob.ws.send(JSON.stringify(jsonmsg));
    });

    this.buttonSave.on('click', {context: this.iblob }, function(evt) {
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
      //css : { width: '100%' },
      html : this.iblob.name+' contents'
    });
    this.displayelt.append(this.displaycontentelt);
    this.displaycontent=null;
  };
  ui_iblob.prototype = {
    constructor: ui_iblob,
    setvalue: function() {
      this.inputbloblen.val(this.iblob.bloblen);
      this.inputblobsize.val(this.iblob.size);
      this.inputformat.val(this.iblob.format);
      this.inputenable.prop({
        checked : (this.iblob.enabletransfer)
      });
      if (this.iblob.enabletransfer) {
        this.buttonSave.removeAttr('disabled');
        this.buttonDisplay.removeAttr('disabled');
      } else {
        this.buttonSave.attr('disabled', 'disabled');
        this.buttonDisplay.attr('disabled', 'disabled');
      }
      if (this.displaycontent) {
        this.displaycontent.reload(this.iblob.format.substring(1), this.iblob.blob);
        //this.displaycontent.refresh();
      }
    },
    toggleDisplay: function() {
      if (!this.displayed && (!this.iblob.blob || this.iblob.size==0)) {
        alert('Display Blob: '+this.iblob.name+' is empty or undefined');
        return;
      }
      this.displayed = !this.displayed;
      if (this.displayed) {
        if (!this.displaycontent) {
          this.buildcontent();
          if (this.displaycontent) {
            this.displaycontent.reload(this.iblob.format.substring(1), this.iblob.blob);
            //this.displaycontent.refresh();
            this.displaycontentelt.empty();
            this.displaycontentelt.append(this.displaycontent.getdivelt());
            this.displayelt.children('td:first').empty();
            this.displayelt.children('td:first').append(this.displaycontent.controls());
          }
        }
        this.displayelt.show();
        //if (this.displaycontent)
        //    this.displaycontent.refresh();
        this.buttonDisplay.html('Hide');
      } else {
        this.displayelt.hide();
        this.buttonDisplay.html('Display');
      }
    },
    buildcontent: function() {
      switch (this.iblob.format) {
        case '.txt':
        case '.xml':
          this.displaycontent=new Indi.util.simpletextviewer(this.iblob);
          break;
        case '.gif':
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.tiff':
        case '.fits':
          this.displaycontent=new Indi.util.glviewer(this.iblob);
          break;
      }
    },
    get_root: function() {
      return this.divelt;
    },
    get_display: function() {
      return this.displayelt;
    }
  };
  return ui_iblob;
}(jQuery)) ;

IndiUI.ui_property = (function($) {
  var ui_property = function(property) {
    var nbitems=0;
    this.property=property;
    this.divelt=$('<fieldset/>', {
      html:'<legend><span style="font-style:italic" title="'+this.property.name+'">'+(this.property.label?this.property.label:this.property.name)+'</span></legend>'
    });
    switch (this.property.type) {
      case Indi.INDI_TYPE.INDI_TEXT:
      case Indi.INDI_TYPE.INDI_NUMBER:
      case Indi.INDI_TYPE.INDI_LIGHT:
      case Indi.INDI_TYPE.INDI_BLOB:
        this.tableelt=$('<table/>');
        for (var index in this.property.vector) {
          var item = this.property.vector[index];
          if (item) {
            nbitems+=1;
            this.tableelt.append(item.ui_element.get_root());
            if (this.property.type == Indi.INDI_TYPE.INDI_BLOB) {
              nbitems+=1; // (add a row for the display element)
              this.tableelt.append(item.ui_element.get_display());
            }
          }
        }
        this.statuselt=$('<td rowspan="'+nbitems+'" style="height:100%; width: 10px; border: 1px solid; border-radius: 5px;"/>');
        this.tableelt.children('tbody:first').children('tr:first').prepend(this.statuselt);
        this.setstate(this.property.state);
        if ((this.property.permission!=Indi.IPerm.IP_RO) && (nbitems > 1)) {
          this.setelt=$('<button style="height:100%">Set</button>');
          this.tdelt=$('<td rowspan="'+nbitems+'" style="height:100%"/>');
          this.tdelt.append(this.setelt);
          this.tableelt.children('tbody:first').children('tr:first').append(this.tdelt);
          this.setelt.on('click', {context: this.property}, function (evt) {
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
        this.setstate(this.property.state);
        for (var index in this.property.vector) {
          var item = this.property.vector[index];
          if (item) {
            nbitems+=1;
            tr.append(item.ui_element.get_root());
          }
        }
        this.tableelt.append(tr);
        this.divelt.append(this.tableelt);
        break;
    }
  };
  ui_property.prototype = {
    constructor: ui_property,
    setstate: function(state) {
      switch (state) {
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
    get_root: function() {
      return this.divelt;
    },
  };
  return ui_property;
}(jQuery));

IndiUI.ui_device = (function($) {
  var ui_device = function(device) {
    this.device = device;
    this.divelt=$('<div/>', {
      html : '<h4>'+this.device.name+'</h4>'
    });
    this.grouplist = [ ];
  }
  ui_device.prototype = {
    constructor : ui_device,
    addgroup: function(groupname) {
      var newgroupdiv = $('<div/>', {
        html : '<h5>'+groupname+'</h5>'
      });
      this.divelt.append(newgroupdiv);
      this.grouplist[groupname] = newgroupdiv;
    },
    addproperty: function(property, groupname) {
      this.grouplist[groupname].append(property.ui_element.get_root());
    },
    removeproperty: function(property) {
      property.get_root().remove();
    },
    removegroup: function(groupname) {
      this.grouplist[groupname].remove();
    },
    get_root : function () {
  	  return this.divelt;
    }
  };
  return ui_device;
}(jQuery)) ;

IndiUI.ui_server = (function($) {
  var ui_server = function(server) {
    this.server=server;
    this.divelt = null;
    this.listelt=$('<li/>');
    this.anchorelt=$('<a/>', {
      html : this.server.host+':'+this.server.port,
      href : 'javascript:void(0);',
    });
    this.connectelt=$('<button/>', {
      html : 'Connect',
      type : 'button',
      disabled : 'disabled'
    });
    this.listelt.append(this.anchorelt);
    this.listelt.append(this.connectelt);
  };
  ui_server.prototype = {
    constructor : ui_server,
    connecting: function() {
      this.anchorelt.css('background-color', '#AE5050');
      this.connectelt.attr('disabled', 'disabled');
    },
    setconnected: function(isconnected) {
      if (isconnected) {
        this.connectelt.html('Disconnect');
        this.connectelt.removeAttr('disabled');
        //connectelt.click = function (evt) { connect(false); };
        this.connectelt.on('click', {context: this.server }, function (evt) {
          evt.data.context.connect(false);
        });
        this.anchorelt.css('background-color', '');
        this.divelt=$('<div/>', {
          html : '<h3>Server '+this.server.host+':'+this.server.port+'</h3>'
        });
        this.divelt.attr('id', this.server.id);

        this.anchorelt.attr('href', '#'+this.server.id);
      } else {
        this.connectelt.html('Connect');
        this.connectelt.removeAttr('disabled');
        this.connectelt.on('click', {context: this.server }, function (evt) {
          evt.data.context.connect(true);
        });
        this.anchorelt.css('background-color', '#AEAEAE');
        this.anchorelt.attr('href', 'javascript:void(0);');
        this.divelt.remove();
        this.divelt=null;
	    }
    },
    adddevice: function(device) {
      this.divelt.append(device.ui_element.get_root());
    },
    get_root: function() {
      return this.divelt;
    },
    get_display: function() {
      return this.listelt;
    }
  };
  return ui_server;
}(jQuery));

IndiUI.ui_manager=(function($) {
  var ui_manager = function(manager, container, collapsible=true) {
    this.manager=manager;
    this.container=container;
    $.ajax({
      url: '/html/indi_simple_html.html',
      success: function(data) {
        //$(this.container).append('<div id="indi">\n' + data+'</div>\n');
        $(this.container).append('<button type="button" class="collapsible" id="indimanager">Indi Manager</button>');
        $(this.container).append('<div id="indi" class=collapsiblecontent>\n' + data+'</div>\n');
        $("#indimanager").on('click', function() {
          this.classList.toggle("active");
          var content = this.nextElementSibling;
          if (content.style.display === "block") {
            content.style.display = "none";
          } else {
            content.style.display = "block";
          }
        });
        $('#connect').on('click', {context: this.manager}, function(evt) {
          var server = $('#server').val();
          var port =  $('#port').val();
          console.log("Connect server "+ server +':'+ port + '\n');
          var serverkey = evt.data.context.createserver(server, port);
          $('#message').val($('#message').val() + 'Connecting ' +serverkey+ '\n');
          //return false;
        });
      },
      context: this
    });
  };
  ui_manager.prototype = {
    constructor : ui_manager,
    addserver: function(indiserver) {
      var serverlistelt=$('#serverlist');
      serverlistelt.append(indiserver.ui_element.get_display());
      if (serverlistelt.is(':hidden')) {
        $('#noservertext').hide();
        serverlistelt.show();
	    }
    },
    setconnected: function(indiserver) {
      $(this.container).append(indiserver.ui_element.get_root());
    },
  };
  return ui_manager;
}(jQuery));
