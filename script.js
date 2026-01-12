document.addEventListener('DOMContentLoaded', () => {
    // 1. 카카오맵 로드 (HTML에 &autoload=false 필수)
    kakao.maps.load(() => {
        initMap();
    });
});

function initMap() {
    // === 지도 생성 ===
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567), // 기본 위치 (서울시청)
        level: 7
    };

    let map;
    try {
        map = new kakao.maps.Map(mapContainer, mapOption);
    } catch (e) {
        console.error("지도 로딩 실패. HTML의 API키를 확인하세요.", e);
        return;
    }

    let allData = [];
    let markers = [];
    let activeOverlay = null; 
    let activeFilter = 'all';

    // === 2. GPS 자동 실행 ===
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                map.setCenter(loc);
            },
            () => console.log('위치 권한 없음')
        );
    }

    // === 3. 데이터 로드 ===
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            createMarkers(allData);
        })
        .catch(err => console.error("JSON 로드 실패:", err));

    // === 4. 마커 생성 ===
    function createMarkers(items) {
        markers.forEach(m => m.setMap(null));
        markers = [];

        items.forEach(item => {
            const pos = new kakao.maps.LatLng(item.lat, item.lng);
            const marker = new kakao.maps.Marker({
                position: pos, map: map, title: item.name
            });
            marker.data = item; 
            kakao.maps.event.addListener(marker, 'click', () => {
                handleMarkerClick(marker, item);
            });
            markers.push(marker);
        });
        applyFilter(activeFilter);
    }

    // === 5. 마커 클릭 핸들러 (확장형 카드 UI) ===
    function handleMarkerClick(clickedMarker, item) {
        markers.forEach(m => m.setVisible(m === clickedMarker));
        map.panTo(clickedMarker.getPosition());

        if (activeOverlay) activeOverlay.setMap(null);

        // 카드 요소 생성
        const contentNode = document.createElement('div');
        contentNode.className = 'overlay-card';

        // 데이터 가공
        const typeText = item.type === 'self' ? '셀프' : '노터치';
        const phoneDisplay = item.phone || '번호없음';
        const bookingBadge = item.booking === '예약제' ? '<span class="feature-tag booking">예약제</span>' : '';
        const bgStyle = item.img ? `background-image: url('${item.img}');` : 'background-color: #ddd;';
        const routeUrl = `https://map.kakao.com/link/to/${item.name},${item.lat},${item.lng}`;

        let tagsHtml = bookingBadge;
        if (item.personal) tagsHtml += `<span class="feature-tag personal">개인용품</span>`;
        if (item.foam) tagsHtml += `<span class="feature-tag foam">폼랜스</span>`;

        // HTML 조립
        contentNode.innerHTML = `
            <div class="card-hero" style="${bgStyle}">
                <button class="close-btn" title="닫기">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="card-body">
                <div class="card-header">
                    <h3 class="place-title">${item.name}<span class="place-type">${typeText}</span></h3>
                </div>
                <div class="card-meta">
                    <div class="star-rating">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> 4.8
                    </div>
                    <span>리뷰 128</span>
                </div>
                <div class="info-row">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>${phoneDisplay}</span>
                </div>
                <div class="tag-row">${tagsHtml}</div>
                <div class="action-bar">
                    <a href="tel:${item.phone}" class="action-btn call">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> 전화
                    </a>
                    <a href="${routeUrl}" target="_blank" class="action-btn route">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg> 길찾기
                    </a>
                </div>
            </div>
        `;

        // 닫기 이벤트
        contentNode.querySelector('.close-btn').addEventListener('click', () => {
            if (activeOverlay) activeOverlay.setMap(null);
            activeOverlay = null;
            applyFilter(activeFilter); 
            const sidebar = document.getElementById('sidebar');
            if(sidebar) { sidebar.classList.remove('expanded'); sidebar.classList.remove('collapsed'); }
        });

        // 오버레이 등록
        const overlay = new kakao.maps.CustomOverlay({
            position: clickedMarker.getPosition(),
            content: contentNode, yAnchor: 1
        });
        overlay.setMap(map);
        activeOverlay = overlay;

        // 모바일 바텀시트 숨김
        const sidebar = document.getElementById('sidebar');
        if(sidebar) { sidebar.classList.remove('expanded'); sidebar.classList.add('collapsed'); }
    }

    // === 6. 지도 빈 곳 클릭 (초기화) ===
    kakao.maps.event.addListener(map, 'click', () => {
        if (activeOverlay) { activeOverlay.setMap(null); activeOverlay = null; }
        applyFilter(activeFilter);
        
        const sidebar = document.getElementById('sidebar');
        if(sidebar) { sidebar.classList.remove('expanded'); sidebar.classList.remove('collapsed'); }
        
        const searchInput = document.getElementById('search-keyword');
        if(searchInput) searchInput.blur(); // 키보드 내림
    });

    // === 7. 필터 및 검색 ===
    function applyFilter(type) {
        activeFilter = type;
        const keyword = document.getElementById('search-keyword').value.trim();
        markers.forEach(marker => {
            const item = marker.data;
            let isVisible = true;
            if (type !== 'all' && item.type !== type) isVisible = false;
            if (keyword && !item.name.includes(keyword) && !(item.address && item.address.includes(keyword))) isVisible = false;
            marker.setVisible(isVisible);
        });
    }

    document.querySelectorAll('.filter-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-tabs .active').classList.remove('active');
            btn.classList.add('active');
            applyFilter(btn.dataset.type);
        });
    });

    // === 8. 검색 실행 ===
    function performSearch() {
        const keyword = document.getElementById('search-keyword').value.trim();
        const listEl = document.getElementById('place-list');
        const sidebar = document.getElementById('sidebar');

        if (!keyword) {
            listEl.innerHTML = '<div class="empty-message"><p>원하는 지역이나<br>세차장 이름을 검색해보세요.</p></div>';
            applyFilter(activeFilter);
            return;
        }

        const results = allData.filter(item => {
            const typeMatch = activeFilter === 'all' || item.type === activeFilter;
            const nameMatch = item.name.includes(keyword) || (item.address && item.address.includes(keyword));
            return typeMatch && nameMatch;
        });

        renderList(results);
        applyFilter(activeFilter);
        
        if(sidebar) { sidebar.classList.add('expanded'); sidebar.classList.remove('collapsed'); }
    }

    function renderList(items) {
        const listEl = document.getElementById('place-list');
        listEl.innerHTML = '';
        if (items.length === 0) {
            listEl.innerHTML = '<div class="empty-message"><p>검색 결과가 없습니다.</p></div>';
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
                </div>`;
            el.addEventListener('click', () => {
                const targetMarker = markers.find(m => m.data.id === item.id);
                if (targetMarker) handleMarkerClick(targetMarker, item);
            });
            listEl.appendChild(el);
        });
    }

    const searchInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');
    if(searchInput) {
        searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('focus', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if(sidebar) { sidebar.classList.add('expanded'); sidebar.classList.remove('collapsed'); }
            }
        });
    }

    // === 9. 모바일 제스처 (스와이프) ===
    const handle = document.querySelector('.mobile-handle-area');
    const sidebar = document.getElementById('sidebar');

    if(handle && sidebar) {
        let isSwipe = false;
        let startY = 0;

        handle.addEventListener('click', () => {
            if (isSwipe) return;
            if (sidebar.classList.contains('expanded')) { sidebar.classList.remove('expanded'); } 
            else if (sidebar.classList.contains('collapsed')) { sidebar.classList.remove('collapsed'); } 
            else { sidebar.classList.add('expanded'); }
        });

        handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; isSwipe = false; }, {passive: true});
        handle.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const distance = startY - endY;
            if (Math.abs(distance) > 30) {
                isSwipe = true;
                if (distance > 0) { sidebar.classList.add('expanded'); sidebar.classList.remove('collapsed'); } 
                else {
                    if (sidebar.classList.contains('expanded')) { sidebar.classList.remove('expanded'); } 
                    else { sidebar.classList.add('collapsed'); }
                }
            }
        });
    }

    // === 10. GPS 버튼 ===
    const gpsBtn = document.getElementById('gps-btn');
    if(gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                    map.setCenter(loc); map.setLevel(5);
                }, () => alert("위치 정보를 가져올 수 없습니다."));
            } else { alert("GPS 미지원"); }
        });
    }
}
