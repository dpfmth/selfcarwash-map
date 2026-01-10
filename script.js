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
        renderMarkers(allData); // 초기 실행: 전체 데이터 표시
    });

// 3. 마커 렌더링 함수
function renderMarkers(dataList) {
    // 기존 마커 & 오버레이 제거
    removeMarkers();
    if (currentOverlay) currentOverlay.setMap(null);

    dataList.forEach(shop => {
        var position = new kakao.maps.LatLng(shop.lat, shop.lng);
        var marker = new kakao.maps.Marker({ map: map, position: position });
        markers.push(marker);

        // ★★★ 디자인된 말풍선 HTML (style.css와 짝꿍) ★★★
        var content = `
            <div class="overlay-bubble">
                <div class="close-btn" onclick="closeOverlay()">✕</div>
                <h3>${shop.name}</h3>
                <p><span class="badge">${getTypeName(shop.type)}</span></p>
                <p style="color:#888; font-size:12px;">⏰ ${shop.time}</p>
            </div>
        `;

        var overlay = new kakao.maps.CustomOverlay({
            content: content,
            position: position,
            yAnchor: 1
        });

        kakao.maps.event.addListener(marker, 'click', function() {
            if (currentOverlay) currentOverlay.setMap(null);
            overlay.setMap(map);
            currentOverlay = overlay;
            
            // (선택) 클릭시 지도가 해당 마커로 부드럽게 이동
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
// ★ 버튼 활성화(색상 변경) 및 필터링 기능
// ===============================================

// 버튼 ID 목록
const btnIds = ['btn-all', 'btn-self', 'btn-notouch', 'btn-detailing', 'btn-hand'];

// 각 버튼에 클릭 이벤트 연결
btnIds.forEach(id => {
    document.getElementById(id).addEventListener('click', function() {
        
        // 1. 시각적 처리: 모든 버튼의 active 클래스 제거 -> 클릭한 것만 추가
        document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active'); 

        // 2. 데이터 필터링 처리
        // ID에서 'btn-'을 뺀 뒷부분(all, self 등)을 가져옴
        const type = id.replace('btn-', ''); 
        
        if (type === 'all') {
            renderMarkers(allData);
        } else {
            const filtered = allData.filter(item => item.type === type);
            renderMarkers(filtered);
        }
    });
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
