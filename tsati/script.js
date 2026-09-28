// Anti-Inspect 
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) return false;
};

function goToScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

const langSelect = document.getElementById('lang-select');
const declareChk = document.getElementById('declare-chk');
const btnReady = document.getElementById('btn-ready');
const examLanguageSelect = document.getElementById('exam-language-select');
const pauseBtn = document.getElementById('pause-btn');
const submitSectionBtn = document.getElementById('submit-section-btn');
const mobileViewToggle = document.getElementById('mobile-view-toggle');

function setMobileExamView(showSidebar) {
    const examScreen = document.getElementById('screen-exam');
    examScreen.classList.toggle('mobile-sidebar-view', showSidebar);
    examScreen.classList.toggle('mobile-question-view', !showSidebar);
    mobileViewToggle.innerText = showSidebar ? 'Questions' : 'Overview';
    mobileViewToggle.setAttribute('aria-pressed', String(showSidebar));
}

mobileViewToggle.addEventListener('click', () => {
    setMobileExamView(!document.getElementById('screen-exam').classList.contains('mobile-sidebar-view'));
});

const mobileViewport = window.matchMedia('(max-width: 520px)');
const updateMobileExamView = event => {
    if (event.matches) setMobileExamView(true);
    else document.getElementById('screen-exam').classList.remove('mobile-sidebar-view', 'mobile-question-view');
};
updateMobileExamView(mobileViewport);
mobileViewport.addEventListener('change', updateMobileExamView);

function applyLanguageSelection(value) {
    if (!value) return;
    if (langSelect) langSelect.value = value;
    if (examLanguageSelect) examLanguageSelect.value = value;
}

function checkReadyStatus() {
    btnReady.disabled = !(langSelect.value !== "" && declareChk.checked);
}
langSelect.addEventListener('change', () => { applyLanguageSelection(langSelect.value); checkReadyStatus(); });
declareChk.addEventListener('change', checkReadyStatus);
examLanguageSelect.addEventListener('change', () => {
    applyLanguageSelection(examLanguageSelect.value);
    renderSectionQuestions();
});

// JSON configuration initialized as objects inside the application context
const sectionMeta = [
    { name: 'General Intelligence and Reasoning', total: 25 },
    { name: 'General Awareness', total: 25 },
    { name: 'Quantitative Aptitude', total: 25 },
    { name: 'English Comprehension', total: 25 }
];

const totalQ = 100;
let questions = [];
let currentSectionIndex = 0;
let currentQ = 0;
let sectionResults = [];
let sectionTimes = [];
let sectionPositions = [];
let totalTime = 60 * 60;
let initialTime = 60 * 60;
let sectionStartRemaining = initialTime;
let timerInterval = null;
let isPaused = false;

const optionMap = { en: ["Option A", "Option B", "Option C", "Option D"], hi: ["विकल्प ए", "विकल्प बी", "विकल्प सी", "विकल्प डी"] };
const textMap = { en: 'Question {n}: Sample question text for demonstration.', hi: 'प्रश्न {n}: प्रदर्शन के लिए नमूना प्रश्न पाठ।' };

function buildQuestions() {
    questions = [];
    let qNumber = 0;
    sectionMeta.forEach((section, sectionIndex) => {
        for (let i = 1; i <= section.total; i++) {
            qNumber++;
            questions.push({
                id: qNumber,
                sectionIndex,
                sectionName: section.name,
                text: textMap.en.replace('{n}', qNumber),
                textHi: textMap.hi.replace('{n}', qNumber),
                optionsEn: optionMap.en,
                optionsHi: optionMap.hi,
                status: 'not-visited',
                selected: null,
                correct: (qNumber + 1) % 4
            });
        }
    });
}
buildQuestions();

document.getElementById('section-tabs').addEventListener('click', event => {
    const tab = event.target.closest('a[data-section-index]');
    if (!tab) return;
    event.preventDefault();
    navigateToSection(Number(tab.dataset.sectionIndex));
});

function getLanguageValue() { return examLanguageSelect ? examLanguageSelect.value : 'en'; }

