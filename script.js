var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

var allData = [];
var filteredData = [];
var markers = [];
var currentOverlay = null;
var myLat = null, myLng = null;

window.onload = function() {
    initTheme();
    // 로딩 시 GPS 시도 (실패해도 조용히 넘어감, 버튼 누르면 에러 띄움)
    attemptAutoGPS(); 
    
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            filteredData = data;
            renderMarkers(allData);
            renderList(allData);
        })
        .catch(err => console.error("데이터 로드 실패:", err));
}

// ==========================================
// ★ [핵심] 오버레이(말풍선) 띄우기 함수
// ==========================================
function showOverlay(shop) {
    var position = new kakao.maps.LatLng(shop.lat, shop.lng);
    
    // 1. 기존 오버레이 닫기
    closeOverlay();

    // 2. 내용 구성 (이미지, 태그, 정보)
    var imgSrc = shop.img ? shop.img : ''; 
    var imgHtml = imgSrc ? `<div class="overlay-img-box"><img src="${imgSrc}" class="overlay-img" alt="${shop.name}"></div>` : '';
    var phoneHtml = shop.phone !== '정보없음' ? `<a href="tel:${shop.phone}">📞 ${shop.phone}</a>` : `<span>📞 전화번호 없음</span>`;
    
    var content = `
        <div class="overlay-bubble">
            ${imgHtml}
            <div class="close-btn" onclick="closeOverlay()">✕</div>
            <div class="overlay-content">
                <h3>${shop.name}</h3>
                <p class="meta-row">
                    <span class="badge type-${shop.type}">${getTypeName(shop.type)}</span>
                    ${shop.reservation && shop.reservation !== '필요없음' ? `<span class="badge res">📅 ${shop.reservation}</span>` : ''}
                </p>
                <div class="info-row">${phoneHtml}</div>
                <div class="info-row">⏰ ${shop.time}</div>
                ${shop.price ? `<div class="info-row">💰 기본 ${shop.price.toLocaleString()}원~</div>` : ''}
                
                <div class="tag-row">
                    ${shop.personal_gear ? '<span class="tag tag-red">개인용품</span>' : ''}
                    ${shop.foam_lance ? '<span class="tag tag-blue">폼랜스</span>' : ''}
                </div>
            </div>
        </div>
    `;

    // 3. 오버레이 생성 및 지도 표시
    var overlay = new kakao.maps.CustomOverlay({
        content: content,
        position: position,
        yAnchor: 1.15, // 말풍선 꼬리가 마커 바로 위에 오도록
        zIndex: 9999   // 제일 위에 표시
    });
    
    overlay.setMap(map);
    currentOverlay = overlay;
    
    // 4. 지도 이동 (부드럽게)
    map.panTo(position);
}

// 리스트 렌더링 (검색 결과)
function renderList(data) {
    var listEl = document.getElementById('place-list');
    listEl.innerHTML = ''; 

    if (data.length === 0) {
        listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#999; font-size:13px;">검색 결과가 없습니다.</div>';
        return;
    }

    data.forEach(shop => {
        // 거리 계산
        var distStr = '';
        if (myLat && myLng) {
            var d = getDistance(myLat, myLng, shop.lat, shop.lng);
            distStr = `<span style="color:#e03131; font-weight:700; margin-left:4px;">${d.toFixed(1)}km</span>`;
        }

        var item = document.createElement('div');
        item.className = 'place-item';
        // 썸네일 없으면 기본 이미지
        var thumb = shop.img ? shop.img : 'https://via.placeholder.com/80x80?text=No+Image';
        
        item.innerHTML = `
            <img src="${thumb}" class="place-thumb" alt="">
            <div class="place-info">
                <div class="place-name">${shop.name}</div>
                <div class="place-meta">${getTypeName(shop.type)} ${distStr}</div>
                <div class="place-meta">⏰ ${shop.time}</div>
                <div class="place-tags-mini">
                    ${shop.personal_gear ? '<span class="dot red"></span>' : ''}
                    ${shop.foam_lance ? '<span class="dot blue"></span>' : ''}
                </div>
            </div>
        `;

        // ★★★ 리스트 클릭 시 -> 오버레이 실행 ★★★
        item.addEventListener('click', () => {
            showOverlay(shop); // 여기서 오버레이를 띄웁니다!
            
            // 모바일이면 사이드바 살짝 내려주기 (지도가 보이게) - 선택사항
            if(window.innerWidth < 768) {
                // document.querySelector('.sidebar').scrollTop = 0;
            }
        });

        listEl.appendChild(item);
    });
}

// 거리 계산 (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
    if ((lat1 == lat2) && (lon1 == lon2)) return 0;
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var theta = lon1-lon2;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) dist = 1;
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515 * 1.609344; 
    return dist;
}

