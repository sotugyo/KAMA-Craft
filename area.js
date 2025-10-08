document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1w5waa7_xUlB-_wt0TfLhDw48ehg86yl6/gviz/tq?sheet=有名&headers=1&tq=";

  let currentLang = 'ja';

  fetch(sheetURL)
    .then(res => res.text())
    .then(data => {
      const json = JSON.parse(data.substr(47).slice(0, -2));
      const rows = json.table.rows;

      const spots = rows.map(row => {
        // CHANGED!緯度経度はF列(index 5)から読み込み
        const latLng = (row.c[5]?.v || '0,0').split(',');
        const lat = parseFloat(latLng[0].trim());
        const lng = parseFloat(latLng[1].trim());
        const website = row.c[14]?.v || '', 
        const openingHours = row.c[10]?.v || ,
        const coolLevel =row.c[9]?.v || '',
        
        return {
          genre: row.c[0]?.v,
          name: { ja: row.c[1]?.v, en: row.c[2]?.v, cn: row.c[3]?.v },
          //CHANGED! 画像URLはE列(index 4)から読み込み
          img: row.c[4]?.v,
          lat: lat,
          lng: lng,
          website: website,        
          openingHours: openingHours,  
          coolLevel: coolLevel    
        };
      });

      displaySpots(spots, 1);
      displaySpots(spots, 2);

      const langButtons = document.querySelectorAll('#language-switcher button');
      langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          currentLang = btn.dataset.lang;
          document.querySelectorAll('.lang-ja, .lang-en, .lang-cn').forEach(el => el.style.display = 'none');
          document.querySelectorAll(`.lang-${currentLang}`).forEach(el => el.style.display = '');
          updateSpotNames(spots);
        });
      });
    });

  function displaySpots(spots, step) {
    spots.forEach((spot, i) => {
      const containerId = `step${step}-cat-${spot.genre}`;
      const container = document.getElementById(containerId);
      if (!container) return;

      const div = document.createElement('div');
      div.className = 'spot-item';
      div.dataset.index = i;
      div.style.cursor = 'pointer';
      div.style.display = 'inline-block';
      div.style.margin = '5px';
      div.style.border = '2px solid transparent';

      div.innerHTML = `
        <img src="${spot.img}" alt="${spot.name.ja}" width="100"><br>
        <p class="spot-name">${spot.name[currentLang]}</p>
      `;

      div.addEventListener('click', () => selectSpot(spot, step, div));
      container.appendChild(div);
    });
  }

  function updateSpotNames(spots) {
    document.querySelectorAll('.spot-item').forEach(div => {
      const index = div.dataset.index;
      if (index === undefined) return;
      const spot = spots[index];
      const p = div.querySelector('.spot-name');
      if (p && spot) p.textContent = spot.name[currentLang] || spot.name.ja;
    });
  }

  function selectSpot(spot, step, div) {
    // ローカルストレージにスポットの詳細情報 (website, openingHours, coolLevel) を含めて保存
    if (step === 1) {
      localStorage.setItem('step1Spot', JSON.stringify(spot));
      highlightSelected('step1', div);
    } else {
      localStorage.setItem('step2Spot', JSON.stringify(spot));
      highlightSelected('step2', div);
    }
  }

  function highlightSelected(step, selectedDiv) {
    document.querySelectorAll(`#${step} .spot-item`).forEach(div => div.classList.remove('selected'));
    selectedDiv.classList.add('selected');
  }

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
