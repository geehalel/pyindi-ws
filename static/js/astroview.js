var Astroview = Astroview || {};

Astroview.astroview = (function($) {
    var astroview = function(divelt) {
	this.divelt = divelt;
	this.simpleelt=$('<div/>', {
	    //attr : { colspan : 5 }, 
	    css : { width: '100%', 'margin-left':'auto', 'margin-right':'auto'},
	    //html : this.name+' contents'
	});
	this.glelt=$('<div/>', {
	    //attr : { colspan : 5 }, 
	    css : { width: '100%', 'margin-left':'auto', 'margin-right':'auto'},
	    //html : this.name+' contents'
	});
	this.divelt.append(this.simpleelt, this.glelt);
	this.simpletable=$('<table/>', {
	    //attr : { colspan : 5 }, 
	    //css : { width: '100%', 'margin-left':'auto', 'margin-right':'auto'},
	    //html : this.name+' contents'
	});
	this.simpleelt.append(this.simpletable);
	this.gltable=$('<table/>', {
	    //attr : { colspan : 5 }, 
	    //css : { width: '100%', 'margin-left':'auto', 'margin-right':'auto'},
	    //html : this.name+' contents'
	});
	this.glelt.append(this.gltable);
	this.simpleline=$('<tr/>', {
	    //attr : { colspan : 5 }, 
	    //css : { width: '100%', 'margin-left':'auto', 'margin-right':'auto'},
	    //html : this.name+' contents'
	});
	this.simpletable.append(this.simpleline);
	this.glline=$('<tr/>', {
	    //attr : { colspan : 5 }, 
	    //css : { width: '100%', 'margin-left':'auto', 'margin-right':'auto'},
	    //html : this.name+' contents'
	});
	this.gltable.append(this.glline);	
	this.simpleviewer=new Indi.util.simpleimageviewer();
	this.glviewer=new Indi.util.glviewer();
	this.simpleline.append($('<td/>').append(this.simpleviewer.controls()), $('<td/>').append(this.simpleviewer.getdivelt()));
	this.glline.append($('<td/>').append(this.glviewer.controls()), $('<td>').append(this.glviewer.getdivelt()));
    };
    
    astroview.prototype = {
	constructor: astroview,
	getdivelt : function () {
	    return this.divelt;
	},
	refresh : function(name, size, arraybuf) {
	    //alert('astroview: loading '+name);
	    var format = name.toLowerCase().split('.').pop();
	    if (['jpg', 'jpeg', 'gif', 'png', 'tiff'].indexOf(format) != -1) {
		this.simpleviewer.reload(format, arraybuf);
		this.simpleviewer.refresh();
	    }
	   // if (format == 'fits') {
		this.glviewer.reload(format, arraybuf);
		//this.glviewer.refresh();
	    //}
	},
	controls: function () {

	}
    };
    
    return astroview;
}(jQuery));
