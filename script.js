// 1. 지도 생성
var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

// 전역 변수
var allData = [];
var markers = [];
var currentOverlay = null;

// 2. 페이지 로드 시 실행 (GPS -> 데이터 로드)
window.onload = function() {
    // ① 접속하자마자 GPS 실행
    getMyLocation(); 
    
    // ② 데이터 가져오기
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderMarkers(allData); 
        })
        .catch(err => console.error("데이터 로드 실패:", err));
}

// 3. 마커 렌더링 함수 (포커스 모드 적용됨)
function renderMarkers(dataList) {
    removeMarkers(); 
    closeOverlay();

    dataList.forEach(shop => {
        var position = new kakao.maps.LatLng(shop.lat, shop.lng);
        var marker = new kakao.maps.Marker({ map: map, position: position });
        markers.push(marker);

        var content = `
            <div class="overlay-bubble">
                <div class="close-btn" onclick="closeOverlay()">✕</div>
                <h3>${shop.name}</h3>
                <p><span class="badge">${getTypeName(shop.type)}</span></p>
                <p style="color:#888; font-size:12px;">⏰ ${shop.time}</p>
            </div>
        `;

        var overlay = new kakao.maps.CustomOverlay({
            content: content, position: position, yAnchor: 1
        });

        // ★ 마커 클릭 이벤트 (다른 마커 숨기기)
        kakao.maps.event.addListener(marker, 'click', function() {
            if (currentOverlay) currentOverlay.setMap(null);
            
            // 클릭되지 않은 나머지 마커 숨김
            markers.forEach(m => {
                if (m !== marker) m.setMap(null);
            });

            overlay.setMap(map);
            currentOverlay = overlay;
            map.panTo(position);
        });
    });
}

// 4. 초기화 및 닫기 함수
function removeMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function closeOverlay() {
    if (currentOverlay) {
        currentOverlay.setMap(null);
        currentOverlay = null;
    }
    // 오버레이 닫으면 숨겨진 마커들 다시 보이기
    if (markers.length > 0) {
        markers.forEach(m => m.setMap(map));
    }
}

// 지도 빈 곳 클릭 시 닫기
kakao.maps.event.addListener(map, 'click', closeOverlay);


// 5. 버튼 필터링 (손세차 제외됨)
const btnIds = ['btn-all', 'btn-self', 'btn-notouch'];

btnIds.forEach(id => {
    var btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); 

            const type = id.replace('btn-', ''); 
            if (type === 'all') {
                renderMarkers(allData);
            } else {
                const filtered = allData.filter(item => item.type === type);
                renderMarkers(filtered);
            }
        });
    }
});

// 6. 검색 기능
document.getElementById('search-btn').addEventListener('click', searchPlaces);
document.getElementById('search-keyword').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchPlaces();
});

function searchPlaces() {
    var keyword = document.getElementById('search-keyword').value.trim();
    if (!keyword) return alert('검색어를 입력하세요.');
    
    var result = allData.filter(d => d.name.includes(keyword));
    if (result.length === 0) return alert('검색 결과가 없습니다.');
    renderMarkers(result);
}

// 7. GPS 기능 (자동실행 + 버튼클릭 공용)
document.getElementById('gps-btn').addEventListener('click', getMyLocation);

function getMyLocation() {
    if (navigator.geolocation) {
        var btn = document.getElementById('gps-btn');
        if(btn) btn.style.transform = "rotate(360deg)";
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                var locPosition = new kakao.maps.LatLng(lat, lng);

                map.panTo(locPosition);
                displayMyMarker(locPosition);
                
                if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
            }, 
            function(error) {
                console.error("GPS 에러:", error);
                if(btn) btn.style.transform = "none";
            }
        );
    }
}

function displayMyMarker(locPosition) {
    var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
    var imageSize = new kakao.maps.Size(24, 35); 
    var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize); 

    var marker = new kakao.maps.Marker({
        map: map, position: locPosition, image : markerImage, title: "내 위치"
    });
}

function getTypeName(type) {
    if (type === 'self') return '셀프세차';
    if (type === 'notouch') return '노터치/자동';
    return type;
}
