// ============================================
// 数据层
// ============================================

let chartPeriod = 7;     // 当前图表显示周期
let deletedRecords = []; // 用于撤销删除

function loadRecords() {
    const records = localStorage.getItem('sleepRecords');
    return records ? JSON.parse(records) : [];
}

function saveRecords(records) {
    localStorage.setItem('sleepRecords', JSON.stringify(records));
}

// ============================================
// 计算函数
// ============================================

function getDurationHours(sleepTime, wakeTime, date) {
    const start = new Date(`${date}T${sleepTime}`);
    let end = new Date(`${date}T${wakeTime}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    return (end - start) / (1000 * 60 * 60);
}

function formatDuration(sleepTime, wakeTime, date) {
    const hours = getDurationHours(sleepTime, wakeTime, date);
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}小时${m}分钟`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

function shortDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============================================
// 数据校验
// ============================================

function validateRecord(date, sleepTime, wakeTime) {
    if (!date || !sleepTime || !wakeTime) {
        return '请填写完整信息';
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const recordDate = new Date(date + 'T23:59:59');
    if (recordDate > today) {
        return '日期不能是未来';
    }
    if (sleepTime === wakeTime) {
        return '入睡和醒来时间不能相同';
    }
    return null;
}

// ============================================
// 渲染函数
// ============================================

function renderRecords() {
    const records = loadRecords();
    const list = document.getElementById('recordsList');

    if (records.length === 0) {
        list.innerHTML = `<div class="empty-state"><p>还没有睡眠记录</p><p class="empty-hint">添加第一条记录开始追踪宝宝的睡眠吧</p></div>`;
        return;
    }

    records.sort((a, b) => {
        const aD = new Date(`${a.date}T${a.sleepTime}`);
        const bD = new Date(`${b.date}T${b.sleepTime}`);
        return bD - aD;
    });

    list.innerHTML = records.map(r => {
        const typeLabel = r.type === 'nap' ? '小睡' : '夜间';
        const typeBadge = r.type === 'nap'
            ? '<span class="type-badge nap">☀️ 小睡</span>'
            : '<span class="type-badge night">🌙 夜间</span>';

        const noteHtml = r.note ? `<div class="record-note">${r.note}</div>` : '';

        return `<div class="record-item" data-id="${r.id}">
            <div class="record-header">
                <div class="record-date">${formatDate(r.date)} ${typeBadge}</div>
                <div class="record-actions">
                    <button class="btn-icon" onclick="editRecord('${r.id}')">✏️</button>
                    <button class="btn-icon danger" onclick="deleteRecord('${r.id}')">🗑️</button>
                </div>
            </div>
            <div class="record-times">
                <div class="time-block">
                    <div class="time-label">入睡</div>
                    <div class="time-value">${r.sleepTime}</div>
                </div>
                <div class="time-block">
                    <div class="time-label">醒来</div>
                    <div class="time-value">${r.wakeTime}</div>
                </div>
            </div>
            <div class="record-footer">
                <div class="duration">${r.duration}</div>
            </div>
            ${noteHtml}
        </div>`;
    }).join('');
}

// ============================================
// 添加记录
// ============================================

function addRecord(e) {
    e.preventDefault();

    const date = document.getElementById('date').value;
    const sleepTime = document.getElementById('sleepTime').value;
    const wakeTime = document.getElementById('wakeTime').value;
    const note = document.getElementById('note').value.trim();
    const type = document.querySelector('input[name="sleepType"]:checked').value;

    const err = validateRecord(date, sleepTime, wakeTime);
    if (err) { showToast(err); return; }

    const duration = formatDuration(sleepTime, wakeTime, date);

    const records = loadRecords();
    records.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date, sleepTime, wakeTime, duration, note, type,
        timestamp: Date.now()
    });

    saveRecords(records);
    renderRecords();
    updateStats();
    updateChart();

    document.getElementById('sleepForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    document.querySelector('input[name="sleepType"][value="night"]').checked = true;

    showToast('✅ 记录已保存');
}

// ============================================
// 编辑记录
// ============================================

function editRecord(id) {
    const records = loadRecords();
    const r = records.find(x => x.id === id);
    if (!r) return;

    document.getElementById('editId').value = id;
    document.getElementById('editSleepTime').value = r.sleepTime;
    document.getElementById('editWakeTime').value = r.wakeTime;
    document.getElementById('editNote').value = r.note || '';

    const radio = document.querySelector(`input[name="editType"][value="${r.type || 'night'}"]`);
    if (radio) radio.checked = true;

    document.getElementById('editOverlay').style.display = 'flex';
}

document.getElementById('editForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const sleepTime = document.getElementById('editSleepTime').value;
    const wakeTime = document.getElementById('editWakeTime').value;
    const note = document.getElementById('editNote').value.trim();
    const type = document.querySelector('input[name="editType"]:checked').value;

    const records = loadRecords();
    const idx = records.findIndex(x => x.id === id);
    if (idx === -1) return;

    records[idx].sleepTime = sleepTime;
    records[idx].wakeTime = wakeTime;
    records[idx].duration = formatDuration(sleepTime, wakeTime, records[idx].date);
    records[idx].note = note;
    records[idx].type = type;

    saveRecords(records);
    renderRecords();
    updateStats();
    updateChart();
    closeEdit();
    showToast('✅ 记录已更新');
});

document.getElementById('editCancel').addEventListener('click', closeEdit);
document.getElementById('editOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeEdit();
});