// 정렬
function sortData(criteria) {
    if (criteria === 'name') {
        filteredData.sort((a, b) => a.name.localeCompare(b.name));
    } else if (criteria === 'distance') {
        if (!myLat || !myLng) return alert("내 위치(GPS)가 활성화되어야 거리순 정렬이 가능합니다.");
        filteredData.sort((a, b) => getDistance(myLat, myLng, a.lat, a.lng) - getDistance(myLat, myLng, b.lat, b.lng));
    }
    renderList(filteredData);
}

document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortData(this.dataset.sort);
    });
});

// 마커 렌더링
function renderMarkers(dataList) {
    removeMarkers(); 
    closeOverlay();
    dataList.forEach(shop => {
        var position = new kakao.maps.LatLng(shop.lat, shop.lng);
        var marker = new kakao.maps.Marker({ map: map, position: position });
        markers.push(marker);
        kakao.maps.event.addListener(marker, 'click', function() { showOverlay(shop); });
    });
}
function removeMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }
function closeOverlay() { if (currentOverlay) { currentOverlay.setMap(null); currentOverlay = null; } }
kakao.maps.event.addListener(map, 'click', closeOverlay);

// 필터링
const btnIds = ['btn-all', 'btn-self', 'btn-notouch'];
btnIds.forEach(id => {
    document.getElementById(id).addEventListener('click', function() {
        document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active'); 
        const type = id.replace('btn-', ''); 
        if (type === 'all') filteredData = allData;
        else filteredData = allData.filter(item => item.type === type);
        renderMarkers(filteredData); renderList(filteredData);
    });
});

// 검색
function searchPlaces() {
    var keyword = document.getElementById('search-keyword').value.trim();
    if (!keyword) return alert('검색어를 입력하세요.');
    filteredData = allData.filter(d => d.name.includes(keyword));
    if (filteredData.length === 0) { alert('검색 결과가 없습니다.'); renderList([]); } 
    else { renderMarkers(filteredData); renderList(filteredData); }
}
document.getElementById('search-btn').addEventListener('click', searchPlaces);
document.getElementById('search-keyword').addEventListener('keypress', function (e) { if (e.key === 'Enter') searchPlaces(); });

// ==========================================
// ★ [핵심] GPS 기능 (에러 메시지 강화)
// ==========================================
function attemptAutoGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { successGPS(pos); },
            (err) => { console.log("자동 GPS 실패 (정상: 권한 대기중일 수 있음)"); }
        );
    }
}

document.getElementById('gps-btn').addEventListener('click', function() {
    if (!navigator.geolocation) return alert("GPS를 지원하지 않는 브라우저입니다.");
    
    var btn = this;
    btn.style.transform = "rotate(360deg)";
    
    navigator.geolocation.getCurrentPosition(
        (pos) => { successGPS(pos); },
        (err) => {
            btn.style.transform = "none";
            // ★ 에러 원인 알려주기
            if(err.code === 1) alert("위치 정보 권한이 거부되었습니다.\n브라우저 설정에서 위치 권한을 허용해주세요.");
            else if(err.code === 2) alert("위치 정보를 사용할 수 없습니다.\n(보안 연결 HTTPS 또는 로컬호스트 환경이 필요합니다.)");
            else if(err.code === 3) alert("위치 정보 탐색 시간이 초과되었습니다.");
            else alert("알 수 없는 오류가 발생했습니다.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

function successGPS(position) {
    myLat = position.coords.latitude;
    myLng = position.coords.longitude;
    var loc = new kakao.maps.LatLng(myLat, myLng);
    map.setCenter(loc); map.setLevel(5, {animate: true});
    
    // 내 위치 마커
    var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
    var markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(24, 35)); 
    new kakao.maps.Marker({ map: map, position: loc, image : markerImage, title: "내 위치" });
    
    // 리스트 거리순 갱신
    renderList(filteredData);
    
    var btn = document.getElementById('gps-btn');
    if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
}

// 테마 등 기타 함수
function getTypeName(type) { if (type === 'self') return '셀프세차'; if (type === 'notouch') return '노터치/자동'; return type; }
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const iconSun = document.querySelector('.icon-sun');
    const iconMoon = document.querySelector('.icon-moon');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        iconSun.style.display = 'none'; iconMoon.style.display = 'block';
    }
    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        if(newTheme === 'dark') { iconSun.style.display = 'none'; iconMoon.style.display = 'block'; }
        else { iconSun.style.display = 'block'; iconMoon.style.display = 'none'; }
    });
    document.getElementById('share-btn').addEventListener('click', async () => {
        try { if (navigator.share) await navigator.share({ title: '세차여지도', text: '내 주변 세차장', url: window.location.href });
              else { await navigator.clipboard.writeText(window.location.href); alert("주소 복사 완료!"); } } catch (err) {}
    });
}
