/**
 * x-trick.js - X投稿用トリック画像メーカーのメインロジック
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ===== 画像データ =====
const images = {
    main: null,
    dummyA: null,
    dummyB: null,
};

// ===== DOM要素 =====
const settingsSection = document.getElementById('settings-section');
const ratioA = document.getElementById('ratio-a');
const ratioB = document.getElementById('ratio-b');
const ratioAValue = document.getElementById('ratio-a-value');
const ratioBValue = document.getElementById('ratio-b-value');
const outputFormat = document.getElementById('output-format');
const outputQuality = document.getElementById('output-quality');
const qualityValue = document.getElementById('quality-value');
const qualitySetting = document.getElementById('quality-setting');
const generateBtn = document.getElementById('generate-btn');
const downloadZipBtn = document.getElementById('download-zip-btn');
const progressOverlay = document.getElementById('progress-overlay');
const progressText = document.getElementById('progress-text');

let generatedBlobs = [];

// ===== 画像アップロード処理 =====
['main', 'dummyA', 'dummyB'].forEach(key => {
    const zone = document.getElementById(`${key}-upload-zone`);
    const input = document.getElementById(`${key}-input`);
    const preview = document.getElementById(`${key}-preview`);
    const content = document.getElementById(`${key}-upload-content`);
    const clearBtn = document.getElementById(`${key}-clear`);

    // ファイル選択
    zone.addEventListener('click', (e) => {
        if (e.target.closest('.clear-btn') || e.target.closest('.btn')) return;
        input.click();
    });

    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) loadImage(key, e.target.files[0]);
    });

    // D&D
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) loadImage(key, e.dataTransfer.files[0]);
    });

    // クリア
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        images[key] = null;
        preview.src = '';
        preview.classList.add('hidden');
        content.classList.remove('hidden');
        clearBtn.classList.add('hidden');
        zone.classList.remove('has-image');
        checkAllImages();
    });
});

function loadImage(key, file) {
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            images[key] = img;

            const preview = document.getElementById(`${key}-preview`);
            const content = document.getElementById(`${key}-upload-content`);
            const clearBtn = document.getElementById(`${key}-clear`);
            const zone = document.getElementById(`${key}-upload-zone`);

            preview.src = e.target.result;
            preview.classList.remove('hidden');
            content.classList.add('hidden');
            clearBtn.classList.remove('hidden');
            zone.classList.add('has-image');

            checkAllImages();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function checkAllImages() {
    const allLoaded = images.main && images.dummyA && images.dummyB;
    if (allLoaded) {
        settingsSection.classList.remove('hidden');
        updatePreview();
    } else {
        settingsSection.classList.add('hidden');
    }
}

// ===== 設定変更 =====
ratioA.addEventListener('input', () => {
    ratioAValue.textContent = ratioA.value + '%';
    updatePreview();
});

ratioB.addEventListener('input', () => {
    ratioBValue.textContent = ratioB.value + '%';
    updatePreview();
});

outputFormat.addEventListener('change', () => {
    const fmt = outputFormat.value;
    qualitySetting.style.display = (fmt === 'jpeg' || fmt === 'webp') ? '' : 'none';
});

outputQuality.addEventListener('input', () => {
    qualityValue.textContent = outputQuality.value + '%';
});

// ===== プレビュータブ =====
document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const view = tab.dataset.view;
        document.getElementById('thumbnail-preview').classList.toggle('hidden', view !== 'thumbnail');
        document.getElementById('individual-preview').classList.toggle('hidden', view !== 'individual');
    });
});

// ===== プレビュー更新 =====
function updatePreview() {
    if (!images.main || !images.dummyA || !images.dummyB) return;

    const mainImg = images.main;
    const dummyA = images.dummyA;
    const dummyB = images.dummyB;

    // メイン画像を4分割
    const halfW = Math.floor(mainImg.naturalWidth / 2);
    const halfH = Math.floor(mainImg.naturalHeight / 2);

    // ダミー画像の高さ（メイン分割画像の高さに対する比率）
    const ratioAVal = parseInt(ratioA.value) / 100;
    const ratioBVal = parseInt(ratioB.value) / 100;
    const dummyAHeight = Math.floor(halfH * ratioAVal);
    const dummyBHeight = Math.floor(halfH * ratioBVal);

    const totalH = dummyAHeight + halfH + dummyBHeight;

    // 4分割の位置
    const splits = [
        { sx: 0, sy: 0 },       // 左上
        { sx: halfW, sy: 0 },     // 右上
        { sx: 0, sy: halfH },     // 左下
        { sx: halfW, sy: halfH },   // 右下
    ];

    // サムネイルプレビュー（2×2グリッドの中央部分を表示）
    for (let i = 0; i < 4; i++) {
        const thumbCanvas = document.getElementById(`thumb-${i + 1}`);
        const thumbCtx = thumbCanvas.getContext('2d');

        // サムネイルキャンバスのサイズ
        thumbCanvas.width = halfW;
        thumbCanvas.height = Math.floor(halfW * 9 / 16); // 16:9の半分

        // 結合画像での中央部分を切り出し = メイン画像のその部分
        // サムネイルではメイン部分のみを表示（中央トリミング）
        const cropH = thumbCanvas.height;
        const srcY = Math.max(0, Math.floor((halfH - cropH) / 2));
        const srcH = Math.min(cropH, halfH);

        thumbCtx.drawImage(
            mainImg,
            splits[i].sx, splits[i].sy + srcY, halfW, srcH,
            0, 0, thumbCanvas.width, thumbCanvas.height
        );
    }

    // 個別プレビュー（フル画像）
    for (let i = 0; i < 4; i++) {
        const fullCanvas = document.getElementById(`full-${i + 1}`);
        const fullCtx = fullCanvas.getContext('2d');

        fullCanvas.width = halfW;
        fullCanvas.height = totalH;

        // ダミーA
        fullCtx.drawImage(dummyA, 0, 0, dummyA.naturalWidth, dummyA.naturalHeight, 0, 0, halfW, dummyAHeight);

        // メイン分割部分
        fullCtx.drawImage(mainImg, splits[i].sx, splits[i].sy, halfW, halfH, 0, dummyAHeight, halfW, halfH);

        // ダミーB
        fullCtx.drawImage(dummyB, 0, 0, dummyB.naturalWidth, dummyB.naturalHeight, 0, dummyAHeight + halfH, halfW, dummyBHeight);
    }
}

// ===== 画像生成 =====
generateBtn.addEventListener('click', async () => {
    if (!images.main || !images.dummyA || !images.dummyB) {
        alert('3枚の画像をすべてアップロードしてください。');
        return;
    }

    progressOverlay.classList.remove('hidden');
    progressText.textContent = '画像を生成中...';

    generatedBlobs = [];

    const mainImg = images.main;
    const dummyA = images.dummyA;
    const dummyB = images.dummyB;

    const halfW = Math.floor(mainImg.naturalWidth / 2);
    const halfH = Math.floor(mainImg.naturalHeight / 2);

    const ratioAVal = parseInt(ratioA.value) / 100;
    const ratioBVal = parseInt(ratioB.value) / 100;
    const dummyAHeight = Math.floor(halfH * ratioAVal);
    const dummyBHeight = Math.floor(halfH * ratioBVal);
    const totalH = dummyAHeight + halfH + dummyBHeight;

    const splits = [
        { sx: 0, sy: 0 },
        { sx: halfW, sy: 0 },
        { sx: 0, sy: halfH },
        { sx: halfW, sy: halfH },
    ];

    const format = outputFormat.value;
    const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const quality = (format === 'jpeg' || format === 'webp') ? parseInt(outputQuality.value) / 100 : undefined;
    const ext = format === 'png' ? 'png' : format === 'jpeg' ? 'jpg' : 'webp';

    for (let i = 0; i < 4; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = halfW;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        // ダミーA
        ctx.drawImage(dummyA, 0, 0, dummyA.naturalWidth, dummyA.naturalHeight, 0, 0, halfW, dummyAHeight);

        // メイン分割部分
        ctx.drawImage(mainImg, splits[i].sx, splits[i].sy, halfW, halfH, 0, dummyAHeight, halfW, halfH);

        // ダミーB
        ctx.drawImage(dummyB, 0, 0, dummyB.naturalWidth, dummyB.naturalHeight, 0, dummyAHeight + halfH, halfW, dummyBHeight);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
        generatedBlobs.push({ blob, name: `x_trick_${i + 1}.${ext}` });
    }

    progressText.textContent = '完了！';
    await new Promise(r => setTimeout(r, 300));
    progressOverlay.classList.add('hidden');

    downloadZipBtn.classList.remove('hidden');
    updatePreview();
});

// ===== ZIPダウンロード =====
downloadZipBtn.addEventListener('click', async () => {
    if (generatedBlobs.length === 0) return;

    progressOverlay.classList.remove('hidden');
    progressText.textContent = 'ZIPを生成中...';

    const zip = new JSZip();
    generatedBlobs.forEach(item => {
        zip.file(item.name, item.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });

    progressOverlay.classList.add('hidden');
    saveAs(content, 'x_trick_images.zip');
});
