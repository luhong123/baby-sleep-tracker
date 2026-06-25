// 从 localStorage 加载记录
function loadRecords() {
    const records = localStorage.getItem('sleepRecords');
    return records ? JSON.parse(records) : [];
}

// 保存记录到 localStorage
function saveRecords(records) {
    localStorage.setItem('sleepRecords', JSON.stringify(records));
}

// 计算睡眠时长
function calculateDuration(sleepTime, wakeTime, date) {
    const sleepDateTime = new Date(`${date}T${sleepTime}`);
    let wakeDateTime = new Date(`${date}T${wakeTime}`);

    // 如果醒来时间早于入睡时间，说明跨天了
    if (wakeDateTime < sleepDateTime) {
        wakeDateTime.setDate(wakeDateTime.getDate() + 1);
    }

    const diffMs = wakeDateTime - sleepDateTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}小时${minutes}分钟`;
}

// 格式化日期显示
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];

    return `${year}年${month}月${day}日 ${weekday}`;
}

// 渲染记录列表
function renderRecords() {
    const records = loadRecords();
    const recordsList = document.getElementById('recordsList');

    if (records.length === 0) {
        recordsList.innerHTML = `
            <div class="empty-state">
                <p>还没有睡眠记录</p>
                <p class="empty-hint">添加第一条记录开始追踪宝宝的睡眠吧</p>
            </div>
        `;
        return;
    }

    // 按日期降序排序
    records.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.sleepTime}`);
        const dateB = new Date(`${b.date}T${b.sleepTime}`);
        return dateB - dateA;
    });

    recordsList.innerHTML = records.map((record, index) => `
        <div class="record-item">
            <div class="record-header">
                <div class="record-date">${formatDate(record.date)}</div>
                <button class="btn-delete" onclick="deleteRecord(${index})">删除</button>
            </div>
            <div class="record-times">
                <div class="time-block">
                    <div class="time-label">入睡时间</div>
                    <div class="time-value">${record.sleepTime}</div>
                </div>
                <div class="time-block">
                    <div class="time-label">醒来时间</div>
                    <div class="time-value">${record.wakeTime}</div>
                </div>
            </div>
            <div class="duration">睡眠时长：${record.duration}</div>
            ${record.note ? `<div class="record-note">${record.note}</div>` : ''}
        </div>
    `).join('');
}

// 添加记录
function addRecord(event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const sleepTime = document.getElementById('sleepTime').value;
    const wakeTime = document.getElementById('wakeTime').value;
    const note = document.getElementById('note').value;

    const duration = calculateDuration(sleepTime, wakeTime, date);

    const records = loadRecords();
    records.push({
        date,
        sleepTime,
        wakeTime,
        duration,
        note,
        timestamp: Date.now()
    });

    saveRecords(records);
    renderRecords();

    // 清空表单
    document.getElementById('sleepForm').reset();
    // 重新设置今天的日期
    document.getElementById('date').valueAsDate = new Date();
}

// 删除记录
function deleteRecord(index) {
    if (confirm('确定要删除这条记录吗？')) {
        const records = loadRecords();
        records.splice(index, 1);
        saveRecords(records);
        renderRecords();
    }
}

// 清空所有记录
function clearAllRecords() {
    if (confirm('确定要清空所有记录吗？此操作不可恢复。')) {
        localStorage.removeItem('sleepRecords');
        renderRecords();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置日期默认值为今天
    document.getElementById('date').valueAsDate = new Date();

    // 绑定表单提交事件
    document.getElementById('sleepForm').addEventListener('submit', addRecord);

    // 绑定清空按钮事件
    document.getElementById('clearAll').addEventListener('click', clearAllRecords);

    // 渲染记录列表
    renderRecords();
});
