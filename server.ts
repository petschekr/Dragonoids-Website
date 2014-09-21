/// <reference path="typescript_defs/node.d.ts" />
/// <reference path="typescript_defs/mongodb.d.ts" />
var crypto = require("crypto");
var fs = require("fs");

interface TeamMember {
	name: string;
	img: string;
	positions: string[];
	bio: string;
}

// MongoDB setup
import mongodb = require("mongodb");
var MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb://localhost:27017/dragonoids", function(err: any, db: mongodb.Db) {
if (err)
	throw err

var Collections: {
	Users: mongodb.Collection;
	BlogPosts: mongodb.Collection;
} = {
	Users: db.collection("users"),
	BlogPosts: db.collection("blog")
};
console.info("Connected to MongoDB server");

var express = require("express");
var app = express();
// Express middleware
var serveStatic = require("serve-static");
var responseTime = require("response-time");
var compress = require("compression");
var bodyParser = require("body-parser").urlencoded({extended: false});
var session = require("express-session");
var MongoStore = require("connect-mongo")({session: session});

app.use(compress());
app.use(responseTime());
var secret: string = fs.readFileSync("secret.txt", {encoding: "utf8"});
app.use(session({
	secret: secret,
	cookie: {
		path: "/",
		httpOnly: true,
		maxAge: 3600000 * 24 * 7 * 4 // 1 month
	},
	store: new MongoStore({db: db}),
	resave: true,
	saveUninitialized: true
}));

app.set("views", __dirname + "/views");
app.set("view engine", "jade");
app.locals.pretty = true;

app.use("/css", serveStatic("css"));
app.use("/js", serveStatic("js"));
app.use("/img", serveStatic("img"));

// Check if logged in
app.use(function(request, response, next) {
	Collections.Users.findOne({"username": request.session["username"], "login.token": request.session["token"]}, function(err: Error, user: any): void {
		if (user) {
			response.locals.loggedIn = true;
			response.locals.user = user;
		}
		else {
			response.locals.loggedIn = false;
		}
		next();
	});
});

function createNonce (bytes: number = 32): string {
	return crypto.randomBytes(bytes).toString("hex");
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

// Logins
app.route("/login").get(function(request, response) {
	response.render("login", function(err: Error, html: string): void {
		if (err) {
			console.error(err);
			response.send(500, "A Jade error occurred!");
			return;
		}
		response.send(html);
	});
}).post(bodyParser, function(request, response) {
	var username: string = request.body.username;
	var password: string = request.body.password;

	if (!username || !username.trim() || !password) {
		response.locals.loginFail = true;
		response.render("login", function(err: Error, html: string): void {
			if (err) {
				console.error(err);
				return;
			}
			response.send(html);
		});
		return;
	}
	Collections.Users.findOne({"username": username}, function(err: Error, user: any) {
		if (err) {
			console.error(err);
			return;
		}
		if (!user) {
			response.locals.loginFail = true;
			response.render("login", function(err: Error, html: string): void {
				if (err) {
					console.error(err);
					return;
				}
				response.send(html);
			});
			return;
		}
		crypto.pbkdf2(password, user.login.salt, user.login.iterations, 32, function(err: Error, hashedPasswordBuffer: Buffer): void {
			var hashedPassword: string = hashedPasswordBuffer.toString("hex");
			if (hashedPassword !== user.login.hash) {
				Collections.Users.update({"_id": user["_id"]}, {$inc: {"pastLogins.failedAttempts": 1}}, {w:0}, undefined);
				response.locals.loginFail = true;
				response.render("login", function(err: Error, html: string): void {
					if (err) {
						console.error(err);
						return;
					}
					response.send(html);
				});
				return;
			}
			// Valid login
			var loginToken: string = crypto.randomBytes(64).toString("hex");
			Collections.Users.update({"_id": user["_id"]}, {$set: {"pastLogins.failedAttempts": 0, "pastLogins.lastLoginTime": new Date(), "login.token": loginToken}, $push: {"pastLogins.ips": request.ip}}, {w:1}, function(err: Error) {
				if (err) {
					console.error(err);
					return;
				}
				request.session["username"] = user.username;
				request.session["token"] = loginToken;
				response.redirect("/");
			});
		});
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

}); // End of MongoDB