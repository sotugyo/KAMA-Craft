// DOMの読み込みが完了してから処理を開始
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    // フォームの入力値を取得
    const data = {
      nationality: document.getElementById("nationality").value,
      age: document.getElementById("age").value,
      companions: document.getElementById("companions").value,
      stay: document.getElementById("stay").value,
      interests: document.getElementById("interests").value,
    };
    
    console.log("ユーザーの選択データ:", data);

    // ローカルストレージに保存
    localStorage.setItem("userAttributes", JSON.stringify(data));


   // 次のページに遷移
    window.location.href = "area.html";
  });
});
