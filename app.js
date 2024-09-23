const express = require("express");
const app = express();

const http = require("http");
const path = require("path");

const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const users = {}; // Store users' locations

io.on("connection", function (socket) {
  console.log("Connected: " + socket.id);

  // Send all previous users' locations to the newly connected user
  socket.emit("all-users", users);

  // Handle the user sending their location
  socket.on("send-location", function (data) {
    const { username, latitude, longitude } = data;

    // Store the user's location along with their username
    users[socket.id] = { username, latitude, longitude };

    // Broadcast the user's location to all other users
    io.emit("received-location", {
      id: socket.id,
      username,
      latitude,
      longitude,
    });
  });

  // Handle user disconnection
  socket.on("disconnect", function () {
    // Remove the user's data from the list
    delete users[socket.id];

    // Notify all clients about the disconnected user
    io.emit("user-disconnected", socket.id);
  });
});


app.get("/", function (req, res) {
  res.render("index");
});

server.listen(3000, function () {
  console.log("Server is running on port 3000");
});
