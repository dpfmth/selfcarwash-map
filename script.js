document.addEventListener('DOMContentLoaded', () => {
    // 1. 지도 생성
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 8
    };
    
    let map;
    try {
        map = new kakao.maps.Map(mapContainer, mapOption);
    } catch(e) {
        console.error("Map Load Error:", e);
    }

    let allData = [];
    let currentOverlay = null; // 현재 열린 버블 관리용

    // 2. JSON 데이터 불러오기
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
        });

    // 3. 검색 기능
    const searchInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');

    function performSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            alert("검색어를 입력해주세요.");
            return;
        }

        const results = allData.filter(item => 
            item.name.includes(keyword) || item.address.includes(keyword)
        );
        
        renderList(results);
    }

    // 엔터키 및 버튼 클릭 이벤트
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    searchBtn.addEventListener('click', performSearch);

    // 4. 리스트 렌더링
    function renderList(items) {
        const listEl = document.getElementById('place-list');
        listEl.innerHTML = ''; // 초기화

        if (items.length === 0) {
            listEl.innerHTML = '<div class="empty-message">검색 결과가 없습니다.</div>';
            return;
        }

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'place-item';
            el.innerHTML = `
                <img src="${item.img}" alt="img">
                <div class="place-info">
                    <h3>${item.name}</h3>
                    <div class="meta">
                        <span class="badge ${item.type}">${item.type === 'self' ? '셀프' : '노터치'}</span>
                        <span class="price">${item.price.toLocaleString()}원~</span>
                    </div>
                </div>
            `;
            
            // 클릭 시 지도 이동 및 버블 표시
            el.addEventListener('click', () => {
                showLocationOnMap(item);
            });

            listEl.appendChild(el);
        });
    }

    // 5. 지도 이동 및 버블 표시 함수
    function showLocationOnMap(item) {
        if (!map) return;

        const loc = new kakao.maps.LatLng(item.lat, item.lng);
        
        // 지도 이동
        map.setCenter(loc);
        map.setLevel(4);

        // 기존 버블 닫기
        if (currentOverlay) currentOverlay.setMap(null);

        // 새 버블 내용
        const content = `
            <div class="custom-overlay">
                <div class="overlay-name">${item.name}</div>
                <div class="overlay-price">${item.price.toLocaleString()}원</div>
            </div>
        `;

        // 커스텀 오버레이 생성
        const overlay = new kakao.maps.CustomOverlay({
            position: loc,
            content: content,
            yAnchor: 1
        });
        
        overlay.setMap(map);
        currentOverlay = overlay;
    }

    // 6. GPS 버튼
    const gpsBtn = document.getElementById('gps-btn');
    gpsBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const loc = new kakao.maps.LatLng(lat, lng);
                map.setCenter(loc);
                map.setLevel(5);
            });
        }
    });

    // 7. 필터 탭 UI (동작 로직은 필요시 추가)
    const filterBtns = document.querySelectorAll('.filter-tabs button');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-tabs .active').classList.remove('active');
            btn.classList.add('active');
        });
    });
});
