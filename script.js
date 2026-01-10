// 1. 지도 생성
var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

// 전역 변수
var allData = [];
var markers = [];
var currentOverlay = null;

// 2. 페이지 로드 시 실행
window.onload = function() {
    getMyLocation(); // 접속하자마자 GPS 실행 + 줌 인
    
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderMarkers(allData); 
        })
        .catch(err => console.error("데이터 로드 실패:", err));
}

// 3. 마커 렌더링 (포커스 모드)
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

        // 마커 클릭 시
        kakao.maps.event.addListener(marker, 'click', function() {
            if (currentOverlay) currentOverlay.setMap(null);
            
            markers.forEach(m => {
                if (m !== marker) m.setMap(null);
            });

            overlay.setMap(map);
            currentOverlay = overlay;
            map.panTo(position);
        });
    });
}

// 4. 초기화 및 닫기
function removeMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function closeOverlay() {
    if (currentOverlay) {
        currentOverlay.setMap(null);
        currentOverlay = null;
    }
    if (markers.length > 0) {
        markers.forEach(m => m.setMap(map));
    }
}

kakao.maps.event.addListener(map, 'click', closeOverlay);

// 5. 버튼 필터링
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

// 6. 검색
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

// 7. GPS 기능 (줌 기능 추가됨)
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

                // 1. 내 위치로 이동
                map.setCenter(locPosition);
                
                // ★★★ 2. 지도 확대 (레벨 5: 동네 상세 뷰) ★★★
                // 숫자가 작을수록 더 크게 확대됩니다 (1~14)
                map.setLevel(5, {animate: true});

                // 3. 내 위치 마커 표시
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
