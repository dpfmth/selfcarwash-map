if (typeof kakao === "undefined") {
  console.error("❌ kakao 객체 없음 — SDK 미로드");
} else {
  console.log("✅ kakao 객체 정상");

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
}
