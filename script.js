document.addEventListener('DOMContentLoaded', () => {
    // [핵심] HTML에 &autoload=false를 넣었으므로, 
    // 여기서 load 함수를 통해 안전하게 실행합니다.
    kakao.maps.load(() => {
        initMap();
    });
});

function initMap() {
    // 1. 지도 생성
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567), // 서울시청 (기본값)
        level: 7 // 확대 레벨
    };

    let map;
    try {
        map = new kakao.maps.Map(mapContainer, mapOption);
    } catch (e) {
        console.error("지도 로딩 실패: API 키, 도메인 등록, 프로토콜(http/https) 확인 필요", e);
        return;
    }

    // 전역 변수 설정
    let allData = [];
    let markers = [];
    let activeOverlay = null; // 현재 켜져있는 말풍선
    let activeFilter = 'all'; // 현재 필터 (all / self / notouch)

    // 2. 접속 시 GPS 자동 실행
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const loc = new kakao.maps.LatLng(lat, lng);
                map.setCenter(loc);
            },
            () => console.log('위치 정보를 가져올 수 없습니다.')
        );
    }

    // 3. 데이터 불러오기
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            createMarkers(allData); // 데이터 로드 후 마커 바로 생성
        })
        .catch(err => console.error("JSON 파일 로드 실패:", err));

    // 4. 마커 생성 및 관리
    function createMarkers(items) {
        // 기존 마커 모두 삭제
        markers.forEach(m => m.setMap(null));
        markers = [];

        items.forEach(item => {
            const pos = new kakao.maps.LatLng(item.lat, item.lng);
            
            const marker = new kakao.maps.Marker({
                position: pos,
                map: map,
                title: item.name
            });

            marker.data = item; // 검색/필터링을 위해 데이터 저장

            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, 'click', () => {
                handleMarkerClick(marker, item);
            });

            markers.push(marker);
        });

        // 생성 직후 현재 필터 상태 반영
        applyFilter(activeFilter);
    }

    // 5. 마커 클릭 핸들러 (핀 클릭 시 동작)
    function handleMarkerClick(clickedMarker, item) {
        // (1) 선택된 핀만 남기고 나머지 숨김 (하이라이트 효과)
        markers.forEach(m => {
            m.setVisible(m === clickedMarker);
        });

        // (2) 지도 중심 이동
        map.panTo(clickedMarker.getPosition());

        // (3) 말풍선(오버레이) 표시
        if (activeOverlay) activeOverlay.setMap(null);

        const content = `
            <div class="custom-overlay">
                <div class="overlay-name">${item.name}</div>
                <div class="overlay-price">${item.type === 'self' ? '셀프' : '노터치'} | ${item.price.toLocaleString()}원~</div>
            </div>
        `;

        const overlay = new kakao.maps.CustomOverlay({
            position: clickedMarker.getPosition(),
            content: content,
            yAnchor: 1
        });

        overlay.setMap(map);
        activeOverlay = overlay;

        // (4) 모바일 UX: 핀을 보려면 목록창(바텀시트)이 내려가야 함
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
        }
    }

    // 6. 지도 빈 곳 클릭 (초기화)
    kakao.maps.event.addListener(map, 'click', () => {
        // 오버레이 닫기
        if (activeOverlay) {
            activeOverlay.setMap(null);
            activeOverlay = null;
        }
        
        // 숨겼던 마커들 다시 필터 조건에 맞춰 보이기
        applyFilter(activeFilter);

        // 모바일 UX: 목록창 상태 초기화 (살짝 올라온 상태)
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.remove('collapsed');
        }
    });

    // 7. 필터링 로직 (탭 + 검색어)
    function applyFilter(type) {
        activeFilter = type;
        const keywordInput = document.getElementById('search-keyword');
        const keyword = keywordInput ? keywordInput.value.trim() : "";

        markers.forEach(marker => {
            const item = marker.data;
            let isVisible = true;

            // 탭 조건 (전체 or 셀프 or 노터치)
            if (type !== 'all' && item.type !== type) isVisible = false;

            // 검색어 조건 (이름 or 주소)
            if (keyword && !item.name.includes(keyword) && !(item.address && item.address.includes(keyword))) {
                isVisible = false;
            }

            marker.setVisible(isVisible);
        });
    }

    // 8. 탭 버튼 클릭 이벤트
    const filterBtns = document.querySelectorAll('.filter-tabs button');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-tabs .active').classList.remove('active');
            btn.classList.add('active');
            
            applyFilter(btn.dataset.type);
        });
    });

    // 9. 검색 기능
    const searchInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');

    function performSearch() {
        const keyword = searchInput.value.trim();
        const listEl = document.getElementById('place-list');
        const sidebar = document.getElementById('sidebar');

        // 검색어 없으면 안내 문구
        if (!keyword) {
            listEl.innerHTML = `
                <div class="empty-message">
                    <p>원하는 지역이나<br>세차장 이름을 검색해보세요.</p>
                </div>`;
            applyFilter(activeFilter); // 지도는 필터 상태 유지
            return;
        }

        // 검색 결과 필터링 (리스트용)
        const results = allData.filter(item => {
            const typeMatch = activeFilter === 'all' || item.type === activeFilter;
            const nameMatch = item.name.includes(keyword) || (item.address && item.address.includes(keyword));
            return typeMatch && nameMatch;
        });

        // 리스트 그리기
        renderList(results);
        
        // 지도 마커 동기화
        applyFilter(activeFilter);

        // 모바일 UX: 검색했으니 결과를 보여주기 위해 창을 올림
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
                </div>
            `;
            // 리스트 클릭 시 해당 핀으로 이동
            el.addEventListener('click', () => {
                const targetMarker = markers.find(m => m.data.id === item.id);
                if (targetMarker) handleMarkerClick(targetMarker, item);
            });
            listEl.appendChild(el);
        });
    }

    // 검색 이벤트 바인딩
    if(searchInput && searchBtn) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        searchBtn.addEventListener('click', performSearch);
        
        // 모바일: 검색창 터치 시 키보드가 올라오므로 창을 확장
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

    // 10. 모바일 핸들바 토글 (클릭으로 열고 닫기)
    const handle = document.querySelector('.mobile-handle-area');
    if(handle) {
        handle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('expanded')) {
                sidebar.classList.remove('expanded'); // 중간 상태로 복귀
            } else {
                sidebar.classList.add('expanded'); // 완전 확장
                sidebar.classList.remove('collapsed');
            }
        });
    }

    // 11. GPS 버튼 (수동)
    const gpsBtn = document.getElementById('gps-btn');
    if(gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                    map.setCenter(loc);
                    map.setLevel(5);
                }, () => {
                    alert("위치 정보를 가져올 수 없습니다.");
                });
            } else {
                alert("GPS를 지원하지 않는 브라우저입니다.");
            }
        });
    }
}
