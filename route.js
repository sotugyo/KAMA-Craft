
document.addEventListener('DOMContentLoaded', () => {
    // ORS APIキー (元のコードの値を維持 - 動作には有効なキーが必要です)
    const orsApiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU4ZjE5YTkzYmJlNTRiYTI5MzgyMWNkNjAyM2M0NzRjIiwiaCI6Im11cm11cjY0In0=";
    const orsUrl = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"; // 徒歩ルート

    // ユーザー設定から言語を読み込み
    let currentLang = localStorage.getItem('siteLanguage') || 'ja';

    // スポット情報をlocalStorageから取得
    // step2Spot, hiddenSpot, step1Spot は area.js/spot.js で保存されています。
    const step1Data = JSON.parse(localStorage.getItem('step1Spot') || '{}');
    const step2Data = JSON.parse(localStorage.getItem('step2Spot') || '{}');
    const hiddenData = JSON.parse(localStorage.getItem('hiddenSpot') || '{}');

    // =================================================================
    // スポット情報を整理し、route.js のデータ構造に合わせてプロパティを調整
    // =================================================================
    const routeSpots = [];

    // step1Spot (スタート)
    if (step1Data?.lat && step1Data?.lng) {
        // step1Data は area.js からのデータ
        routeSpots.push({
            label: "スタート",
            name: step1Data.name || {ja: 'スタート地点'},
            img: step1Data.img || '',
            lat: parseFloat(step1Data.lat), // 緯度経度は数値に
            lng: parseFloat(step1Data.lng),
            // step1/step2のデータには詳細情報がない場合があるため、デフォルト値を設定
            website: step1Data.website || '#',
            opening_hours: step1Data.openingHours || '不明',
            rating: step1Data.coolLevel || 'N/A'
        });
    }

    // hiddenSpot (穴場スポット)
    if (hiddenData?.lat && hiddenData?.lng) {
        // hiddenData は spot.js からのデータ。spot.js のプロパティ名を使用
        routeSpots.push({
            label: "穴場スポット",
            name: hiddenData.name || {ja: '穴場スポット'},
            img: hiddenData.img || '',
            lat: parseFloat(hiddenData.lat),
            lng: parseFloat(hiddenData.lng),
            // spot.js で取得・保存した詳細情報
            website: hiddenData.website || '#',
            opening_hours: hiddenData.openingHours || '不明', // spot.jsでの名称
            rating: hiddenData.coolLevel || 'N/A'             // spot.jsでの名称
        });
    }

    // step2Spot (ゴール)
    if (step2Data?.lat && step2Data?.lng) {
        // step2Data は area.js からのデータ
        routeSpots.push({
            label: "ゴール",
            name: step2Data.name || {ja: 'ゴール地点'},
            img: step2Data.img || '',
            lat: parseFloat(step2Data.lat),
            lng: parseFloat(step2Data.lng),
            // step1/step2のデータには詳細情報がない場合があるため、デフォルト値を設定
            website: step2Data.website || '#',
            opening_hours: step2Data.openingHours || '不明',
            rating: step2Data.coolLevel || 'N/A'
        });
    }

    // 地図初期化
    const map = L.map('map').setView([35.3199, 139.5501], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let routeLayer = null;
    let markerGroup = L.layerGroup().addTo(map);

    // ===========================================
    // ヘルパー関数 (時間変換/サマリー生成)
    // ===========================================

    function formatDuration(seconds) {
        const minutes = Math.ceil(seconds / 60);
        if (minutes < 60) {
            return `徒歩${minutes}分`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `徒歩${hours}時間${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`;
    }

    function generateOverallRouteMessage(spots, durations = []) {
        if (spots.length < 2) return '';

        let message = '';
        spots.forEach((spot, index) => {
            const spotNameJa = spot.name[currentLang] || spot.name.ja || spot.label;

            // スポット名ボタン (写真に合わせたデザイン)
            message += `<div class="route-summary-item">${spotNameJa.replace('地点', '').replace('スポット', '')}神社</div>`;

            if (index < spots.length - 1) {
                const durationText = formatDuration(durations[index]).replace('徒歩', '');
                message += `<div class="route-summary-arrow">徒歩${durationText}</div>`;
            }
        });
        return message;
    }

    // ===========================================
    // メイン機能: スポットカードの生成と表示
    // ===========================================
    function createSpotCards(spots, durations = []) {
        const container = document.getElementById('spot-cards-container');
        const messageContainer = document.getElementById('overall-route-message-container');
        container.innerHTML = '';
        messageContainer.innerHTML = '';
        markerGroup.clearLayers();

        spots.forEach((spot, index) => {
            const isLast = index === spots.length - 1;
            const spotName = spot.name[currentLang] || spot.name.ja || spot.label;
            const websiteUrl = spot.website || '#';

            // 重要な変更点: spot.opening_hours と spot.rating を使用
            const openingHours = spot.opening_hours || '不明';
            const coolLevel = spot.rating || 'N/A';

            // スポットカードを生成 (写真, 名前, 営業時間, 涼しさ)
            const cardHtml = `
                <div class="spot-card">
                    <h4 class="card-label">${spot.label}</h4>

                    <a href="${websiteUrl}" target="_blank" class="image-link-container" title="${spotName}の公式サイトへ">
                        ${spot.img ? `<img src="${spot.img}" alt="${spotName}">` :
                        // 画像がない場合のプレースホルダー（CSSで雲と丘のデザイン）
                        `<div style="text-align: center; font-size: 18px; color: #444; font-weight: bold; margin-top: 35px; position:relative; z-index: 10;">
                             ${spotName.replace('地点', '').replace('スポット', '')}神社
                         </div>`}
                    </a>

                    <div class="spot-info">
                        <h4 class="spot-name-dynamic">
                             <span style="font-size: 14px; color: #999;">${spot.label}: </span>
                             ${spotName}
                        </h4>
                        <p class="spot-desc-dynamic">鎌倉時代のが建つ有名な神社<br>御利益等に記載</p>
                        <p>営業時間: <strong>${openingHours}</strong></p>
                        <p>涼しさ: <strong>${coolLevel}</strong></p>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);

            // スポット間のルート情報（徒歩の時間）
            if (!isLast && durations[index] !== undefined) {
                const durationText = formatDuration(durations[index]);
                const routeInfoHtml = `
                    <div class="route-info">
                        <div class="route-time">${durationText}</div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', routeInfoHtml);
            }

            // マーカーとラベルを追加
            if (spot.lat && spot.lng) {
                L.marker([spot.lat, spot.lng])
                    .addTo(markerGroup)
                    .bindTooltip(spot.label, { permanent: true, direction: 'top', offset: [0, -25] })
                    .bindPopup(`<strong>${spotName}</strong> (${spot.label})`);
            }
        });

        // ルートサマリーメッセージを挿入
        const overallRouteMessage = generateOverallRouteMessage(spots, durations);
        if (overallRouteMessage) {
              const messageHtml = `
                 <div class="overall-route-message">
                     移動区間の所要時間によっては、それぞれのスポット滞在時間と所要時間を短くしても良いかもしれません。
                     <a href="属性.html" style="font-size:12px; font-weight:normal; color:#0066cc; text-decoration:underline;">
                         ※滞在時間をクリックしたら決めれるホームに戻るような設定
                     </a>
                 </div>
                 <div class="route-summary">
                     ${overallRouteMessage}
                 </div>
               `;
               messageContainer.insertAdjacentHTML('beforeend', messageHtml);
        }
    }

    // 言語切り替え時の動的要素の更新
    window.updateLanguage = function(lang) {
        currentLang = lang;
        const durations = document.getElementById('spot-cards-container').dataset.durations ?
                             JSON.parse(document.getElementById('spot-cards-container').dataset.durations) : [];
        createSpotCards(routeSpots, durations);
    };

    // ===========================================
    // ORS ルート取得・描画
    // ===========================================
    const coords = routeSpots
        .filter(s => s.lng && s.lat) // 緯度経度があるスポットのみ
        .map(s => [s.lng, s.lat]);

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
            if (data.features && data.features.length > 0) {
                // ルートの描画
                if (routeLayer) { map.removeLayer(routeLayer); }
                routeLayer = L.geoJSON(data, { style: { color: "#4da6ff", weight: 4 } }).addTo(map);

                const routeBounds = routeLayer.getBounds();
                if (routeBounds.isValid()) {
                    map.fitBounds(routeBounds, { padding: [30, 30] });
                }

                // 所要時間の取得
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
        // スポットが1つ以下の場合もカードとピンのラベルは表示
        createSpotCards(routeSpots);
    }
});
