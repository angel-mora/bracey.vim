//the brackets server
//this sits between vim and the webpage

var VERSION = "0.0.1";

console.log("brackets server");
console.log("version: " + VERSION);

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var htmlfile = require("./htmlfile.js");

var connections = [];
var port = 1337;

//TODO: this is all temporary
var webRoot = "./test";
var defaultFile = "index.html";
var currentFileX = 0;
var currentFileY = 0;

var currentFile = new htmlfile(webRoot + '/index.html');

var server = http.createServer(function(request, response){
	if(request.url == "/"){
		if(request.method == "POST"){
			var postData = '';

			request.on('data', function(data){
				postData += data;
			});

			request.on('end', function(){
				if(postData.length > 2){
					command = postData[0];
					content = postData.substring(2);
					switch(command){
						//cursor position command
						case 'p':
							cords = content.split(':');
							currentFileX = cords[1] - 1;
							currentFileY = cords[0] - 1;
							elem = currentFile.tagFromPosition(currentFileY, currentFileX);
							if(elem != null){
								broadcast({
									'command': 'select',
									'selector': '[meta-brackets-element-index=\"' + elem.index + '\"]'
								});
							}
							break;
						case 'b':
							currentFile.setContent(content);
							break;
					}
				}
			});

			response.writeHead(200);
			response.end();
		}else{
			response.writeHead(302, {
				'Location': defaultFile
			});
			response.end();
		}
	}else if(webRoot + request.url == currentFile.path){
		response.writeHead(200);
		response.end(currentFile.webSrc());
	}else{
		fs.readFile(webRoot + request.url, function(err, data){
			if(err){
				response.writeHead(404);
				response.end(err.toString());
			}else{
				response.writeHead(200, {
					"Content-Type": mime.lookup(request.url)
				});
				response.end(data, "binary");
			}
		});
	}
});

server.listen(port);

webSocketServer = new websocket.server({
	httpServer: server,
	autoAcceptConnections: false
});

webSocketServer.on('request', function(request){
	console.log("websocket connected");
	var connection = request.accept('', request.origin);
	connections.push(connection)
	var i = connections.length - 1;

	connection.on('close', function(reason, description){
		connections.splice(i, 1);
	});

	connection.on('message', function(message){
		var content = JSON.parse(message.utf8Data);
		//TODO: handle client messages
	});
});

function broadcast(command){
	for(var i = 0; i < connections.length; i++){
		connections[i].sendUTF(JSON.stringify(command));
	}
}
