/**
 * watermark-main.js - ウォーターマークツールのエントリーポイント
 */

import './style.css';
import { ImageUploader } from './modules/uploader.js';
import { CanvasManager } from './modules/canvas.js';
import { WatermarkManager } from './modules/watermark.js';

// ===== 状態 =====
let imageLoaded = false;
let currentImage = null;
let currentImageName = '';

// ===== DOM要素 =====
const uploadArea = document.getElementById('upload-area');
const editorArea = document.getElementById('editor-area');
const imageNameEl = document.getElementById('image-name');
const imageSizeEl = document.getElementById('image-size');
const imageFilesizeEl = document.getElementById('image-filesize');
const downloadBtn = document.getElementById('download-btn');
const outputFormat = document.getElementById('output-format');
const outputQuality = document.getElementById('output-quality');
const qualityValue = document.getElementById('quality-value');
const qualityGroup = document.getElementById('quality-group');

// ===== マネージャー初期化 =====
const canvasManager = new CanvasManager();
const watermarkManager = new WatermarkManager(canvasManager);

// Watermark integration
canvasManager.setWatermarkManager(watermarkManager);
// 初期状態で有効にする
watermarkManager.setState({ enabled: true });

// ===== 画像アップロード =====
const uploader = new ImageUploader((img, info) => {
    // 画像情報表示
    imageNameEl.textContent = info.name;
    imageSizeEl.textContent = `${info.width} × ${info.height} px`;
    imageFilesizeEl.textContent = formatFileSize(info.size);

    currentImage = img;
    currentImageName = info.name.replace(/\.[^.]+$/, '');

    // UIの切替
    uploadArea.classList.add('hidden');
    editorArea.classList.remove('hidden');

    // Canvas に画像を設定
    canvasManager.setImage(img);
    imageLoaded = true;
});

// ===== ウォーターマーク UI イベント =====
const wmOptions = document.getElementById('watermark-options');
const wmTypeRadios = document.getElementsByName('wm-type');
const wmTextSettings = document.getElementById('wm-text-settings');
const wmImageSettings = document.getElementById('wm-image-settings');
const wmTextInput = document.getElementById('wm-text');
const wmFontSelect = document.getElementById('wm-font');
const wmColorInput = document.getElementById('wm-color');
const wmColorValue = document.getElementById('wm-color-value');
const wmOpacity = document.getElementById('wm-opacity');
const wmOpacityValue = document.getElementById('wm-opacity-value');
const wmSize = document.getElementById('wm-size');
const wmSizeValue = document.getElementById('wm-size-value');
const wmMargin = document.getElementById('wm-margin');
const wmMarginValue = document.getElementById('wm-margin-value');
const wmImageUploadBtn = document.getElementById('wm-image-upload-btn');
const wmImageInput = document.getElementById('wm-image-input');
const wmImageName = document.getElementById('wm-image-name');
const wmPosItems = document.querySelectorAll('.pos-item');

// タイプ切替
wmTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        const type = radio.value;
        wmTextSettings.classList.toggle('hidden', type !== 'text');
        wmImageSettings.classList.toggle('hidden', type !== 'image');
        watermarkManager.setState({ type });
    });
});

// テキスト入力
wmTextInput.addEventListener('input', () => {
    watermarkManager.setState({ text: wmTextInput.value });
});

// フォント変更
wmFontSelect.addEventListener('change', () => {
    watermarkManager.setState({ font: wmFontSelect.value });
});

// カラー
const updateColor = () => {
    const color = wmColorInput.value;
    wmColorValue.textContent = color;
    watermarkManager.setState({ color });
};
wmColorInput.addEventListener('input', updateColor);
wmColorInput.addEventListener('change', updateColor); // for some pickers

// 透明度
const updateOpacity = () => {
    const val = wmOpacity.value;
    wmOpacityValue.textContent = val + '%';
    watermarkManager.setState({ opacity: val / 100 });
};
wmOpacity.addEventListener('input', updateOpacity);
wmOpacity.addEventListener('change', updateOpacity);
wmOpacity.addEventListener('touchmove', (e) => { e.stopPropagation(); updateOpacity(); }, { passive: true }); // for mobile robust

// サイズ
const updateSize = () => {
    const val = wmSize.value;
    wmSizeValue.textContent = val + '%';
    watermarkManager.setState({ scale: val / 100 });
};
wmSize.addEventListener('input', updateSize);
wmSize.addEventListener('change', updateSize);
wmSize.addEventListener('touchmove', (e) => { e.stopPropagation(); updateSize(); }, { passive: true }); // for mobile robust

// マージン
const updateMargin = () => {
    const val = wmMargin.value;
    wmMarginValue.textContent = val + '%';
    watermarkManager.setState({ margin: val / 100 });
};
wmMargin.addEventListener('input', updateMargin);
wmMargin.addEventListener('change', updateMargin);
wmMargin.addEventListener('touchmove', (e) => { e.stopPropagation(); updateMargin(); }, { passive: true }); // for mobile robust

// 位置変更
wmPosItems.forEach(item => {
    item.addEventListener('click', () => {
        wmPosItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        watermarkManager.setState({ position: item.dataset.pos });
    });
});

// 初期状態の同期 (特にカラーとスライダー)
// ページロード時にHTMLのvalue属性とJSの状態を同期させる
window.addEventListener('DOMContentLoaded', () => {
    // カラーの初期化
    watermarkManager.setState({
        color: wmColorInput.value,
        opacity: wmOpacity.value / 100,
        scale: wmSize.value / 100,
        margin: wmMargin.value / 100,
        text: wmTextInput.value,
        font: wmFontSelect.value
    });
});

// 画像アップロード
wmImageUploadBtn.addEventListener('click', () => wmImageInput.click());
wmImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        wmImageName.textContent = file.name;
        try {
            await watermarkManager.loadImage(file);
        } catch (err) {
            console.error('Failed to load watermark image', err);
            alert('画像の読み込みに失敗しました');
        }
    }
});

// ===== 出力設定 =====
outputFormat.addEventListener('change', () => {
    const fmt = outputFormat.value;
    qualityGroup.style.display = (fmt === 'jpeg' || fmt === 'webp') ? '' : 'none';
});

outputQuality.addEventListener('input', () => {
    qualityValue.textContent = outputQuality.value + '%';
});

// ===== 保存処理 =====
downloadBtn.addEventListener('click', () => {
    if (!imageLoaded || !currentImage) return;

    const w = currentImage.naturalWidth;
    const h = currentImage.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // 画像描画
    ctx.drawImage(currentImage, 0, 0);

    // ウォーターマーク描画
    watermarkManager.render(ctx, w, h);

    // 保存
    const format = outputFormat.value;
    const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const quality = (format === 'jpeg' || format === 'webp') ? parseInt(outputQuality.value) / 100 : undefined;
    const ext = format === 'png' ? 'png' : format === 'jpeg' ? 'jpg' : 'webp';

    canvas.toBlob((blob) => {
        if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentImageName}_watermarked.${ext}`;
            document.body.appendChild(a); // Append to body
            a.click();
            document.body.removeChild(a); // Remove after click
            URL.revokeObjectURL(url);
        }
    }, mimeType, quality);
});


// ===== ユーティリティ =====
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== ウィンドウリサイズ対応 =====
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (imageLoaded) {
            canvasManager._fitToContainer();
            canvasManager.draw();
        }
    }, 100);
});
