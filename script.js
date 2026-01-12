var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

var allData = [];
var filteredData = [];
var markers = [];
var currentOverlay = null;
var myLat = null, myLng = null;
var userVotes = JSON.parse(localStorage.getItem('userVotes')) || {}; 

window.onload = function() {
    initTheme();
    attemptAutoGPS(); 
    fetch('./data.json').then(res => res.json()).then(data => {
        allData = data;
        filteredData = data;
        renderMarkers(allData);
        renderList([]); // 초기엔 빈 리스트
    }).catch(err => console.error(err));
}

// 오버레이 표시
function showOverlay(shop) {
    var position = new kakao.maps.LatLng(shop.lat, shop.lng);
    closeOverlay();

    var isBest = shop.likes >= 10;
    var bestBadge = isBest ? '<span class="badge best">🏆 BEST</span>' : '';
    var imgSrc = shop.img ? shop.img : ''; 
    var imgHtml = imgSrc ? `<div class="overlay-img-box"><img src="${imgSrc}" class="overlay-img"></div>` : '';
    var phoneHtml = shop.phone !== '정보없음' ? `<a href="tel:${shop.phone}">📞 ${shop.phone}</a>` : `<span>📞 전화번호 없음</span>`;
    var myVote = userVotes[shop.id];

    var content = `
        <div class="overlay-bubble">
            ${imgHtml}
            <div class="close-btn" onclick="closeOverlay()">✕</div>
            <div class="overlay-content">
                <h3>${shop.name}</h3>
                <p class="meta-row">
                    ${bestBadge}
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
                <div class="vote-area">
                    <button class="vote-btn ${myVote === 'like' ? 'active' : ''}" onclick="vote(${shop.id}, 'like')">
                        👍 좋아요 <span>${shop.likes}</span>
                    </button>
                    <button class="vote-btn ${myVote === 'dislike' ? 'active' : ''}" onclick="vote(${shop.id}, 'dislike')">
                        👎 별로예요 <span>${shop.dislikes}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    var overlay = new kakao.maps.CustomOverlay({ content: content, position: position, yAnchor: 1.15, zIndex: 9999 });
    overlay.setMap(map);
    currentOverlay = overlay;
    map.panTo(position);
}

window.vote = function(id, type) {
    var shop = allData.find(d => d.id === id);
    if (!shop) return;
    var prevVote = userVotes[id];
    if (prevVote === type) {
        delete userVotes[id];
        if (type === 'like') shop.likes--; else shop.dislikes--;
    } else {
        if (prevVote === 'like') shop.likes--; if (prevVote === 'dislike') shop.dislikes--;
        userVotes[id] = type;
        if (type === 'like') shop.likes++; else shop.dislikes++;
    }
    localStorage.setItem('userVotes', JSON.stringify(userVotes));
    showOverlay(shop); // UI 갱신
}

function renderList(data) {
    var listEl = document.getElementById('place-list');
    listEl.innerHTML = ''; 
    if (!data || data.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><p>세차장을 검색해보세요!</p></div>`;
        return;
    }
    data.forEach(shop => {
        var distStr = '';
        if (myLat && myLng) {
            var d = getDistance(myLat, myLng, shop.lat, shop.lng);
            distStr = `<span style="color:#e03131; font-weight:700; margin-left:4px;">${d.toFixed(1)}km</span>`;
        }
        var isBest = shop.likes >= 10;
        var bestBadge = isBest ? '<span class="badge-mini best">BEST</span>' : '';
        var item = document.createElement('div');
        item.className = 'place-item';
        var thumb = shop.img ? shop.img : 'https://via.placeholder.com/80x80?text=No+Image';
        
        item.innerHTML = `
            <div class="place-thumb-box"><img src="${thumb}" class="place-thumb"> ${bestBadge}</div>
            <div class="place-info">
                <div class="place-name">${shop.name}</div>
                <div class="place-meta">${getTypeName(shop.type)} ${distStr}</div>
                <div class="place-meta">👍 ${shop.likes}명이 추천함</div>
                <div class="place-tags-mini">${shop.personal_gear ? '<span class="dot red"></span>' : ''}${shop.foam_lance ? '<span class="dot blue"></span>' : ''}</div>
            </div>
        `;
        item.addEventListener('click', () => { showOverlay(shop); });
        listEl.appendChild(item);
    });
}

