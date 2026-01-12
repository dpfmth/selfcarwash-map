document.addEventListener('DOMContentLoaded', () => {
    // 1. 카카오맵 로드 (HTML에 &autoload=false 필수)
    kakao.maps.load(() => {
        initMap();
    });
});

function initMap() {
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 7
    };

    let map;
    try {
        map = new kakao.maps.Map(mapContainer, mapOption);
    } catch (e) {
        console.error("지도 로딩 실패. API키 및 도메인을 확인하세요.", e);
        return;
    }

    let allData = [];
    let markers = [];
    let activeOverlay = null;
    let activeFilter = 'all';

    // 2. GPS 자동 실행
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            map.setCenter(loc);
        });
    }

    // 3. 데이터 로드
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            createMarkers(allData);
        })
        .catch(err => console.error("데이터 로드 실패:", err));

    // 4. 마커 생성
    function createMarkers(items) {
        markers.forEach(m => m.setMap(null));
        markers = [];

        items.forEach(item => {
            const pos = new kakao.maps.LatLng(item.lat, item.lng);
            const marker = new kakao.maps.Marker({
                position: pos,
                map: map,
                title: item.name
            });
            marker.data = item;
            
            kakao.maps.event.addListener(marker, 'click', () => {
                handleMarkerClick(marker, item);
            });
            markers.push(marker);
        });
        applyFilter(activeFilter);
    }

    // 5. [핵심] 핀 클릭 시 카드형 정보창 표시
    function handleMarkerClick(clickedMarker, item) {
        // 선택된 핀만 보기
        markers.forEach(m => m.setVisible(m === clickedMarker));
        map.panTo(clickedMarker.getPosition());

        if (activeOverlay) activeOverlay.setMap(null);

        // 카드 HTML 조립
        const contentNode = document.createElement('div');
        contentNode.className = 'overlay-card';

        // 데이터 가공
        const typeText = item.type === 'self' ? '셀프세차' : '노터치/자동';
        const phoneText = item.phone || '전화번호 없음';
        const bookingText = item.booking || '비예약제';
        
        // 태그 생성
        let tagsHtml = '';
        if (item.personal) tagsHtml += `<span class="feature-tag personal">개인용품</span>`;
        if (item.foam) tagsHtml += `<span class="feature-tag foam">폼랜스</span>`;

        contentNode.innerHTML = `
            <div class="card-header">
                <h3>${item.name}</h3>
                <button class="close-btn" title="닫기">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <span class="type-badge">${typeText}</span>
            <div class="info-row">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>${phoneText}</span>
            </div>
            <div class="info-row">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${bookingText}</span>
            </div>
            <div class="tag-row">${tagsHtml}</div>
        `;

        // 닫기 버튼 로직
        const closeBtn = contentNode.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            if (activeOverlay) activeOverlay.setMap(null);
            activeOverlay = null;
            applyFilter(activeFilter); // 지도 원상복구
            
            // 모바일 시트 복구
            const sidebar = document.getElementById('sidebar');
            if(sidebar) {
                sidebar.classList.remove('expanded');
                sidebar.classList.remove('collapsed');
            }
        });

        // 오버레이 등록
        const overlay = new kakao.maps.CustomOverlay({
            position: clickedMarker.getPosition(),
            content: contentNode,
            yAnchor: 1
        });
        overlay.setMap(map);
        activeOverlay = overlay;

        // 모바일: 핀 클릭 시 바텀시트 내리기
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
        }
    }

    // 6. 지도 빈 곳 클릭 (초기화)
    kakao.maps.event.addListener(map, 'click', () => {
        if (activeOverlay) {
            activeOverlay.setMap(null);
            activeOverlay = null;
        }
        applyFilter(activeFilter);
        
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.remove('collapsed');
        }
    });

    // 7. 필터 및 검색
    function applyFilter(type) {
        activeFilter = type;
        const keyword = document.getElementById('search-keyword').value.trim();

        markers.forEach(marker => {
            const item = marker.data;
            let isVisible = true;
            if (type !== 'all' && item.type !== type) isVisible = false;
            if (keyword && !item.name.includes(keyword) && !(item.address?.includes(keyword))) isVisible = false;
            marker.setVisible(isVisible);
        });
    }

    const filterBtns = document.querySelectorAll('.filter-tabs button');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-tabs .active').classList.remove('active');
            btn.classList.add('active');
            applyFilter(btn.dataset.type);
        });
    });

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
            const nameMatch = item.name.includes(keyword) || (item.address?.includes(keyword));
            return typeMatch && nameMatch;
        });

        renderList(results);
        applyFilter(activeFilter);
        
        if(sidebar) {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
        }
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

    const handle = document.querySelector('.mobile-handle-area');
    if(handle) {
        handle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('expanded')) { sidebar.classList.remove('expanded'); } 
            else { sidebar.classList.add('expanded'); sidebar.classList.remove('collapsed'); }
        });
    }

    const gpsBtn = document.getElementById('gps-btn');
    if(gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                    map.setCenter(loc); map.setLevel(5);
                });
            } else { alert("위치 정보를 사용할 수 없습니다."); }
        });
    }
}
