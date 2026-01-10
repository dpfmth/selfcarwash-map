// 1. 지도 생성
var container = document.getElementById('map');
var options = {
    center: new kakao.maps.LatLng(36.5, 127.5), // 전국이 다 보이게 중심 설정
    level: 13 // 전국 뷰 레벨
};
var map = new kakao.maps.Map(container, options);

// 2. 마커 이미지를 담을 변수 (유형별 색상 구분 등 필요시 사용)
// 일단 기본 마커를 사용하거나 커스텀 이미지가 있다면 여기에 정의

// 3. 인포윈도우 (하나만 만들어서 재사용 - 클릭할 때마다 내용만 바뀜)
var infowindow = new kakao.maps.InfoWindow({
    zIndex: 1,
    removable: true
});


// 4. 데이터 불러오기 및 마커 생성 (핵심 부분)
fetch('./data.json')
    .then(response => response.json())
    .then(washData => {
        console.log("데이터 로드 성공, 총 개수:", washData.length);

        // 데이터 개수만큼 반복하며 마커 생성
        washData.forEach(shop => {
            
            // 위도, 경도로 위치 객체 생성
            var position = new kakao.maps.LatLng(shop.lat, shop.lng);

            // 마커 생성
            var marker = new kakao.maps.Marker({
                map: map,
                position: position,
                title: shop.name // 마우스 올리면 이름 나옴
            });

            // 마커 클릭 이벤트 리스너 추가
            kakao.maps.event.addListener(marker, 'click', function() {
                
                // 인포윈도우에 들어갈 HTML 내용 구성
                var content = `
                    <div style="padding:10px; min-width:200px; font-size:14px;">
                        <h4 style="margin:0 0 5px 0;">${shop.name}</h4>
                        <p style="margin:5px 0;">
                            <b>유형:</b> ${getTypeName(shop.type)}<br>
                            <b>영업시간:</b> ${shop.time}<br>
                            ${shop.foam !== null ? `<b>폼건:</b> ${shop.foam ? '있음' : '없음'}` : ''}
                        </p>
                    </div>
                `;

                // 인포윈도우 내용 설정 및 열기
                infowindow.setContent(content);
                infowindow.open(map, marker);
            });
        });

    })
    .catch(error => {
        console.error("데이터 로드 실패! data.json 파일이 있는지 확인하세요.", error);
        alert("데이터를 불러오지 못했습니다. 로컬 파일(file://)이 아닌 서버(GitHub 등)에서 실행하세요.");
    });


// [보조 함수] 영문 타입 코드를 한글로 변환
function getTypeName(typeCode) {
    if (typeCode === 'self') return '셀프세차';
    if (typeCode === 'notouch') return '노터치/자동';
    if (typeCode === 'detailing') return '디테일링/광택';
    if (typeCode === 'hand') return '손세차';
    return typeCode;
}