function updateSectionHeader() {
    const section = sectionMeta[currentSectionIndex];
    const paletteHeading = document.querySelector('.palette-section-title');
    if (paletteHeading) paletteHeading.innerText = section.name;
    const tabs = document.getElementById('section-tabs');
    tabs.innerHTML = sectionMeta.map((item, index) => {
        const isCompleted = Boolean(sectionResults[index]);
        const isActive = index === currentSectionIndex;
        const state = isActive ? 'active' : isCompleted ? 'completed' : '';
        const marker = isCompleted ? ' ✓' : '';
        return `<a class="section-tab ${state}" href="#section-${index + 1}" data-section-index="${index}" ${isActive ? 'aria-current="step"' : ''}>${item.name}${marker}</a>`;
    }).join('');

    // Change submit button text if on last section
    submitSectionBtn.innerText = currentSectionIndex === sectionMeta.length - 1 ? "Submit Exam" : "Submit section";
}

function formatTimerDisplay() {
    const hours = String(Math.floor(totalTime / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalTime % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalTime % 60).padStart(2, '0');
    const display = `${hours} : ${minutes} : ${seconds}`;
    document.getElementById('exam-timer').innerText = display;
    document.getElementById('exam-timer-panel').innerText = display;
    return display;
}

function formatClockFromSeconds(seconds) {
    const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hours} : ${minutes} : ${secs}`;
}

function saveActiveSectionTime() {
    const elapsed = Math.max(0, sectionStartRemaining - totalTime);
    sectionTimes[currentSectionIndex] = (sectionTimes[currentSectionIndex] || 0) + elapsed;
    sectionStartRemaining = totalTime;
}

function animateSectionChange() {
    const examLayout = document.querySelector('#screen-exam .exam-layout');
    examLayout.classList.remove('section-transition');
    void examLayout.offsetWidth;
    examLayout.classList.add('section-transition');
    examLayout.addEventListener('animationend', () => examLayout.classList.remove('section-transition'), { once: true });
}

function navigateToSection(sectionIndex) {
    if (!Number.isInteger(sectionIndex) || sectionIndex < 0 || sectionIndex >= sectionMeta.length || sectionIndex === currentSectionIndex) return;
    sectionPositions[currentSectionIndex] = currentQ;
    saveActiveSectionTime();
    sectionResults[sectionIndex] = null;
    currentSectionIndex = sectionIndex;
    currentQ = sectionPositions[sectionIndex] || 0;
    const sectionQuestions = questions.filter(question => question.sectionIndex === currentSectionIndex);
    if (sectionQuestions[currentQ]?.status === 'not-visited') sectionQuestions[currentQ].status = 'not-answered';
    renderSectionQuestions();
    animateSectionChange();
}

function togglePause() {
    isPaused = !isPaused;
    const screen = document.getElementById('screen-exam');
    const overlay = document.getElementById('pause-overlay');
    pauseBtn.innerText = isPaused ? 'Resume' : 'Pause';
    screen.classList.toggle('paused', isPaused);
    if (overlay) overlay.classList.toggle('visible', isPaused);

    if (isPaused && timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    else if (!isPaused && timerInterval === null) {
        timerInterval = setInterval(() => {
            totalTime--;
            if(totalTime <= 0) { clearInterval(timerInterval); submitFinalSummary(); return; }
            formatTimerDisplay();
        }, 1000);
    }
}
pauseBtn.addEventListener('click', togglePause);

function startExam() {
    goToScreen('screen-exam');
    isPaused = false;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('visible');
    if (pauseBtn) pauseBtn.innerText = 'Pause';
    totalTime = initialTime;
    currentSectionIndex = 0; currentQ = 0;
    sectionTimes = [];
    sectionPositions = [];
    sectionResults = [];
    sectionStartRemaining = totalTime;
    formatTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isPaused) return;
        totalTime--;
        if(totalTime <= 0) { clearInterval(timerInterval); submitFinalSummary(); return; }
        formatTimerDisplay();
    }, 1000);

    const firstQuestion = questions.filter(q => q.sectionIndex === currentSectionIndex)[0];
    if (firstQuestion && firstQuestion.status === 'not-visited') firstQuestion.status = 'not-answered';
    renderSectionQuestions();
}

function renderSectionQuestions() {
    const sectionQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    const q = sectionQuestions[currentQ];
    if (!q) return;

    const language = getLanguageValue();
    document.getElementById('q-num-text').innerText = `Q: ${q.id} / ${totalQ}`;
    document.getElementById('q-text').innerText = language === 'hi' ? q.textHi : q.text;

    const optsContainer = document.getElementById('q-options');
    const options = language === 'hi' ? q.optionsHi : q.optionsEn;
    optsContainer.innerHTML = options.map((opt, i) => `
        <label class="option-lbl">
            <input type="radio" name="opt" onchange="selectOpt(${i})" ${q.selected === i ? 'checked' : ''}> ${opt}
        </label>
    `).join('');

    renderGrid();
    updateSectionHeader();
}

function selectOpt(idx) {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) {
        q.selected = idx;
        q.status = 'answered';
        renderGrid();
    }
}

function renderGrid() {
    const grid = document.getElementById('palette-grid');
    grid.innerHTML = '';
    const sectionQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    let stats = { ans:0, notans:0, notvis:0, mark:0, ansmark:0 };

    sectionQuestions.forEach((q, i) => {
        if(q.status === 'answered') stats.ans++;
        else if(q.status === 'not-answered') stats.notans++;
        else if(q.status === 'not-visited') stats.notvis++;
        else if(q.status === 'marked') stats.mark++;
        else if(q.status === 'ans-marked') stats.ansmark++;

        const btn = document.createElement('button');
        btn.className = `shape-btn ${q.status}`;
        btn.innerText = q.id;
        btn.classList.toggle('current-question', i === currentQ);
        
        btn.onclick = () => {
            if(sectionQuestions[i].status === 'not-visited') sectionQuestions[i].status = 'not-answered';
            currentQ = i;
            renderSectionQuestions();
        };
        grid.appendChild(btn);
    });

    document.getElementById('leg-ans').innerText = stats.ans;
    document.getElementById('leg-not-ans').innerText = stats.notans;
    document.getElementById('leg-not-vis').innerText = stats.notvis;
    document.getElementById('leg-mark').innerText = stats.mark;
    document.getElementById('leg-ans-mark').innerText = stats.ansmark;
}

function saveNext() {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) { q.status = q.selected !== null ? 'answered' : 'not-answered'; goNext(); }
}

function markNext() {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) { q.status = q.selected !== null ? 'ans-marked' : 'marked'; goNext(); }
}

function clearResp() {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) { q.selected = null; q.status = 'not-answered'; renderSectionQuestions(); }
}

function goNext() {
    const sectionQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    if (currentQ < sectionQuestions.length - 1) {
        currentQ += 1;
        if(sectionQuestions[currentQ].status === 'not-visited') sectionQuestions[currentQ].status = 'not-answered';
        renderSectionQuestions();
    } else { renderGrid(); }
}

function getSectionStatusCounts(secIdx) {
    const sq = questions.filter(q => q.sectionIndex === secIdx);
    return {
        ans: sq.filter(q => q.status === 'answered').length,
        ansmark: sq.filter(q => q.status === 'ans-marked').length,
        notans: sq.filter(q => q.status === 'not-answered').length,
        mark: sq.filter(q => q.status === 'marked').length,
        notvis: sq.filter(q => q.status === 'not-visited').length
    };
}

function showModal() {
    const section = sectionMeta[currentSectionIndex];
    const s = getSectionStatusCounts(currentSectionIndex);
    document.getElementById('mod-section-name').innerText = section.name;
    document.getElementById('mod-total').innerText = section.total;
    document.getElementById('mod-ans').innerText = s.ans;
    document.getElementById('mod-ans-mark').innerText = s.ansmark;
    document.getElementById('mod-not-ans').innerText = s.notans;
    document.getElementById('mod-mark').innerText = s.mark;
    document.getElementById('mod-not-vis').innerText = s.notvis;
    document.getElementById('mod-effective').innerText = s.ans + s.ansmark;
    const elapsed = (sectionTimes[currentSectionIndex] || 0) + Math.max(0, sectionStartRemaining - totalTime);
    document.getElementById('mod-time').innerText = formatClockFromSeconds(elapsed);
    document.getElementById('modal-summary').style.display = 'flex';
}

function showFinalSummaryModal() {
    const tbody = document.getElementById('final-summary-rows');
    tbody.innerHTML = '';
    if (!sectionResults[currentSectionIndex]) {
        sectionTimes[currentSectionIndex] = (sectionTimes[currentSectionIndex] || 0) + Math.max(0, sectionStartRemaining - totalTime);
        sectionResults[currentSectionIndex] = calculateSectionResult(currentSectionIndex);
    }
    const overall = { ans: 0, ansmark: 0, notans: 0, mark: 0, notvis: 0, effective: 0 };
    const totals = { questions: 0, ans: 0, ansmark: 0, notans: 0, mark: 0, notvis: 0, effective: 0, time: 0 };
    sectionMeta.forEach((sec, idx) => {
        const s = getSectionStatusCounts(idx);
        const effective = s.ans + s.ansmark;
        const timeTaken = sectionTimes[idx] || 0;
        overall.ans += s.ans;
        overall.ansmark += s.ansmark;
        overall.notans += s.notans;
        overall.mark += s.mark;
        overall.notvis += s.notvis;
        overall.effective += effective;
        totals.questions += sec.total;
        totals.ans += s.ans;
        totals.ansmark += s.ansmark;
        totals.notans += s.notans;
        totals.mark += s.mark;
        totals.notvis += s.notvis;
        totals.effective += effective;
        totals.time += timeTaken;
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td>${sec.name}</td>
                <td>${sec.total}</td>
                <td>${s.ans}</td>
                <td>${s.ansmark}</td>
                <td>${s.notans}</td>
                <td>${s.mark}</td>
                <td>${s.notvis}</td>
                <td>${effective}</td>
                <td>${formatClockFromSeconds(timeTaken)}</td>
            </tr>
        `;
    });
    document.getElementById('final-answered').innerText = overall.ans;
    document.getElementById('final-ans-marked').innerText = overall.ansmark;
    document.getElementById('final-not-answered').innerText = overall.notans;
    document.getElementById('final-marked').innerText = overall.mark;
    document.getElementById('final-not-visited').innerText = overall.notvis;
    document.getElementById('final-time').innerText = formatClockFromSeconds(initialTime - totalTime);
    document.getElementById('final-summary-total').innerHTML = `
        <tr>
            <td colspan="2">Total</td>
            <td>${totals.questions}</td>
            <td>${totals.ans}</td>
            <td>${totals.ansmark}</td>
            <td>${totals.notans}</td>
            <td>${totals.mark}</td>
            <td>${totals.notvis}</td>
            <td>${totals.effective}</td>
            <td>${formatClockFromSeconds(totals.time)}</td>
        </tr>
    `;
    document.getElementById('modal-final-summary').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function submitCurrentSection() {
    closeModal('modal-summary');
    saveActiveSectionTime();
    sectionPositions[currentSectionIndex] = currentQ;
    sectionResults[currentSectionIndex] = calculateSectionResult(currentSectionIndex);
    const nextIncomplete = sectionMeta.findIndex((section, index) => !sectionResults[index]);
    if (nextIncomplete === -1) {
        showFinalSummaryModal();
        return;
    }
    currentSectionIndex = nextIncomplete;
    currentQ = sectionPositions[nextIncomplete] || 0;
    const nextQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    if (nextQuestions[currentQ]?.status === 'not-visited') nextQuestions[currentQ].status = 'not-answered';
    renderSectionQuestions();
    animateSectionChange();
}

