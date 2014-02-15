function startws(scheme, host, port) {
  return function() { 

    websocket = scheme+'://'+host+':'+port+'/ws'; 
    if (window.WebSocket) {
	ws = new WebSocket(websocket); 
    } else if (window.MozWebSocket) { 
	ws = MozWebSocket(websocket); 
    } else { 
	console.log('WebSocket Not Supported'); 
	return; 
    }
    indielt=$('#logs');
    indimanager=new Indi.manager(ws, indielt);

    window.onbeforeunload = function(e) {
	$('#message').val($('#message').val() + 'Bye bye...\n');
	ws.close(1000, 'Disconnecting from WebSocket server\n');
	if (!e) e = window.event; 
	e.stopPropagation();
	e.preventDefault(); 
    }; 

    ws.onmessage = function (evt) { 
	var result=null;
	try { 
	    var obj=$.parseJSON(evt.data);
	    if (obj.type) {
		result = indimanager.processmessage(obj);
	    } else {
		result = 'Unknown json format: '+ JSON.stringify(obj);
	    }
	} catch (e) {
	    result =  "MESSAGE: " + evt.data ;
	} 
	if (result)
	    $('#message').val($('#message').val() + result + '\n');
    }; 
    
    ws.onopen = function() { 
	$('#message').val("WebSocket opened - Fetching key\n");
	ws.sendmsg('getkey', null);
    }; 

    ws.onclose = function(evt) {
	$('#message').val($('#message').val() + 'Connection closed by server: ' + evt.code + ' \"' + evt.reason + '\"\n');
    };

    ws.sendmsg = function (type, data) {
	var msg = { };
	msg.type=type;
	msg.data=data;
	//jsonmsg=JSON.stringify(msg);
	ws.send(JSON.stringify(msg));
    } 


    
  };
}
