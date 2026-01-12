// 전역 변수
var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

var allData = [];
var filteredData = []; // 현재 필터링된 데이터
var markers = [];
var currentOverlay = null;
var myLat = null, myLng = null; // 내 위치 저장용

window.onload = function() {
    initTheme();
    getMyLocation(); // 내 위치 먼저 확보
    
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            filteredData = data; // 초기엔 전체 데이터
            renderMarkers(allData);
            renderList(allData); // 리스트도 그리기
        })
        .catch(err => console.error("데이터 로드 실패:", err));
}

// 거리 계산 함수 (Haversine Formula) - km 단위
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
    dist = dist * 60 * 1.1515;
    dist = dist * 1.609344; // Kilometer
    return dist;
}

// 리스트 렌더링 함수 (검색창 아래 카드 리스트)
function renderList(data) {
    var listEl = document.getElementById('place-list');
    listEl.innerHTML = ''; // 초기화

    if (data.length === 0) {
        listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">검색 결과가 없습니다.</div>';
        return;
    }

    data.forEach(shop => {
        // 거리 계산 (내 위치가 있으면 계산, 없으면 -)
        var distStr = '';
        if (myLat && myLng) {
            var d = getDistance(myLat, myLng, shop.lat, shop.lng);
            distStr = `<span style="color:#d6336c; font-weight:bold;">${d.toFixed(1)}km</span>`;
        }

        var item = document.createElement('div');
        item.className = 'place-item';
        // 사진이 있으면 넣고 없으면 기본 이미지
        var imgSrc = shop.img ? shop.img : 'https://via.placeholder.com/80?text=NoImage';
        
        item.innerHTML = `
            <img src="${imgSrc}" class="place-thumb" alt="${shop.name}">
            <div class="place-info">
                <div class="place-name">${shop.name}</div>
                <div class="place-meta">${getTypeName(shop.type)} · ${distStr}</div>
                <div class="place-meta">⏰ ${shop.time}</div>
                <div class="place-tags">
                    ${shop.personal_gear ? '<span class="tag-red">개인용품</span>' : ''}
                    ${shop.foam_lance ? '<span class="tag-blue">폼랜스</span>' : ''}
                </div>
            </div>
        `;

        // 리스트 클릭 시 지도 이동 & 오버레이 열기
        item.addEventListener('click', () => {
            var moveLatLon = new kakao.maps.LatLng(shop.lat, shop.lng);
            map.panTo(moveLatLon);
            // 해당 마커 찾아서 클릭 이벤트 트리거 (오버레이 열기 위해)
            // (마커 배열과 데이터 순서가 같다고 가정하거나, id로 매칭해야 함. 여기선 간단히 오버레이 직접 호출)
            showOverlay(shop);
        });

        listEl.appendChild(item);
    });
}

// 데이터 정렬 함수
function sortData(criteria) {
    if (criteria === 'name') {
        filteredData.sort((a, b) => a.name.localeCompare(b.name));
    } else if (criteria === 'distance') {
        if (!myLat || !myLng) {
            alert("내 위치를 먼저 확인해야 거리순 정렬이 가능합니다.");
            return;
        }
        filteredData.sort((a, b) => {
            var d1 = getDistance(myLat, myLng, a.lat, a.lng);
            var d2 = getDistance(myLat, myLng, b.lat, b.lng);
            return d1 - d2;
        });
    }
    renderList(filteredData); // 리스트 다시 그리기
}

// 정렬 버튼 이벤트 연결
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortData(this.dataset.sort);
    });
});

