// --- 1. 더미 데이터 ---
const washData = [
    { id: 1, name: "스팽글세차장 강남점", type: "self", lat: 37.498, lng: 127.027, time: "24시간", foam: true },
    { id: 2, name: "스팽글세차장 송파", type: "self", lat: 37.514, lng: 127.100, time: "09:00~23:00", foam: false },
    { id: 3, name: "스팽글세차장 노터치", type: "notouch", lat: 37.544, lng: 127.056, time: "24시간", foam: null },
    { id: 4, name: "스팽글디테일링센터", type: "detailing", lat: 37.534, lng: 126.992, time: "10:00~19:00", foam: null },
    { id: 5, name: "스팽글손세차달인", type: "hand", lat: 37.524, lng: 127.042, time: "09:00~18:00", foam: null },
];

let currentType = 'self'; // 현재 탭
let map; // 지도 객체
let markers = []; // 마커 관리용 배열
let overlays = []; // 오버레이 관리용 배열

// --- 2. 초기화 (페이지 로드 완료 시 실행) ---
window.onload = function() {
    const container = document.getElementById('map'); // 지도를 담을 영역
    
    // 카카오맵 옵션 설정
    const options = { 
        center: new kakao.maps.LatLng(37.498, 127.027), // 초기 중심좌표 (강남)
        level: 7 // 지도의 확대 레벨
    };

    // 지도 생성!
    map = new kakao.maps.Map(container, options);

    // ★ 안내 문구 숨기기 (지도가 떴으니 이제 안 보여도 됨)
    document.querySelector('.map-placeholder').style.display = 'none';

    // 초기 마커 그리기
    renderMarkers(); 
};

// --- 3. 마커 및 오버레이 그리기 함수 ---
function renderMarkers() {
    // 1. 기존 마커/오버레이 지우기
    markers.forEach(m => m.setMap(null));
    overlays.forEach(o => o.setMap(null));
    markers = [];
    overlays = [];

    // 2. 현재 탭(currentType)에 맞는 데이터만 필터링해서 그리기
    washData.forEach(shop => {
        if(shop.type !== currentType) return; // 타입 안 맞으면 패스

        // 마커 위치
        const position = new kakao.maps.LatLng(shop.lat, shop.lng);

        // 마커 생성
        const marker = new kakao.maps.Marker({
            map: map,
            position: position
        });
        markers.push(marker); // 나중에 지우기 위해 배열에 저장

        // 커스텀 오버레이(버블) 내용 생성
        const content = createContent(shop);

        // 오버레이 생성
        const overlay = new kakao.maps.CustomOverlay({
            content: content,
            map: map,
            position: marker.getPosition(),
            yAnchor: 1 // 버블의 꼬리가 마커 위에 오도록 위치 조정
        });
        overlays.push(overlay);

        // (선택사항) 마커 클릭 시 오버레이 껐다 켰다 하려면 여기에 이벤트 추가
    });
}

// --- 4. 탭 변경 함수 ---
function filterMap(type, btn) {
    currentType = type;
    
    // 버튼 스타일 변경
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 지도 다시 그리기
    renderMarkers();
}

// --- 5. 버블(오버레이) HTML 생성 ---
function createContent(data) {
    let infoHtml = '';

    // 셀프 세차장일 때만 폼랜스 표시
    if (data.type === 'self') {
        const foamStatus = data.foam 
            ? `<span class="foam-lance">✔ 폼랜스 사용가능</span>` 
            : `<span style="color:#999">폼랜스 사용불가</span>`;
        
        infoHtml = `
            <p>🕒 ${data.time}</p>
            <p>🚿 ${foamStatus}</p>
        `;
    } else {
        infoHtml = `<p>🕒 ${data.time}</p>`;
    }

    const typeNames = { self: '셀프', notouch: '노터치', detailing: '디테일링', hand: '손세차' };
    
    // 닫기 기능이나 스타일은 CSS .bubble 클래스 참고
    return `
        <div class="bubble">
            <span class="badge">${typeNames[data.type]}</span>
            <h3>${data.name}</h3>
            ${infoHtml}
        </div>
    `;
}

// 검색 및 정렬 (껍데기)
function handleSearch() {
    console.log("검색 기능은 데이터를 DB와 연결 후 구현됩니다.");
}
function handleSort(val) {
    console.log("정렬 기능 준비 중");
}

