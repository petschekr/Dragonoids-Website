/// <reference path="typescript_defs/node.d.ts" />
var crypto = require("crypto");

var express = require("express");
var app = express();
// Express middleware
var serveStatic = require("serve-static");
var responseTime = require("response-time");
var compress = require("compression");

app.use(compress());
app.use(responseTime());

app.set("views", __dirname + "/views");
app.set("view engine", "jade");
app.locals.pretty = true;

app.use("/css", serveStatic("css"));
app.use("/js", serveStatic("js"));

function createNonce (bytes: number = 32): string {
	return crypto.randomBytes(bytes).toString("hex");
}

app.route("/").get(function(request, response) {
	response.render("index", function(err: Error, html: string): void {
		if (err) {
			console.error(err);
			return;
		}
		response.send(html);
	});
});

// 404 page
app.use(function(request, response, next): void {
	response.send(404, "404 Not found!");
});

var PORT: number = 8080;
app.listen(PORT, "0.0.0.0", function(): void {
	console.log("Server listening on port " + PORT);
});