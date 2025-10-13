document.addEventListener('DOMContentLoaded', () => {
    // OpenRouteService APIキーとURL
    const orsApiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU4ZjE5YTkzYmJlNTRiYTI5MzgyMWNkNjAyM2M0NzRjIiwiaCI6Im11cm11cjY0In0=";
    const orsUrl = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

    let currentLang = localStorage.getItem('siteLanguage') || 'ja';

    // ===== コンソールでローカルストレージ確認 =====
    console.log("=== step1Spot ===");
    console.log(JSON.parse(localStorage.getItem('step1Spot') || '{}'));

    console.log("=== step2Spot ===");
    console.log(JSON.parse(localStorage.getItem('step2Spot') || '{}'));

    console.log("=== hiddenSpot ===");
    console.log(JSON.parse(localStorage.getItem('hiddenSpot') || '{}'));

    // 全ローカルストレージ一覧も確認
    console.log("=== 全ローカルストレージ ===");
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(key, localStorage.getItem(key));
    }

    const step1Data = JSON.parse(localStorage.getItem('step1Spot') || '{}');
    const step2Data = JSON.parse(localStorage.getItem('step2Spot') || '{}');
    const hiddenData = JSON.parse(localStorage.getItem('hiddenSpot') || '{}');

    const sheetData = window.sheetData || [];
    const nameCol = 0;
    const descriptionCol = 11;

    const routeSpots = [];

    // ===== スポットデータ収集 =====
    if (step1Data?.lat && step1Data?.lng) {
        const rowIndex = sheetData.findIndex(row => row[nameCol] === step1Data.name.ja);
        routeSpots.push({
            label: "スタート",
            name: step1Data.name || {ja: 'スタート地点'},
            img: step1Data.img || '',
            lat: parseFloat(step1Data.lat),
            lng: parseFloat(step1Data.lng),
            website: step1Data.website || '#',
            opening_hours: rowIndex >= 0 ? sheetData[rowIndex][10] : step1Data.openingHours || '不明',
            rating: rowIndex >= 0 ? sheetData[rowIndex][9] : step1Data.coolLevel || 'N/A',
            description: rowIndex >= 0 ? sheetData[rowIndex][descriptionCol] : step1Data.description || ''
        });
    }

    if (hiddenData?.lat && hiddenData?.lng) {
        const rowIndex = sheetData.findIndex(row => row[nameCol] === hiddenData.name.ja);
        routeSpots.push({
            label: "穴場スポット",
            name: hiddenData.name || {ja: '穴場スポット'},
            img: hiddenData.img || '',
            lat: parseFloat(hiddenData.lat),
            lng: parseFloat(hiddenData.lng),
            website: hiddenData.website || '#',
            opening_hours: rowIndex >= 0 ? sheetData[rowIndex][10] : hiddenData.openingHours || '不明',
            rating: rowIndex >= 0 ? sheetData[rowIndex][9] : hiddenData.coolLevel || 'N/A',
            description: rowIndex >= 0 ? sheetData[rowIndex][descriptionCol] : hiddenData.description || ''
        });
    }

    if (step2Data?.lat && step2Data?.lng) {
        const rowIndex = sheetData.findIndex(row => row[nameCol] === step2Data.name.ja);
        routeSpots.push({
            label: "ゴール",
            name: step2Data.name || {ja: 'ゴール地点'},
            img: step2Data.img || '',
            lat: parseFloat(step2Data.lat),
            lng: parseFloat(step2Data.lng),
            website: step2Data.website || '#',
            opening_hours: rowIndex >= 0 ? sheetData[rowIndex][10] : step2Data.openingHours || '不明',
            rating: rowIndex >= 0 ? sheetData[rowIndex][9] : step2Data.coolLevel || 'N/A',
            description: rowIndex >= 0 ? sheetData[rowIndex][descriptionCol] : step2Data.description || ''
        });
    }

    // ===== 地図初期化 =====
    const map = L.map('map').setView([35.3199, 139.5501], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let routeLayer = null;
    let markerGroup = L.layerGroup().addTo(map);

    // ===== ヘルパー関数 =====
    function formatDuration(seconds) {
        const minutes = Math.ceil(seconds / 60);
        if (minutes < 60) return `徒歩${minutes}分`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `徒歩${hours}時間${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`;
    }

    function generateOverallRouteMessage(spots, durations = []) {
        if (spots.length < 2) return '';
        let message = '';
        spots.forEach((spot, index) => {
            const spotNameJa = spot.name[currentLang] || spot.name.ja || spot.label;
            message += `<div class="route-summary-item">${spotNameJa.replace('地点','').replace('スポット','')}</div>`;
            if (index < spots.length - 1 && durations[index] !== undefined) {
                const durationText = formatDuration(durations[index]).replace('徒歩','');
                message += `<div class="route-summary-arrow">徒歩${durationText}</div>`;
            }
        });
        return message;
    }

    // ===== スポットカード作成 (修正済み) =====
    function createSpotCards(spots, durations = []) {
        const container = document.getElementById('spot-cards-container');
        const messageContainer = document.getElementById('overall-route-message-container');
        container.innerHTML = '';
        messageContainer.innerHTML = '';
        markerGroup.clearLayers();

        spots.forEach((spot, index) => {
            const isLast = index === spots.length - 1;
            const spotName = spot.name[currentLang] || spot.name.ja || spot.label;

            // ★修正1: imgタグを文字列で囲む★
            const imageHtml = spot.img ? `<img src="${spot.img}" alt="${spotName}">` :
            `<div style="text-align:center;font-size:18px;color:#444;font-weight:bold;margin-top:35px;position:relative;z-index:10;">
                ${spotName.replace('地点','').replace('スポット','')}
            </div>`;

            // ★修正2: descriptionのpタグを文字列で囲む★
            const descriptionHtml = spot.description ? `<p class="spot-desc-dynamic">${spot.description}</p>` : '';

            const cardHtml = `
                <div class="spot-card">
                    <h4 class="card-label">${spot.label}</h4>
                    <a href="${spot.website}" target="_blank" class="image-link-container" title="${spotName}の公式サイトへ">
                        ${imageHtml}
                    </a>
                    <div class="spot-info">
                        <h4 class="spot-name-dynamic"><span style="font-size:14px;color:#999;">${spot.label}: </span>${spotName}</h4>
                        ${descriptionHtml}
                        <p>営業時間: <strong>${spot.opening_hours}</strong></p>
                        <p>涼しさ: <strong>${spot.rating}</strong></p>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);

            if (!isLast && durations[index] !== undefined) {
                const durationText = formatDuration(durations[index]);
                container.insertAdjacentHTML('beforeend', `<div class="route-info"><div class="route-time">${durationText}</div></div>`);
            }

            if (spot.lat && spot.lng) {
                L.marker([spot.lat, spot.lng])
                    .addTo(markerGroup)
                    .bindTooltip(spot.label, { permanent: true, direction: 'top', offset: [0,-25] })
                    .bindPopup(`<strong>${spotName}</strong> (${spot.label})`);
            }
        });

        const overallRouteMessage = generateOverallRouteMessage(spots, durations);
        if (overallRouteMessage) {
            messageContainer.insertAdjacentHTML('beforeend', `
                <div class="route-summary">${overallRouteMessage}</div>
            `);
        }
    }

    window.updateLanguage = function(lang) {
        currentLang = lang;
        const durations = document.getElementById('spot-cards-container').dataset.durations ?
                            JSON.parse(document.getElementById('spot-cards-container').dataset.durations) : [];
        createSpotCards(routeSpots, durations);
    };

    const coords = routeSpots.filter(s => s.lat && s.lng).map(s => [s.lng, s.lat]);

    // ===== ルート描画処理 =====
    if (coords.length >= 2) {
        fetch(orsUrl, {
            method: "POST",
            headers: {
                "Authorization": orsApiKey,
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ coordinates: coords })
        })
        .then(res => {
            // ステータスコードが4xx/5xxの場合はエラーメッセージを表示
            if (!res.ok) {
                console.error(`ORS API Error: ${res.status} ${res.statusText}`);
                return res.json().then(errorData => {
                    console.error("ORS API詳細エラー:", errorData);
                    throw new Error("ORS APIからのエラーレスポンス");
                });
            }
            return res.json();
        })
        .then(data => {
            if (data.features && data.features.length > 0) {
                // ルート描画
                if (routeLayer) map.removeLayer(routeLayer);
                routeLayer = L.geoJSON(data, { style: { color:"#4da6ff", weight:4 }}).addTo(map);
                
                // 地図の範囲をルートに合わせる
                const routeBounds = routeLayer.getBounds();
                if (routeBounds.isValid()) map.fitBounds(routeBounds, {padding:[30,30]});

                // 所要時間を取得してカードを更新
                const segments = data.features[0]?.properties?.segments || [];
                const durations = segments.map(seg => seg.duration);
                document.getElementById('spot-cards-container').dataset.durations = JSON.stringify(durations);

                createSpotCards(routeSpots, durations);
            } else {
                console.error("ORSルートデータなし:", data);
                createSpotCards(routeSpots);
            }
        })
        .catch(err => {
            console.error("ORSルート取得エラー:", err);
            createSpotCards(routeSpots);
        });
    } else {
        createSpotCards(routeSpots);
    }
});
