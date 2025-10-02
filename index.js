// DOMの読み込みが完了してから処理を開始
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // ページリロードを防ぐ

    // フォームの入力値を取得
    const data = {
      nationality: document.getElementById("nationality").value,
      age: document.getElementById("age").value,
      companions: document.getElementById("companions").value,
      stay: document.getElementById("stay").value,
      interests: document.getElementById("interests").value,
    };

    // 取得したデータを確認（開発用）
    console.log("ユーザーの選択データ:", data);

    // ローカルストレージに保存（次の画面で使える）
    localStorage.setItem("userAttributes", JSON.stringify(data));


   // 次のページに遷移（ここでは仮に area.html に設定）
    window.location.href = "area.html";
  });
});