// 오버레이 표시 함수 (리스트 클릭 시에도 사용)
function showOverlay(shop) {
    var position = new kakao.maps.LatLng(shop.lat, shop.lng);
    
    if (currentOverlay) currentOverlay.setMap(null);

    // 이미지 포함된 오버레이
    var imgSrc = shop.img ? shop.img : ''; 
    var imgHtml = imgSrc ? `<img src="${imgSrc}" class="overlay-img">` : '';
    var phoneHtml = shop.phone !== '정보없음' ? `<a href="tel:${shop.phone}">📞 ${shop.phone}</a>` : `<span>📞 전화번호 없음</span>`;

    var content = `
        <div class="overlay-bubble">
            ${imgHtml}
            <div class="close-btn" onclick="closeOverlay()">✕</div>
            <div class="overlay-content">
                <h3>${shop.name}</h3>
                <p style="margin-bottom: 6px;">
                    <span class="badge" style="background:var(--accent-color); color:var(--accent-text); padding:2px 6px; border-radius:4px; font-size:11px;">${getTypeName(shop.type)}</span>
                    <span style="font-size:12px; color:#d6336c; margin-left:4px;">${shop.reservation === '필요없음' ? '' : '📅 ' + shop.reservation}</span>
                </p>
                <p>${phoneHtml}</p>
                <p>⏰ ${shop.time}</p>
                <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:8px;">
                    ${shop.personal_gear ? '<span class="tag-red">개인용품</span>' : ''}
                    ${shop.foam_lance ? '<span class="tag-blue">폼랜스</span>' : ''}
                </div>
            </div>
        </div>
    `;

    var overlay = new kakao.maps.CustomOverlay({
        content: content, position: position, yAnchor: 1.15
    });
    
    overlay.setMap(map);
    currentOverlay = overlay;
    map.panTo(position);
}

// 기존 renderMarkers 함수 수정 (showOverlay 사용하도록)
function renderMarkers(dataList) {
    removeMarkers(); 
    closeOverlay();

    dataList.forEach(shop => {
        var position = new kakao.maps.LatLng(shop.lat, shop.lng);
        var marker = new kakao.maps.Marker({ map: map, position: position });
        markers.push(marker);

        kakao.maps.event.addListener(marker, 'click', function() {
            showOverlay(shop);
        });
    });
}

function removeMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }
function closeOverlay() { if (currentOverlay) { currentOverlay.setMap(null); currentOverlay = null; } }

// 필터링 버튼
const btnIds = ['btn-all', 'btn-self', 'btn-notouch'];
btnIds.forEach(id => {
    document.getElementById(id).addEventListener('click', function() {
        document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active'); 
        const type = id.replace('btn-', ''); 
        
        if (type === 'all') filteredData = allData;
        else filteredData = allData.filter(item => item.type === type);
        
        renderMarkers(filteredData);
        renderList(filteredData); // 리스트도 갱신
    });
});

// 검색 기능
function searchPlaces() {
    var keyword = document.getElementById('search-keyword').value.trim();
    if (!keyword) return alert('검색어를 입력하세요.');
    
    filteredData = allData.filter(d => d.name.includes(keyword));
    
    if (filteredData.length === 0) {
        alert('검색 결과가 없습니다.');
        renderList([]); // 빈 리스트
    } else {
        renderMarkers(filteredData);
        renderList(filteredData); // 검색 결과 리스트 표시
    }
}
document.getElementById('search-btn').addEventListener('click', searchPlaces);
document.getElementById('search-keyword').addEventListener('keypress', function (e) { if (e.key === 'Enter') searchPlaces(); });

// GPS 기능
function getMyLocation() {
    if (navigator.geolocation) {
        var btn = document.getElementById('gps-btn');
        if(btn) btn.style.transform = "rotate(360deg)";
        navigator.geolocation.getCurrentPosition(
            function(position) {
                myLat = position.coords.latitude; // 전역 변수에 저장 (거리 계산용)
                myLng = position.coords.longitude;
                
                var loc = new kakao.maps.LatLng(myLat, myLng);
                map.setCenter(loc); map.setLevel(5, {animate: true}); displayMyMarker(loc);
                
                // 내 위치 찾았으면 리스트 거리순으로 갱신해주는 센스
                renderList(filteredData); 
                
                if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
            }, 
            function(error) { console.error("GPS Error:", error); if(btn) btn.style.transform = "none"; }
        );
    }
}
document.getElementById('gps-btn').addEventListener('click', getMyLocation);

// 나머지 (테마, 공유 등)은 이전과 동일
function displayMyMarker(loc) { /* ... 기존 코드 ... */ 
    var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
    var markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(24, 35)); 
    new kakao.maps.Marker({ map: map, position: loc, image : markerImage, title: "내 위치" });
}
function getTypeName(type) { if (type === 'self') return '셀프세차'; if (type === 'notouch') return '노터치/자동'; return type; }
function initTheme() { /* ... 기존 코드 ... */ 
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
        try {
            if (navigator.share) await navigator.share({ title: '세차여지도', text: '내 주변 세차장', url: window.location.href });
            else { await navigator.clipboard.writeText(window.location.href); alert("주소가 복사되었습니다!"); }
        } catch (err) { console.error(err); }
    });
}
