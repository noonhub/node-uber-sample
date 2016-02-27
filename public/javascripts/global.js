//Calling the locateme function when the document finishes loading
$(document).ready(function() {
    locateMe();
});

//Function to locate the user
var locateMe = function(){
    var map_element= $('#map');
    if (navigator.geolocation) {
        var position= navigator.geolocation.getCurrentPosition(loadMap);
    } else {
        map_element.innerHTML = "Geolocation is not supported by this browser.";
    }
};

//Lets load the mop using the position
var loadMap = function(position) {
    var loading= $('#loading');
    var latitude=position.coords.latitude;
    var longitude=position.coords.longitude;
    var myLatlng = new google.maps.LatLng(latitude, longitude);
    //Initializing the options for the map
    var myOptions = {
        center: myLatlng,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
    };
    //Creating the map in teh DOM
    var map_element=document.getElementById("map");
    var map = new google.maps.Map(map_element,myOptions);
    //Adding markers to it
    var marker = new google.maps.Marker({
        position: myLatlng,
        map: map,
        title: 'Current Location'
    });
    //Adding the Marker content to it
    var infowindow = new google.maps.InfoWindow({
        content: "<h2>Current Location</h2>",
        //Settingup the maxwidth
        maxWidth: 300
    });

    google.maps.event.addListener(map, "click", function(event) {
        var lat = event.latLng.lat();
        var lng = event.latLng.lng();

        marker.setPosition({lat: lat, lng: lng});
        map.setCenter({lat: lat, lng: lng});

        // populate yor box/field with lat, lng
        document.getElementById("lat").value = lat;
        document.getElementById("lng").value = lng;
    });
};