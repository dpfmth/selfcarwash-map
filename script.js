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
        console.error("지도 로딩 실패. HTML의 API키 및 도메인 설정을 확인하세요.", e);
        return;
    }

    // 전역 변수 설정
    let allData = [];
    let markers = [];
    let activeOverlay = null; // 현재 열린 정보창
    let activeFilter = 'all'; // 현재 필터 상태

    // === 2. GPS 자동 실행 (접속 시) ===
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                map.setCenter(loc);
            },
            () => console.log('위치 권한이 없거나 차단됨')
        );
    }

    // === 3. 데이터 로드 ===
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            createMarkers(allData);
        })
        .catch(err => console.error("데이터 로드 실패:", err));

    // === 4. 마커 생성 함수 ===
    function createMarkers(items) {
        markers.forEach(m => m.setMap(null)); // 기존 마커 삭제
        markers = [];

        items.forEach(item => {
            const pos = new kakao.maps.LatLng(item.lat, item.lng);
            const marker = new kakao.maps.Marker({
                position: pos,
                map: map,
                title: item.name
            });
            marker.data = item; // 데이터 저장

            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, 'click', () => {
                handleMarkerClick(marker, item);
            });
            markers.push(marker);
        });
        
        applyFilter(activeFilter); // 초기 필터 적용
    }

    // === 5. 마커 클릭 핸들러 (카드형 정보창 표시) ===
    function handleMarkerClick(clickedMarker, item) {
        // (1) 선택된 핀만 남기고 나머지 숨기기
        markers.forEach(m => m.setVisible(m === clickedMarker));
        map.panTo(clickedMarker.getPosition());

        if (activeOverlay) activeOverlay.setMap(null);

        // (2) DOM 요소로 카드 정보창 생성
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

        // HTML 조립
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

        // (3) 닫기 버튼 로직
        const closeBtn = contentNode.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            if (activeOverlay) activeOverlay.setMap(null);
            activeOverlay = null;
            applyFilter(activeFilter); // 지도 마커 복구
            
            // 모바일 시트 복구 (중간 위치로)
            const sidebar = document.getElementById('sidebar');
            if(sidebar) {
                sidebar.classList.remove('expanded');
                sidebar.classList.remove('collapsed');
            }
        });

        // (4) 오버레이 지도에 표시
        const overlay = new kakao.maps.CustomOverlay({
            position: clickedMarker.getPosition(),
            content: contentNode,
            yAnchor: 1
        });
        overlay.setMap(map);
        activeOverlay = overlay;

        // (5) 모바일 UX: 핀 클릭 시 바텀시트 내리기 (지도 확보)
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
        }
    }

// 6. 지도 빈 곳 클릭 (초기화 및 UI 숨기기)
    kakao.maps.event.addListener(map, 'click', () => {
        // (1) 열려있는 말풍선(오버레이) 닫기
        if (activeOverlay) {
            activeOverlay.setMap(null);
            activeOverlay = null;
        }
        
        // (2) 모바일: 올라와 있던 목록창을 아래로 내리기
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            // 'expanded' 클래스를 제거하면 -> 검색창만 보이는 높이(기본)로 내려갑니다.
            sidebar.classList.remove('expanded');
            
            // 만약 지도 볼 때 검색창도 거슬린다면 아래 주석을 해제하세요 (더 납작하게 만듦)
            // sidebar.classList.add('collapsed'); 
        }

        // (3) 키보드 내리기 (검색하다가 지도 누르면 키보드 사라지게)
        const searchInput = document.getElementById('search-keyword');
        if(searchInput) {
            searchInput.blur(); // 포커스 해제
        }
    });

    // === 7. 필터 및 검색 로직 ===
    function applyFilter(type) {
        activeFilter = type;
        const keywordInput = document.getElementById('search-keyword');
        const keyword = keywordInput ? keywordInput.value.trim() : "";

        markers.forEach(marker => {
            const item = marker.data;
            let isVisible = true;
            if (type !== 'all' && item.type !== type) isVisible = false;
            if (keyword && !item.name.includes(keyword) && !(item.address && item.address.includes(keyword))) {
                isVisible = false;
            }
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

    // === 8. 검색 실행 ===
    function performSearch() {
        const keywordInput = document.getElementById('search-keyword');
        const keyword = keywordInput ? keywordInput.value.trim() : "";
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

        // 검색 시 모바일 시트 올리기
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
        
        // 모바일: 검색창 포커스 시 시트 확장
        searchInput.addEventListener('focus', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if(sidebar) {
                    sidebar.classList.add('expanded');
                    sidebar.classList.remove('collapsed');
                }
            }
        });
    }

    // === 9. 모바일 핸들바 제스처 (클릭 & 스와이프) ===
    const handle = document.querySelector('.mobile-handle-area');
    const sidebar = document.getElementById('sidebar');

    if(handle && sidebar) {
        // (1) 클릭 토글 (스와이프 안했을 때)
        let isSwipe = false;

        handle.addEventListener('click', () => {
            if (isSwipe) return; // 스와이프 동작이었으면 클릭 무시

            if (sidebar.classList.contains('expanded')) {
                sidebar.classList.remove('expanded');
            } else if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            } else {
                sidebar.classList.add('expanded');
            }
        });

        // (2) 스와이프 로직
        let startY = 0;

        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isSwipe = false;
        }, {passive: true});

        handle.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const distance = startY - endY; // 양수: 위로, 음수: 아래로

            // 30px 이상 움직이면 스와이프로 간주
            if (Math.abs(distance) > 30) {
                isSwipe = true; // 클릭 이벤트 방지용 플래그

                if (distance > 0) {
                    // ▲ 위로 쓸어올림 -> 확장
                    sidebar.classList.add('expanded');
                    sidebar.classList.remove('collapsed');
                } else {
                    // ▼ 아래로 쓸어내림
                    if (sidebar.classList.contains('expanded')) {
                        sidebar.classList.remove('expanded'); // 중간으로
                    } else {
                        sidebar.classList.add('collapsed'); // 바닥으로
                    }
                }
            }
        });
    }

    // === 10. GPS 버튼 (수동) ===
    const gpsBtn = document.getElementById('gps-btn');
    if(gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                    map.setCenter(loc);
                    map.setLevel(5);
                }, () => alert("위치 정보를 가져올 수 없습니다."));
            } else {
                alert("GPS를 지원하지 않습니다.");
            }
        });
    }
}

