document.addEventListener('DOMContentLoaded', () => {
  // 地図初期化
  const map = L.map('map').setView([35.3199, 139.5501], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 保存済みスポット取得
  const step1Spot = JSON.parse(localStorage.getItem('step1Spot'));
  const step2Spot = JSON.parse(localStorage.getItem('step2Spot'));
  const hiddenSpot = JSON.parse(localStorage.getItem('hiddenSpot'));

  const routeSpots = [];
  if (step1Spot?.lat && step1Spot?.lng) routeSpots.push(step1Spot);
  if (hiddenSpot?.lat && hiddenSpot?.lng) routeSpots.push(hiddenSpot);
  if (step2Spot?.lat && step2Spot?.lng) routeSpots.push(step2Spot);

  // マーカー表示
  routeSpots.forEach(spot => {
    if (!spot?.lat || !spot?.lng) return;

    let popupContent = `<strong>${spot.name.ja}</strong><br>`;
    if (spot.description?.ja) popupContent += `<p>${spot.description.ja}</p>`;
    if (spot.img) popupContent += `<img src="${spot.img}" alt="${spot.name.ja}" style="width:120px;"><br>`;
    if (spot.website) popupContent += `<a href="${spot.website}" target="_blank">公式サイト</a><br>`;
    if (spot.reservation) popupContent += `<a href="${spot.reservation}" target="_blank">予約リンク</a>`;

    L.marker([spot.lat, spot.lng]).addTo(map).bindPopup(popupContent);
  });

  // ORS ルート表示
  const orsApiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU4ZjE5YTkzYmJlNTRiYTI5MzgyMWNkNjAyM2M0NzRjIiwiaCI6Im11cm11cjY0In0=";
  const orsUrl = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

  const coords = routeSpots.map(s => [s.lng, s.lat]); // [lng, lat]

  if (coords.length >= 2) {
    fetch(orsUrl, {
      method: "POST",
      headers: {
        "Authorization": orsApiKey,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ coordinates: coords })
    })
      .then(res => res.json())
      .then(data => {
        console.log("ORS response:", data);

        if (!data.features || data.features.length === 0) {
          throw new Error("ORSレスポンスにルート情報がありません");
        }

        // GeoJSONとして地図に追加
        const geojsonLayer = L.geoJSON(data, {
          style: { color: "blue", weight: 4 }
        }).addTo(map);

        // 地図範囲をルートに合わせる
        map.fitBounds(geojsonLayer.getBounds());

        // 距離・時間は properties.summary にある場合があります
        const summary = data.features[0]?.properties?.summary;
        if (summary) {
          console.log("距離:", summary.distance, "m");
          console.log("所要時間:", summary.duration, "秒");
        }
      })
      .catch(err => console.error("ORSルート取得エラー:", err));
  } else {
    console.warn("ルートを描画するには2つ以上のスポットが必要です");
  }
});
