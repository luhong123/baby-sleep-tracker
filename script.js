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

// 计算睡眠时长（小时数，用于统计）
function calculateDurationInHours(sleepTime, wakeTime, date) {
    const sleepDateTime = new Date(`${date}T${sleepTime}`);
    let wakeDateTime = new Date(`${date}T${wakeTime}`);

    if (wakeDateTime < sleepDateTime) {
        wakeDateTime.setDate(wakeDateTime.getDate() + 1);
    }

    const diffMs = wakeDateTime - sleepDateTime;
    return diffMs / (1000 * 60 * 60);
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
    updateStats();
    updateChart();

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
        updateStats();
        updateChart();
    }
}

// 清空所有记录
function clearAllRecords() {
    if (confirm('确定要清空所有记录吗？此操作不可恢复。')) {
        localStorage.removeItem('sleepRecords');
        renderRecords();
        updateStats();
        updateChart();
    }
}

// 更新统计数据
function updateStats() {
    const records = loadRecords();

    document.getElementById('totalRecords').textContent = records.length;

    if (records.length === 0) {
        document.getElementById('avgDuration').textContent = '0小时';
        document.getElementById('maxDuration').textContent = '0小时';
        return;
    }

    let totalHours = 0;
    let maxHours = 0;

    records.forEach(record => {
        const hours = calculateDurationInHours(record.sleepTime, record.wakeTime, record.date);
        totalHours += hours;
        maxHours = Math.max(maxHours, hours);
    });

    const avgHours = totalHours / records.length;
    document.getElementById('avgDuration').textContent = `${avgHours.toFixed(1)}小时`;
    document.getElementById('maxDuration').textContent = `${maxHours.toFixed(1)}小时`;
}

// 图表实例
let sleepChart = null;

// 更新图表
function updateChart() {
    const records = loadRecords();
    const ctx = document.getElementById('sleepChart').getContext('2d');

    // 按日期正序排序（最旧的在前）
    const sortedRecords = [...records].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    // 只显示最近14天的数据
    const recentRecords = sortedRecords.slice(-14);

    const labels = recentRecords.map(record => {
        const date = new Date(record.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const data = recentRecords.map(record => {
        return calculateDurationInHours(record.sleepTime, record.wakeTime, record.date);
    });

    // 销毁旧图表
    if (sleepChart) {
        sleepChart.destroy();
    }

    // 创建新图表
    sleepChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '睡眠时长（小时）',
                data: data,
                borderColor: '#3C5A78',
                backgroundColor: 'rgba(60, 90, 120, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3C5A78',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1E2227',
                    padding: 12,
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    borderColor: '#E7E3DA',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)} 小时`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#E7E3DA',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6B7077',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value + 'h';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6B7077',
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
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

    // 更新统计和图表
    updateStats();
    updateChart();
});