function closeEdit() {
    document.getElementById('editOverlay').style.display = 'none';
}

// ============================================
// 删除 & 撤销
// ============================================

function deleteRecord(id) {
    showDialog('删除记录', '确定要删除这条记录吗？', () => {
        const records = loadRecords();
        const idx = records.findIndex(x => x.id === id);
        if (idx === -1) return;

        const deleted = records.splice(idx, 1)[0];
        saveRecords(records);

        // 暂存用于撤销
        deletedRecords.unshift({ record: deleted, records: loadRecords() });
        if (deletedRecords.length > 5) deletedRecords.pop();

        renderRecords();
        updateStats();
        updateChart();
        showToast('已删除', '撤销', () => undoDelete());
    });
}

function undoDelete() {
    const item = deletedRecords.shift();
    if (!item) return;

    const records = loadRecords();
    records.push(item.record);
    saveRecords(records);
    renderRecords();
    updateStats();
    updateChart();
    showToast('✅ 已恢复');
}

// ============================================
// 清空记录
// ============================================

function clearAllRecords() {
    const records = loadRecords();
    if (records.length === 0) { showToast('没有记录可清空'); return; }

    showDialog('清空所有记录', `确定要清空全部 ${records.length} 条记录吗？此操作可通过撤销恢复。`, () => {
        const backup = loadRecords();
        localStorage.removeItem('sleepRecords');

        deletedRecords.unshift({ records: backup, isClear: true });
        if (deletedRecords.length > 5) deletedRecords.pop();

        renderRecords();
        updateStats();
        updateChart();
        showToast('已清空所有记录', '撤销', () => undoClearAll());
    });
}

function undoClearAll() {
    const item = deletedRecords.shift();
    if (!item || !item.isClear) return;
    saveRecords(item.records);
    renderRecords();
    updateStats();
    updateChart();
    showToast('✅ 已恢复所有记录');
}

// ============================================
// 自定义弹窗
// ============================================

let dialogCallback = null;

function showDialog(title, message, onConfirm) {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogMessage').textContent = message;
    document.getElementById('dialogOverlay').style.display = 'flex';
    dialogCallback = onConfirm;
}

document.getElementById('dialogConfirm').addEventListener('click', function() {
    document.getElementById('dialogOverlay').style.display = 'none';
    if (dialogCallback) dialogCallback();
    dialogCallback = null;
});

document.getElementById('dialogCancel').addEventListener('click', function() {
    document.getElementById('dialogOverlay').style.display = 'none';
    dialogCallback = null;
});

document.getElementById('dialogOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
        dialogCallback = null;
    }
});

// ============================================
// Toast 通知
// ============================================

let toastTimer = null;

function showToast(message, actionText, actionCallback) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.classList.remove('show');

    // 清除旧按钮
    const oldBtn = toast.querySelector('.toast-btn');
    if (oldBtn) oldBtn.remove();

    if (actionText && actionCallback) {
        const btn = document.createElement('button');
        btn.className = 'toast-btn';
        btn.textContent = actionText;
        btn.onclick = function() {
            actionCallback();
            toast.classList.remove('show');
        };
        toast.appendChild(btn);
    }

    clearTimeout(toastTimer);
    // 强制回流
    void toast.offsetWidth;
    toast.classList.add('show');

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// 统计
// ============================================

