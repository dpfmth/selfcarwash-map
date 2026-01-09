const map = new kakao.maps.Map(
  document.getElementById("map"),
  {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  }
);

const marker = new kakao.maps.Marker({
  position: new kakao.maps.LatLng(37.5665, 126.9780)
});

marker.setMap(map);
