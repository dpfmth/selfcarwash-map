// 1. 지도 생성
var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

// 전역 변수
var allData = [];
var markers = [];
var currentOverlay = null;

// 2. 초기 실행 (GPS -> 데이터 로드)
window.onload = function() {
    getMyLocation(); // 내 위치 먼저 잡고
    
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderMarkers(allData); // 데이터 뿌리기
        });
}

// 3. 마커 렌더링 함수
function renderMarkers(dataList) {
    removeMarkers(); // 기존 마커 싹 지우기
    closeOverlay();  // 열린 말풍선도 닫기

    dataList.forEach(shop => {
        var position = new kakao.maps.LatLng(shop.lat, shop.lng);
        var marker = new kakao.maps.Marker({ map: map, position: position });
        markers.push(marker); // 배열에 저장 (나중에 껐다 켰다 하기 위해)

        // 말풍선 내용
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

        // ★★★ [핵심] 마커 클릭 이벤트 수정됨 ★★★
        kakao.maps.event.addListener(marker, 'click', function() {
            // 1. 기존 열린 오버레이 닫기
            if (currentOverlay) currentOverlay.setMap(null);
            
            // 2. ★ 다른 마커들 숨기기 (포커스 모드) ★
            markers.forEach(m => {
                if (m !== marker) { // 내가 클릭한 마커가 아니면
                    m.setMap(null); // 지도에서 지워라
                }
            });

            // 3. 내 오버레이 열기 & 지도 이동
            overlay.setMap(map);
            currentOverlay = overlay;
            map.panTo(position);
        });
    });
}

// 4. 마커 모두 지우기 (필터링용 아예 삭제)
function removeMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

// 5. ★★★ [핵심] 오버레이 닫기 & 마커 복구 함수 ★★★
function closeOverlay() {
    if (currentOverlay) {
        currentOverlay.setMap(null);
        currentOverlay = null;
    }
    
    // ★ 숨겨졌던 마커들 다시 다 보여주기 ★
    if (markers.length > 0) {
        markers.forEach(m => m.setMap(map));
    }
}

// 지도 빈 곳 클릭 시에도 닫기 & 마커 복구
kakao.maps.event.addListener(map, 'click', function() {
    closeOverlay();
});


// 6. 유틸리티 함수들
function getTypeName(type) {
    if (type === 'self') return '셀프세차';
    if (type === 'notouch') return '노터치/자동';
    return type;
}

// ===============================================
// ★ 버튼 활성화 및 필터링
// ===============================================
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

// 검색 기능
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

// ===============================================
// ★ 내 위치(GPS)
// ===============================================
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
                console.error(error);
                if(btn) btn.style.transform = "none";
            }
        );
    }
}

function displayMyMarker(locPosition) {
    // 내 위치 마커 아이콘 설정 (파란 점)
    var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
    var imageSize = new kakao.maps.Size(24, 35); 
    var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize); 

    var marker = new kakao.maps.Marker({
        map: map,
        position: locPosition,
        image : markerImage,
        title: "내 위치"
    });
}
