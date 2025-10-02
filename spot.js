document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1w5waa7_xUlB-_wt0TfLhDw48ehg86yl6/gviz/tq?sheet=穴場&headers=1&tq=";
  const spotContainer = document.getElementById('spotContainer');
  const nextBtn = document.getElementById('nextBtn');
  let currentLang = 'ja';
  let recommendedSpots = [];
  const langButtons = document.querySelectorAll('#language-switcher button');

  const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
  const step1Spot = JSON.parse(localStorage.getItem('step1Spot') || 'null');
  const step2Spot = JSON.parse(localStorage.getItem('step2Spot') || 'null');

  const genreMap = {
    "歴史・寺社・文化": "History", "自然・景観": "Nature", "グルメ・カフェ": "Food",
    "お土産・雑貨": "Shopping", "体験・アクティビティ": "Activity"
  };
  const selectedGenre = genreMap[userAttributes.interests] || userAttributes.interests;
  const maxDistanceKm = 2;

  function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function pointToLineDistance(lat1, lng1, lat2, lng2, lat0, lng0) {
    const A = getDistance(lat0, lng0, lat1, lng1);
    const B = getDistance(lat0, lng0, lat2, lng2);
    const C = getDistance(lat1, lng1, lat2, lng2);
    if (C === 0) return A;
    const s = (A + B + C) / 2;
    const area = Math.sqrt(s * (s - A) * (s - B) * (s - C));
    return 2 * area / C;
  }

  fetch(sheetURL)
    .then(res => res.text())
    .then(data => {
      const json = JSON.parse(data.substr(47).slice(0, -2));
      const rows = json.table.rows;

      const allSpots = rows.map(row => {
        // 9列目(index:8)の緯度経度文字列を取得し、分割
        const latLngString = row.c[8]?.v || "0,0";
        const [lat, lng] = latLngString.split(',').map(coord => parseFloat(coord.trim()));

        return {
          genre: row.c[0]?.v || '',
          name: { ja: row.c[1]?.v || '', en: row.c[2]?.v || '', cn: row.c[3]?.v || '' },
          img: row.c[4]?.v || '',
          description: { ja: row.c[5]?.v || '', en: row.c[6]?.v || '', cn: row.c[7]?.v || '' },
          lat: lat,
          lng: lng,
          coolLevel: row.c[9]?.v || '',      // 10列目
          openingHours: row.c[10]?.v || '', // 11列目
          website: row.c[14]?.v || '',      // 15列目
          reservation: row.c[15]?.v || ''   // 16列目
        };
      });

      const filteredSpots = allSpots.filter(s => {
        const matchGenre = s.genre === selectedGenre;
        if (!matchGenre) return false;
        if (step1Spot?.lat && step2Spot?.lat && s.lat) {
          const distanceToLine = pointToLineDistance(step1Spot.lat, step1Spot.lng, step2Spot.lat, step2Spot.lng, s.lat, s.lng);
          return distanceToLine <= maxDistanceKm;
        }
        return false;
      });
      
      if (filteredSpots.length === 0) {
        spotContainer.innerHTML = `<p>条件に合うスポットが見つかりませんでした。</p>`;
        nextBtn.style.display = 'none';
        return;
      }

      recommendedSpots = filteredSpots;

      displaySpots(recommendedSpots);
    })
    .catch(err => {
      console.error("穴場スポット取得失敗:", err);
      spotContainer.innerHTML = "<p>データを読み込めませんでした</p>";
    });

  function displaySpots(spotsToDisplay) {
    spotContainer.innerHTML = '';
    spotsToDisplay.forEach(spot => {
      const div = document.createElement('div');
      div.className = 'spot-item';

      let detailsHtml = `<p class="spot-description">${spot.description[currentLang] || spot.description.ja}</p>`;
      if (spot.openingHours) {
        detailsHtml += `<p class="spot-info"><strong>営業時間:</strong> ${spot.openingHours}</p>`;
      }
      if (spot.coolLevel) {
    // CHANGED: 涼しさの表示を修正
        detailsHtml += `<p class="spot-info"><strong>涼しさ:</strong> ${spot.coolLevel}</p>`;
      }
      if (spot.website) {
        detailsHtml += `<p class="spot-info"><a href="${spot.website}" target="_blank">公式サイト</a></p>`;
      }
      if (spot.reservation) {
        detailsHtml += `<p class="spot-info"><a href="${spot.reservation}" target="_blank">予約リンク</a></p>`;
      }
      
      div.innerHTML = `
        <img src="${spot.img}" alt="${spot.name.ja}">
        <div class="spot-details">
          <h3 class="spot-name">${spot.name[currentLang] || spot.name.ja}</h3>
          ${detailsHtml}
        </div>
      `;
      div.addEventListener('click', () => selectSpot(spot, div));
      spotContainer.appendChild(div);
    });
  }

  function updateDisplayedLanguage() {
    document.querySelectorAll('.lang-ja, .lang-en, .lang-cn').forEach(el => el.style.display = 'none');
    document.querySelectorAll(`.lang-${currentLang}`).forEach(el => el.style.display = '');

    document.querySelectorAll('.spot-item').forEach((div, index) => {
      const spotData = recommendedSpots[index];
      if (spotData) {
        div.querySelector('.spot-name').textContent = spotData.name[currentLang] || spotData.name.ja;
        div.querySelector('.spot-description').textContent = spotData.description[currentLang] || spotData.description.ja;
      }
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
      updateDisplayedLanguage();
    });
  });
  
  updateDisplayedLanguage();

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