function updateStats() {
    const records = loadRecords();
    const statsCard = document.querySelector('.stats-card');

    document.getElementById('totalRecords').textContent = records.length;

    if (records.length === 0) {
        document.getElementById('avgDuration').textContent = '0小时';
        document.getElementById('maxDuration').textContent = '0小时';
        document.getElementById('weekStats').style.display = 'none';
        statsCard.classList.add('hidden');
        return;
    }

    statsCard.classList.remove('hidden');

    let total = 0, max = 0;
    records.forEach(r => {
        const h = getDurationHours(r.sleepTime, r.wakeTime, r.date);
        total += h;
        max = Math.max(max, h);
    });

    document.getElementById('avgDuration').textContent = `${(total / records.length).toFixed(1)}小时`;
    document.getElementById('maxDuration').textContent = `${max.toFixed(1)}小时`;

    updateWeekStats(records);
}

function updateWeekStats(records) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const weekRecords = records.filter(r => {
        const d = new Date(r.date);
        return d >= monday && d <= now;
    });

    if (weekRecords.length === 0) {
        document.getElementById('weekStats').style.display = 'none';
        return;
    }

    document.getElementById('weekStats').style.display = 'block';
    document.getElementById('weekDays').textContent = `${weekRecords.length}天`;

    let totalH = 0, nightH = 0;
    weekRecords.forEach(r => {
        const h = getDurationHours(r.sleepTime, r.wakeTime, r.date);
        totalH += h;
        if (r.type !== 'nap') nightH += h;
    });

    document.getElementById('weekAvg').textContent = `${(totalH / weekRecords.length).toFixed(1)}小时`;
    document.getElementById('weekNight').textContent = `${nightH.toFixed(1)}小时`;
}

// ============================================
// 图表
// ============================================

let sleepChart = null;

function updateChart() {
    const records = loadRecords();
    const ctx = document.getElementById('sleepChart').getContext('2d');

    let sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    if (chartPeriod !== 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(chartPeriod));
        sorted = sorted.filter(r => new Date(r.date) >= cutoff);
    }

    const labels = sorted.map(r => shortDate(r.date));
    const data = sorted.map(r => getDurationHours(r.sleepTime, r.wakeTime, r.date));
    const napData = sorted.map(r => r.type === 'nap' ? getDurationHours(r.sleepTime, r.wakeTime, r.date) : null);

    if (sleepChart) sleepChart.destroy();

    sleepChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '夜间睡眠',
                    data: napData,
                    borderColor: '#FF9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.08)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#FF9500',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    spanGaps: true
                },
                {
                    label: '总睡眠',
                    data,
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#007AFF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 16,
                        usePointStyle: true,
                        font: { size: 12 },
                        color: '#8E8E93'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    borderWidth: 0,
                    cornerRadius: 8,
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} 小时`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(60,60,67,0.08)', drawBorder: false },
                    ticks: { color: '#8E8E93', font: { size: 12 }, callback: v => v + 'h' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8E8E93', font: { size: 11 } }
                }
            }
        }
    });
}

// ============================================
// 图表周期切换
// ============================================

document.querySelectorAll('.chart-period').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        chartPeriod = this.dataset.period;
        updateChart();
    });
});

// ============================================
// 快速记录
// ============================================

function quickSleep() {
    const now = new Date();
    document.getElementById('date').valueAsDate = now;
    document.getElementById('sleepTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('wakeTime').value = '';
    document.getElementById('sleepTime').focus();
}

function quickWake() {
    const now = new Date();
    document.getElementById('wakeTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('wakeTime').focus();
}

// ============================================
// 导出/导入
// ============================================

function exportData() {
    const records = loadRecords();
    if (records.length === 0) { showToast('没有数据可以导出'); return; }

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `宝宝睡眠记录_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ 数据已导出');
}

function importData() {
    document.getElementById('fileInput').click();
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error('无效格式');

            const current = loadRecords();
            const merged = [...current, ...imported];

            // 按 id 去重
            const seen = new Set();
            const unique = merged.filter(r => {
                const key = r.id || `${r.date}_${r.sleepTime}_${r.wakeTime}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // 确保每个记录都有 id
            unique.forEach(r => {
                if (!r.id) r.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            });

            saveRecords(unique);
            renderRecords();
            updateStats();
            updateChart();
            showToast(`✅ 成功导入 ${imported.length} 条记录`);
        } catch (err) {
            showToast('导入失败：' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ============================================
// 初始化
// ============================================

// 注册 Service Worker（PWA 离线支持）
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('date').valueAsDate = new Date();

    document.getElementById('sleepForm').addEventListener('submit', addRecord);
    document.getElementById('quickSleep').addEventListener('click', quickSleep);
    document.getElementById('quickWake').addEventListener('click', quickWake);
    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importData').addEventListener('click', importData);
    document.getElementById('fileInput').addEventListener('change', handleFileImport);
    document.getElementById('clearAll').addEventListener('click', clearAllRecords);

    renderRecords();
    updateStats();
    updateChart();
});