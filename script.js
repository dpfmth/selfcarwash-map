document.addEventListener('DOMContentLoaded', () => {
    // === 1. 지도 생성 (Container 높이 확보 후 생성) ===
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 7
    };
    
    let map = new kakao.maps.Map(mapContainer, mapOption);
    
    // 데이터 및 마커 관리를 위한 변수
    let allData = [];
    let markers = []; 
    let activeOverlay = null; // 현재 떠있는 버블
    let activeFilter = 'all'; // 현재 필터 상태

    // === 2. GPS 자동 실행 ===
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const loc = new kakao.maps.LatLng(lat, lng);
                map.setCenter(loc);
            },
            () => console.log('GPS 권한 없음')
        );
    }

    // === 3. JSON 데이터 로드 ===
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            // 초기: 모든 마커 생성 (보이게 할지는 필터 로직에서 결정)
            createMarkers(allData);
        });

    // === 4. 마커 생성 및 관리 함수 ===
    function createMarkers(items) {
        // 기존 마커 제거
        markers.forEach(m => m.setMap(null));
        markers = [];

        items.forEach(item => {
            const pos = new kakao.maps.LatLng(item.lat, item.lng);
            
            // 마커 이미지 (선택사항)
            // const imageSrc = 'marker_url.png'; 
            // const imageSize = new kakao.maps.Size(24, 35); 
            // const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

            const marker = new kakao.maps.Marker({
                position: pos,
                map: map, // 지도에 표시
                title: item.name
            });

            // 마커 객체에 커스텀 데이터 저장
            marker.data = item;

            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, 'click', () => {
                handleMarkerClick(marker, item);
            });

            markers.push(marker);
        });
        
        applyFilter(activeFilter); // 필터 적용
    }

    // === 5. 마커 클릭 핸들러 (요구사항 #7) ===
    function handleMarkerClick(clickedMarker, item) {
        // 1. 다른 마커 숨기기 (선택된 것만 남김)
        markers.forEach(m => {
            if (m === clickedMarker) {
                m.setVisible(true);
            } else {
                m.setVisible(false);
            }
        });

        // 2. 지도 이동
        map.panTo(clickedMarker.getPosition());

        // 3. 커스텀 오버레이 표시
        if (activeOverlay) activeOverlay.setMap(null);

        const content = `
            <div class="custom-overlay">
                <span class="overlay-name">${item.name}</span>
                <span class="overlay-price">${item.type === 'self' ? '셀프' : '노터치'} | ${item.price.toLocaleString()}원~</span>
            </div>
        `;

        const overlay = new kakao.maps.CustomOverlay({
            position: clickedMarker.getPosition(),
            content: content,
            yAnchor: 1
        });

        overlay.setMap(map);
        activeOverlay = overlay;

        // 모바일: 핀 클릭시 사이드바 내리기
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
    }

    // 지도 빈 곳 클릭 시 "리셋" (모든 마커 다시 보이기 + 오버레이 닫기)
    kakao.maps.event.addListener(map, 'click', () => {
        if (activeOverlay) {
            activeOverlay.setMap(null);
            activeOverlay = null;
        }
        // 필터 상태에 맞춰 다시 마커 보이기
        applyFilter(activeFilter);
        
        // 모바일: 사이드바 살짝 올리기 (기본 상태)
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('expanded');
        sidebar.classList.remove('collapsed');
    });

    // === 6. 필터링 로직 (탭 & 검색) ===
    function applyFilter(type) {
        activeFilter = type;
        const keyword = document.getElementById('search-keyword').value.trim();

        markers.forEach(marker => {
            const item = marker.data;
            let isVisible = true;

            // 1. 탭 필터 체크
            if (type !== 'all' && item.type !== type) isVisible = false;

            // 2. 검색어 필터 체크 (검색어가 있을 때만)
            if (keyword && !item.name.includes(keyword) && !item.address?.includes(keyword)) {
                isVisible = false;
            }

            marker.setVisible(isVisible);
        });
    }

    // 탭 버튼 클릭 이벤트
    const filterBtns = document.querySelectorAll('.filter-tabs button');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-tabs .active').classList.remove('active');
            btn.classList.add('active');
            applyFilter(btn.dataset.type);
        });
    });

    // === 7. 검색 기능 (리스트 렌더링) ===
    const searchInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');

    function performSearch() {
        const keyword = searchInput.value.trim();
        const listEl = document.getElementById('place-list');
        const sidebar = document.getElementById('sidebar');

        // 요구사항 #5: 검색 전엔 아무것도 안 나옴 (초기 상태 유지)
        if (!keyword) {
            listEl.innerHTML = '<div class="empty-message">검색어를 입력해주세요.</div>';
            applyFilter(activeFilter); // 마커는 필터 상태 유지
            return;
        }

        // 데이터 필터링 (리스트용)
        const results = allData.filter(item => {
            // 탭 필터 + 검색어 모두 만족해야 함
            const typeMatch = activeFilter === 'all' || item.type === activeFilter;
            const nameMatch = item.name.includes(keyword) || (item.address && item.address.includes(keyword));
            return typeMatch && nameMatch;
        });

        // 리스트 렌더링
        renderList(results);
        
        // 지도 마커도 동기화
        applyFilter(activeFilter);

        // 모바일: 검색 시 사이드바 확장
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
    }

    function renderList(items) {
        const listEl = document.getElementById('place-list');
        listEl.innerHTML = '';

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
            el.addEventListener('click', () => {
                // 리스트 아이템 클릭 시 해당 마커 클릭 핸들러 트리거
                const targetMarker = markers.find(m => m.data.id === item.id);
                if (targetMarker) handleMarkerClick(targetMarker, item);
            });
            listEl.appendChild(el);
        });
    }

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    searchBtn.addEventListener('click', performSearch);

    // === 8. 모바일 인터랙션 (바텀 시트) ===
    const sidebar = document.getElementById('sidebar');
    const handle = document.querySelector('.mobile-handle-area');

    // 핸들 클릭 시 토글
    handle.addEventListener('click', () => {
        if (sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
        } else {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
        }
    });

    // 검색창 포커스 시 확장
    searchInput.addEventListener('focus', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
        }
    });

    // GPS 버튼
    document.getElementById('gps-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                map.setCenter(loc);
                map.setLevel(5);
            });
        } else {
            alert("GPS를 지원하지 않습니다.");
        }
    });
});
