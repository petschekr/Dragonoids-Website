/// <reference path="typescript_defs/node.d.ts" />
var crypto = require("crypto");
var fs = require("fs");

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
app.use("/img", serveStatic("img"));

function createNonce (bytes: number = 32): string {
	return crypto.randomBytes(bytes).toString("hex");
}

interface TeamMember {
	name: string;
	img: string;
	positions: string[];
	bio: string;
}

app.route("/").get(function(request, response) {
	// Read the team file
	fs.readFile("team.json", {charset: "utf8"}, function(err: Error, team: string): void {
		if (err) {
			console.error(err);
			response.send(500, "Error reading team.json!");
			return;
		}
		try {
			var members: TeamMember[] = JSON.parse(team).members;
		} catch (e) {
			console.error(e);
			response.send(500, "Invalid team.json file!");
			return;
		}
		response.render("index", {members: members}, function(err: Error, html: string): void {
			if (err) {
				console.error(err);
				response.send(500, "A Jade error occurred!");
				return;
			}
			response.send(html);
		});
	});
});
app.route("/blog").get(function(request, response) {
	response.render("blog", function(err: Error, html: string): void {
		if (err) {
			console.error(err);
			response.send(500, "A Jade error occurred!");
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