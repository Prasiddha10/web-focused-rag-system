import DOMPurify from './dompurify.min.js';
import Chart from 'chart.js/auto';

const API_BASE_URL = 'http://localhost:3000'; // Update to deployed backend URL
let urls = [];
let knowledgeBase = [];
let questionHistory = [];
let stats = { crawlsSuccess: 0, crawlsFailed: 0, questionsAsked: 0 };
const DATA_VERSION = '1.0';

let statsChart = null; // Hold chart instance for updates

function loadData() {
    const savedVersion = localStorage.getItem('dataVersion');
    if (savedVersion !== DATA_VERSION) {
        localStorage.clear();
        localStorage.setItem('dataVersion', DATA_VERSION);
    }
    const savedUrls = localStorage.getItem('urls');
    const savedKnowledgeBase = localStorage.getItem('knowledgeBase');
    const savedHistory = localStorage.getItem('questionHistory');
    const savedStats = localStorage.getItem('stats');
    if (savedUrls) urls = JSON.parse(savedUrls);
    if (savedKnowledgeBase) knowledgeBase = JSON.parse(savedKnowledgeBase);
    if (savedHistory) questionHistory = JSON.parse(savedHistory);
    if (savedStats) stats = JSON.parse(savedStats);

    updateUrlList();
    updateKnowledgeBase();
    updateQuestionHistory();
    updateStatsChart();
}

function saveData() {
    localStorage.setItem('urls', JSON.stringify(urls));
    localStorage.setItem('knowledgeBase', JSON.stringify(knowledgeBase));
    localStorage.setItem('questionHistory', JSON.stringify(questionHistory));
    localStorage.setItem('stats', JSON.stringify(stats));
    localStorage.setItem('dataVersion', DATA_VERSION);
}

function addUrl() {
    const input = document.getElementById('urlInput');
    const url = DOMPurify.sanitize(input.value.trim());
    
    if (!url) {
        showStatus('Please enter a URL', 'error');
        return;
    }
    
    if (!isValidUrl(url)) {
        showStatus('Please enter a valid URL (must start with http:// or https://)', 'error');
        return;
    }
    
    if (urls.includes(url)) {
        showStatus('URL already added', 'error');
        return;
    }
    
    urls.push(url);
    input.value = '';
    updateUrlList();
    saveData();
    showStatus('URL added successfully', 'success');
}

function removeUrl(index) {
    urls.splice(index, 1);
    updateUrlList();
    saveData();
    showStatus('URL removed', 'success');
}

function clearUrls() {
    urls = [];
    knowledgeBase = [];
    stats.crawlsSuccess = 0;
    stats.crawlsFailed = 0;
    updateUrlList();
    updateKnowledgeBase();
    updateStatsChart();
    saveData();
    showStatus('All URLs and knowledge base cleared', 'success');
}

function clearHistory() {
    questionHistory = [];
    stats.questionsAsked = 0;
    updateQuestionHistory();
    updateStatsChart();
    saveData();
    showStatus('Question history cleared', 'success');
}

