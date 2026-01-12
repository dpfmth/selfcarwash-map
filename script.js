document.addEventListener('DOMContentLoaded', () => {
    // [핵심] 카카오 지도 SDK가 로드된 후 실행하도록 감쌉니다.
    // HTML script 태그에 &autoload=false 가 필수입니다.
    kakao.maps.load(() => {
        initMap();
    });
});

function initMap() {
    // 1. 지도 생성
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567), // 기본 위치 (서울시청)
        level: 7
    };

    let map;
    try {
        map = new kakao.maps.Map(mapContainer, mapOption);
    } catch (e) {
        console.error("지도 로드 실패: API 키 또는 도메인 등록 확인 필요", e);
        return;
    }

    // 상태 관리 변수
    let allData = [];       // 전체 데이터 저장
    let markers = [];       // 지도에 찍힌 마커들 관리
    let activeOverlay = null; // 현재 떠 있는 말풍선
    let activeFilter = 'all'; // 현재 탭 필터 (all, self, notouch)

    // 2. GPS 자동 실행 (접속 시 내 위치로 이동)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const loc = new kakao.maps.LatLng(lat, lng);
                map.setCenter(loc);
            },
            () => console.log('위치 정보 권한이 없거나 차단되었습니다.')
        );
    }

    // 3. 데이터 로드
    fetch('./data.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            // 로드 되자마자 마커 생성 (화면엔 전체가 보임)
            createMarkers(allData);
        })
        .catch(err => console.error("JSON 로드 실패:", err));

    // 4. 마커 생성 함수
    function createMarkers(items) {
        // 기존 마커 싹 지우기
        markers.forEach(m => m.setMap(null));
        markers = [];

        items.forEach(item => {
            const pos = new kakao.maps.LatLng(item.lat, item.lng);
            
            // 마커 객체 생성
            const marker = new kakao.maps.Marker({
                position: pos,
                map: map,
                title: item.name
            });

            // 필터링을 위해 마커에 데이터 심어두기
            marker.data = item; 

            // 마커 클릭 이벤트 연결
            kakao.maps.event.addListener(marker, 'click', () => {
                handleMarkerClick(marker, item);
            });

            markers.push(marker);
        });
        
        // 현재 필터 상태 적용 (초기화)
        applyFilter(activeFilter);
    }

    // 5. 마커 클릭 핸들러 (핀 클릭 시 동작)
    function handleMarkerClick(clickedMarker, item) {
        // (1) 선택된 핀만 남기고 나머지 숨기기
        markers.forEach(m => {
            m.setVisible(m === clickedMarker);
        });

        // (2) 지도 중심 이동
        map.panTo(clickedMarker.getPosition());

        // (3) 기존 말풍선 닫고 새로 열기
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

        // (4) 모바일: 핀을 클릭했으니 목록창(바텀시트)을 아래로 내림
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
        }
    }

    // 6. 지도 빈 곳 클릭 이벤트 (초기화)
    kakao.maps.event.addListener(map, 'click', () => {
        // 말풍선 닫기
        if (activeOverlay) {
            activeOverlay.setMap(null);
            activeOverlay = null;
        }
        
        // 숨겨진 핀들 다시 보여주기 (현재 필터 조건에 맞는 것들만)
        applyFilter(activeFilter); 

        // 모바일: 목록창 상태 초기화
        const sidebar = document.getElementById('sidebar');
        if(sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.remove('collapsed');
        }
    });

    // 7. 통합 필터링 함수 (탭 + 검색어)
    function applyFilter(type) {
        activeFilter = type;
        const keywordInput = document.getElementById('search-keyword');
        const keyword = keywordInput ? keywordInput.value.trim() : "";

        markers.forEach(marker => {
            const item = marker.data;
            let isVisible = true;

            // (1) 탭 조건 확인
            if (type !== 'all' && item.type !== type) isVisible = false;
            
            // (2) 검색어 조건 확인 (검색어가 있을 때만)
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
            // UI 변경
            document.querySelector('.filter-tabs .active').classList.remove('active');
            btn.classList.add('active');
            
            // 필터 적용
            applyFilter(btn.dataset.type);
        });
    });

    // 9. 검색 기능 수행
    const searchInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');

    function performSearch() {
        const keyword = searchInput.value.trim();
        const listEl = document.getElementById('place-list');
        const sidebar = document.getElementById('sidebar');

        // 검색어가 없으면 안내 문구 표시 (지도는 현재 필터 유지)
        if (!keyword) {
            listEl.innerHTML = '<div class="empty-message">원하는 지역이나<br>세차장 이름을 검색해보세요.</div>';
            applyFilter(activeFilter);
            return;
        }

        // 데이터 필터링 (리스트 표시용)
        const results = allData.filter(item => {
            const typeMatch = activeFilter === 'all' || item.type === activeFilter;
            const nameMatch = item.name.includes(keyword) || (item.address && item.address.includes(keyword));
            return typeMatch && nameMatch;
        });

        // 리스트 그리기
        renderList(results);
        
        // 지도 마커도 검색어에 맞춰 필터링
        applyFilter(activeFilter);

        // 모바일: 검색했으니 목록창을 위로 올림
        if(sidebar) {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
        }
    }

    // 리스트 렌더링 함수
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
            
            // 리스트 항목 클릭 시 해당 핀 클릭 효과 트리거
            el.addEventListener('click', () => {
                const targetMarker = markers.find(m => m.data.id === item.id);
                if (targetMarker) {
                    handleMarkerClick(targetMarker, item);
                }
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
        
        // 모바일: 검색창 터치 시 목록창 올리기
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

    // 10. 모바일 핸들바 (드래그 대신 클릭 토글로 심플하게 구현)
    const handle = document.querySelector('.mobile-handle-area');
    if(handle) {
        handle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('expanded')) {
                sidebar.classList.remove('expanded');
            } else {
                sidebar.classList.add('expanded');
                sidebar.classList.remove('collapsed');
            }
        });
    }

    // 11. GPS 버튼 (수동 이동)
    const gpsBtn = document.getElementById('gps-btn');
    if(gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                    map.setCenter(loc);
                    map.setLevel(5);
                });
            } else {
                alert("위치 정보를 사용할 수 없습니다.");
            }
        });
    }
}
