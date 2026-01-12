let map;
let markers = [];
let allData = [];

// [핵심] 카카오맵이 로드된 후 실행 (v2/maps/sdk.js?autoload=false 대응)
kakao.maps.load(function() {
    initMap();      // 지도 먼저 그리고
    loadData();     // 데이터 불러오기
});

function initMap() {
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.6583599, 126.8320201), // 고양시 부근
        level: 7
    };
    map = new kakao.maps.Map(container, options);
}

function loadData() {
    // data.json 파일 분리
    fetch('./data.json')
        .then(res => {
            if (!res.ok) throw new Error("파일을 찾을 수 없습니다.");
            return res.json();
        })
        .then(data => {
            allData = data;
            renderList(allData.slice(0, 50));
            renderMarkers(allData);
        })
        .catch(err => {
            console.error(err);
            document.getElementById('place-list').innerHTML = 
                '<div style="text-align:center; padding:40px; color:#888;">데이터(data.json)를 불러올 수 없습니다.<br>Live Server 환경인지 확인해주세요.</div>';
        });
}

function renderList(data) {
    const container = document.getElementById('place-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">검색 결과가 없습니다.</div>';
        return;
    }

    data.forEach(item => {
        const typeClass = item.type === 'notouch' ? 'notouch' : 'self';
        const typeText = item.type === 'notouch' ? '노터치/자동' : '셀프세차';
        const imgUrl = item.img || 'https://via.placeholder.com/80';

        const html = `
            <div class="card" onclick="panTo(${item.lat}, ${item.lng})">
                <img src="${imgUrl}" class="card-img" onerror="this.src='https://via.placeholder.com/80?text=No+Img'">
                <div class="card-info">
                    <div>
                        <div class="card-top">
                            <div class="card-title">${item.name}</div>
                        </div>
                        <div class="card-tags">
                            <span class="tag ${typeClass}">${typeText}</span>
                        </div>
                        <div class="card-details">
                            📞 ${item.phone}<br>
                            ⏰ ${item.time}
                        </div>
                    </div>
                    <div class="card-price">
                        ₩${item.price.toLocaleString()}~
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function renderMarkers(data) {
    markers.forEach(m => m.setMap(null));
    markers = [];

    data.forEach(item => {
        if(!item.lat || !item.lng) return;

        const position = new kakao.maps.LatLng(item.lat, item.lng);
        const marker = new kakao.maps.Marker({
            position: position,
            title: item.name
        });

        marker.setMap(map);
        markers.push(marker);

        kakao.maps.event.addListener(marker, 'click', function() {
            map.panTo(position);
        });
    });
}

function panTo(lat, lng) {
    const moveLatLon = new kakao.maps.LatLng(lat, lng);
    map.panTo(moveLatLon);
}

// 검색 기능
const searchInput = document.getElementById('search-keyword');
searchInput.addEventListener('keyup', function() {
    const keyword = searchInput.value.toLowerCase();
    const filtered = allData.filter(item => 
        item.name.toLowerCase().includes(keyword)
    );
    renderList(filtered);
    renderMarkers(filtered);
});

// 테마 변경
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const sun = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    if(document.body.classList.contains('dark-mode')){
        sun.style.display = 'none'; moon.style.display = 'block';
    } else {
        sun.style.display = 'block'; moon.style.display = 'none';
    }
});

// GPS
document.getElementById('gps-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.panTo(new kakao.maps.LatLng(lat, lng));
        });
    }
});