function getDistance(lat1, lon1, lat2, lon2) {
    if ((lat1 == lat2) && (lon1 == lon2)) return 0;
    var radlat1 = Math.PI * lat1/180; var radlat2 = Math.PI * lat2/180;
    var theta = lon1-lon2; var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) dist = 1; dist = Math.acos(dist); dist = dist * 180/Math.PI; dist = dist * 60 * 1.1515 * 1.609344;
    return dist;
}

function sortData(criteria) {
    if (filteredData.length === 0) return;
    if (criteria === 'name') filteredData.sort((a, b) => a.name.localeCompare(b.name));
    else if (criteria === 'distance') {
        if (!myLat || !myLng) return alert("GPS 권한이 필요합니다.");
        filteredData.sort((a, b) => getDistance(myLat, myLng, a.lat, a.lng) - getDistance(myLat, myLng, b.lat, b.lng));
    }
    renderList(filteredData);
}

document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active'); sortData(this.dataset.sort);
    });
});

function renderMarkers(dataList) {
    removeMarkers(); closeOverlay();
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

function searchPlaces() {
    var keyword = document.getElementById('search-keyword').value.trim();
    if (!keyword) { renderList([]); return; }
    filteredData = allData.filter(d => d.name.includes(keyword));
    if (filteredData.length === 0) { renderList([]); alert('검색 결과가 없습니다.'); } 
    else { renderMarkers(filteredData); renderList(filteredData); }
}
document.getElementById('search-btn').addEventListener('click', searchPlaces);
document.getElementById('search-keyword').addEventListener('keypress', function (e) { if (e.key === 'Enter') searchPlaces(); });

function attemptAutoGPS() { if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => successGPS(pos), (err) => console.log("GPS Fail")); }
document.getElementById('gps-btn').addEventListener('click', function() {
    if (!navigator.geolocation) return alert("GPS 미지원");
    var btn = this; btn.style.transform = "rotate(360deg)";
    navigator.geolocation.getCurrentPosition((pos) => successGPS(pos), (err) => {
        btn.style.transform = "none";
        alert(err.code === 1 ? "권한 거부" : "위치 확인 실패 (HTTPS 필요)");
    }, { enableHighAccuracy: true, timeout: 10000 });
});
function successGPS(position) {
    myLat = position.coords.latitude; myLng = position.coords.longitude;
    var loc = new kakao.maps.LatLng(myLat, myLng);
    map.setCenter(loc); map.setLevel(5, {animate: true});
    var marker = new kakao.maps.Marker({ map: map, position: loc, title: "내 위치", image: new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", new kakao.maps.Size(24, 35)) });
    if (filteredData.length > 0) renderList(filteredData);
    var btn = document.getElementById('gps-btn'); if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
}

function getTypeName(type) { if (type === 'self') return '셀프세차'; if (type === 'notouch') return '노터치/자동'; return type; }
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const iconSun = document.querySelector('.icon-sun');
    const iconMoon = document.querySelector('.icon-moon');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) { document.documentElement.setAttribute('data-theme', 'dark'); iconSun.style.display = 'none'; iconMoon.style.display = 'block'; }
    toggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        if(newTheme === 'dark') { iconSun.style.display = 'none'; iconMoon.style.display = 'block'; }
        else { iconSun.style.display = 'block'; iconMoon.style.display = 'none'; }
    });
    document.getElementById('share-btn').addEventListener('click', async () => {
        try { if (navigator.share) await navigator.share({ title: '세차여지도', url: window.location.href });
              else { await navigator.clipboard.writeText(window.location.href); alert("주소 복사 완료!"); } } catch (err) {}
    });
}
