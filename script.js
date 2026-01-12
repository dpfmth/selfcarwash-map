document.addEventListener('DOMContentLoaded', function() {
    
    // 1. 지도 초기화
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567), // 기본 위치: 서울시청
        level: 3
    };
    
    let map;
    try {
        map = new kakao.maps.Map(container, options);
        // 줌 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
    } catch (e) {
        console.error("Kakao Map Load Failed:", e);
    }

    // 2. JSON 데이터 불러오기 및 리스트 생성
    fetch('./data.json')
        .then(response => response.json())
        .then(data => {
            const listContainer = document.getElementById('placeList');
            
            data.forEach(place => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="place-name">${place.name}</div>
                    <div class="place-addr">${place.address}</div>
                `;
                
                // 리스트 클릭 시 지도 이동 이벤트
                item.addEventListener('click', () => {
                    if (map) {
                        const moveLatLon = new kakao.maps.LatLng(place.lat, place.lng);
                        map.panTo(moveLatLon);
                        
                        // 마커 표시
                        new kakao.maps.Marker({
                            map: map,
                            position: moveLatLon
                        });
                    }
                });

                listContainer.appendChild(item);
            });
        })
        .catch(error => console.error('Error loading JSON:', error));

    // 3. GPS 기능
    const gpsBtn = document.getElementById('gpsButton');
    gpsBtn.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                if(map) {
                    const locPosition = new kakao.maps.LatLng(lat, lon);
                    map.setCenter(locPosition);
                    
                    // 현재 위치 마커 (단순화)
                    new kakao.maps.Marker({
                        map: map,
                        position: locPosition
                    });
                }
            }, function(error) {
                console.error(error);
                alert("위치 정보를 가져올 수 없습니다.");
            });
        } else {
            alert("GPS를 지원하지 않는 브라우저입니다.");
        }
    });

    // 4. 필터 버튼 UI 액션
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // 추후 필터링 로직 추가 가능
        });
    });
});
