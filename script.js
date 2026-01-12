var container = document.getElementById('map');
var options = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(container, options);

var allData = [];
var markers = [];
var currentOverlay = null;

window.onload = function() {
    initTheme();
    getMyLocation(); 
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderMarkers(allData); 
        })
        .catch(err => console.error("데이터 로드 실패:", err));
}

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
        if(newTheme === 'dark') {
            iconSun.style.display = 'none'; iconMoon.style.display = 'block';
        } else {
            iconSun.style.display = 'block'; iconMoon.style.display = 'none';
        }
    });

    document.getElementById('share-btn').addEventListener('click', async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: '세차여지도', text: '내 주변 세차장 찾기', url: window.location.href });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("주소가 복사되었습니다!");
            }
        } catch (err) { console.error(err); }
    });
}

function renderMarkers(dataList) {
    removeMarkers(); 
    closeOverlay();

    dataList.forEach(shop => {
        var position = new kakao.maps.LatLng(shop.lat, shop.lng);
        var marker = new kakao.maps.Marker({ map: map, position: position });
        markers.push(marker);

        var phoneHtml = shop.phone && shop.phone !== '정보없음' 
            ? `<a href="tel:${shop.phone}">📞 ${shop.phone}</a>` 
            : `<span>📞 전화번호 없음</span>`;

        var content = `
            <div class="overlay-bubble">
                <div class="close-btn" onclick="closeOverlay()">✕</div>
                <h3>${shop.name}</h3>
                <p style="margin-bottom: 6px;">
                    <span class="badge" style="background:var(--accent-color); color:var(--accent-text); padding:2px 6px; border-radius:4px; font-size:11px;">${getTypeName(shop.type)}</span>
                </p>
                <p>${phoneHtml}</p>
                <p>⏰ ${shop.time}</p>
                <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:8px;">
                    ${shop.personal_gear ? '<span class="tag-red">개인용품</span>' : ''}
                    ${shop.foam_lance ? '<span class="tag-blue">폼랜스</span>' : ''}
                </div>
            </div>
        `;
        
        var overlay = new kakao.maps.CustomOverlay({ content: content, position: position, yAnchor: 1.15 });

        kakao.maps.event.addListener(marker, 'click', function() {
            if (currentOverlay) currentOverlay.setMap(null);
            markers.forEach(m => { if (m !== marker) m.setMap(null); });
            overlay.setMap(map);
            currentOverlay = overlay;
            map.panTo(position);
        });
    });
}

function removeMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }
function closeOverlay() { if (currentOverlay) { currentOverlay.setMap(null); currentOverlay = null; } if(markers.length > 0) markers.forEach(m => m.setMap(map)); }
kakao.maps.event.addListener(map, 'click', closeOverlay);

const btnIds = ['btn-all', 'btn-self', 'btn-notouch'];
btnIds.forEach(id => {
    document.getElementById(id).addEventListener('click', function() {
        document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active'); 
        const type = id.replace('btn-', ''); 
        if (type === 'all') renderMarkers(allData);
        else renderMarkers(allData.filter(item => item.type === type));
    });
});

document.getElementById('search-btn').addEventListener('click', searchPlaces);
document.getElementById('search-keyword').addEventListener('keypress', function (e) { if (e.key === 'Enter') searchPlaces(); });

function searchPlaces() {
    var keyword = document.getElementById('search-keyword').value.trim();
    if (!keyword) return alert('검색어를 입력하세요.');
    var result = allData.filter(d => d.name.includes(keyword));
    if (result.length === 0) return alert('검색 결과가 없습니다.');
    renderMarkers(result);
}

document.getElementById('gps-btn').addEventListener('click', getMyLocation);

function getMyLocation() {
    if (navigator.geolocation) {
        var btn = document.getElementById('gps-btn');
        if(btn) btn.style.transform = "rotate(360deg)";
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var loc = new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
                map.setCenter(loc); map.setLevel(5, {animate: true}); displayMyMarker(loc);
                if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
            }, 
            function(error) { console.error("GPS Error:", error); if(btn) btn.style.transform = "none"; }
        );
    }
}

function displayMyMarker(loc) {
    var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
    var markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(24, 35)); 
    new kakao.maps.Marker({ map: map, position: loc, image : markerImage, title: "내 위치" });
}

function getTypeName(type) {
    if (type === 'self') return '셀프세차';
    if (type === 'notouch') return '노터치/자동';
    return type;
}
