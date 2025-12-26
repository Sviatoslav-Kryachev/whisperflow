// элементы DOM
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("audioFile");
const modelSelect = document.getElementById("modelSelect");
const resultBlock = document.getElementById("result");
const downloadBtn = document.getElementById("downloadBtn");

uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    const model = modelSelect.value;

    if (!file) {
        alert("Select audio file");
        return;
    }

    resultBlock.textContent = "Uploading...";
    progressBar.value = 0;
    downloadBtn.style.display = "none";

    try {
        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(progress + 10, 90);
            progressBar.value = progress;
        }, 200);

        const data = await apiUploadAudio(file, model);
        clearInterval(interval);
        progressBar.value = 100;

        resultBlock.textContent = JSON.stringify(data, null, 2);

        // Показываем кнопку скачивания
        downloadBtn.style.display = "inline-block";
        downloadBtn.onclick = () => {
            const blob = new Blob([resultBlock.textContent], { type: "text/plain;charset=utf-8" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${file.name.split(".")[0]}.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
        };

    } catch (err) {
        clearInterval(interval);
        resultBlock.textContent = "Error: " + err.message;
        progressBar.value = 0;
    }
});

// создаём прогресс-бар
let progressBar = document.getElementById("progressBar");
if (!progressBar) {
    progressBar = document.createElement("progress");
    progressBar.id = "progressBar";
    progressBar.max = 100;
    progressBar.value = 0;
    resultBlock.parentNode.insertBefore(progressBar, resultBlock);
}

// функция загрузки через fetch с FormData
async function apiUploadAudio(file, model) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);

    const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Upload failed");
    }

    return await response.json();
}

// обработчик кнопки
uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    const model = modelSelect.value;

    if (!file) {
        alert("Select audio file");
        return;
    }

    resultBlock.textContent = "Uploading...";
    progressBar.value = 0;

    try {
        // Простая анимация прогресса (эмуляция, пока нет streaming)
        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(progress + 10, 90);
            progressBar.value = progress;
        }, 200);

        const data = await apiUploadAudio(file, model);
        clearInterval(interval);
        progressBar.value = 100;

        resultBlock.textContent = JSON.stringify(data, null, 2);

    } catch (err) {
        resultBlock.textContent = "Error: " + err.message;
        progressBar.value = 0;
    }
});
