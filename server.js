const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const path = require("path");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// Discord OAuth2 info
const CLIENT_ID = "1411025062680854588";
const CLIENT_SECRET = "r5WKWVJYnOFIzNzo3zw9H7PRGUbbJkTi";
const CALLBACK_URL = "http://localhost:3000/callback";
const BOT_TOKEN = "MTQxMTAyNTA2MjY4MDg1NDU4OA.G4CRaz.ptvypczT4PBc_N3fKn_3PgrPmqZx929yCBh43w"; // Put your bot token

// Initialize Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(BOT_TOKEN);

app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport setup
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new DiscordStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

// Homepage
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

// Login with Discord
app.get("/login", passport.authenticate("discord"));

// OAuth2 callback
app.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => res.redirect("/dashboard")
);

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/");

  if (!client.isReady()) return res.send("Bot is not ready yet, try again in a few seconds.");

  // Servers the bot is in
  const botGuilds = client.guilds.cache.map(g => g.id);

  // Filter only servers both bot and user are in
  const userGuilds = req.user.guilds.filter(g => botGuilds.includes(g.id));

  const servers = userGuilds.map(g => ({
    name: g.name.replace(/`/g, "'"),
    iconURL: g.icon
      ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
      : "https://via.placeholder.com/80"
  }));

  // Read dashboard.html
  let html = fs.readFileSync(path.join(__dirname, "public/dashboard.html"), "utf8");

  // Inject server data safely
  const serversJson = JSON.stringify(servers).replace(/</g, "\\u003c");
  html = html.replace("window.servers = undefined;", `window.servers = ${serversJson};`);

  res.send(html);
});

// Logout
app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

// Start server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
