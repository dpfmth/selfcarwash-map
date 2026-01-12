var mapContainer = document.getElementById('map');
var mapOption = {
    center: new kakao.maps.LatLng(37.566826, 126.9786567), 
    level: 3 
};

var map = new kakao.maps.Map(mapContainer, mapOption); 
var ps = new kakao.maps.services.Places();  
var infowindow = new kakao.maps.InfoWindow({zIndex:1});
var markers = []; 

// GPS: 내 위치
function getCurrentPos() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude, lon = position.coords.longitude;
            var locPosition = new kakao.maps.LatLng(lat, lon); 
            map.setCenter(locPosition);
            map.setLevel(3);
        }, function(err) {
            alert('GPS를 켜주세요.');
        });
    } else {
        alert('위치 서비스를 지원하지 않습니다.');
    }
}

// 검색 실행
function searchPlaces() {
    var keyword = document.getElementById('keyword').value;
    if (!keyword.replace(/^\s+|\s+$/g, '')) {
        alert('키워드를 입력해주세요!');
        return false;
    }
    ps.keywordSearch(keyword, placesSearchCB); 
}

// 검색 콜백
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        displayPlaces(data);
        displayPagination(pagination);
        // 검색 성공 시, 모바일에서는 리스트가 보이도록 처리하거나 스크롤 이동
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 없습니다.');
    } else if (status === kakao.maps.services.Status.ERROR) {
        alert('검색 중 오류가 발생했습니다.');
    }
}

// 목록 표출
function displayPlaces(places) {
    var listEl = document.getElementById('placesList'), 
    fragment = document.createDocumentFragment(), 
    bounds = new kakao.maps.LatLngBounds();
    
    removeAllChildNods(listEl);
    removeMarker();
    
    for ( var i=0; i<places.length; i++ ) {
        var placePosition = new kakao.maps.LatLng(places[i].y, places[i].x),
            marker = addMarker(placePosition, i), 
            itemEl = getListItem(i, places[i]); 

        bounds.extend(placePosition);

        (function(marker, title, address, url) {
            kakao.maps.event.addListener(marker, 'click', function() {
                displayInfowindow(marker, title, address, url);
            });
            itemEl.onclick = function () {
                displayInfowindow(marker, title, address, url);
                map.panTo(marker.getPosition()); 
            };
        })(marker, places[i].place_name, places[i].road_address_name || places[i].address_name, places[i].place_url);

        fragment.appendChild(itemEl);
    }
    listEl.appendChild(fragment);
    map.setBounds(bounds);
}

function getListItem(index, places) {
    var el = document.createElement('li'),
    itemStr = '<div class="info">' +
                '   <h5>' + (index+1) + '. ' + places.place_name + '</h5>';
    if (places.road_address_name) {
        itemStr += '    <span>' + places.road_address_name + '</span>';
    } else {
        itemStr += '    <span>' +  places.address_name  + '</span>'; 
    }
    itemStr += '  <span class="tel">' + places.phone  + '</span>' + '</div>';            
    el.innerHTML = itemStr;
    el.className = 'item';
    return el;
}

function addMarker(position, idx) {
    var imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue.png', 
        imageSize = new kakao.maps.Size(36, 37),  
        imgOptions =  {
            spriteSize : new kakao.maps.Size(36, 691), 
            spriteOrigin : new kakao.maps.Point(0, (idx*46)+10), 
            offset: new kakao.maps.Point(13, 37) 
        },
        markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions),
        marker = new kakao.maps.Marker({ position: position, image: markerImage });
    marker.setMap(map); 
    markers.push(marker);  
    return marker;
}

function removeMarker() {
    for ( var i = 0; i < markers.length; i++ ) { markers[i].setMap(null); }   
    markers = [];
}

function displayPagination(pagination) {
    var paginationEl = document.getElementById('pagination'),
        fragment = document.createDocumentFragment(), i; 
    while (paginationEl.hasChildNodes()) { paginationEl.removeChild (paginationEl.lastChild); }

    for (i=1; i<=pagination.last; i++) {
        var el = document.createElement('a');
        el.href = "#"; el.innerHTML = i;
        if (i===pagination.current) { el.className = 'on'; } 
        else { el.onclick = (function(i) { return function() { pagination.gotoPage(i); } })(i); }
        fragment.appendChild(el);
    }
    paginationEl.appendChild(fragment);
}

function displayInfowindow(marker, title, address, url) {
    var content = '<div style="padding:10px;z-index:1;min-width:200px;">' +
        '<div style="font-weight:bold;margin-bottom:5px;">' + title + '</div>' +
        '<div style="font-size:12px;color:#555;">' + address + '</div>' +
        '<a href="' + url + '" target="_blank" style="color:#222;font-size:12px;text-decoration:underline;">상세보기</a></div>';
    infowindow.setContent(content);
    infowindow.open(map, marker);
}

function removeAllChildNods(el) { while (el.hasChildNodes()) { el.removeChild (el.lastChild); } }
