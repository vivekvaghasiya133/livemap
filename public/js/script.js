const socket = io();

function getLocationFromGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log("GPS Latitude: ", latitude, "Longitude: ", longitude);
                // Emit the GPS-based location to the server
                socket.emit("send-location", { latitude, longitude });
            },
            (err) => {
                console.error("Error fetching GPS location", err);
                getLocationFromIP(); // Fallback to IP-based location
            },
            {
                enableHighAccuracy: true,   // Use high-accuracy GPS
                timeout: 5000,              // Timeout after 5 seconds
                maximumAge: 0               // Do not use cached location
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        getLocationFromIP(); // Fallback to IP-based location if geolocation is not supported
    }
}

function getLocationFromIP() {
    // Using IP-based geolocation as fallback
    fetch('ipinfo.io/152.58.62.94?token=504d3f9321eef5')  // Replace YOUR_TOKEN_HERE with your ipinfo.io token
        .then(response => response.json())
        .then(data => {
            const [latitude, longitude] = data.loc.split(',');
            console.log("IP-based Latitude: ", latitude, "Longitude: ", longitude);
            socket.emit("send-location", { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
        })
        .catch(error => {
            console.error("Error fetching IP-based location", error);
        });
}

// Initialize GPS tracking
getLocationFromGPS();

// Set up the map with Leaflet.js
const map = L.map("map").setView([0, 0], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap"
}).addTo(map);

const markers = {};

// Handle receiving location updates from the server
socket.on("received-location", (data) => {
    const { id, latitude, longitude } = data;

    if (!markers[id]) {
        // Set map view and create marker for new users
        map.setView([latitude, longitude], 15);
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    } else {
        // Update marker position for existing users
        markers[id].setLatLng([latitude, longitude]);
    }
});

// Handle user disconnection event
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});
