document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1w5waa7_xUlB-_wt0TfLhDw48ehg86yl6/gviz/tq?sheet=穴場&headers=1&tq=";
  const spotContainer = document.getElementById('spotContainer');
  const nextBtn = document.getElementById('next-step'); // ←ここ修正！
  let currentLang = 'ja';
  let recommendedSpots = [];
  const langButtons = document.querySelectorAll('#language-switcher button');

  const buttonTexts = {
  ja: { inactive: '穴場スポットを選んでください', active: '次へ' },
  en: { inactive: 'Please select a hidden spot', active: 'Next' },
  cn: { inactive: '请选择一个隐藏景点', active: '下一步' }
};

// --- 次ボタン更新関数 ---
 function updateNextButton() {
   const hiddenSpot = localStorage.getItem('hiddenSpot');
   const enabled = hiddenSpot !== null;

   nextBtn.disabled = !enabled;
   nextBtn.querySelector('.lang-ja').textContent = enabled
     ? buttonTexts.ja.active
     : buttonTexts.ja.inactive;
   nextBtn.querySelector('.lang-en').textContent = enabled
     ? buttonTexts.en.active
     : buttonTexts.en.inactive;
   nextBtn.querySelector('.lang-cn').textContent = enabled
     ? buttonTexts.cn.active
     : buttonTexts.cn.inactive;
 }

  const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
  const step1Spot = JSON.parse(localStorage.getItem('step1Spot') || 'null');
  const step2Spot = JSON.parse(localStorage.getItem('step2Spot') || 'null');

  const genreMap = {
    "歴史・寺社・文化": "History",
    "自然・景観": "Nature",
    "グルメ・カフェ": "Food",
    "お土産・雑貨": "Shopping",
    "体験・アクティビティ": "Activity"
  };
  const selectedGenre = genreMap[userAttributes.interests] || userAttributes.interests;
  const maxDistanceKm = 2;

  const labels = {
    ja: { hours: '営業時間', cool: '涼しさ', website: '公式サイト', reservation: '予約リンク',
          distance: 'スタートからの距離', totalRoute: 'ゴールまでの総距離',
          walk: '徒歩', about: '約', unitKm: 'km', unitMin: '分',
          recommendation: 'あなたへのオススメ度' },
    en: { hours: 'Opening Hours', cool: 'Cool Level', website: 'Official Site', reservation: 'Reservation Link',
          distance: 'Distance from Start', totalRoute: 'Total Distance to Goal',
          walk: 'Walk', about: 'approx.', unitKm: 'km', unitMin: 'min',
          recommendation: 'Recommended for You' },
    cn: { hours: '营业时间', cool: '凉爽度', website: '官网', reservation: '预约链接',
          distance: '从起点的距离', totalRoute: '到终点的总距离',
          walk: '步行', about: '约', unitKm: '公里', unitMin: '分钟',
          recommendation: '为您推荐度' }
  };

  const companionMap = {
    solo: 'ひとり旅',
    couple: 'カップル',
    family: '家族',
    friends: '友人',
    group: 'グループ',
    'ひとり旅': 'ひとり旅',
    'カップル': 'カップル',
    '家族': '家族',
    '友人': '友人',
    'グループ': 'グループ'
  };

  const userCompanionKey = companionMap[userAttributes.companions] || 'ひとり旅';

  function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function getStars(score) {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
  }

  fetch(sheetURL)
    .then(res => res.text())
    .then(data => {
      const json = JSON.parse(data.substr(47).slice(0, -2));
      const rows = json.table.rows;

      const allSpots = rows.map(row => {
        const latLngString = row.c[8]?.v || "0,0";
        const [lat, lng] = latLngString.split(',').map(coord => parseFloat(coord.trim()));

        const companionScores = {
          'ひとり旅': parseInt(row.c[17]?.v) || 0,
          'カップル': parseInt(row.c[18]?.v) || 0,
          '家族': parseInt(row.c[19]?.v) || 0,
          '友人': parseInt(row.c[20]?.v) || 0,
          'グループ': parseInt(row.c[21]?.v) || 0
        };

        return {
          genre: row.c[0]?.v || '',
          name: { ja: row.c[1]?.v || '', en: row.c[2]?.v || '', cn: row.c[3]?.v || '' },
          img: row.c[4]?.v || '',
          description: { ja: row.c[5]?.v || '', en: row.c[6]?.v || '', cn: row.c[7]?.v || '' },
          lat, lng,
          coolLevel: row.c[9]?.v || '',
          openingHours: row.c[10]?.v || '',
          website: row.c[14]?.v || '',
          reservation: row.c[15]?.v || '',
          companionScores
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

      recommendedSpots = filteredSpots.sort((a, b) => {
        const scoreA = a.companionScores[userCompanionKey] || 0;
        const scoreB = b.companionScores[userCompanionKey] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.distanceFromStart || 0) - (b.distanceFromStart || 0);
      }).slice(0, 4);

      displaySpots(recommendedSpots, userCompanionKey);
    })
    .catch(err => {
      console.error("穴場スポット取得失敗:", err);
      spotContainer.innerHTML = "<p>データを読み込めませんでした</p>";
    });

  function displaySpots(spotsToDisplay, userCompanion) {
    spotContainer.innerHTML = '';
    const l = labels[currentLang];

    spotsToDisplay.forEach(spot => {
      const wrapper = document.createElement('div');
      wrapper.className = 'spot-wrapper';

      // 上に距離ラベル
      const distanceLabel = document.createElement('div');
      distanceLabel.className = 'spot-distance-label';
      const walkMinutes = Math.round((spot.distanceFromStart || 0) * 15);
      distanceLabel.textContent = `${l.distance}: ${(spot.distanceFromStart || 0).toFixed(2)} ${l.unitKm}（${l.walk}${l.about}${walkMinutes} ${l.unitMin}）`;

      const div = document.createElement('div');
      div.className = 'spot-item';

      let detailsHtml = `<p class="spot-description">${spot.description[currentLang] || spot.description.ja}</p>`;
      if (spot.openingHours) detailsHtml += `<p><strong>${l.hours}:</strong> ${spot.openingHours}</p>`;
      if (spot.coolLevel) detailsHtml += `<p><strong>${l.cool}:</strong> ${spot.coolLevel}</p>`;
      if (spot.website) detailsHtml += `<p><a href="${spot.website}" target="_blank">${l.website}</a></p>`;
      if (spot.reservation) detailsHtml += `<p><a href="${spot.reservation}" target="_blank">${l.reservation}</a></p>`;
      detailsHtml += `<p><strong>${l.recommendation}:</strong> ${getStars(spot.companionScores[userCompanion] || 0)}</p>`;
      detailsHtml += `<p><strong>${l.totalRoute}:</strong> ${(spot.totalRouteDistance || 0).toFixed(2)} ${l.unitKm}</p>`;

      div.innerHTML = `<img src="${spot.img}" alt="${spot.name.ja}">
                       <div class="spot-details">
                         <h3>${spot.name[currentLang] || spot.name.ja}</h3>
                         ${detailsHtml}
                       </div>`;

      div.addEventListener('click', () => selectSpot(spot, div));

      wrapper.appendChild(distanceLabel);
      wrapper.appendChild(div);
      spotContainer.appendChild(wrapper);
    });
  }

  // --- スポット選択処理 ---
    function selectSpot(spot, div) {
      document.querySelectorAll('.spot-item').forEach(d => d.classList.remove('selected'));
      div.classList.add('selected');
      localStorage.setItem('hiddenSpot', JSON.stringify(spot));
      updateNextButton(); // ←ここ大事！
    }

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      displaySpots(recommendedSpots, userCompanionKey);
    });
  });

  // --- 次ボタンクリック ---
   if (nextBtn) {
     nextBtn.addEventListener('click', () => {
       const hiddenSpot = localStorage.getItem('hiddenSpot');
       if (!hiddenSpot) {
         alert('穴場スポットを選んでください');
         return;
       }
       window.location.href = 'route.html';
     });
   }
 });
