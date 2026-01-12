// 1. 지도 생성
var mapContainer = document.getElementById('map');
var mapOption = {
    center: new kakao.maps.LatLng(37.566826, 126.9786567), 
    level: 3 
};

var map = new kakao.maps.Map(mapContainer, mapOption); 

// 2. 장소 검색 객체 및 인포윈도우
var ps = new kakao.maps.services.Places();  
var infowindow = new kakao.maps.InfoWindow({zIndex:1});
var markers = []; 

// GPS: 내 위치 찾기 함수
function getCurrentPos() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude,
                lon = position.coords.longitude;
            
            var locPosition = new kakao.maps.LatLng(lat, lon); 
            
            map.setCenter(locPosition);
            map.setLevel(3);
        }, function(err) {
            alert('위치 정보를 가져올 수 없습니다. GPS 설정을 확인해주세요.');
        });
    } else {
        alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
    }
}

// 3. 키워드 검색
function searchPlaces() {
    var keyword = document.getElementById('keyword').value;

    if (!keyword.replace(/^\s+|\s+$/g, '')) {
        alert('키워드를 입력해주세요!');
        return false;
    }

    ps.keywordSearch(keyword, placesSearchCB); 
}

// 4. 검색 콜백
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        document.getElementById('menu_wrap').style.display = 'flex';
        displayPlaces(data);
        displayPagination(pagination);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 존재하지 않습니다.');
        return;
    } else if (status === kakao.maps.services.Status.ERROR) {
        alert('검색 중 오류가 발생했습니다.');
        return;
    }
}

// 5. 목록 및 마커 표출
function displayPlaces(places) {
    var listEl = document.getElementById('placesList'), 
    menuEl = document.getElementById('menu_wrap'),
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
    menuEl.scrollTop = 0;
    map.setBounds(bounds);
}

// 6. 리스트 아이템 HTML
function getListItem(index, places) {
    var el = document.createElement('li'),
    itemStr = '<div class="info">' +
                '   <h5>' + (index+1) + '. ' + places.place_name + '</h5>';

    if (places.road_address_name) {
        itemStr += '    <span>' + places.road_address_name + '</span>';
    } else {
        itemStr += '    <span>' +  places.address_name  + '</span>'; 
    }
            
    itemStr += '  <span class="tel">' + places.phone  + '</span>' +
                '</div>';            

    el.innerHTML = itemStr;
    el.className = 'item';

    return el;
}

// 7. 마커 생성
function addMarker(position, idx) {
    var imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue.png', 
        imageSize = new kakao.maps.Size(36, 37),  
        imgOptions =  {
            spriteSize : new kakao.maps.Size(36, 691), 
            spriteOrigin : new kakao.maps.Point(0, (idx*46)+10), 
            offset: new kakao.maps.Point(13, 37) 
        },
        markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions),
            marker = new kakao.maps.Marker({
            position: position,
            image: markerImage 
        });

    marker.setMap(map); 
    markers.push(marker);  
    return marker;
}

function removeMarker() {
    for ( var i = 0; i < markers.length; i++ ) {
        markers[i].setMap(null);
    }   
    markers = [];
}

function displayPagination(pagination) {
    var paginationEl = document.getElementById('pagination'),
        fragment = document.createDocumentFragment(),
        i; 

    while (paginationEl.hasChildNodes()) {
        paginationEl.removeChild (paginationEl.lastChild);
    }

    for (i=1; i<=pagination.last; i++) {
        var el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;

        if (i===pagination.current) {
            el.className = 'on';
        } else {
            el.onclick = (function(i) {
                return function() {
                    pagination.gotoPage(i);
                }
            })(i);
        }
        fragment.appendChild(el);
    }
    paginationEl.appendChild(fragment);
}

// 인포윈도우
function displayInfowindow(marker, title, address, url) {
    var content = `
        <div style="padding:10px; z-index:1; min-width:200px; font-family:sans-serif;">
            <div style="font-weight:bold; margin-bottom:5px; font-size:14px;">${title}</div>
            <div style="font-size:12px; color:#555; margin-bottom:5px;">${address}</div>
            <a href="${url}" target="_blank" style="color:#007bff; font-size:12px; text-decoration:none; border:1px solid #007bff; padding:2px 5px; border-radius:3px;">상세보기 ></a>
        </div>`;

    infowindow.setContent(content);
    infowindow.open(map, marker);
}

function removeAllChildNods(el) {   
    while (el.hasChildNodes()) {
        el.removeChild (el.lastChild);
    }
}

// 링크 공유
function shareUrl() {
    var url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => alert("링크 복사 완료!")).catch(() => fallbackCopy(url));
    } else {
        fallbackCopy(url);
    }
}
function fallbackCopy(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; 
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert("링크 복사 완료!");
    } catch (err) {
        alert("복사 실패");
    }
    document.body.removeChild(textArea);
}

// 목록 토글
function toggleList() {
    var menu = document.getElementById('menu_wrap');
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';
    } else {
        menu.style.display = 'none';
    }
}
