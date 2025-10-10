document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1w5waa7_xUlB-_wt0TfLhDw48ehg86yl6/gviz/tq?sheet=有名&headers=1&tq=";

  let currentLang = 'ja';
  let allSpotsData = []; // スポットデータを保持する配列

  // --- Googleスプレッドシートからデータ取得 ---
  fetch(sheetURL)
    .then(res => res.text())
    .then(data => {
      const json = JSON.parse(data.substr(47).slice(0, -2));
      const rows = json.table.rows;

      allSpotsData = rows.map(row => {
        const latLng = (row.c[5]?.v || '0,0').split(',');
        const lat = parseFloat(latLng[0].trim());
        const lng = parseFloat(latLng[1].trim());

        return {
          genre: row.c[0]?.v,
          name: { ja: row.c[1]?.v, en: row.c[2]?.v, cn: row.c[3]?.v },
          img: row.c[4]?.v,
          lat: lat,
          lng: lng,
          coolness: row.c[6]?.v,  // G列「涼しさ」
          hours: row.c[7]?.v,     // H列「営業時間」
          website_url: row.c[11]?.v // L列「ウェブサイトURL」
        };
      });

      displaySpots(allSpotsData, 1);
      displaySpots(allSpotsData, 2);

      // --- 言語切り替え処理 ---
      const langButtons = document.querySelectorAll('#language-switcher button');
      langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          currentLang = btn.dataset.lang;
          document.querySelectorAll('.lang-ja, .lang-en, .lang-cn').forEach(el => el.style.display = 'none');
          document.querySelectorAll(`.lang-${currentLang}`).forEach(el => el.style.display = '');
          updateSpotNames(allSpotsData);
        });
      });
    });

  // --- スポットを表示 ---
  function displaySpots(spots, step) {
    spots.forEach((spot, i) => {
      const containerId = `step${step}-cat-${spot.genre}`;
      const container = document.getElementById(containerId);
      if (!container) return;

      const div = document.createElement('div');
      div.className = 'spot-item';
      div.dataset.index = i;

      div.innerHTML = `
        <img src="${spot.img}" alt="${spot.name.ja}"><br>
        <p class="spot-name">${spot.name[currentLang] || spot.name.ja}</p>
      `;

      div.addEventListener('click', () => selectSpot(spot, step, div));
      container.appendChild(div);
    });
  }

  // --- 言語切り替え時にスポット名を更新 ---
  function updateSpotNames(spots) {
    document.querySelectorAll('.spot-item').forEach(div => {
      const index = div.dataset.index;
      if (index === undefined) return;
      const spot = spots[index];
      const p = div.querySelector('.spot-name');
      if (p && spot) p.textContent = spot.name[currentLang] || spot.name.ja;
    });
  }

  // --- スポット選択処理（クリック無効チェック付き） ---
  function selectSpot(spot, step, div) {
    if (div.classList.contains('disabled')) return; // 無効化されたスポットは選択しない

    const spotIndex = div.dataset.index;

    if (step === 1) {
      localStorage.setItem('step1Spot', JSON.stringify(spot));
      highlightSelected('step1', div);
      syncSelections(spotIndex, 2); // ステップ2を同期
    } else {
      localStorage.setItem('step2Spot', JSON.stringify(spot));
      highlightSelected('step2', div);
      syncSelections(spotIndex, 1); // ステップ1を同期
    }
  }

  // --- 選択中デザインを更新 ---
  function highlightSelected(step, selectedDiv) {
    document.querySelectorAll(`#${step} .spot-item`).forEach(div => div.classList.remove('selected'));
    selectedDiv.classList.add('selected');
  }

  // --- 反対側のスポットを無効化 ---
  function syncSelections(selectedIndex, targetStep) {
    document.querySelectorAll(`#step${targetStep} .spot-item`).forEach(item => {
      item.classList.remove('disabled');
    });

    if (selectedIndex) {
      const spotToDisable = document.querySelector(`#step${targetStep} .spot-item[data-index="${selectedIndex}"]`);
      if (spotToDisable) {
        spotToDisable.classList.add('disabled');
      }
    }
  }

  // --- 次へ進むボタン ---
  const nextBtn = document.getElementById('next-step');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const step1 = localStorage.getItem('step1Spot');
      const step2 = localStorage.getItem('step2Spot');
      if (!step1 || !step2) {
        alert('両方のスポットを選んでください');
        return;
      }
      window.location.href = 'spot.html';
    });
  }
});
