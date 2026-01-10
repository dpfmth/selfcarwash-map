// 1. 지도 생성
var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

// 전역 변수
var allData = [];
var markers = [];
var currentOverlay = null;

// 2. 데이터 로드
fetch('./data.json')
    .then(res => res.json())
    .then(data => {
        allData = data;
        // 초기 데이터 뿌리기 (손세차 메뉴를 숨겼으므로, 지도에서도 처음부터 뺄지 고민되지만 일단 다 보여줍니다)
        // 만약 처음부터 손세차를 빼고 싶다면 아래 줄을 주석처리하고 그 아래 줄을 푸세요.
        renderMarkers(allData); 
        // renderMarkers(allData.filter(d => d.type !== 'hand')); 
    });

// ★★★ 3. 페이지 접속하자마자 GPS 실행하기 ★★★
// (이 코드가 있어서 들어오자마자 팝업이 뜹니다)
window.onload = function() {
    getMyLocation(); 
}

// 4. 마커 렌더링 함수
function renderMarkers(dataList) {
    removeMarkers();
    if (currentOverlay) currentOverlay.setMap(null);

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

        kakao.maps.event.addListener(marker, 'click', function() {
            if (currentOverlay) currentOverlay.setMap(null);
            overlay.setMap(map);
            currentOverlay = overlay;
            map.panTo(position);
        });
    });
}

function removeMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function closeOverlay() {
    if (currentOverlay) {
        currentOverlay.setMap(null);
        currentOverlay = null;
    }
}

function getTypeName(type) {
    if (type === 'self') return '셀프세차';
    if (type === 'notouch') return '노터치/자동';
    if (type === 'detailing') return '디테일링';
    if (type === 'hand') return '손세차';
    return type;
}

// ===============================================
// ★ 버튼 활성화 및 필터링 (손세차 제외됨)
// ===============================================

// HTML에서 손세차 버튼을 주석처리 했으므로, 여기서도 리스트에서 뺍니다.
// (btn-hand 제거함 -> 에러 방지)
const btnIds = ['btn-all', 'btn-self', 'btn-notouch', 'btn-detailing'];

btnIds.forEach(id => {
    // 혹시 HTML에 버튼이 없을 수도 있으니 확인 후 이벤트 연결
    var btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
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
// ★ 내 위치(GPS) 함수 분리
// ===============================================

// 버튼 클릭 시 실행
document.getElementById('gps-btn').addEventListener('click', getMyLocation);

// 실제 위치 가져오는 로직 (자동실행/버튼클릭 공용)
function getMyLocation() {
    if (navigator.geolocation) {
        // 아이콘 회전 효과 (버튼이 있을 때만)
        var btn = document.getElementById('gps-btn');
        if(btn) btn.style.transform = "rotate(360deg)";
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                var locPosition = new kakao.maps.LatLng(lat, lng);

                map.panTo(locPosition);
                
                // 내 위치 마커 표시
                displayMyMarker(locPosition);
                
                if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
            }, 
            function(error) {
                console.error(error);
                // 자동 실행일 때는 에러 메시지를 안 띄우는 게 사용자 경험상 좋습니다.
                // (차단했을 수도 있으니까요)
                if(btn) btn.style.transform = "none";
            }
        );
    } else {
        // GPS 미지원 브라우저
    }
}

function displayMyMarker(locPosition) {
    // 내 위치 마커는 기존 마커 배열(markers)에 넣지 않음 (필터링 때 사라지지 않게)
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
