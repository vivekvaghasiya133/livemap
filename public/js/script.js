const socket = io();

// Ask the user for their name when they connect
let username = prompt("Enter your name:");

// Initialize GPS tracking
getLocationFromGPS();

function getLocationFromGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("GPS Latitude: ", latitude, "Longitude: ", longitude);
        // Emit the GPS-based location to the server, including the username
        socket.emit("send-location", { username, latitude, longitude });
        // Draw a red line on the path if the user can walk
        drawPathOnMap(latitude, longitude);
      },
      (err) => {
        console.error("Error fetching GPS location", err);
        getLocationFromIP(); // Fallback to IP-based location
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
    getLocationFromIP(); // Fallback to IP-based location if geolocation is not supported
  }
}

function getLocationFromIP() {
  fetch("https://ipapi.co/json/")
    .then((response) => response.json())
    .then((data) => {
      const { lat, lon } = data;
      console.log("IP-based Latitude: ", lat, "Longitude: ", lon);
      socket.emit("send-location", {
        username,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      });
      // Draw a red line on the path if the user can walk
      drawPathOnMap(parseFloat(lat), parseFloat(lon));
    })
    .catch((error) => {
      console.error("Error fetching IP-based location", error);
    });
}

// Set up the map with Leaflet.js
const map = L.map("map").setView([0, 0], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "OpenStreetMap",
}).addTo(map);

const markers = {};
const pathPoints = []; // Array to store path points

// Function to draw a red line on the path
function drawPathOnMap(latitude, longitude) {
  pathPoints.push([latitude, longitude]); // Add the new point to the path
  if (pathPoints.length > 1) {
    L.polyline(pathPoints, { color: 'red' }).addTo(map);
  }
}

// Handle receiving all existing users when a new user connects
socket.on("all-users", (users) => {
  Object.keys(users).forEach((id) => {
    const { latitude, longitude, username } = users[id];
    console.log(latitude, longitude);

    // Create a marker for each existing user, with the username as the popup
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(username)
      .openPopup();
  });
});

// Handle receiving location updates from the server
socket.on("received-location", (data) => {
  const { id, username, latitude, longitude } = data;

  if (!markers[id]) {
    // Set map view and create marker for new users
    map.setView([latitude, longitude], 15);
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(username)
      .openPopup();
  } else {
    // Update marker position for existing users
    markers[id].setLatLng([latitude, longitude]);
    markers[id].getPopup().setContent(username);
  }
});

// Handle user disconnection event
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});