async function crawlWebsites() {
    if (urls.length === 0) {
        showStatus('Please add at least one URL to crawl', 'error');
        return;
    }

    const crawlBtn = document.getElementById('crawlBtn');
    const progressBar = document.getElementById('crawlProgress');
    const progressFill = document.getElementById('progressFill');
    crawlBtn.innerHTML = '<div class="loader"></div>Crawling...';
    crawlBtn.disabled = true;
    progressBar.style.display = 'block';
    
    showStatus('Crawling websites... This may take a moment.', 'loading');
    
    try {
        const response = await fetch(`${API_BASE_URL}/crawl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls })
        });
        const results = await response.json();
        
        knowledgeBase = [];
        stats.crawlsSuccess = 0;
        stats.crawlsFailed = 0;
        
        results.forEach(result => {
            if (result.status === 'success') {
                knowledgeBase.push({
                    url: result.url,
                    content: DOMPurify.sanitize(result.content),
                    timestamp: new Date().toISOString()
                });
                stats.crawlsSuccess++;
            } else {
                stats.crawlsFailed++;
            }
        });
        
        saveData();
        updateKnowledgeBase();
        updateStatsChart();
        
        if (stats.crawlsSuccess > 0) {
            showStatus(`Successfully crawled ${stats.crawlsSuccess} website(s)${stats.crawlsFailed > 0 ? `, ${stats.crawlsFailed} failed` : ''}`, 'success');
        } else {
            showStatus('Failed to crawl any websites. Please check your URLs and try again.', 'error');
        }
    } catch (error) {
        showStatus('Error during crawling. Please try again.', 'error');
        console.error('Crawl error:', error);
    }
    
    crawlBtn.innerHTML = '🚀 Crawl Websites';
    crawlBtn.disabled = false;
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
}

function updateUrlList() {
    const list = document.getElementById('urlList');
    list.innerHTML = '';
    
    urls.forEach((url, index) => {
        const li = document.createElement('li');
        li.className = 'url-item';
        li.innerHTML = `
            <span class="url-text">${DOMPurify.sanitize(url)}</span>
            <button onclick="removeUrl(${index})" class="btn btn-danger">Remove</button>
        `;
        list.appendChild(li);
    });
}

function updateKnowledgeBase() {
    const kbDiv = document.getElementById('knowledgeBase');
    
    if (knowledgeBase.length === 0) {
        kbDiv.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No content crawled yet.</p>';
        return;
    }
    
    kbDiv.innerHTML = knowledgeBase.map((item, index) => `
        <div class="kb-item">
            <div class="kb-url">📄 ${DOMPurify.sanitize(item.url)}</div>
            <div class="kb-content${item.content.length > 200 ? '' : ' expanded'}" id="content-${index}">
                ${DOMPurify.sanitize(item.content)}
            </div>
            ${item.content.length > 200 ? `
                <button class="expand-btn" onclick="toggleContent(${index})">
                    Show More
                </button>
            ` : ''}
        </div>
    `).join('');
}

function toggleContent(index) {
    const content = document.getElementById(`content-${index}`);
    const btn = content.parentElement.querySelector('.expand-btn');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        btn.textContent = 'Show More';
    } else {
        content.classList.add('expanded');
        btn.textContent = 'Show Less';
    }
}

async function askQuestion() {
    const questionInput = document.getElementById('questionInput');
    const question = DOMPurify.sanitize(questionInput.value.trim());
    
    if (!question) {
        showStatus('Please enter a question', 'error');
        return;
    }
    
    if (question.length > 500) {
        showStatus('Question is too long. Please keep it under 500 characters.', 'error');
        return;
    }
    
    if (knowledgeBase.length === 0) {
        showStatus('Please crawl some websites first to build your knowledge base', 'error');
        return;
    }
    
    const askBtn = document.getElementById('askBtn');
    askBtn.innerHTML = '<div class="loader"></div>Processing with Gemini AI...';
    askBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        const { answer, sources } = await response.json();
        
        displayAnswer(question, answer, sources);
        addToHistory(question, answer, sources);
        stats.questionsAsked++;
        updateStatsChart();
        saveData();
    } catch (error) {
        showStatus('Error generating answer. Please try again.', 'error');
        console.error('Query error:', error);
    }
    
    askBtn.innerHTML = '🔍 Get Answer';
    askBtn.disabled = false;
}

function displayAnswer(question, answer, sources) {
    const answerBox = document.getElementById('answerBox');
    answerBox.innerHTML = `
        <div class="answer-box">
            <h4 style="color: #333; margin-bottom: 15px;">❓ Question:</h4>
            <p style="font-style: italic; color: #555; margin-bottom: 20px;">${DOMPurify.sanitize(question)}</p>
            <h4 style="color: #333; margin-bottom: 15px;">💡 Answer:</h4>
            <p>${DOMPurify.sanitize(answer)}</p>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 0.9rem; color: #666;">
                <strong>Sources:</strong><br>
                ${sources.map(s => `
                    <div class="source-excerpt">
                        <a href="${DOMPurify.sanitize(s.url)}" target="_blank" rel="noopener noreferrer">${DOMPurify.sanitize(s.url)}</a><br>
                        ${DOMPurify.sanitize(s.excerpt)}...
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function addToHistory(question, answer, sources) {
    questionHistory.unshift({ question, answer, sources, timestamp: new Date().toISOString() });
    if (questionHistory.length > 10) {
        questionHistory.pop();
    }
    updateQuestionHistory();
}

function updateQuestionHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = questionHistory.length === 0
        ? '<p style="text-align: center; color: #666; font-style: italic;">No questions asked yet.</p>'
        : questionHistory.map((item, index) => `
            <div class="history-item" onclick="revisitQuestion(${index})" style="cursor:pointer;">
                <strong>❓ ${DOMPurify.sanitize(item.question)}</strong><br>
                <small>${new Date(item.timestamp).toLocaleString()}</small>
            </div>
        `).join('');
}

function revisitQuestion(index) {
    const item = questionHistory[index];
    document.getElementById('questionInput').value = item.question;
    displayAnswer(item.question, item.answer, item.sources);
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('crawlStatus');
    statusDiv.innerHTML = `<div class="status ${type}">${DOMPurify.sanitize(message)}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function updateStatsChart() {
    const ctx = document.getElementById('statsChart').getContext('2d');
    if (statsChart) {
        // Update existing chart data and redraw
        statsChart.data.datasets[0].data = [stats.crawlsSuccess, stats.crawlsFailed, stats.questionsAsked];
        statsChart.update();
    } else {
        // Create chart if doesn't exist
        statsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Successful Crawls', 'Failed Crawls', 'Questions Asked'],
                datasets: [{
                    label: 'System Stats',
                    data: [stats.crawlsSuccess, stats.crawlsFailed, stats.questionsAsked],
                    backgroundColor: ['#00b894', '#e17055', '#4facfe'],
                    borderColor: ['#00b894', '#e17055', '#4facfe'],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Count' }
                    },
                    x: {
                        title: { display: true, text: 'System Stats' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'System Statistics' }
                }
            }
        });
    }
}

document.getElementById('urlInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addUrl();
    }
});

document.getElementById('questionInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        askQuestion();
    }
});

window.onload = function() {
    loadData();
    showStatus('Welcome! Add URLs above to start building your knowledge base.', 'success');
};
window.addUrl = addUrl;
window.removeUrl = removeUrl;
window.clearUrls = clearUrls;
window.clearHistory = clearHistory;
window.crawlWebsites = crawlWebsites;
window.askQuestion = askQuestion;
window.toggleContent = toggleContent;
window.revisitQuestion = revisitQuestion;