function calculateSectionResult(sectionIndex) {
    const section = sectionMeta[sectionIndex];
    const sectionQuestions = questions.filter(question => question.sectionIndex === sectionIndex);
    const attempted = sectionQuestions.filter(question => question.selected !== null);
    const correct = attempted.filter(question => question.selected === question.correct).length;
    const counts = getSectionStatusCounts(sectionIndex);
    return {
        name: section.name,
        total: section.total,
        answered: counts.ans,
        answeredMarked: counts.ansmark,
        notAnswered: counts.notans,
        marked: counts.mark,
        notVisited: counts.notvis,
        unseen: counts.notvis,
        effectiveAttempts: counts.ans + counts.ansmark,
        attempted: attempted.length,
        correct,
        incorrect: attempted.length - correct,
        skipped: sectionQuestions.length - attempted.length - counts.notvis,
        score: Number((correct * 2 - (attempted.length - correct) * 0.5).toFixed(1)),
        time: sectionTimes[sectionIndex] || 0
    };
}

function submitFinalSummary() {
    closeModal('modal-summary');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    showFinalSummaryModal();
}

function submitExam() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const submitButton = document.querySelector('#modal-final-summary .modal-footer button');
    const submitMessage = document.getElementById('final-submit-message');
    submitButton.disabled = true;
    submitButton.innerText = 'Submitted';
    submitMessage.innerText = 'Test submitted successfully.';
}