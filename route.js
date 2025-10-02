document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------
  // 地図初期化
  // -----------------------------
  const map = L.map('map').setView([35.3199, 139.5501], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // -----------------------------
  // 保存済みスポット取得
  // -----------------------------
  const step1Spot = JSON.parse(localStorage.getItem('step1Spot')); // 出発点
  const step2Spot = JSON.parse(localStorage.getItem('step2Spot')); // ゴール
  const hiddenSpot = JSON.parse(localStorage.getItem('hiddenSpot')); // 穴場

  const routeSpots = [];
  if (step1Spot?.lat && step1Spot?.lng) routeSpots.push(step1Spot);
  if (hiddenSpot?.lat && hiddenSpot?.lng) routeSpots.push(hiddenSpot);
  if (step2Spot?.lat && step2Spot?.lng) routeSpots.push(step2Spot);

  // -----------------------------
  // マーカー表示（出発点・穴場・ゴール）
  // -----------------------------
  routeSpots.forEach((spot, index) => {
    if (!spot?.lat || !spot?.lng) return;

    let popupContent = `<strong>${spot.name.ja}</strong><br>`;

    // 詳細情報表示（穴場とゴールも詳細ポップアップ）
    if (spot.description?.ja) popupContent += `<p>${spot.description.ja}</p>`;
    if (spot.img) popupContent += `<img src="${spot.img}" alt="${spot.name.ja}" style="width:120px;"><br>`;
    if (spot.website) popupContent += `<a href="${spot.website}" target="_blank">公式サイト</a><br>`;
    if (spot.reservation) popupContent += `<a href="${spot.reservation}" target="_blank">予約リンク</a>`;

    L.marker([spot.lat, spot.lng])
      .addTo(map)
      .bindPopup(popupContent);
  });

  // -----------------------------
  // ORS ルート表示
  // -----------------------------
  const orsApiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU4ZjE5YTkzYmJlNTRiYTI5MzgyMWNkNjAyM2M0NzRjIiwiaCI6Im11cm11cjY0In0=";
  const orsUrl = "https://api.openrouteservice.org/v2/directions/foot-walking";

  const coords = routeSpots.map(s => [s.lng, s.lat]); // ORSは [lng, lat] 順

  fetch(orsUrl, {
    method: "POST",
    headers: {
      "Authorization": orsApiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ coordinates: coords })
  })
    .then(res => res.json())
    .then(data => {
      const routeLatLngs = L.Polyline.fromEncoded(data.routes[0].geometry).getLatLngs();
      L.polyline(routeLatLngs, { color: 'blue', weight: 4 }).addTo(map);
      map.fitBounds(L.polyline(routeLatLngs).getBounds());
      console.log("距離:", data.routes[0].summary.distance, "m");
      console.log("所要時間:", data.routes[0].summary.duration, "秒");
    })
    .catch(err => console.error("ORSルート取得エラー:", err));

});
