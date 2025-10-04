document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1w5waa7_xUlB-_wt0TfLhDw48ehg86yl6/gviz/tq?sheet=穴場&headers=1&tq=";
  const spotContainer = document.getElementById('spotContainer');
  const nextBtn = document.getElementById('nextBtn');
  let currentLang = 'ja';
  let recommendedSpots = [];
  const langButtons = document.querySelectorAll('#language-switcher button');

  const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
  const step1Spot = JSON.parse(localStorage.getItem('step1Spot') || 'null');
  const step2Spot = JSON.parse(localStorage.getItem('step2Spot') || 'null'); // ✅ ゴール地点

  const genreMap = {
    "歴史・寺社・文化": "History",
    "自然・景観": "Nature",
    "グルメ・カフェ": "Food",
    "お土産・雑貨": "Shopping",
    "体験・アクティビティ": "Activity"
  };
  const selectedGenre = genreMap[userAttributes.interests] || userAttributes.interests;
  const maxDistanceKm = 2;

  // 🌍 ラベルを全言語で定義（「約」「分」含む）
  const labels = {
    ja: {
      hours: '営業時間', cool: '涼しさ', website: '公式サイト', reservation: '予約リンク',
      distance: 'スタートからの距離', totalRoute: 'ゴールまでの総距離',
      walk: '徒歩', about: '約', unitKm: 'km', unitMin: '分'
    },
    en: {
      hours: 'Opening Hours', cool: 'Cool Level', website: 'Official Site', reservation: 'Reservation Link',
      distance: 'Distance from Start', totalRoute: 'Total Distance to Goal',
      walk: 'Walk', about: 'approx.', unitKm: 'km', unitMin: 'min'
    },
    cn: {
      hours: '营业时间', cool: '凉爽度', website: '官网', reservation: '预约链接',
      distance: '从起点的距离', totalRoute: '到终点的总距离',
      walk: '步行', about: '约', unitKm: '公里', unitMin: '分钟'
    }
  };

  function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  fetch(sheetURL)
    .then(res => res.text())
    .then(data => {
      const json = JSON.parse(data.substr(47).slice(0, -2));
      const rows = json.table.rows;

      const allSpots = rows.map(row => {
        const latLngString = row.c[8]?.v || "0,0";
        const [lat, lng] = latLngString.split(',').map(coord => parseFloat(coord.trim()));

        return {
          genre: row.c[0]?.v || '',
          name: { ja: row.c[1]?.v || '', en: row.c[2]?.v || '', cn: row.c[3]?.v || '' },
          img: row.c[4]?.v || '',
          description: { ja: row.c[5]?.v || '', en: row.c[6]?.v || '', cn: row.c[7]?.v || '' },
          lat, lng,
          coolLevel: row.c[9]?.v || '',
          openingHours: row.c[10]?.v || '',
          website: row.c[14]?.v || '',
          reservation: row.c[15]?.v || ''
        };
      });

      const filteredSpots = allSpots
        .filter(s => s.genre === selectedGenre)
        .map(s => {
          if (step1Spot?.lat && s.lat) {
            const distanceFromStart = getDistance(step1Spot.lat, step1Spot.lng, s.lat, s.lng);
            const distanceToGoal = step2Spot?.lat ? getDistance(s.lat, s.lng, step2Spot.lat, step2Spot.lng) : 0;
            const totalRouteDistance = distanceFromStart + distanceToGoal;
            return { ...s, distanceFromStart, totalRouteDistance };
          }
          return s;
        })
        .filter(s => s.distanceFromStart !== undefined && s.distanceFromStart <= maxDistanceKm);

      if (filteredSpots.length === 0) {
        spotContainer.innerHTML = `<p>条件に合うスポットが見つかりませんでした。</p>`;
        nextBtn.style.display = 'none';
        return;
      }

      recommendedSpots = filteredSpots.sort((a,b) => a.distanceFromStart - b.distanceFromStart).slice(0, 4);
      displaySpots(recommendedSpots);
    })
    .catch(err => {
      console.error("穴場スポット取得失敗:", err);
      spotContainer.innerHTML = "<p>データを読み込めませんでした</p>";
    });

  function displaySpots(spotsToDisplay) {
    spotContainer.innerHTML = '';
    const l = labels[currentLang];

    spotsToDisplay.forEach(spot => {
      const div = document.createElement('div');
      div.className = 'spot-item';

      const walkMinutes = Math.round(spot.distanceFromStart * 15);
      const totalWalkMinutes = Math.round(spot.totalRouteDistance * 15);

      let detailsHtml = `
        <p class="spot-description">${spot.description[currentLang] || spot.description.ja}</p>
      `;
      if (spot.openingHours) detailsHtml += `<p><strong>${l.hours}:</strong> ${spot.openingHours}</p>`;
      if (spot.coolLevel) detailsHtml += `<p><strong>${l.cool}:</strong> ${spot.coolLevel}</p>`;
      if (spot.website) detailsHtml += `<p><a href="${spot.website}" target="_blank">${l.website}</a></p>`;
      if (spot.reservation) detailsHtml += `<p><a href="${spot.reservation}" target="_blank">${l.reservation}</a></p>`;

      // ✅ スタートからとゴールまでの距離を両方表示
      detailsHtml += `
        <p><strong>${l.distance}:</strong> ${spot.distanceFromStart.toFixed(2)} ${l.unitKm}（${l.walk}${l.about}${walkMinutes} ${l.unitMin}）</p>
        <p><strong>${l.totalRoute}:</strong> ${spot.totalRouteDistance.toFixed(2)} ${l.unitKm}（${l.walk}${l.about}${totalWalkMinutes} ${l.unitMin}）</p>
      `;

      div.innerHTML = `
        <img src="${spot.img}" alt="${spot.name.ja}">
        <div class="spot-details">
          <h3>${spot.name[currentLang] || spot.name.ja}</h3>
          ${detailsHtml}
        </div>
      `;

      div.addEventListener('click', () => selectSpot(spot, div));
      spotContainer.appendChild(div);
    });
  }

  function selectSpot(spot, div) {
    document.querySelectorAll('.spot-item').forEach(d => d.classList.remove('selected'));
    div.classList.add('selected');
    localStorage.setItem('hiddenSpot', JSON.stringify(spot));
  }

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      displaySpots(recommendedSpots);
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!localStorage.getItem('hiddenSpot')) {
        alert('穴場スポットを1つ選んでください');
        return;
      }
      window.location.href = 'route.html';
    });
  }
});
